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

function getHostname(input: string): string {
  // If it doesn't look like a URL, treat it as a bare hostname
  if (!input.includes("://")) {
    return input;
  }
  const parsed = new URL(input);
  return parsed.hostname;
}

export function matchEntries(
  tabUrl: string,
  entries: MatchableEntry[],
): MatchResult {
  const tabHostname = getHostname(tabUrl);
  const baseDomainTabHostname = parse(tabUrl).domain;
  const exactMatches: MatchableEntry[] = [];
  const baseDomainMatches: MatchableEntry[] = [];
  const unmatched: MatchableEntry[] = [];
  for (const entry of entries) {
    if (!entry.uris || entry.uris.length === 0) {
      unmatched.push(entry);
      continue;
    }

    let isExact = false;
    let isBaseDomain = false;

    for (const uri of entry.uris) {
      const uriHostname = getHostname(uri);
      if (uriHostname === tabHostname) {
        isExact = true;
        break;
      }
      if (parse(uri).domain === baseDomainTabHostname) {
        isBaseDomain = true;
      }
    }

    if (isExact) exactMatches.push(entry);
    else if (isBaseDomain) baseDomainMatches.push(entry);
    else unmatched.push(entry);
  }

  return {
    matched: exactMatches.concat(baseDomainMatches),
    unmatched: unmatched,
  };
}
