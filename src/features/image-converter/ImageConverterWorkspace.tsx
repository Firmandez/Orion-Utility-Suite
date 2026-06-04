import {
  FolderOutput,
  FolderSearch2,
  Gauge,
  Sparkles,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import type { AppBootstrapState } from "@/types/app";
import { ImageBatchDropZone } from "./ImageBatchDropZone";
import { ImageConversionResultList } from "./ImageConversionResultList";
import { imageOutputFormatOptions } from "./image-converter.utils";
import { useImageConverter } from "./useImageConverter";

export function ImageConverterWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const { defaultOutputFolder } = useShell();
  const {
    files,
    outputFolderPath,
    outputFolderSource,
    outputFormat,
    qualityInput,
    resizeEnabled,
    resizeWidth,
    resizeHeight,
    compress,
    status,
    progressPercent,
    progressStatus,
    currentFileName,
    isWindowDragActive,
    response,
    errorMessage,
    isDesktopRuntime,
    pickImages,
    pickOutputFolder,
    removeFile,
    clearQueue,
    updateOutputFormat,
    updateQualityInput,
    normalizeQualityInput,
    updateResizeEnabled,
    updateResizeWidth,
    updateResizeHeight,
    updateCompress,
    copyOutputPath,
    runConversion,
  } = useImageConverter(bootstrap, defaultOutputFolder);

  const summaryRows = response
    ? [
        { label: "Output folder", value: outputFolderPath ?? response.outputFolderPath },
        { label: "Total files", value: String(response.totalFiles), mono: true },
        { label: "Succeeded", value: String(response.successCount), mono: true },
        { label: "Failed", value: String(response.failedCount), mono: true },
      ]
    : [
        { label: "Queue size", value: String(files.length), mono: true },
        { label: "Target format", value: outputFormat.toUpperCase() },
        { label: "Resize", value: resizeEnabled ? "Enabled" : "Disabled" },
        { label: "Compression", value: compress ? "Enabled" : "Disabled" },
      ];

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="Image Queue"
          description="Add images from your device."
        >
          <ImageBatchDropZone
            files={files}
            isDragActive={isWindowDragActive}
            disabled={status === "loading"}
            onPick={pickImages}
            onClear={clearQueue}
            onRemove={removeFile}
          />
        </PageSection>

        <PageSection
          title="Conversion Settings"
          description="Set output, format, quality, resize, and compression."
          actions={
            <Button variant="outline" leadingIcon={FolderSearch2} onClick={pickOutputFolder} disabled={!isDesktopRuntime || status === "loading"}>
              {outputFolderSource === "default" ? "Choose custom folder" : "Choose output folder"}
            </Button>
          }
        >
          <div className="space-y-3">
            <Input
              label="Output folder"
              hint={
                outputFolderSource === "default"
                  ? "Using the Settings default. Choose a folder to override."
                  : "Converted files are saved here."
              }
              placeholder="Choose output folder..."
              value={outputFolderPath ?? ""}
              readOnly
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Target format"
                hint="JPG for smaller files, PNG for lossless output."
                options={imageOutputFormatOptions}
                value={outputFormat}
                onChange={(event) => updateOutputFormat(event.target.value as "jpg" | "png")}
              />
              <Input
                label="JPG quality"
                hint="1-100. Used only for JPG."
                inputMode="numeric"
                value={qualityInput}
                onChange={(event) => updateQualityInput(event.target.value)}
                onBlur={normalizeQualityInput}
                disabled={outputFormat !== "jpg"}
              />
            </div>

            <Toggle
              label="Enable resize"
                hint="Limit width or height while preserving aspect ratio."
              checked={resizeEnabled}
              onCheckedChange={updateResizeEnabled}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Resize width"
                hint="Leave empty to use height only."
                inputMode="numeric"
                placeholder="e.g. 1600"
                value={resizeWidth}
                onChange={(event) => updateResizeWidth(event.target.value)}
                disabled={!resizeEnabled}
              />
              <Input
                label="Resize height"
                hint="Leave empty to use width only."
                inputMode="numeric"
                placeholder="e.g. 1200"
                value={resizeHeight}
                onChange={(event) => updateResizeHeight(event.target.value)}
                disabled={!resizeEnabled}
              />
            </div>

            <Toggle
              label="Enable compression"
              hint="PNG uses stronger compression; JPG follows quality."
              checked={compress}
              onCheckedChange={updateCompress}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                leadingIcon={Sparkles}
                onClick={runConversion}
                loading={status === "loading"}
                disabled={!isDesktopRuntime}
              >
                Run conversion
              </Button>
              <Button
                variant="secondary"
                leadingIcon={FolderOutput}
                onClick={pickOutputFolder}
                disabled={!isDesktopRuntime || status === "loading"}
              >
                Change output folder
              </Button>
            </div>
          </div>
        </PageSection>
      </div>

      <PageSection
        title="Progress"
        description="Conversion progress and batch summary."
      >
        <div className="space-y-3">
          <ProgressBar
            label={currentFileName ? `${progressStatus} - ${currentFileName}` : progressStatus}
            value={progressPercent}
            tone={status === "error" ? "amber" : "teal"}
          />

          {errorMessage ? (
            <ErrorBanner title="Conversion needs review" message={errorMessage} />
          ) : null}

          {response ? (
            <ResultCard
              title="Batch Summary"
              description="Summary of the last conversion run."
              rows={summaryRows}
            />
          ) : (
            <EmptyState
              icon={Gauge}
              title="No batch has been run yet"
              description="Run conversion to see progress and results."
            />
          )}
        </div>
      </PageSection>

      <PageSection
        title="Per-file Results"
        description="Review per-file status and output paths."
      >
        <ImageConversionResultList
          results={response?.results ?? []}
          onCopyOutputPath={copyOutputPath}
        />
      </PageSection>
    </div>
  );
}
