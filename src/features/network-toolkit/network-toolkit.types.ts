import type {
  DnsLookupResponse,
  HttpStatusResponse,
  LocalIpResponse,
  PingHostResponse,
  PortCheckResponse,
} from "@/types/app";

export type NetworkQueryStatus = "idle" | "loading" | "ready" | "error";

export interface NetworkQueryState<T> {
  status: NetworkQueryStatus;
  data?: T;
  errorMessage?: string;
}

export interface NetworkToolkitState {
  localIp: NetworkQueryState<LocalIpResponse>;
  dnsDomain: string;
  dns: NetworkQueryState<DnsLookupResponse>;
  pingHost: string;
  ping: NetworkQueryState<PingHostResponse>;
  portHost: string;
  portValue: string;
  port: NetworkQueryState<PortCheckResponse>;
  httpUrl: string;
  http: NetworkQueryState<HttpStatusResponse>;
}
