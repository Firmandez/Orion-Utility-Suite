import {
  ClipboardCopy,
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
import type { AppBootstrapState } from "@/types/app";
import { PdfQueueDropZone } from "./PdfQueueDropZone";
import { PdfResultFileList } from "./PdfResultFileList";
import type { PdfToolOperation } from "./pdf-tools.types";
import {
  buildResultRows,
  getAcceptedExtensions,
  getQueueDescription,
  pdfOperationOptions,
} from "./pdf-tools.utils";
import { usePdfTools } from "./usePdfTools";

export function PdfToolsWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const { defaultOutputFolder } = useShell();
  const {
    operation,
    files,
    outputFolderPath,
    outputFolderSource,
    outputFileName,
    outputPathPreview,
    status,
    progressPercent,
    progressStatus,
    currentItemName,
    isWindowDragActive,
    result,
    errorMessage,
    isDesktopRuntime,
    pickFiles,
    pickOutputFolder,
    setOperation,
    removeFile,
    moveFileUp,
    moveFileDown,
    clearQueue,
    setOutputFileName,
    normalizeOutputFile,
    copyPath,
    copyResultSummary,
    runOperation,
  } = usePdfTools(bootstrap, defaultOutputFolder);

  const resultRows = buildResultRows(result);

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
        <PageSection title="Document Queue" description={getQueueDescription(operation)}>
          <PdfQueueDropZone
            operation={operation}
            files={files}
            isDragActive={isWindowDragActive}
            disabled={status === "loading"}
            onPick={pickFiles}
            onClear={clearQueue}
            onRemove={removeFile}
            onMoveUp={moveFileUp}
            onMoveDown={moveFileDown}
          />
        </PageSection>

        <PageSection
          title="Operation Settings"
          description="Choose the PDF operation, output folder, and output filename when needed."
          actions={
            <Button
              variant="outline"
              leadingIcon={FolderSearch2}
              onClick={pickOutputFolder}
              disabled={!isDesktopRuntime || status === "loading"}
            >
              {outputFolderSource === "default" ? "Choose custom folder" : "Choose output folder"}
            </Button>
          }
        >
          <div className="space-y-4">
            <Select
              label="PDF operation"
              hint="Merge and image-to-PDF create one output file. Split and PDF to Image use an output folder."
              options={pdfOperationOptions}
              value={operation}
              onChange={(event) => setOperation(event.target.value as PdfToolOperation)}
            />

            <Input
              label="Output folder"
              hint={
                outputFolderSource === "default"
                  ? "Orion is currently using the default output folder from Settings. Choose a new folder to override it for this operation."
                  : "This folder is used for merge, split, image-to-PDF, or PDF to Image results."
              }
              placeholder="Choose output folder..."
              value={outputFolderPath ?? ""}
              readOnly
            />

            {operation === "merge" || operation === "image-to-pdf" ? (
              <Input
                label="Output filename"
                hint="The filename will be cleaned of invalid characters and must end with .pdf."
                placeholder="Example: merged.pdf"
                value={outputFileName}
                onChange={(event) => setOutputFileName(event.target.value)}
                onBlur={normalizeOutputFile}
              />
            ) : null}

            <Input
              label="Output preview"
              hint="Result location based on the folder and filename you selected."
              value={outputPathPreview}
              readOnly
            />

            <div className="rounded-xl border bg-black/10 p-3 text-sm leading-5 text-(--text-secondary)]">
              Accepted files for this operation:{" "}
              <span className="font-mono text-(--text-primary)]">{getAcceptedExtensions(operation).join(", ").toUpperCase()}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                leadingIcon={Sparkles}
                onClick={runOperation}
                loading={status === "loading"}
                disabled={!isDesktopRuntime}
              >
                Run PDF operation
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

      <PageSection title="Progress & Summary" description="Track PDF processing and review the latest result summary.">
        <div className="space-y-5">
          <ProgressBar
            label={currentItemName ? `${progressStatus} - ${currentItemName}` : progressStatus}
            value={progressPercent}
            tone={status === "error" ? "amber" : "cyan"}
          />

          {errorMessage ? <ErrorBanner title="PDF operation failed" message={errorMessage} /> : null}


          {resultRows.length > 0 ? (
            <ResultCard
              title="Operation Summary"
              description="Latest result summary for the active PDF operation."
              rows={resultRows}
              footer={
                <Button variant="outline" leadingIcon={ClipboardCopy} onClick={copyResultSummary}>
                  Copy summary
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Gauge}
              title="No operation results yet"
              description="Set up the queue and output folder first, then run a PDF operation to see progress and results."
            />
          )}
        </div>
      </PageSection>

      <PageSection
        title="File Output"
        description="Output files are grouped by operation so paths are easy to copy, especially for split results."
      >
        <PdfResultFileList result={result} onCopyPath={copyPath} />
      </PageSection>
    </div>
  );
}
