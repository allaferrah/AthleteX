"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Locale } from "./translations";
import { translations } from "./translations";
import type { Translations } from "./types";

type SetLocale = (locale: Locale) => void;

interface LocaleContextValue {
  locale: Locale;
  setLocale: SetLocale;
  dir: "ltr" | "rtl";
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const LS_KEY = "athletix-locale";

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale: SetLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(LS_KEY, l); } catch {}
    document.cookie = `${LS_KEY}=${l};path=/;max-age=31536000`;
  }, []);

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";

  const t = useCallback((path: string, params?: Record<string, string | number>): string => {
    const keys = path.split(".");
    let result: unknown = translations[locale];
    for (const key of keys) {
      if (result && typeof result === "object" && key in result) {
        result = (result as Record<string, unknown>)[key];
      } else {
        return path;
      }
    }
    let str = typeof result === "string" ? result : path;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      }
    }
    return str;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
