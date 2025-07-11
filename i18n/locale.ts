import { Pathnames } from "next-intl/routing";

export const locales = ["en", "zh", "zh-TW", "es", "fr", "de", "ja", "ko", "ar", "bn", "hi", "id"];

export const localeNames: any = {
  en: "English",
  zh: "中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  ko: "한국어",
  ar: "العربية",
  "zh-TW": "繁體中文",
  bn: "বাংলা",
  hi: "हिंदी",
  id: "Indonesia",
};

export const defaultLocale = "en";

export const localePrefix = "as-needed";

export const localeDetection =
  process.env.NEXT_PUBLIC_LOCALE_DETECTION === "true";

export const pathnames = {
  en: {
    "privacy-policy": "/privacy-policy",
    "terms-of-service": "/terms-of-service",
  },
} satisfies Pathnames<typeof locales>;
