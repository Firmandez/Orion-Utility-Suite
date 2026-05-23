export type HashAlgorithm = "md5" | "sha1" | "sha256";
export type HashCheckerStatus = "idle" | "loading" | "ready" | "error";

export interface HashCompareState {
  status: "idle" | "match" | "not-match";
  normalizedInput: string;
  matchedAlgorithm?: HashAlgorithm;
  matches: Record<HashAlgorithm, boolean>;
}
