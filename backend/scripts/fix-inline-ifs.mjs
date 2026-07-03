#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

// Get the git diff for all service files
const diff = execSync('git diff HEAD -- "*.service.ts"', { encoding: 'utf-8' });
const lines = diff.split('\n');

// Parse diff to find pairs where an if-condition was lost
// Pattern: -    if (<cond>) throw new <Exception>('msg');
//          +throw new LocalizedException('key', ...)
const fixes = []; // { file, line, oldIf, newThrow }

let currentFile = '';
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  
  // Track the file being diffed
  const fileMatch = line.match(/^\+\+\+ b\/(.+\.service\.ts)/);
  if (fileMatch) {
    currentFile = fileMatch[1];
    i++;
    continue;
  }
  
  // Look for removed if-throw lines followed by added LocalizedException lines
  if (line.startsWith('-') && !line.startsWith('---') && !line.startsWith('-- ')) {
    const removedLine = line.substring(1);
    const ifMatch = removedLine.match(/^\s*if\s*\((.+?)\)\s+throw\s+new\s+\w+Exception\(/);
    
    if (ifMatch) {
      const condition = ifMatch[1];
      const nextLine = lines[i + 1];
      
      if (nextLine && nextLine.startsWith('+') && nextLine.includes('LocalizedException')) {
        const addedLine = nextLine.substring(1);
        const throwMatch = addedLine.match(/^\s*(throw new LocalizedException\('[^']+',\s*undefined,\s*(?:undefined|HttpStatus\.\w+),\s*'[^']*'\))\s*;?\s*/);
        
        if (throwMatch) {
          const throwStmt = throwMatch[1];
          // Get the original indentation from the removed line
          const indent = removedLine.match(/^\s*/)[0];
          const oldThrow = lines[i + 1]; // The + line
          
          fixes.push({
            file: currentFile,
            fullLine: addedLine,
            replacement: `${indent}if (${condition}) ${throwStmt};`,
          });
        }
      }
    }
  }
  
  i++;
}

console.log(`Found ${fixes.length} inline if-throws to fix`);

// Group fixes by file
const byFile = {};
for (const fix of fixes) {
  if (!byFile[fix.file]) byFile[fix.file] = [];
  byFile[fix.file].push(fix);
}

// Apply fixes to each file (in reverse order to preserve line numbers)
for (const [file, fileFixes] of Object.entries(byFile)) {
  let content = readFileSync(file, 'utf-8');
  const fileLines = content.split('\n');
  
  // Find each throw line and replace it
  for (const fix of fileFixes) {
    const searchStr = fix.fullLine.trim();
    const replaceStr = fix.replacement.trim();
    
    // Find the line in the file
    for (let j = 0; j < fileLines.length; j++) {
      if (fileLines[j].trim() === searchStr) {
        fileLines[j] = fix.replacement;
        break;
      }
    }
  }
  
  const newContent = fileLines.join('\n');
  writeFileSync(file, newContent, 'utf-8');
  console.log(`  Fixed ${fileFixes.length} in ${file}`);
}
