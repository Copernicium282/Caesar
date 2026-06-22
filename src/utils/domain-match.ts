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
    // Bare hostname like "github.com" or "github.com/login"
    // tldts handles this — parse extracts domain from "github.com/login" as "github.com"
    return getRegisteredDomain(input);
  } catch {
    return input;
  }
}

export function matchEntries(
  tabUrl: string,
  entries: MatchableEntry[],
): MatchResult {
  const tabDomain = getRegisteredDomain(tabUrl);
  const tabHostname = getFullHostname(tabUrl);
  const exactMatches: MatchableEntry[] = [];
  const baseDomainMatches: MatchableEntry[] = [];
  const unmatched: MatchableEntry[] = [];

  for (const entry of entries) {
    if (!entry.uris || entry.uris.length === 0) {
      unmatched.push(entry);
      continue;
    }

    let matched = false;

    for (const uri of entry.uris) {
      const uriDomain = getRegisteredDomain(uri);
      const uriHostname = getFullHostname(uri);

      // Exact hostname match (handles subdomains: www.github.com matches github.com)
      if (tabHostname === uriHostname || tabHostname.endsWith("." + uriHostname) || uriHostname.endsWith("." + tabHostname)) {
        exactMatches.push(entry);
        matched = true;
        break;
      }

      // Base domain match (e.g., mail.google.com matches google.com)
      if (uriDomain && uriDomain === tabDomain) {
        baseDomainMatches.push(entry);
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatched.push(entry);
    }
  }

  return {
    matched: exactMatches.concat(baseDomainMatches),
    unmatched: unmatched,
  };
}
