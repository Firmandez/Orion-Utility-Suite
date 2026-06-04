import {
  Download,
  Link,
  Search,
  Square,
  FolderOpen,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { PageSection } from "@/components/common/PageSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AppBootstrapState } from "@/types/app";
import { DownloadOptionsPanel } from "./DownloadOptionsPanel";
import { DownloadProgressPanel } from "./DownloadProgressPanel";
import { VideoInfoCard } from "./VideoInfoCard";
import { useYoutubeDownloader } from "./useYoutubeDownloader";
import { isValidUrl } from "./youtube-downloader.utils";

export function YoutubeDownloaderWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const dl = useYoutubeDownloader(bootstrap);

  const isAnalyzing = dl.status === "analyzing";
  const isDownloading = dl.status === "downloading";
  const isCompleted = dl.status === "completed";
  const isBusy = isAnalyzing || isDownloading;
  const canAnalyze = isValidUrl(dl.url) && !isBusy && dl.availability?.ytdlpAvailable;
  const canDownload = dl.videoInfo && dl.outputFolder && !isBusy && dl.availability?.ytdlpAvailable;

  return (
    <div className="space-y-4">
      {/* Availability warnings */}
      {dl.availability && !dl.availability.ytdlpAvailable && (
        <ErrorBanner
          title="yt-dlp not found"
          message="yt-dlp was not found. Please install yt-dlp or place the executable in your system PATH."
          icon={AlertTriangle}
        />
      )}

      {dl.availability?.ytdlpAvailable && !dl.availability.ffmpegAvailable && (
        <div className="rounded-xl border border-amber-400/18 bg-amber-500/10 p-3">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-amber-300" />
            <div>
              <div className="text-sm font-semibold text-(--text-primary)">ffmpeg not found</div>
              <div className="mt-1 text-sm leading-5 text-amber-100/90">
                ffmpeg was not found. Some video merge or audio conversion features may not work.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version & Update bar */}
      {dl.availability?.ytdlpAvailable && (
        <div className="surface-panel flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
            <span>yt-dlp</span>
            <span className="rounded-md bg-(--surface-3) px-1.5 py-0.5 font-mono text-[11px] text-(--text-primary)">
              {dl.availability.ytdlpVersion ?? "unknown"}
            </span>
            {dl.availability.ffmpegAvailable && (
              <>
                <span className="text-(--text-muted)">·</span>
                <span>ffmpeg available</span>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            leadingIcon={RefreshCw}
            onClick={dl.updateYtdlp}
            loading={dl.isUpdating}
            disabled={dl.isUpdating || isDownloading}
          >
            Update yt-dlp
          </Button>
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Left column: URL + Options */}
        <div className="space-y-4">
          <PageSection title="URL Input" description="Paste a video URL and analyze it.">
            <div className="space-y-3">
              <Input
                label="Video URL"
                placeholder="https://www.youtube.com/watch?v=..."
                value={dl.url}
                onChange={(e) => dl.setUrl(e.target.value)}
                icon={Link}
                disabled={isDownloading}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  leadingIcon={Search}
                  onClick={dl.analyzeUrl}
                  loading={isAnalyzing}
                  disabled={!canAnalyze}
                >
                  Analyze URL
                </Button>
                {dl.videoInfo && !isDownloading && (
                  <Button variant="outline" leadingIcon={RotateCcw} onClick={dl.resetState}>
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </PageSection>

          {/* Download options – only show after analysis */}
          {dl.videoInfo && (
            <DownloadOptionsPanel
              downloadType={dl.downloadType}
              videoQuality={dl.videoQuality}
              videoFormat={dl.videoFormat}
              audioFormat={dl.audioFormat}
              outputFolder={dl.outputFolder}
              filenameTemplate={dl.filenameTemplate}
              disabled={isDownloading}
              onDownloadTypeChange={dl.setDownloadType}
              onVideoQualityChange={dl.setVideoQuality}
              onVideoFormatChange={dl.setVideoFormat}
              onAudioFormatChange={dl.setAudioFormat}
              onFilenameTemplateChange={dl.setFilenameTemplate}
              onPickFolder={dl.pickOutputFolder}
            />
          )}
        </div>

        {/* Right column: Info + Progress */}
        <div className="space-y-4">
          {dl.videoInfo ? (
            <PageSection title="Media Info" description="Details about the analyzed URL.">
              <VideoInfoCard info={dl.videoInfo} />
            </PageSection>
          ) : (
            <PageSection title="Media Info" description="Analyze a URL to see video details.">
              <EmptyState
                icon={Search}
                title="No media analyzed yet"
                description="Paste a URL and click Analyze to fetch video information."
              />
            </PageSection>
          )}

          {(isDownloading || isCompleted || dl.status === "failed" || dl.status === "cancelled" || dl.logLines.length > 0) && (
            <DownloadProgressPanel
              status={dl.status}
              progressPercent={dl.progressPercent}
              speed={dl.progressSpeed}
              eta={dl.progressEta}
              downloaded={dl.progressDownloaded}
              total={dl.progressTotal}
              message={dl.progressMessage}
              logLines={dl.logLines}
            />
          )}

          {dl.errorMessage && dl.status !== "checking" && (
            <ErrorBanner title="Error" message={dl.errorMessage} icon={AlertTriangle} />
          )}
        </div>
      </div>

      {/* Download controls */}
      {dl.videoInfo && (
        <PageSection title="Download Controls">
          <div className="flex flex-wrap items-center gap-2">
            {isDownloading ? (
              <Button variant="secondary" leadingIcon={Square} onClick={dl.cancelDownload}>
                Cancel Download
              </Button>
            ) : (
              <Button
                leadingIcon={Download}
                onClick={dl.startDownload}
                disabled={!canDownload}
              >
                Start Download
              </Button>
            )}

            {isCompleted && dl.outputPath && (
              <Button variant="outline" leadingIcon={FolderOpen} onClick={dl.openOutputFolder}>
                Open Output Folder
              </Button>
            )}
          </div>
        </PageSection>
      )}

      {/* Legal disclaimer */}
      <p className="text-center text-[11px] leading-4 text-(--text-muted)">
        Only download content that you own or have permission to download.
      </p>
    </div>
  );
}
