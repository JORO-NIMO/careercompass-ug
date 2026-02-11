import { describe, expect, it } from "vitest";
import {
  assertSafeOutboundUrl,
  redactSensitiveQuery,
} from "../utils/security.js";

describe("security utils", () => {
  describe("assertSafeOutboundUrl", () => {
    it("allows public https URL", () => {
      expect(() =>
        assertSafeOutboundUrl("https://example.com/feed.xml"),
      ).not.toThrow();
    });

    it("blocks localhost URL", () => {
      expect(() => assertSafeOutboundUrl("http://localhost:8080/feed")).toThrow(
        /Localhost/,
      );
    });

    it("blocks private IPv4 URL", () => {
      expect(() => assertSafeOutboundUrl("http://192.168.1.5/feed")).toThrow(
        /Private network/,
      );
    });

    it("enforces allowlist when provided", () => {
      expect(() =>
        assertSafeOutboundUrl("https://example.com/feed", ["allowed.com"]),
      ).toThrow(/allowed RSS host list/);
    });
  });

  describe("redactSensitiveQuery", () => {
    it("redacts sensitive query keys", () => {
      const redacted = redactSensitiveQuery({
        apiKey: "secret",
        page: "1",
        token: "x",
      });
      expect(redacted).toEqual({
        apiKey: "[REDACTED]",
        page: "1",
        token: "[REDACTED]",
      });
    });
  });
});
