/**
 * @prinodia/i18n
 *
 * Internationalization support for Prinodia Workspace.
 * Supported languages: French (fr), English (en), Lingala (ln), Swahili (sw), Tshiluba (lua)
 *
 * French is the default language and the primary language of administration
 * in the Democratic Republic of Congo.
 */

export type SupportedLocale = "fr" | "en" | "ln" | "sw" | "lua";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["fr", "en", "ln", "sw", "lua"];

export const DEFAULT_LOCALE: SupportedLocale = "fr";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  fr: "Français",
  en: "English",
  ln: "Lingala",
  sw: "Kiswahili",
  lua: "Tshiluba",
};

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  ln: "🇨🇩",
  sw: "🇨🇩",
  lua: "🇨🇩",
};

/**
 * Returns whether a string is a valid supported locale.
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Resolves a locale string to a supported locale, falling back to default.
 */
export function resolveLocale(locale: string | undefined | null): SupportedLocale {
  if (locale && isSupportedLocale(locale)) return locale;
  return DEFAULT_LOCALE;
}
