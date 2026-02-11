import { URL } from "url";

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [toIPv4Number("10.0.0.0"), toIPv4Number("10.255.255.255")],
  [toIPv4Number("127.0.0.0"), toIPv4Number("127.255.255.255")],
  [toIPv4Number("169.254.0.0"), toIPv4Number("169.254.255.255")],
  [toIPv4Number("172.16.0.0"), toIPv4Number("172.31.255.255")],
  [toIPv4Number("192.168.0.0"), toIPv4Number("192.168.255.255")],
];

function toIPv4Number(ip: string): number {
  return (
    ip
      .split(".")
      .map((part) => parseInt(part, 10))
      .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0
  );
}

function isPrivateIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) {
    return false;
  }

  const octets = ip.split(".").map((n) => parseInt(n, 10));
  if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
    return false;
  }

  const ipNumber = toIPv4Number(ip);
  return PRIVATE_IPV4_RANGES.some(
    ([start, end]) => ipNumber >= start && ipNumber <= end,
  );
}

function isLikelyPrivateIPv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function assertSafeOutboundUrl(
  url: string,
  allowedHosts: string[] = [],
): void {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP(S) URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not allowed");
  }

  if (isPrivateIPv4(hostname) || isLikelyPrivateIPv6(hostname)) {
    throw new Error("Private network URLs are not allowed");
  }

  if (allowedHosts.length > 0 && !allowedHosts.includes(hostname)) {
    throw new Error("Host is not in allowed RSS host list");
  }
}

export function redactSensitiveQuery(
  query: Record<string, unknown>,
): Record<string, unknown> {
  const sensitiveKeyRegex =
    /(api[_-]?key|token|secret|password|authorization|key)/i;

  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => {
      if (sensitiveKeyRegex.test(key)) {
        return [key, "[REDACTED]"];
      }
      return [key, value];
    }),
  );
}
