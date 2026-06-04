use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{anyhow, bail, Context};
use regex::Regex;
use serde_json::Value;
use tauri::{Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use tokio::sync::Mutex;

use crate::models::{
    YtdlpAvailabilityPayload, YtdlpDownloadOptions, YtdlpDownloadResult, YtdlpFormatInfo,
    YtdlpProgressPayload, YtdlpUpdateResult, YtdlpVideoInfo,
};

const YTDLP_PROGRESS_EVENT: &str = "ytdlp-download-progress";

/// Relative path from the resource directory to the bundled tools folder.
const TOOLS_SUBDIR: &str = "resources/tools/yt-dlp";

/// Shared state to track active yt-dlp child processes for cancellation.
#[derive(Default)]
pub struct YtdlpState {
    pub active_downloads: Arc<Mutex<HashMap<String, tokio::process::Child>>>,
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/// Resolve the full path to a bundled tool (e.g. `yt-dlp.exe`, `ffmpeg.exe`).
///
/// Resolution order:
/// 1. Bundled: `<resource_dir>/resources/tools/yt-dlp/<tool_name>` (ships with the app)
/// 2. Fallback: bare tool name (resolved via system PATH)
fn resolve_tool_path(app_handle: &tauri::AppHandle, tool_name: &str) -> PathBuf {
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let bundled = resource_dir.join(TOOLS_SUBDIR).join(tool_name);
        if bundled.exists() {
            return bundled;
        }
    }

    // Fallback to PATH
    PathBuf::from(tool_name)
}

/// Resolve the directory containing the bundled ffmpeg/ffprobe, if available.
fn resolve_ffmpeg_dir(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    let resource_dir = app_handle.path().resource_dir().ok()?;
    let tools_dir = resource_dir.join(TOOLS_SUBDIR);
    let ffmpeg_path = tools_dir.join(if cfg!(target_os = "windows") {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    });

    if ffmpeg_path.exists() {
        Some(tools_dir)
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// Availability check
// ---------------------------------------------------------------------------

/// Check if yt-dlp and ffmpeg are available (bundled or in PATH).
pub async fn check_ytdlp_available_payload(
    app_handle: &tauri::AppHandle,
) -> anyhow::Result<YtdlpAvailabilityPayload> {
    let ytdlp_path = resolve_tool_path(app_handle, if cfg!(target_os = "windows") { "yt-dlp.exe" } else { "yt-dlp" });
    let ffmpeg_path = resolve_tool_path(app_handle, if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" });

    let ytdlp_result = run_tool_version(&ytdlp_path, "--version").await;
    // ffmpeg uses a single-dash `-version` flag, not `--version`
    let ffmpeg_available = run_tool_version(&ffmpeg_path, "-version").await.is_ok();

    Ok(YtdlpAvailabilityPayload {
        ytdlp_available: ytdlp_result.is_ok(),
        ytdlp_version: ytdlp_result.ok(),
        ffmpeg_available,
    })
}

/// Run a tool with its version flag and return the first line of stdout.
async fn run_tool_version(tool_path: &PathBuf, version_flag: &str) -> anyhow::Result<String> {
    let mut cmd = TokioCommand::new(tool_path);
    cmd.arg(version_flag);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }
    cmd.kill_on_drop(true);

    let tool_display = tool_path.display();
    let output = cmd
        .output()
        .await
        .context(format!("{tool_display} is not available"))?;

    if !output.status.success() {
        bail!("{tool_display} exited with non-zero status");
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let version = stdout.lines().next().unwrap_or("").trim().to_string();

    if version.is_empty() {
        bail!("{tool_display} returned empty version");
    }

    Ok(version)
}

// ---------------------------------------------------------------------------
// Fetch video info
// ---------------------------------------------------------------------------

/// Fetch video metadata and available formats using `yt-dlp -J`.
pub async fn fetch_ytdlp_info_payload(
    app_handle: &tauri::AppHandle,
    url: String,
) -> anyhow::Result<YtdlpVideoInfo> {
    validate_url(&url)?;

    let ytdlp_path = resolve_tool_path(app_handle, if cfg!(target_os = "windows") { "yt-dlp.exe" } else { "yt-dlp" });

    let mut cmd = TokioCommand::new(&ytdlp_path);
    cmd.args(["-J", "--no-playlist", "--no-warnings"]);

    // Point yt-dlp to the bundled ffmpeg if available
    if let Some(ffmpeg_dir) = resolve_ffmpeg_dir(app_handle) {
        cmd.arg("--ffmpeg-location");
        cmd.arg(ffmpeg_dir);
    }

    cmd.arg(&url);

    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }
    cmd.kill_on_drop(true);

    let output = tokio::time::timeout(std::time::Duration::from_secs(30), cmd.output())
        .await
        .context("yt-dlp timed out while fetching video info")?
        .context("Failed to run yt-dlp. Is it installed and in PATH?")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let error_msg = stderr
            .lines()
            .find(|line| line.contains("ERROR"))
            .unwrap_or("yt-dlp failed to fetch video information.")
            .trim();
        bail!("{error_msg}");
    }

    let json: Value =
        serde_json::from_slice(&output.stdout).context("Failed to parse yt-dlp JSON output")?;

    parse_video_info(&json)
}

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

/// Parse the JSON output from yt-dlp -J into our structured type.
fn parse_video_info(json: &Value) -> anyhow::Result<YtdlpVideoInfo> {
    let title = json["title"]
        .as_str()
        .unwrap_or("Unknown Title")
        .to_string();

    let formats = json["formats"]
        .as_array()
        .map(|arr| arr.iter().filter_map(parse_format_info).collect())
        .unwrap_or_default();

    Ok(YtdlpVideoInfo {
        title,
        uploader: json["uploader"].as_str().map(ToOwned::to_owned),
        duration: json["duration"].as_f64(),
        duration_string: json["duration_string"].as_str().map(ToOwned::to_owned),
        thumbnail: json["thumbnail"].as_str().map(ToOwned::to_owned),
        webpage_url: json["webpage_url"].as_str().map(ToOwned::to_owned),
        description: json["description"]
            .as_str()
            .map(|d| d.chars().take(300).collect()),
        view_count: json["view_count"].as_u64(),
        upload_date: json["upload_date"].as_str().map(ToOwned::to_owned),
        formats,
        is_playlist: json["_type"].as_str() == Some("playlist"),
        playlist_count: json["playlist_count"].as_u64(),
    })
}

/// Parse a single format entry from yt-dlp JSON.
fn parse_format_info(format: &Value) -> Option<YtdlpFormatInfo> {
    let format_id = format["format_id"].as_str()?.to_string();
    let extension = format["ext"].as_str().unwrap_or("unknown").to_string();
    let vcodec = format["vcodec"].as_str().map(ToOwned::to_owned);
    let acodec = format["acodec"].as_str().map(ToOwned::to_owned);

    let has_video = vcodec.as_deref().map(|v| v != "none").unwrap_or(false);
    let has_audio = acodec.as_deref().map(|a| a != "none").unwrap_or(false);

    Some(YtdlpFormatInfo {
        format_id,
        extension,
        resolution: format["resolution"].as_str().map(ToOwned::to_owned),
        fps: format["fps"].as_f64(),
        filesize: format["filesize"].as_u64(),
        filesize_approx: format["filesize_approx"].as_u64(),
        vcodec,
        acodec,
        abr: format["abr"].as_f64(),
        vbr: format["vbr"].as_f64(),
        format_note: format["format_note"].as_str().map(ToOwned::to_owned),
        has_video,
        has_audio,
    })
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/// Start a yt-dlp download, streaming progress events to the frontend.
pub async fn start_ytdlp_download_payload(
    window: tauri::Window,
    state: tauri::State<'_, YtdlpState>,
    options: YtdlpDownloadOptions,
) -> anyhow::Result<YtdlpDownloadResult> {
    validate_url(&options.url)?;
    validate_output_folder(&options.output_folder)?;

    let download_id = options.download_id.clone();
    let app_handle = window.app_handle().clone();
    let window_label = window.label().to_string();

    let ytdlp_path = resolve_tool_path(&app_handle, if cfg!(target_os = "windows") { "yt-dlp.exe" } else { "yt-dlp" });
    let ffmpeg_dir = resolve_ffmpeg_dir(&app_handle);

    // Build the yt-dlp command arguments
    let args = build_download_args(&options, ffmpeg_dir.as_deref());

    let mut cmd = TokioCommand::new(&ytdlp_path);
    cmd.args(&args);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }
    cmd.kill_on_drop(true);

    // Emit initial progress
    emit_ytdlp_progress(
        &app_handle,
        &window_label,
        &download_id,
        "downloading",
        0.0,
        None,
        None,
        None,
        None,
        "Starting download...",
    )?;

    let mut child = cmd.spawn().context(
        "Failed to start yt-dlp. Make sure yt-dlp is bundled or available in PATH.",
    )?;

    // Take stdout/stderr before moving child into state
    let child_stdout = child.stdout.take();
    let child_stderr = child.stderr.take();

    {
        let mut downloads = state.active_downloads.lock().await;
        downloads.insert(download_id.clone(), child);
    }

    let progress_regex = Regex::new(
        r"\[download\]\s+(\d+\.?\d*)%\s+of\s+~?\s*(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)",
    )
    .unwrap();

    let progress_simple_regex =
        Regex::new(r"\[download\]\s+(\d+\.?\d*)%\s+of\s+~?\s*(\S+)").unwrap();

    // Read stdout for progress
    let dl_id_stdout = download_id.clone();
    let ah_stdout = app_handle.clone();
    let wl_stdout = window_label.clone();
    let progress_regex_clone = progress_regex.clone();
    let progress_simple_clone = progress_simple_regex.clone();

    let stdout_task = tokio::spawn(async move {
        if let Some(stdout) = child_stdout {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(caps) = progress_regex_clone.captures(&line) {
                    let percent: f64 = caps[1].parse().unwrap_or(0.0);
                    let total = Some(caps[2].to_string());
                    let speed = Some(caps[3].to_string());
                    let eta = Some(caps[4].to_string());

                    let _ = emit_ytdlp_progress(
                        &ah_stdout,
                        &wl_stdout,
                        &dl_id_stdout,
                        "downloading",
                        percent,
                        speed.as_deref(),
                        eta.as_deref(),
                        None,
                        total.as_deref(),
                        &line,
                    );
                } else if let Some(caps) = progress_simple_clone.captures(&line) {
                    let percent: f64 = caps[1].parse().unwrap_or(0.0);
                    let total = Some(caps[2].to_string());

                    let _ = emit_ytdlp_progress(
                        &ah_stdout,
                        &wl_stdout,
                        &dl_id_stdout,
                        "downloading",
                        percent,
                        None,
                        None,
                        None,
                        total.as_deref(),
                        &line,
                    );
                } else if !line.trim().is_empty() {
                    let _ = emit_ytdlp_progress(
                        &ah_stdout,
                        &wl_stdout,
                        &dl_id_stdout,
                        "downloading",
                        -1.0,
                        None,
                        None,
                        None,
                        None,
                        &line,
                    );
                }
            }
        }
    });

    // Read stderr for errors/info
    let dl_id_stderr = download_id.clone();
    let ah_stderr = app_handle.clone();
    let wl_stderr = window_label.clone();

    let stderr_task = tokio::spawn(async move {
        let mut error_lines = Vec::new();
        if let Some(stderr) = child_stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    error_lines.push(line.clone());
                    let _ = emit_ytdlp_progress(
                        &ah_stderr,
                        &wl_stderr,
                        &dl_id_stderr,
                        "downloading",
                        -1.0,
                        None,
                        None,
                        None,
                        None,
                        &line,
                    );
                }
            }
        }
        error_lines
    });

    // Wait for both readers to finish
    let _ = stdout_task.await;
    let error_lines = stderr_task.await.unwrap_or_default();

    // Wait for the child process to exit
    let exit_status = {
        let mut downloads = state.active_downloads.lock().await;
        if let Some(mut child) = downloads.remove(&download_id) {
            child.wait().await.ok()
        } else {
            // Process was already removed (cancelled)
            emit_ytdlp_progress(
                &app_handle,
                &window_label,
                &download_id,
                "cancelled",
                0.0,
                None,
                None,
                None,
                None,
                "Download cancelled.",
            )?;

            return Ok(YtdlpDownloadResult {
                download_id,
                status: "cancelled".into(),
                output_path: None,
                message: "Download was cancelled.".into(),
            });
        }
    };

    let success = exit_status.map(|s| s.success()).unwrap_or(false);

    if success {
        emit_ytdlp_progress(
            &app_handle,
            &window_label,
            &download_id,
            "completed",
            100.0,
            None,
            None,
            None,
            None,
            "Download completed successfully.",
        )?;

        Ok(YtdlpDownloadResult {
            download_id,
            status: "completed".into(),
            output_path: Some(options.output_folder),
            message: "Download completed successfully.".into(),
        })
    } else {
        let error_summary = error_lines
            .iter()
            .find(|line| line.contains("ERROR"))
            .cloned()
            .unwrap_or_else(|| "yt-dlp download failed.".into());

        emit_ytdlp_progress(
            &app_handle,
            &window_label,
            &download_id,
            "failed",
            0.0,
            None,
            None,
            None,
            None,
            &error_summary,
        )?;

        Ok(YtdlpDownloadResult {
            download_id,
            status: "failed".into(),
            output_path: None,
            message: error_summary,
        })
    }
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

