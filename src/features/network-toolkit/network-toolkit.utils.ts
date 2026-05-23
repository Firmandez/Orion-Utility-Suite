import type {
  DnsLookupResponse,
  HttpStatusResponse,
  LocalIpResponse,
  PingHostResponse,
  PortCheckResponse,
  ResultRow,
} from "@/types/app";

export function normalizePortInput(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 5);
}

export function parsePortInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return undefined;
  }

  return parsed;
}

export function formatLocalIpRows(result?: LocalIpResponse): ResultRow[] {
  if (!result) {
    return [];
  }

  return [{ label: "Local IP", value: result.localIp, mono: true }];
}

export function formatDnsRows(result?: DnsLookupResponse): ResultRow[] {
  if (!result) {
    return [];
  }

  return [
    { label: "Domain", value: result.domain },
    { label: "Address count", value: String(result.addresses.length), mono: true },
  ];
}

export function formatPingRows(result?: PingHostResponse): ResultRow[] {
  if (!result) {
    return [];
  }

  return [
    { label: "Host", value: result.host },
    { label: "Reachable", value: result.reachable ? "Yes" : "No" },
    { label: "Duration", value: `${result.durationMs} ms`, mono: true },
    { label: "Detail code", value: result.exitCode === undefined ? "Unavailable" : String(result.exitCode), mono: true },
  ];
}

export function formatPortRows(result?: PortCheckResponse): ResultRow[] {
  if (!result) {
    return [];
  }

  return [
    { label: "Host", value: result.host },
    { label: "Port", value: String(result.port), mono: true },
    { label: "Open", value: result.isOpen ? "Yes" : "No" },
    { label: "Duration", value: `${result.durationMs} ms`, mono: true },
  ];
}

export function formatHttpRows(result?: HttpStatusResponse): ResultRow[] {
  if (!result) {
    return [];
  }

  return [
    { label: "Status", value: String(result.statusCode), mono: true },
    { label: "Success", value: result.ok ? "Yes" : "No" },
    { label: "URL", value: result.url },
    { label: "Final URL", value: result.finalUrl },
  ];
}

export function formatDnsCopy(result?: DnsLookupResponse) {
  if (!result) {
    return "";
  }

  return [`Domain: ${result.domain}`, "Addresses:", ...result.addresses.map((address) => `- ${address}`)].join("\n");
}

export function formatPingCopy(result?: PingHostResponse) {
  if (!result) {
    return "";
  }

  return [
    `Host: ${result.host}`,
    `Reachable: ${result.reachable ? "Yes" : "No"}`,
    `Duration: ${result.durationMs} ms`,
    `Detail code: ${result.exitCode ?? "Unavailable"}`,
    `Summary: ${result.summary}`,
    "",
    result.output,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatPortCopy(result?: PortCheckResponse) {
  if (!result) {
    return "";
  }

  return [
    `Host: ${result.host}`,
    `Port: ${result.port}`,
    `Open: ${result.isOpen ? "Yes" : "No"}`,
    `Duration: ${result.durationMs} ms`,
    `Summary: ${result.summary}`,
  ].join("\n");
}

export function formatHttpCopy(result?: HttpStatusResponse) {
  if (!result) {
    return "";
  }

  return [
    `URL: ${result.url}`,
    `Final URL: ${result.finalUrl}`,
    `Status code: ${result.statusCode}`,
    `Success: ${result.ok ? "Yes" : "No"}`,
    `Summary: ${result.summary}`,
  ].join("\n");
}
