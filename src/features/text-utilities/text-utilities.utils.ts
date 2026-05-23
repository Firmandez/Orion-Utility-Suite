import { copyText as copyTextToClipboard } from "@/lib/clipboard";
import type { ResultRow, SelectOption } from "@/types/app";
import type {
  TextTransformResult,
  TextUtilityOperationDefinition,
  TextUtilityOperationId,
} from "./text-utilities.types";

export const textUtilityOperations: TextUtilityOperationDefinition[] = [
  {
    id: "json-format",
    label: "JSON Formatter",
    description: "Indent JSON agar lebih rapi dibaca atau diinspeksi.",
    category: "JSON",
    outputLabel: "Formatted JSON",
  },
  {
    id: "json-minify",
    label: "JSON Minifier",
    description: "Hapus whitespace JSON yang tidak diperlukan.",
    category: "JSON",
    outputLabel: "Minified JSON",
  },
  {
    id: "json-validate",
    label: "JSON Validator",
    description: "Validasi apakah payload JSON bisa diparse dengan aman.",
    category: "JSON",
    outputLabel: "Validation Result",
  },
  {
    id: "base64-encode",
    label: "Base64 Encode",
    description: "Encode teks Unicode ke Base64 secara aman.",
    category: "Encoding",
    outputLabel: "Base64 Result",
    swapTo: "base64-decode",
  },
  {
    id: "base64-decode",
    label: "Base64 Decode",
    description: "Decode Base64 kembali ke teks asli.",
    category: "Encoding",
    outputLabel: "Decoded Text",
    swapTo: "base64-encode",
  },
  {
    id: "url-encode",
    label: "URL Encode",
    description: "Escape karakter agar aman dipakai di URL atau query string.",
    category: "Encoding",
    outputLabel: "Encoded URL",
    swapTo: "url-decode",
  },
  {
    id: "url-decode",
    label: "URL Decode",
    description: "Kembalikan string URL-encoded menjadi teks biasa.",
    category: "Encoding",
    outputLabel: "Decoded URL",
    swapTo: "url-encode",
  },
  {
    id: "uppercase",
    label: "Uppercase",
    description: "Ubah semua huruf menjadi kapital.",
    category: "Text Transform",
    outputLabel: "Uppercase Text",
  },
  {
    id: "lowercase",
    label: "Lowercase",
    description: "Ubah semua huruf menjadi huruf kecil.",
    category: "Text Transform",
    outputLabel: "Lowercase Text",
  },
  {
    id: "title-case",
    label: "Title Case",
    description: "Kapitalisasi awal kata untuk judul atau label.",
    category: "Text Transform",
    outputLabel: "Title Case Text",
  },
  {
    id: "remove-extra-spaces",
    label: "Remove Extra Spaces",
    description: "Rapikan spasi berlebih dan trim ujung teks.",
    category: "Text Transform",
    outputLabel: "Normalized Text",
  },
  {
    id: "slug-generator",
    label: "Slug Generator",
    description: "Buat slug URL-friendly dari teks bebas.",
    category: "Text Transform",
    outputLabel: "Slug Result",
  },
  {
    id: "character-counter",
    label: "Character Counter",
    description: "Hitung total karakter input, termasuk Unicode.",
    category: "Metrics",
    outputLabel: "Character Count",
  },
  {
    id: "word-counter",
    label: "Word Counter",
    description: "Hitung jumlah kata dari input aktif.",
    category: "Metrics",
    outputLabel: "Word Count",
  },
];

export const textUtilityOperationOptions: SelectOption[] = textUtilityOperations.map((operation) => ({
  value: operation.id,
  label: operation.label,
}));

export const defaultTextUtilityOperation: TextUtilityOperationId = "json-format";

export function getTextUtilityOperation(operationId: TextUtilityOperationId) {
  const operation = textUtilityOperations.find((item) => item.id === operationId);

  if (!operation) {
    throw new Error(`Unknown text utility operation: ${operationId}`);
  }

  return operation;
}

