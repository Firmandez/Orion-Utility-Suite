import { ResultCard } from "@/components/common/ResultCard";
import type { YtdlpVideoInfo } from "@/types/app";
import { formatDuration, formatViewCount, formatUploadDate } from "./youtube-downloader.utils";

interface VideoInfoCardProps {
  info: YtdlpVideoInfo;
}

export function VideoInfoCard({ info }: VideoInfoCardProps) {
  const rows = [
    { label: "Title", value: info.title },
    ...(info.uploader ? [{ label: "Uploader", value: info.uploader }] : []),
    ...(info.duration != null ? [{ label: "Duration", value: formatDuration(info.duration) }] : []),
    ...(info.viewCount != null ? [{ label: "Views", value: formatViewCount(info.viewCount) }] : []),
    ...(info.uploadDate ? [{ label: "Uploaded", value: formatUploadDate(info.uploadDate) }] : []),
    { label: "Formats", value: `${info.formats.length} available`, mono: true },
  ];

  return <ResultCard title="Video Information" rows={rows} />;
}
