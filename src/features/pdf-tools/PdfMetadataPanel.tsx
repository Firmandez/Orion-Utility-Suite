import {
  ClipboardCopy,
  Eraser,
  FileSearch,
  FolderSearch2,
  RefreshCw,
  Save,
  FileText,
  RotateCcw,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AppBootstrapState, ResultRow } from "@/types/app";
import { usePdfMetadata } from "./usePdfMetadata";

function buildMetadataRows(
  meta?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  },
): ResultRow[] {
  if (!meta) return [];
  return [
    { label: "Title", value: meta.title || "(empty)" },
    { label: "Author", value: meta.author || "(empty)" },
    { label: "Subject", value: meta.subject || "(empty)" },
    { label: "Keywords", value: meta.keywords || "(empty)" },
    { label: "Creator", value: meta.creator || "(empty)", mono: true },
    { label: "Producer", value: meta.producer || "(empty)", mono: true },
    { label: "Created", value: meta.creationDate || "(empty)", mono: true },
    { label: "Modified", value: meta.modificationDate || "(empty)", mono: true },
  ];
}

export function PdfMetadataPanel() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const { defaultOutputFolder } = useShell();
  const {
    filePath,
    fileName,
    metadata,
    editTitle,
    editAuthor,
    editSubject,
    editKeywords,
    resolvedOutputFolder,
    outputFolderSource,
    status,
    errorMessage,
    lastSavedPath,
    isDesktopRuntime,
    isProcessing,
    pickFile,
    readMetadata,
    saveMetadataCopy,
    clearMetadata,
    pickOutputFolder,
    copyOutputPath,
    setEditTitle,
    setEditAuthor,
    setEditSubject,
    setEditKeywords,
    resetForm,
  } = usePdfMetadata(bootstrap.source === "rust", defaultOutputFolder);

  const metadataRows = buildMetadataRows(metadata);

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[1fr_1fr]">
        <PageSection
          title="Source Document"
          description="Choose a PDF to inspect and edit metadata."
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                leadingIcon={FileSearch}
                onClick={pickFile}
                disabled={!isDesktopRuntime || isProcessing}
              >
                Choose PDF
              </Button>
              <Button
                variant="ghost"
                leadingIcon={RotateCcw}
                onClick={resetForm}
                disabled={isProcessing || !filePath}
              >
                Reset
              </Button>
            </div>
          }
        >
          {filePath ? (
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 rounded-lg border bg-(--surface-2) px-3 py-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-300">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-(--text-primary)">{fileName}</div>
                  <div className="mt-0.5 break-all font-mono text-[12px] leading-4 text-(--text-muted)">
                    {filePath}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                leadingIcon={RefreshCw}
                onClick={readMetadata}
                loading={status === "reading"}
                disabled={isProcessing}
              >
                Re-read Metadata
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={FileSearch}
              title="No PDF selected"
              description="Choose a PDF to view and edit metadata."
            />
          )}
        </PageSection>

        <PageSection
          title="Current Metadata"
          description="Read-only document information preview."
        >
          {metadataRows.length > 0 ? (
            <ResultCard
              title="Document Info Dictionary"
              description={`Metadata from ${fileName || "the selected PDF"}.`}
              rows={metadataRows}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No metadata available"
              description={filePath ? "This PDF does not contain readable metadata fields." : "Select a PDF to preview its metadata."}
            />
          )}
        </PageSection>
      </div>

      <PageSection
        title="Edit Metadata"
        description="Modify fields and save a new copy."
        actions={
          <Button
            variant="outline"
            leadingIcon={FolderSearch2}
            onClick={pickOutputFolder}
            disabled={!isDesktopRuntime || isProcessing}
          >
            {outputFolderSource === "default" ? "Choose custom folder" : "Choose output folder"}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Title"
              hint="Displayed in PDF readers."
              placeholder="Enter document title..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={!filePath || isProcessing}
            />
            <Input
              label="Author"
              hint="Creator name or entity."
              placeholder="Enter author name..."
              value={editAuthor}
              onChange={(e) => setEditAuthor(e.target.value)}
              disabled={!filePath || isProcessing}
            />
            <Input
              label="Subject"
              hint="Brief topic description."
              placeholder="Enter subject..."
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              disabled={!filePath || isProcessing}
            />
            <Input
              label="Keywords"
              hint="Comma-separated search keywords."
              placeholder="e.g. report, finance, Q4"
              value={editKeywords}
              onChange={(e) => setEditKeywords(e.target.value)}
              disabled={!filePath || isProcessing}
            />
          </div>

          <Input
            label="Output folder"
            hint={
              outputFolderSource === "default"
                ? "Using the Settings default. Choose a folder to override."
                : "Saved copies are written here."
            }
            placeholder="Choose output folder..."
            value={resolvedOutputFolder}
            readOnly
          />

          {errorMessage ? <ErrorBanner title="Metadata operation failed" message={errorMessage} /> : null}

          {lastSavedPath ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/8 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-300">Last saved</div>
                <div className="mt-1 break-all font-mono text-[12px] leading-4 text-(--text-secondary)">
                  {lastSavedPath}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyOutputPath}
                aria-label="Copy output path"
                title="Copy output path"
              >
                <ClipboardCopy className="size-4" />
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              leadingIcon={Save}
              onClick={saveMetadataCopy}
              loading={status === "saving"}
              disabled={!filePath || !resolvedOutputFolder || isProcessing}
            >
              Save Metadata Copy
            </Button>
            <Button
              variant="secondary"
              leadingIcon={Eraser}
              onClick={clearMetadata}
              loading={status === "clearing"}
              disabled={!filePath || !resolvedOutputFolder || isProcessing}
            >
              Clear Metadata
            </Button>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
