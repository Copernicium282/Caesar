import { describe, it, expect } from "vitest";
import { matchEntries } from "../utils/domain-match.js";

const entries = [
  { name: "GitHub", username: "dev@github.com", url: "https://github.com", uris: ["github.com"] },
  { name: "Gmail", username: "me@gmail.com", url: "https://mail.google.com", uris: ["mail.google.com", "google.com"] },
  { name: "AWS", username: "admin@company.com", url: "https://console.aws.amazon.com", uris: ["console.aws.amazon.com"] },
];

describe("matchEntries - base-domain (default)", () => {
  it("matches exact hostname", () => {
    const r = matchEntries("https://github.com/login", entries);
    expect(r.matched.map(e => e.name)).toContain("GitHub");
  });

  it("matches subdomain via base domain", () => {
    const r = matchEntries("https://mail.google.com/inbox", entries);
    expect(r.matched.map(e => e.name)).toContain("Gmail");
  });

  it("matches base domain from subdomain URI", () => {
    const r = matchEntries("https://www.google.com/search", entries);
    expect(r.matched.map(e => e.name)).toContain("Gmail");
  });

  it("does not match unrelated domains", () => {
    const r = matchEntries("https://example.com", entries);
    expect(r.matched).toHaveLength(0);
  });

  it("puts unmatched entries in unmatched array", () => {
    const r = matchEntries("https://example.com", entries);
    expect(r.unmatched).toHaveLength(3);
  });

  it("entries with no URIs go to unmatched", () => {
    const noUri = [{ name: "NoUri", username: "u", url: "https://x.com", uris: [] }];
    const r = matchEntries("https://x.com", noUri);
    expect(r.unmatched).toHaveLength(1);
  });
});

describe("matchEntries - hostname strategy", () => {
  it("matches exact hostname only", () => {
    const r = matchEntries("https://github.com/login", entries, "hostname");
    expect(r.matched.map(e => e.name)).toContain("GitHub");
  });

  it("does NOT match subdomain via base domain", () => {
    const r = matchEntries("https://www.google.com/search", entries, "hostname");
    expect(r.matched.map(e => e.name)).not.toContain("Gmail");
  });

  it("matches mail.google.com to mail.google.com", () => {
    const r = matchEntries("https://mail.google.com/inbox", entries, "hostname");
    expect(r.matched.map(e => e.name)).toContain("Gmail");
  });
});

describe("matchEntries - exact strategy", () => {
  it("matches exact URL", () => {
    const r = matchEntries("https://github.com", entries, "exact");
    expect(r.matched.map(e => e.name)).toContain("GitHub");
  });

  it("does NOT match URL with path when URI has no path", () => {
    const r = matchEntries("https://github.com/login", entries, "exact");
    expect(r.matched.map(e => e.name)).not.toContain("GitHub");
  });
});

describe("matchEntries - starts-with strategy", () => {
  it("matches when URI is prefix of tab URL", () => {
    const r = matchEntries("https://console.aws.amazon.com/ec2", entries, "starts-with");
    expect(r.matched.map(e => e.name)).toContain("AWS");
  });

  it("matches when tab URL is prefix of URI", () => {
    const r = matchEntries("https://console.aws.amazon.com", entries, "starts-with");
    expect(r.matched.map(e => e.name)).toContain("AWS");
  });
});
