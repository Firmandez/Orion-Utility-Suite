import type { HashResultResponse } from "@/types/app";
import type { HashCompareState } from "./hash-checker.types";

export const HASH_PROGRESS_EVENT = "hash-progress";

export function getBaseName(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

export function normalizeHashInput(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function compareReferenceHash(referenceHash: string, result?: HashResultResponse): HashCompareState {
  const normalizedInput = normalizeHashInput(referenceHash);

  if (!normalizedInput || !result) {
    return {
      status: "idle",
      normalizedInput,
      matches: { md5: false, sha1: false, sha256: false },
    };
  }

  const matches = {
    md5: normalizedInput === result.md5.toLowerCase(),
    sha1: normalizedInput === result.sha1.toLowerCase(),
    sha256: normalizedInput === result.sha256.toLowerCase(),
  };

  const matchedAlgorithm = (Object.entries(matches).find(([, value]) => value)?.[0] ?? undefined) as
    | "md5"
    | "sha1"
    | "sha256"
    | undefined;

  return {
    status: matchedAlgorithm ? "match" : "not-match",
    normalizedInput,
    matchedAlgorithm,
    matches,
  };
}

export function describeComparison(compareState: HashCompareState) {
  if (compareState.status === "idle") {
    return "Masukkan hash pembanding untuk mengecek match.";
  }

  if (compareState.status === "match" && compareState.matchedAlgorithm) {
    return `Reference hash cocok dengan ${compareState.matchedAlgorithm.toUpperCase()}.`;
  }

  return "Reference hash tidak cocok dengan MD5, SHA1, maupun SHA256 hasil file ini.";
}
