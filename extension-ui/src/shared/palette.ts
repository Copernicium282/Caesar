export type Theme = "dark" | "light" | "system";

export const DARK = {
  bg: "#1c1917", surface: "#292524", surfaceRaised: "#312e2b",
  surfaceOverlay: "#3d3835", hairline: "#44403c", hairlineStrong: "#57534e",
  ink: "#fafaf9", inkMuted: "#a8a29e", inkFaint: "#78716c",
  accent: "#c9a84c", accentPressed: "#a8893c", accentSubtle: "#2a2315",
  accentTextOn: "#1c1917", error: "#c0392b", errorSubtle: "#2a1715",
} as const;

export const LIGHT = {
  bg: "#f5f5f4", surface: "#ffffff", surfaceRaised: "#e7e5e4",
  surfaceOverlay: "#d6d3d1", hairline: "#d6d3d1", hairlineStrong: "#a8a29e",
  ink: "#1c1917", inkMuted: "#57534e", inkFaint: "#a8a29e",
  accent: "#92700c", accentPressed: "#78600a", accentSubtle: "#fef3c7",
  accentTextOn: "#ffffff", error: "#dc2626", errorSubtle: "#fef2f2",
} as const;

export type Palette = typeof DARK;

export const C: Palette = { ...DARK };
