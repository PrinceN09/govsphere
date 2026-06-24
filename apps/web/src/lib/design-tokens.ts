/**
 * GovSphere design tokens — TypeScript constants.
 *
 * Use these when you need raw values in JS (e.g. inline styles, canvas, charts).
 * For Tailwind classes, use the configured colour names directly.
 */

export const GOV_TOKENS = {
  /** DRC national flag stripe colours */
  drc: {
    blue: "#007fff",
    gold: "#f7d918",
    red: "#ce1020",
  },

  /** Authority accent — gold left border on active sidebar nav */
  authorityGold: "#d4a012",

  /** Sidebar surface */
  sidebar: "#07101d",

  /** Page background — cool blue-tinted off-white */
  surfacePage: "#e8edf5",

  /** Government blue — primary interactive colour */
  govBlue: "#1550c8",
} as const;

export type GovTokenKey = keyof typeof GOV_TOKENS;
