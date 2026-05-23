import type { ResultRow } from "@/types/app";

export type TextUtilityCategory = "JSON" | "Encoding" | "Text Transform" | "Metrics";

export type TextUtilityOperationId =
  | "json-format"
  | "json-minify"
  | "json-validate"
  | "base64-encode"
  | "base64-decode"
  | "url-encode"
  | "url-decode"
  | "uppercase"
  | "lowercase"
  | "title-case"
  | "remove-extra-spaces"
  | "slug-generator"
  | "character-counter"
  | "word-counter";

export interface TextUtilityOperationDefinition {
  id: TextUtilityOperationId;
  label: string;
  description: string;
  category: TextUtilityCategory;
  swapTo?: TextUtilityOperationId;
  outputLabel: string;
}

export interface TextTransformSummary {
  inputCharacters: number;
  inputWords: number;
  outputCharacters: number;
  outputWords: number;
}

export interface TextTransformResult {
  output: string;
  errorMessage?: string;
  statusLabel: string;
  detailRows: ResultRow[];
  summary: TextTransformSummary;
}
