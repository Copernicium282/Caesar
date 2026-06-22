import { useState } from "react";
import { type Entry, type FilterTab } from "../shared/types";

export function useVaultLogic(entries: Entry[], fetching: boolean) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || (e.url || "").toLowerCase().includes(q);
    const matchT = tab === "all" || (tab === "logins" && e.type === "login") || (tab === "notes" && e.type === "note") || (tab === "favorites" && e.favorite);
    return matchQ && matchT;
  });

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" }, { id: "logins", label: "Logins" },
    { id: "notes", label: "Notes" }, { id: "favorites", label: "Favorites" },
  ];

  return { search, setSearch, tab, setTab, filtered, TABS, fetching };
}
