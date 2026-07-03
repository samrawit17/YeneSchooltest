import { Injectable } from '@nestjs/common';
import { TranslationParams } from '../interfaces/localization.interface';

@Injectable()
export class MessageFormatter {
  format(template: string, params?: TranslationParams): string {
    if (!params || Object.keys(params).length === 0) return template;

    let result = template;

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      const pattern = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g');
      result = result.replace(pattern, String(value));
    }

    return result;
  }

  hasUnresolvedParams(template: string): boolean {
    return /\{\{.+?\}\}/.test(template);
  }

  extractParams(template: string): string[] {
    const params: string[] = [];
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(template)) !== null) {
      params.push(match[1]);
    }
    return [...new Set(params)];
  }

  buildKey(...parts: string[]): string {
    return parts.filter(Boolean).join('.');
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
