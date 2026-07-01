import { parse } from "tldts";

interface MatchableEntry {
  name: string;
  username: string;
  url: string;
  uris?: string[];
}

interface MatchResult {
  matched: MatchableEntry[];
  unmatched: MatchableEntry[];
}

export type MatchStrategy = "base-domain" | "hostname" | "starts-with" | "exact";

function getRegisteredDomain(input: string): string {
  try {
    const result = parse(input);
    return result.domain || input;
  } catch {
    return input;
  }
}

function getFullHostname(input: string): string {
  try {
    if (input.includes("://")) {
      return new URL(input).hostname;
    }
    // For bare hostnames like "mail.google.com" or "mail.google.com/login"
    const firstPart = input.split("/")[0];
    if (firstPart && firstPart.includes(".")) {
      return firstPart;
    }
    return getRegisteredDomain(input);
  } catch {
    return input;
  }
}

function normalizeUrl(input: string): string {
  try {
    if (input.includes("://")) return input;
    return "https://" + input;
  } catch {
    return input;
  }
}

export function matchEntries(
  tabUrl: string,
  entries: MatchableEntry[],
  strategy: MatchStrategy = "base-domain",
): MatchResult {
  const tabDomain = getRegisteredDomain(tabUrl);
  const tabHostname = getFullHostname(tabUrl);
  const matched: MatchableEntry[] = [];
  const unmatched: MatchableEntry[] = [];

  for (const entry of entries) {
    if (!entry.uris || entry.uris.length === 0) {
      unmatched.push(entry);
      continue;
    }

    let isMatch = false;

    for (const uri of entry.uris) {
      const uriDomain = getRegisteredDomain(uri);
      const uriHostname = getFullHostname(uri);

      switch (strategy) {
        case "exact": {
          const normTab = normalizeUrl(tabUrl);
          const normUri = normalizeUrl(uri);
          if (normTab === normUri || normTab === normUri + "/" || normTab + "/" === normUri) {
            isMatch = true;
          }
          break;
        }
        case "hostname": {
          if (tabHostname === uriHostname) {
            isMatch = true;
          }
          break;
        }
        case "starts-with": {
          const normTab = normalizeUrl(tabUrl);
          const normUri = normalizeUrl(uri);
          if (normTab.startsWith(normUri) || normUri.startsWith(normTab)) {
            isMatch = true;
          }
          break;
        }
        case "base-domain":
        default: {
          // Exact hostname match (handles subdomains: www.github.com matches github.com)
          if (tabHostname === uriHostname || tabHostname.endsWith("." + uriHostname) || uriHostname.endsWith("." + tabHostname)) {
            isMatch = true;
          }
          // Base domain match (e.g., mail.google.com matches google.com)
          else if (uriDomain && uriDomain === tabDomain) {
            isMatch = true;
          }
          break;
        }
      }

      if (isMatch) break;
    }

    if (isMatch) {
      matched.push(entry);
    } else {
      unmatched.push(entry);
    }
  }

  return { matched, unmatched };
}