export function groupTextUtilityOperations() {
  return textUtilityOperations.reduce<Record<string, TextUtilityOperationDefinition[]>>((groups, operation) => {
    if (!groups[operation.category]) {
      groups[operation.category] = [];
    }

    groups[operation.category].push(operation);
    return groups;
  }, {});
}

export function transformText(input: string, operationId: TextUtilityOperationId): TextTransformResult {
  const operation = getTextUtilityOperation(operationId);
  const inputCharacters = countCharacters(input);
  const inputWords = countWords(input);
  let output = "";
  let errorMessage: string | undefined;
  let statusLabel = "Ready";
  let detailRows: ResultRow[] = [];

  if (inputCharacters === 0) {
    if (operationId === "character-counter" || operationId === "word-counter") {
      output = "0";
      statusLabel = "Counted";
      detailRows = [
        { label: "Characters", value: "0", mono: true },
        { label: "Words", value: "0", mono: true },
        { label: "Lines", value: "0", mono: true },
      ];
    } else {
      statusLabel = "Waiting for input";
      detailRows = [
        { label: "Operation", value: operation.label },
        { label: "Input chars", value: "0", mono: true },
        { label: "Input words", value: "0", mono: true },
      ];
    }

    const outputCharacters = countCharacters(output);
    const outputWords = countWords(output);

    return {
      output,
      statusLabel,
      detailRows,
      summary: {
        inputCharacters,
        inputWords,
        outputCharacters,
        outputWords,
      },
    };
  }

  try {
    switch (operationId) {
      case "json-format": {
        output = JSON.stringify(parseJsonInput(input), null, 2);
        statusLabel = "Formatted";
        detailRows = buildJsonRows(output);
        break;
      }
      case "json-minify": {
        output = JSON.stringify(parseJsonInput(input));
        statusLabel = "Minified";
        detailRows = buildJsonRows(output);
        break;
      }
      case "json-validate": {
        const parsed = parseJsonInput(input);
        output = "Valid JSON";
        statusLabel = "Valid";
        detailRows = [
          { label: "Root type", value: describeJsonRoot(parsed) },
          { label: "Characters", value: String(inputCharacters), mono: true },
          { label: "Words", value: String(inputWords), mono: true },
        ];
        break;
      }
      case "base64-encode": {
        output = encodeBase64Unicode(input);
        statusLabel = "Encoded";
        detailRows = [
          { label: "Algorithm", value: "Base64" },
          { label: "Input chars", value: String(inputCharacters), mono: true },
          { label: "Output chars", value: String(countCharacters(output)), mono: true },
        ];
        break;
      }
      case "base64-decode": {
        output = decodeBase64Unicode(input);
        statusLabel = "Decoded";
        detailRows = [
          { label: "Algorithm", value: "Base64" },
          { label: "Input chars", value: String(inputCharacters), mono: true },
          { label: "Output chars", value: String(countCharacters(output)), mono: true },
        ];
        break;
      }
      case "url-encode": {
        output = encodeURIComponent(input);
        statusLabel = "Encoded";
        detailRows = [
          { label: "Mode", value: "encodeURIComponent" },
          { label: "Input chars", value: String(inputCharacters), mono: true },
          { label: "Output chars", value: String(countCharacters(output)), mono: true },
        ];
        break;
      }
      case "url-decode": {
        output = decodeURIComponent(input);
        statusLabel = "Decoded";
        detailRows = [
          { label: "Mode", value: "decodeURIComponent" },
          { label: "Input chars", value: String(inputCharacters), mono: true },
          { label: "Output chars", value: String(countCharacters(output)), mono: true },
        ];
        break;
      }
      case "uppercase": {
        output = input.toUpperCase();
        statusLabel = "Transformed";
        detailRows = buildTransformRows(input, output);
        break;
      }
      case "lowercase": {
        output = input.toLowerCase();
        statusLabel = "Transformed";
        detailRows = buildTransformRows(input, output);
        break;
      }
      case "title-case": {
        output = toTitleCase(input);
        statusLabel = "Transformed";
        detailRows = buildTransformRows(input, output);
        break;
      }
      case "remove-extra-spaces": {
        output = normalizeSpaces(input);
        statusLabel = "Normalized";
        detailRows = buildTransformRows(input, output);
        break;
      }
      case "slug-generator": {
        output = toSlug(input);
        statusLabel = "Generated";
        detailRows = buildTransformRows(input, output);
        break;
      }
      case "character-counter": {
        output = String(inputCharacters);
        statusLabel = "Counted";
        detailRows = [
          { label: "Characters", value: output, mono: true },
          { label: "Words", value: String(inputWords), mono: true },
          { label: "Lines", value: String(countLines(input)), mono: true },
        ];
        break;
      }
      case "word-counter": {
        output = String(inputWords);
        statusLabel = "Counted";
        detailRows = [
          { label: "Words", value: output, mono: true },
          { label: "Characters", value: String(inputCharacters), mono: true },
          { label: "Lines", value: String(countLines(input)), mono: true },
        ];
        break;
      }
    }
  } catch (error) {
    output = "";
    statusLabel = "Error";
    errorMessage = error instanceof Error ? error.message : "Transform text gagal diproses.";
    detailRows = [
      { label: "Operation", value: operation.label },
      { label: "Status", value: "Invalid input" },
      { label: "Input chars", value: String(inputCharacters), mono: true },
    ];
  }

  const outputCharacters = countCharacters(output);
  const outputWords = countWords(output);

  return {
    output,
    errorMessage,
    statusLabel,
    detailRows,
    summary: {
      inputCharacters,
      inputWords,
      outputCharacters,
      outputWords,
    },
  };
}

