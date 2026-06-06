"use client";

import { useEffect, useState } from "react";
import { Languages, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { translationAPI, type TranslationResult } from "@/lib/api";
import { useLanguageStore } from "@/lib/languageStore";
import { cn } from "@/lib/utils";

interface TranslatedTextProps {
  text: string;
  className?: string;
  textClassName?: string;
  showOriginalByDefault?: boolean;
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4";
  showControls?: boolean;
}

function getFailureLabel(result?: TranslationResult | null) {
  switch (result?.reason) {
    case "disabled":
      return "Translation is not configured";
    case "unsupported_language":
      return "Language is not supported by this provider";
    case "provider_error":
      return "Translation failed";
    case "protected_text":
      return "Nothing to translate";
    case "same_language":
      return "Already in this language";
    default:
      return "Translation unavailable";
  }
}

export function TranslatedText({
  text,
  className,
  textClassName,
  showOriginalByDefault = true,
  as: TextTag = "p",
  showControls = true,
}: TranslatedTextProps) {
  const language = useLanguageStore((state) => state.language);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(showOriginalByDefault);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canTranslate = Boolean(trimmed) && language !== "en";
  const activeText =
    !showOriginal && result?.translated ? result.translatedText : text;

  useEffect(() => {
    setResult(null);
    setShowOriginal(showOriginalByDefault);
    setError(null);
  }, [language, showOriginalByDefault, text]);

  const handleTranslate = async () => {
    if (!canTranslate || isLoading) return;

    if (result?.translated) {
      setShowOriginal((current) => !current);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await translationAPI.translate({
        text,
        targetLanguage: language,
      });
      setResult(response.data);
      setShowOriginal(!response.data.translated);
    } catch (requestError: any) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Translation failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showControls) {
    return (
      <TextTag className={cn("whitespace-pre-wrap break-words", textClassName)}>
        {activeText}
      </TextTag>
    );
  }

  return (
    <div className={cn("group/translation space-y-1", className)}>
      <TextTag className={cn("whitespace-pre-wrap break-words", textClassName)}>
        {activeText}
      </TextTag>

      {canTranslate && showControls && (
        <div className="flex items-center gap-1 text-[11px]">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleTranslate}
                  disabled={isLoading}
                  className="h-6 gap-1 px-1.5 text-[11px] opacity-70 hover:opacity-100"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : result?.translated && !showOriginal ? (
                    <RotateCcw className="h-3 w-3" />
                  ) : (
                    <Languages className="h-3 w-3" />
                  )}
                  <span>{result?.translated && !showOriginal ? "Original" : "Translate"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {result?.translated
                  ? result.fromCache
                    ? "Cached translation"
                    : `Translated with ${result.provider}`
                  : result
                    ? getFailureLabel(result)
                    : `Translate to ${language.toUpperCase()}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!result?.translated && result && (
            <span className="text-muted-foreground">{getFailureLabel(result)}</span>
          )}
          {error && <span className="text-red-500">{error}</span>}
        </div>
      )}
    </div>
  );
}
