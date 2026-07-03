#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(__dirname, '..');

function hashMessage(msg) {
  return createHash('md5').update(msg).digest('hex').substring(0, 8);
}

function toKey(msg, domain) {
  let clean = msg.replace(/\$\{[^}]+\}/g, '').replace(/['"]/g, '').trim();
  if (clean.length > 80) clean = clean.substring(0, 80);
  const keyBase = clean
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').replace(/_{2,}/g, '_').substring(0, 60);
  const h = hashMessage(msg);
  return domain + '.' + (keyBase || 'err') + '_' + h;
}

function escapeLit(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

const STATUS_MAP = {
  BadRequestException: 'undefined',
  NotFoundException: 'HttpStatus.NOT_FOUND',
  ConflictException: 'HttpStatus.CONFLICT',
  ForbiddenException: 'HttpStatus.FORBIDDEN',
  UnauthorizedException: 'HttpStatus.UNAUTHORIZED',
  InternalServerErrorException: 'HttpStatus.INTERNAL_SERVER_ERROR',
  ServiceUnavailableException: 'HttpStatus.SERVICE_UNAVAILABLE',
  HttpException: 'undefined',
};

function findServiceFiles(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...findServiceFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.service.ts')) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

const allKeys = new Map();
const files = findServiceFiles(join(BACKEND, 'src'));

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  const domain = file.replace(BACKEND, '').match(/\/src\/([^/]+)/)?.[1]?.replace(/-/g, '_') || 'general';
  const lines = content.split('\n');
  const newLines = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Pattern 1: Single line: "if (cond) throw new XException(msg);"
    const singleLineMatch = trimmed.match(/^if\s*\((.+)\)\s+throw\s+new\s+(BadRequestException|NotFoundException|ConflictException|ForbiddenException|UnauthorizedException|InternalServerErrorException|ServiceUnavailableException|HttpException)\(([^)]*)\)\s*;?\s*/);
    
    if (singleLineMatch) {
      const condition = singleLineMatch[1];
      const excType = singleLineMatch[2];
      let msgRaw = singleLineMatch[3].trim();
      let msg = msgRaw;
      if ((msg.startsWith("'") && msg.endsWith("'")) || (msg.startsWith('"') && msg.endsWith('"'))) {
        msg = msg.slice(1, -1);
      } else if (msg.startsWith('`') && msg.endsWith('`')) {
        msg = msg.slice(1, -1);
      }
      msg = msg.replace(/\\'/g, "'");

      let status = STATUS_MAP[excType] || 'undefined';
      const key = toKey(msg, domain);
      allKeys.set(key, msg);

      const indent = line.match(/^\s*/)[0];
      newLines.push(`${indent}if (${condition}) throw new LocalizedException('${key}', undefined, ${status}, '${escapeLit(msg)}');`);
      changed = true;
      continue;
    }

    // Pattern 2: "if (cond)" on this line, "throw new XException(msg);" on next line
    const ifMatch = trimmed.match(/^if\s*\((.+)\)\s*$/);
    if (ifMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextTrimmed = nextLine.trim();
      const throwMatch = nextTrimmed.match(/^throw\s+new\s+(BadRequestException|NotFoundException|ConflictException|ForbiddenException|UnauthorizedException|InternalServerErrorException|ServiceUnavailableException|HttpException)\(([^)]*)\)\s*;?\s*/);
      
      if (throwMatch) {
        const condition = ifMatch[1];
        const excType = throwMatch[1];
        let msgRaw = throwMatch[2].trim();
        let msg = msgRaw;
        if ((msg.startsWith("'") && msg.endsWith("'")) || (msg.startsWith('"') && msg.endsWith('"'))) {
          msg = msg.slice(1, -1);
        } else if (msg.startsWith('`') && msg.endsWith('`')) {
          msg = msg.slice(1, -1);
        }
        msg = msg.replace(/\\'/g, "'");

        let status = STATUS_MAP[excType] || 'undefined';
        const key = toKey(msg, domain);
        allKeys.set(key, msg);

        const indent = line.match(/^\s*/)[0];
        newLines.push(`${indent}if (${condition}) throw new LocalizedException('${key}', undefined, ${status}, '${escapeLit(msg)}');`);
        i++; // skip the next line
        changed = true;
        continue;
      }
    }

    // Pattern 3: "if (cond) {" on this line, "throw new XException(msg);" on next line, optionally with "}" after
    const ifBlockMatch = trimmed.match(/^if\s*\((.+)\)\s*\{\s*$/);
    if (ifBlockMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextTrimmed = nextLine.trim();
      const throwMatch = nextTrimmed.match(/^throw\s+new\s+(BadRequestException|NotFoundException|ConflictException|ForbiddenException|UnauthorizedException|InternalServerErrorException|ServiceUnavailableException|HttpException)\(([^)]*)\)\s*;?\s*/);
      
      if (throwMatch) {
        const condition = ifBlockMatch[1];
        const excType = throwMatch[1];
        let msgRaw = throwMatch[2].trim();
        let msg = msgRaw;
        if ((msg.startsWith("'") && msg.endsWith("'")) || (msg.startsWith('"') && msg.endsWith('"'))) {
          msg = msg.slice(1, -1);
        } else if (msg.startsWith('`') && msg.endsWith('`')) {
          msg = msg.slice(1, -1);
        }
        msg = msg.replace(/\\'/g, "'");

        let status = STATUS_MAP[excType] || 'undefined';
        const key = toKey(msg, domain);
        allKeys.set(key, msg);

        const indent = line.match(/^\s*/)[0];
        newLines.push(`${indent}if (${condition}) throw new LocalizedException('${key}', undefined, ${status}, '${escapeLit(msg)}');`);
        i++; // skip the throw line
        // Also skip the closing "}" if it's the next line
        if (i + 1 < lines.length) {
          const closingLine = lines[i + 1].trim();
          if (/^\}\s*$/.test(closingLine)) {
            i++;
          }
        }
        changed = true;
        continue;
      }
    }

    newLines.push(line);
  }

  if (changed) {
    writeFileSync(file, newLines.join('\n'), 'utf-8');
  }
}

// Add imports where needed
for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  if (!content.includes('LocalizedException')) continue;
  if (content.includes("'../core/localization'") || content.includes('"../core/localization"')) continue;
  if (content.includes("'../../core/localization'") || content.includes('"../../core/localization"')) continue;
  
  const lines = content.split('\n');
  const relPath = relative(dirname(file), join(BACKEND, 'src', 'core', 'localization'));
  let importPath = relPath.startsWith('.') ? relPath : './' + relPath;
  
  // Find the NestJS common import block
  let nestImportIdx = -1;   // line with "import {"
  let nestFromIdx = -1;     // line with "} from '@nestjs/common'"
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('from \'@nestjs/common\'') || lines[i].includes('from "@nestjs/common"')) {
      nestFromIdx = i;
      break;
    }
  }
  if (nestFromIdx >= 0) {
    // Walk backwards to find "import {" line
    for (let i = nestFromIdx; i >= 0; i--) {
      if (lines[i].includes('import {')) { nestImportIdx = i; break; }
    }
  }
  
  if (nestImportIdx >= 0) {
    // Add HttpStatus if not present
    if (!lines[nestImportIdx].includes('HttpStatus') && !lines.slice(nestImportIdx + 1, nestFromIdx).some(l => l.includes('HttpStatus'))) {
      lines[nestImportIdx] = lines[nestImportIdx].replace('import {', 'import { HttpStatus,');
    }
    // Add LocalizedException import after the closing brace line
    const fromLine = lines[nestFromIdx];
    const indent = fromLine.match(/^\s*/)?.[0] || '';
    lines.splice(nestFromIdx + 1, 0, `${indent}import { LocalizedException } from '${importPath}';`);
  }
  
  writeFileSync(file, lines.join('\n'), 'utf-8');
}

// Generate translation files - merge new keys with existing
for (const lang of ['en', 'am', 'om', 'so', 'ar']) {
  const dir = join(BACKEND, 'src', 'core', 'localization', 'translations', lang);
  let existing = {};
  try {
    existing = JSON.parse(readFileSync(join(dir, 'messages.json'), 'utf-8'));
  } catch {}
  // Merge: new keys from this run override existing ones with same key
  const merged = { ...existing };
  for (const [key, msg] of allKeys) {
    merged[key] = merged[key] || msg; // only add if not already present
  }
  // Sort keys
  const sorted = {};
  for (const k of Object.keys(merged).sort()) sorted[k] = merged[k];
  writeFileSync(join(dir, 'messages.json'), JSON.stringify(sorted, null, 2) + '\n');
}

console.log(`Processed ${files.length} files, ${allKeys.size} translation keys`);