export async function copyText(value: string) {
  await copyTextToClipboard(value);
}

function parseJsonInput(input: string) {
  if (!input.trim()) {
    throw new Error("Input JSON tidak boleh kosong.");
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON tidak valid.";
    throw new Error(`JSON tidak valid: ${message}`);
  }
}

function describeJsonRoot(value: unknown) {
  if (Array.isArray(value)) {
    return "Array";
  }

  if (value === null) {
    return "Null";
  }

  return typeof value === "object" ? "Object" : typeof value;
}

function buildJsonRows(output: string): ResultRow[] {
  return [
    { label: "Output chars", value: String(countCharacters(output)), mono: true },
    { label: "Words", value: String(countWords(output)), mono: true },
    { label: "Lines", value: String(countLines(output)), mono: true },
  ];
}

function buildTransformRows(input: string, output: string): ResultRow[] {
  return [
    { label: "Input chars", value: String(countCharacters(input)), mono: true },
    { label: "Output chars", value: String(countCharacters(output)), mono: true },
    { label: "Input words", value: String(countWords(input)), mono: true },
    { label: "Output words", value: String(countWords(output)), mono: true },
  ];
}

function encodeBase64Unicode(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeBase64Unicode(input: string) {
  if (!input.trim()) {
    throw new Error("Input Base64 tidak boleh kosong.");
  }

  try {
    const normalized = input.replace(/\s+/g, "");
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    throw new Error("Base64 tidak valid atau bukan payload UTF-8 yang bisa dibaca.");
  }
}

function toTitleCase(input: string) {
  return input.toLowerCase().replace(/\b\p{L}[\p{L}\p{M}\p{N}'-]*/gu, (word) => {
    const [firstCharacter = "", ...restCharacters] = Array.from(word);
    return `${firstCharacter.toUpperCase()}${restCharacters.join("")}`;
  });
}

function normalizeSpaces(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function toSlug(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function countCharacters(input: string) {
  return Array.from(input).length;
}

function countWords(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function countLines(input: string) {
  if (!input) {
    return 0;
  }

  return input.split(/\r?\n/).length;
}
