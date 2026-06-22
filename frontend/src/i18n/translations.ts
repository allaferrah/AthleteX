import en from "./en";
import ar from "./ar";
import type { Translations } from "./types";

export type Locale = "en" | "ar";

export const translations: Record<Locale, Translations> = { en, ar };
