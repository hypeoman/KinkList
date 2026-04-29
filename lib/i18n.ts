import en from "@/locales/en.json";
import ru from "@/locales/ru.json";

export type Locale = "ru" | "en";
export type Theme = "light" | "dark";

export type Messages = typeof ru;

export const localeMessages: Record<Locale, Messages> = {
  ru,
  en
};

export const localeOptions: Array<{ value: Locale; labelKey: "russian" | "english" }> = [
  { value: "ru", labelKey: "russian" },
  { value: "en", labelKey: "english" }
];