/// Cancel an active yt-dlp download by killing the child process.
pub async fn cancel_ytdlp_download_payload(
    state: tauri::State<'_, YtdlpState>,
    download_id: String,
) -> anyhow::Result<()> {
    let mut downloads = state.active_downloads.lock().await;

    if let Some(mut child) = downloads.remove(&download_id) {
        let _ = child.kill().await;
        Ok(())
    } else {
        bail!("No active download found with ID: {download_id}")
    }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/// Run `yt-dlp -U` to self-update the bundled yt-dlp executable.
pub async fn update_ytdlp_payload(
    app_handle: &tauri::AppHandle,
) -> anyhow::Result<YtdlpUpdateResult> {
    let ytdlp_path = resolve_tool_path(
        app_handle,
        if cfg!(target_os = "windows") { "yt-dlp.exe" } else { "yt-dlp" },
    );

    // Get current version before update
    let old_version = run_tool_version(&ytdlp_path, "--version").await.ok();

    let mut cmd = TokioCommand::new(&ytdlp_path);
    cmd.arg("-U");
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }
    cmd.kill_on_drop(true);

    let output = tokio::time::timeout(std::time::Duration::from_secs(120), cmd.output())
        .await
        .context("yt-dlp update timed out after 120 seconds")?
        .context("Failed to run yt-dlp -U")?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{stdout}\n{stderr}").trim().to_string();

    if !output.status.success() {
        return Ok(YtdlpUpdateResult {
            success: false,
            old_version: old_version.clone(),
            new_version: old_version,
            message: if combined.is_empty() {
                "yt-dlp update failed.".into()
            } else {
                combined
            },
        });
    }

    // Get new version after update
    let new_version = run_tool_version(&ytdlp_path, "--version").await.ok();

    let already_latest = combined.contains("is up to date")
        || combined.contains("already")
        || old_version == new_version;

    let message = if already_latest {
        format!(
            "yt-dlp is already up to date ({})",
            new_version.as_deref().unwrap_or("unknown")
        )
    } else {
        format!(
            "Updated from {} to {}",
            old_version.as_deref().unwrap_or("unknown"),
            new_version.as_deref().unwrap_or("unknown")
        )
    };

    Ok(YtdlpUpdateResult {
        success: true,
        old_version,
        new_version,
        message,
    })
}

