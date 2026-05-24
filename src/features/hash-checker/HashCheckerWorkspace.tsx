import {
  FolderSearch2,
  Gauge,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { PageSection } from "@/components/common/PageSection";
import { ResultCard } from "@/components/common/ResultCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { truncateMiddle } from "@/lib/utils";
import type { AppBootstrapState } from "@/types/app";
import { HashDigestCard } from "./HashDigestCard";
import { HashFileDropZone } from "./HashFileDropZone";
import { useHashChecker } from "./useHashChecker";
import { compareReferenceHash } from "./hash-checker.utils";

export function HashCheckerWorkspace() {
  const bootstrap = useOutletContext<AppBootstrapState>();
  const {
    selectedFileName,
    selectedFilePath,
    referenceHash,
    result,
    status,
    progressPercent,
    progressStatus,
    isWindowDragActive,
    errorMessage,
    isDesktopRuntime,
    pickFile,
    clearSelection,
    setReferenceHash,
    runHash,
    copyHashValue,
  } = useHashChecker(bootstrap);

  const compareState = compareReferenceHash(referenceHash, result);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PageSection
          title="Source File"
          description="Choose a file from your device, then generate MD5, SHA1, and SHA256 hashes."
        >
          <div className="space-y-5">
            <HashFileDropZone
              selectedFilePath={selectedFilePath}
              selectedFileName={selectedFileName}
              isDragActive={isWindowDragActive}
              disabled={status === "loading"}
              onPick={pickFile}
              onClear={clearSelection}
            />

            <Input
              label="Reference hash"
              hint="Paste a reference hash to check whether it matches any generated file digest."
              placeholder="Enter an MD5, SHA1, or SHA256 hash..."
              value={referenceHash}
              onChange={(event) => setReferenceHash(event.target.value)}
            />

            <div className="flex flex-wrap gap-3">
              <Button leadingIcon={Sparkles} onClick={runHash} loading={status === "loading"} disabled={!selectedFilePath || !isDesktopRuntime}>
                Generate hashes
              </Button>
              <Button variant="outline" leadingIcon={FolderSearch2} onClick={pickFile} disabled={status === "loading" || !isDesktopRuntime}>
                Choose another file
              </Button>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Progress & File Info"
          description="Track progress and file information."
        >
          <div className="space-y-5">
            <ProgressBar
              label={progressStatus}
              value={progressPercent}
              tone={status === "error" ? "amber" : "cyan"}
            />

            {errorMessage ? (
              <ErrorBanner title="Hash generation failed" message={errorMessage} icon={ShieldX} />
            ) : null}

            {result ? (
              <ResultCard
                title="File Summary"
                rows={[
                  { label: "File name", value: result.fileName },
                  { label: "File size", value: `${result.fileSize.toLocaleString("en-US")} bytes`, mono: true },
                  { label: "Selected path", value: selectedFilePath ? truncateMiddle(selectedFilePath, 24, 16) : "Unavailable" },
                  { label: "Reference", value: compareState.status === "match" ? "Match" : compareState.status === "not-match" ? "No match" : "Waiting" },
                ]}
              />
            ) : (
              <EmptyState
                icon={Gauge}
                title="No hash results yet"
                description="Choose a file and run the hash generator to see digests, progress, and reference status."
              />
            )}
          </div>
        </PageSection>
      </div>

      <PageSection
        title="Generated Digests"
        description="Each digest can be copied individually and is automatically compared with the reference hash."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <HashDigestCard
            label="MD5"
            value={result?.md5}
            compareStatus={compareState.status === "idle" ? "idle" : compareState.matches.md5 ? "match" : "not-match"}
            onCopy={() => copyHashValue("MD5", result?.md5)}
          />
          <HashDigestCard
            label="SHA1"
            value={result?.sha1}
            compareStatus={compareState.status === "idle" ? "idle" : compareState.matches.sha1 ? "match" : "not-match"}
            onCopy={() => copyHashValue("SHA1", result?.sha1)}
          />
          <HashDigestCard
            label="SHA256"
            value={result?.sha256}
            compareStatus={compareState.status === "idle" ? "idle" : compareState.matches.sha256 ? "match" : "not-match"}
            onCopy={() => copyHashValue("SHA256", result?.sha256)}
          />
        </div>
      </PageSection>
    </div>
  );
}
