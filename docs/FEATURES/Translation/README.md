# Translation Module

> Purpose: Multi-language translation service for dynamic content.

---

## Status: ⚠️ Partial — Azure/Google provider configuration may be needed

## Responsibilities
- Translate text between supported languages
- Cache translations for performance
- Support manual translation overrides
- Integrate with external translation providers

## Features
- Text translation between all 5 supported languages
- Translation provider integration (Azure/Google/disabled)
- Cached translations to reduce API calls
- School-specific translation cache
- Manual translation entries for custom terms

## Languages
| Code | Language |
|------|----------|
| en | English |
| am | Amharic |
| ar | Arabic |
| om | Oromo |
| so | Somali |

## Database Entities
- `TranslationCache` — id, schoolId, sourceText, sourceLang, targetLang, translatedText, provider, createdAt

## Related Documents
- `backend/src/translation/`
- `frontend/src/lib/languageStore.ts`
- `frontend/src/hooks/useTranslations.ts`
- `frontend/src/messages/` — Static translation files
- `frontend/src/components/translation/`
