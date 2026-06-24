import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)) as AbstractIntlMessages,
  };
});
