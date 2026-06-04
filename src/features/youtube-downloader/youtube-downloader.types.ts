export type DownloadType = "video" | "audio";
export type VideoQuality = "best" | "2160" | "1440" | "1080" | "720" | "480" | "360";
export type VideoContainer = "mp4" | "webm" | "mkv";
export type AudioContainer = "mp3" | "m4a" | "opus" | "wav";

export const YTDLP_PROGRESS_EVENT = "ytdlp-download-progress";
export const DEFAULT_FILENAME_TEMPLATE = "%(title)s.%(ext)s";

export const VIDEO_QUALITY_OPTIONS = [
  { value: "best", label: "Best available" },
  { value: "2160", label: "4K (2160p)" },
  { value: "1440", label: "QHD (1440p)" },
  { value: "1080", label: "Full HD (1080p)" },
  { value: "720", label: "HD (720p)" },
  { value: "480", label: "SD (480p)" },
  { value: "360", label: "Low (360p)" },
] as const;

export const VIDEO_FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4" },
  { value: "webm", label: "WebM" },
  { value: "mkv", label: "MKV" },
] as const;

export const AUDIO_FORMAT_OPTIONS = [
  { value: "mp3", label: "MP3" },
  { value: "m4a", label: "M4A" },
  { value: "opus", label: "Opus" },
  { value: "wav", label: "WAV" },
] as const;