// ---------------------------------------------------------------------------
// Argument building
// ---------------------------------------------------------------------------

/// Build yt-dlp command arguments from download options.
fn build_download_args(
    options: &YtdlpDownloadOptions,
    ffmpeg_dir: Option<&std::path::Path>,
) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    // Progress output options
    args.push("--newline".into());
    args.push("--progress".into());
    args.push("--no-color".into());
    args.push("--no-playlist".into());

    // Point yt-dlp to the bundled ffmpeg directory
    if let Some(dir) = ffmpeg_dir {
        args.push("--ffmpeg-location".into());
        args.push(dir.to_string_lossy().into_owned());
    }

    // Output template
    let output_template = format!(
        "{}/{}",
        options.output_folder.trim_end_matches(['/', '\\']),
        options.filename_template
    );
    args.push("-o".into());
    args.push(output_template);

    match options.download_type.as_str() {
        "audio" => {
            args.push("-x".into());
            if let Some(ref audio_fmt) = options.audio_format {
                args.push("--audio-format".into());
                args.push(audio_fmt.clone());
            }
        }
        _ => {
            // Video mode
            let container = options.video_format.as_deref();
            let format_selector = build_video_format_selector(
                options.video_quality.as_deref(),
                container,
            );
            args.push("-f".into());
            args.push(format_selector);

            if let Some(ref vfmt) = options.video_format {
                match vfmt.as_str() {
                    "mp4" | "mkv" | "webm" => {
                        args.push("--merge-output-format".into());
                        args.push(vfmt.clone());
                    }
                    _ => {}
                }

                // For MP4: re-encode audio to AAC to avoid Opus-in-MP4
                // which most players (Windows Media Player) can't handle.
                // Video stream is copied as-is (no re-encoding).
                if vfmt == "mp4" {
                    args.push("--postprocessor-args".into());
                    args.push("ffmpeg:-c:v copy -c:a aac -b:a 192k".into());
                }
            }
        }
    }

    // URL must be the last argument
    args.push(options.url.clone());

    args
}

