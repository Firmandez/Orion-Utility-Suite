use std::net::IpAddr;

use anyhow::{anyhow, bail, Context};
use hickory_resolver::Resolver;
use regex::Regex;
use reqwest::{redirect, Client, Url};
use tokio::net::TcpStream;
use tokio::process::Command as TokioCommand;
use tokio::time::{timeout, Duration, Instant};

use crate::models::{DnsLookupPayload, HttpStatusPayload, PingHostPayload, PortCheckPayload};

const DNS_LOOKUP_TIMEOUT: Duration = Duration::from_secs(5);
const PING_TIMEOUT: Duration = Duration::from_secs(4);
const PORT_CHECK_TIMEOUT: Duration = Duration::from_secs(3);
const HTTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(4);
const HTTP_REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

pub async fn dns_lookup_payload(domain: String) -> anyhow::Result<DnsLookupPayload> {
    let validated_domain = validate_host_input(&domain)?;
    let resolver = Resolver::builder_tokio()
        .context("Failed to create the DNS resolver with host system configuration.")?
        .build();

    let lookup = timeout(
        DNS_LOOKUP_TIMEOUT,
        resolver.lookup_ip(validated_domain.as_str()),
    )
    .await
    .map_err(|_| {
        anyhow!(
            "DNS lookup timed out after {} seconds.",
            DNS_LOOKUP_TIMEOUT.as_secs()
        )
    })?
    .with_context(|| format!("DNS lookup failed for {validated_domain}."))?;

    let mut addresses = lookup
        .iter()
        .map(|address| address.to_string())
        .collect::<Vec<_>>();

    addresses.sort();
    addresses.dedup();

    if addresses.is_empty() {
        bail!("No A or AAAA records were returned for {validated_domain}.");
    }

    Ok(DnsLookupPayload {
        domain: validated_domain,
        addresses,
    })
}

pub async fn ping_host_payload(host: String) -> anyhow::Result<PingHostPayload> {
    let validated_host = validate_host_input(&host)?;
    let mut command = TokioCommand::new("ping");
    let command_arguments = build_ping_arguments(validated_host.as_str());

    command.args(command_arguments).arg(validated_host.as_str());
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    command.kill_on_drop(true);

    let started_at = Instant::now();
    let output = timeout(PING_TIMEOUT, command.output())
        .await
        .map_err(|_| anyhow!("Ping timed out after {} seconds.", PING_TIMEOUT.as_secs()))?
        .with_context(|| format!("Failed to run the system ping command for {validated_host}."))?;
    let duration_ms = started_at.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let combined_output = if stdout.is_empty() {
        stderr.clone()
    } else if stderr.is_empty() {
        stdout.clone()
    } else {
        format!("{stdout}\n{stderr}")
    };
    let reachable = output.status.success();
    let summary = if reachable {
        format!("{validated_host} responded to one ping probe.")
    } else {
        format!("{validated_host} did not respond to the ping probe.")
    };

    Ok(PingHostPayload {
        host: validated_host,
        reachable,
        exit_code: output.status.code(),
        duration_ms,
        summary,
        output: combined_output,
    })
}

pub async fn check_port_payload(host: String, port: u16) -> anyhow::Result<PortCheckPayload> {
    let validated_host = validate_host_input(&host)?;
    validate_port(port)?;

    let started_at = Instant::now();
    let is_open = match timeout(
        PORT_CHECK_TIMEOUT,
        TcpStream::connect((validated_host.as_str(), port)),
    )
    .await
    {
        Ok(Ok(_stream)) => true,
        Ok(Err(_)) => false,
        Err(_) => false,
    };
    let duration_ms = started_at.elapsed().as_millis() as u64;
    let summary = if is_open {
        format!("TCP connection to {validated_host}:{port} succeeded.")
    } else if duration_ms >= PORT_CHECK_TIMEOUT.as_millis() as u64 {
        format!("TCP connection to {validated_host}:{port} timed out.")
    } else {
        format!("TCP connection to {validated_host}:{port} was refused or unreachable.")
    };

    Ok(PortCheckPayload {
        host: validated_host,
        port,
        is_open,
        duration_ms,
        summary,
    })
}

