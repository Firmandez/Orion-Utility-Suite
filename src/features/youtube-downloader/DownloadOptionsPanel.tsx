import { FolderOpen } from "lucide-react";
import { PageSection } from "@/components/common/PageSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { DownloadType, VideoQuality, VideoContainer, AudioContainer } from "./youtube-downloader.types";
import {
  VIDEO_QUALITY_OPTIONS,
  VIDEO_FORMAT_OPTIONS,
  AUDIO_FORMAT_OPTIONS,
} from "./youtube-downloader.types";

interface DownloadOptionsPanelProps {
  downloadType: DownloadType;
  videoQuality: VideoQuality;
  videoFormat: VideoContainer;
  audioFormat: AudioContainer;
  outputFolder: string;
  filenameTemplate: string;
  disabled: boolean;
  onDownloadTypeChange: (value: DownloadType) => void;
  onVideoQualityChange: (value: VideoQuality) => void;
  onVideoFormatChange: (value: VideoContainer) => void;
  onAudioFormatChange: (value: AudioContainer) => void;
  onFilenameTemplateChange: (value: string) => void;
  onPickFolder: () => void;
}

const downloadTypeOptions = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio only" },
];

export function DownloadOptionsPanel({
  downloadType,
  videoQuality,
  videoFormat,
  audioFormat,
  outputFolder,
  filenameTemplate,
  disabled,
  onDownloadTypeChange,
  onVideoQualityChange,
  onVideoFormatChange,
  onAudioFormatChange,
  onFilenameTemplateChange,
  onPickFolder,
}: DownloadOptionsPanelProps) {
  return (
    <PageSection title="Download Options" description="Configure format, quality, and output settings.">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Download type"
            options={downloadTypeOptions}
            value={downloadType}
            onChange={(e) => onDownloadTypeChange(e.target.value as DownloadType)}
            disabled={disabled}
          />

          {downloadType === "video" ? (
            <>
              <Select
                label="Quality"
                options={[...VIDEO_QUALITY_OPTIONS]}
                value={videoQuality}
                onChange={(e) => onVideoQualityChange(e.target.value as VideoQuality)}
                disabled={disabled}
              />
              <Select
                label="Format"
                options={[...VIDEO_FORMAT_OPTIONS]}
                value={videoFormat}
                onChange={(e) => onVideoFormatChange(e.target.value as VideoContainer)}
                disabled={disabled}
              />
            </>
          ) : (
            <Select
              label="Audio format"
              options={[...AUDIO_FORMAT_OPTIONS]}
              value={audioFormat}
              onChange={(e) => onAudioFormatChange(e.target.value as AudioContainer)}
              disabled={disabled}
            />
          )}
        </div>

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label="Output folder"
              placeholder="Select output folder..."
              value={outputFolder}
              readOnly
            />
          </div>
          <Button
            variant="secondary"
            leadingIcon={FolderOpen}
            onClick={onPickFolder}
            disabled={disabled}
          >
            Browse
          </Button>
        </div>

        <Input
          label="Filename template"
          hint="Use yt-dlp template variables like %(title)s, %(ext)s, %(id)s"
          placeholder="%(title)s.%(ext)s"
          value={filenameTemplate}
          onChange={(e) => onFilenameTemplateChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    </PageSection>
  );
}