/// Build the -f format selector based on quality and container preferences.
fn build_video_format_selector(quality: Option<&str>, container: Option<&str>) -> String {
    let is_mp4 = container == Some("mp4");

    match (quality, is_mp4) {
        // MP4 container: prefer h264 video + m4a (AAC) audio for best compatibility
        (Some("best") | None, true) => {
            "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best".into()
        }
        (Some(height), true) => {
            format!(
                "bestvideo[height<={height}][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best[height<={height}]/best"
            )
        }
        // Non-MP4 containers (MKV, WebM): any codec works
        (Some("best") | None, false) => "bestvideo+bestaudio/best".into(),
        (Some(height), false) => {
            format!("bestvideo[height<={height}]+bestaudio/best[height<={height}]/best")
        }
    }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/// Validate that the URL looks reasonable (not empty, starts with http/https).
fn validate_url(url: &str) -> anyhow::Result<()> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        bail!("URL cannot be empty.");
    }
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        bail!("URL must start with http:// or https://");
    }
    if trimmed.len() < 10 {
        bail!("URL appears to be too short to be valid.");
    }
    Ok(())
}

/// Validate that the output folder exists and is a directory.
fn validate_output_folder(path: &str) -> anyhow::Result<()> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        bail!("Output folder cannot be empty. Please select an output folder.");
    }
    let folder = std::path::Path::new(trimmed);
    if !folder.exists() {
        bail!("Output folder does not exist: {}", folder.display());
    }
    if !folder.is_dir() {
        bail!("Output path is not a directory: {}", folder.display());
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Progress events
// ---------------------------------------------------------------------------

/// Emit a progress event to the frontend.
fn emit_ytdlp_progress(
    app_handle: &tauri::AppHandle,
    window_label: &str,
    download_id: &str,
    status: &str,
    progress_percent: f64,
    speed: Option<&str>,
    eta: Option<&str>,
    downloaded_size: Option<&str>,
    total_size: Option<&str>,
    message: &str,
) -> anyhow::Result<()> {
    let payload = YtdlpProgressPayload {
        download_id: download_id.into(),
        status: status.into(),
        progress_percent,
        speed: speed.map(ToOwned::to_owned),
        eta: eta.map(ToOwned::to_owned),
        downloaded_size: downloaded_size.map(ToOwned::to_owned),
        total_size: total_size.map(ToOwned::to_owned),
        message: message.into(),
    };

    app_handle
        .emit_to(window_label, YTDLP_PROGRESS_EVENT, payload)
        .map_err(|error| anyhow!("Failed to emit ytdlp progress event: {error}"))?;

    Ok(())
}
