import { useMemo } from "react";
import { useLanguageStore } from "@/lib/languageStore";
import {
  getDateLocale,
  getModuleMessages,
  type MessageModule,
} from "@/messages/registry";

export function useTranslations<T = Record<string, unknown>>(module: MessageModule) {
  const language = useLanguageStore((state) => state.language);

  const t = useMemo(
    () => getModuleMessages<T>(language, module),
    [language, module],
  );

  return {
    t,
    language,
    locale: getDateLocale(language),
  };
}