pub async fn check_http_status_payload(url: String) -> anyhow::Result<HttpStatusPayload> {
    let normalized_url = normalize_http_url_input(&url)?;
    let client = Client::builder()
        .connect_timeout(HTTP_CONNECT_TIMEOUT)
        .timeout(HTTP_REQUEST_TIMEOUT)
        .redirect(redirect::Policy::limited(5))
        .build()
        .context("Failed to initialize the HTTP client for status checking.")?;

    let response = client
        .get(normalized_url.clone())
        .send()
        .await
        .with_context(|| format!("HTTP request failed for {normalized_url}."))?;
    let status_code = response.status();
    let final_url = response.url().to_string();
    let ok = status_code.is_success();
    let summary = if ok {
        format!(
            "HTTP request completed successfully with status {}.",
            status_code.as_u16()
        )
    } else {
        format!(
            "HTTP request completed with status {}.",
            status_code.as_u16()
        )
    };

    Ok(HttpStatusPayload {
        url: normalized_url,
        final_url,
        status_code: status_code.as_u16(),
        ok,
        summary,
    })
}

fn validate_host_input(value: &str) -> anyhow::Result<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        bail!("Host cannot be empty.");
    }

    if trimmed.contains(char::is_whitespace) {
        bail!("Host cannot contain spaces.");
    }

    if trimmed.len() > 255 {
        bail!("Host is too long.");
    }

    if trimmed.parse::<IpAddr>().is_ok() {
        return Ok(trimmed.to_string());
    }

    let hostname_pattern = Regex::new(
        r"(?i)^(localhost|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*)\.?$",
    )
    .expect("hostname validation regex should be valid");

    if hostname_pattern.is_match(trimmed) {
        return Ok(trimmed.to_string());
    }

    bail!("Invalid host or domain format.");
}

fn validate_port(port: u16) -> anyhow::Result<()> {
    if port == 0 {
        bail!("Port must be between 1 and 65535.");
    }

    Ok(())
}

fn normalize_http_url_input(value: &str) -> anyhow::Result<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        bail!("URL cannot be empty.");
    }

    let candidate = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };

    let parsed = Url::parse(&candidate).with_context(|| format!("Invalid URL: {trimmed}."))?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => bail!("Unsupported URL scheme: {scheme}. Use http or https."),
    }

    if parsed.host_str().is_none() {
        bail!("URL must include a valid host.");
    }

    Ok(parsed.to_string())
}

fn build_ping_arguments(_host: &str) -> Vec<&'static str> {
    if cfg!(target_os = "windows") {
        vec!["-n", "1"]
    } else {
        vec!["-c", "1"]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_host_input_accepts_domains_and_ip_addresses() {
        assert_eq!(
            validate_host_input("example.com").expect("domain should be valid"),
            "example.com"
        );
        assert_eq!(
            validate_host_input("127.0.0.1").expect("ipv4 should be valid"),
            "127.0.0.1"
        );
        assert_eq!(
            validate_host_input("::1").expect("ipv6 should be valid"),
            "::1"
        );
    }

    #[test]
    fn validate_host_input_rejects_whitespace_and_shell_like_strings() {
        assert!(validate_host_input("example.com && whoami").is_err());
        assert!(validate_host_input("bad host").is_err());
    }

    #[test]
    fn normalize_http_url_input_adds_https_scheme_when_missing() {
        assert_eq!(
            normalize_http_url_input("example.com").expect("url should normalize"),
            "https://example.com/"
        );
    }

    #[test]
    fn normalize_http_url_input_rejects_unsupported_scheme() {
        let error =
            normalize_http_url_input("ftp://example.com").expect_err("ftp should be rejected");
        assert!(error.to_string().contains("Unsupported URL scheme"));
    }
}
