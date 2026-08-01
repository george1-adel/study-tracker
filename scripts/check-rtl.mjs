import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('src');

function getFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getFiles(res, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      files.push(res);
    }
  }
  return files;
}

const cssFiles = getFiles(SRC_DIR, ['.css']);
const tsxFiles = getFiles(SRC_DIR, ['.tsx']);

let errors = [];

// CSS Rules
// Ban: margin-left, margin-right, padding-left, padding-right, border-left, border-right,
// bare left: or right:, text-align: left|right
const cssBans = [
  { regex: /\bmargin-left\b/, msg: 'Use margin-inline-start / margin-inline-end instead of margin-left' },
  { regex: /\bmargin-right\b/, msg: 'Use margin-inline-start / margin-inline-end instead of margin-right' },
  { regex: /\bpadding-left\b/, msg: 'Use padding-inline-start / padding-inline-end instead of padding-left' },
  { regex: /\bpadding-right\b/, msg: 'Use padding-inline-start / padding-inline-end instead of padding-right' },
  { regex: /\bborder-left\b/, msg: 'Use border-inline-start instead of border-left' },
  { regex: /\bborder-right\b/, msg: 'Use border-inline-end instead of border-right' },
  { regex: /(?<![\w-])(left|right)\s*:/, msg: 'Use inset-inline-start / inset-inline-end instead of bare left: or right:' },
  { regex: /\btext-align\s*:\s*(left|right)\b/, msg: 'Use text-align: start / end instead of text-align: left|right' },
];

for (const file of cssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Strip CSS comments
    const cleanLine = line.replace(/\/\*.*?\*\//g, '');
    for (const ban of cssBans) {
      if (ban.regex.test(cleanLine)) {
        errors.push(`${path.relative(process.cwd(), file)}:${idx + 1}: ${ban.msg}`);
      }
    }
  });
}

// TSX Rules
// Ban: JSX text node of two or more letters that is not inside a t( call
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Strip comments
    let trimmed = line.replace(/\/\/.*/, '').trim();
    if (!trimmed) return;
    if (trimmed.startsWith('import ') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // Match text between > and <
    const matches = trimmed.matchAll(/>([^<>{}]*)</g);
    for (const match of matches) {
      const text = match[1].trim();
      // Skip if empty or less than 2 letters
      const letters = text.match(/[a-zA-Z\u0600-\u06FF]/g);
      if (!letters || letters.length < 2) continue;

      // Check if it's inside t(...) - if it's text node between > and < without {}, it cannot be inside t()
      errors.push(`${path.relative(process.cwd(), file)}:${lineNum}: Hardcoded JSX text string "${text}". Use t() instead.`);
    }

    // Match string literal child in JSX: >{"..."}< or >{'...'}< if not in t()
    const strExprMatches = trimmed.matchAll(/>\s*\{\s*(["'])(.*?)\1\s*\}\s*</g);
    for (const match of strExprMatches) {
      const strVal = match[2].trim();
      const letters = strVal.match(/[a-zA-Z\u0600-\u06FF]/g);
      if (letters && letters.length >= 2) {
        errors.push(`${path.relative(process.cwd(), file)}:${lineNum}: Hardcoded JSX string literal "${strVal}". Use t() instead.`);
      }
    }
  });
}

if (errors.length > 0) {
  console.error('check:rtl FAILED with errors:');
  errors.forEach((err) => console.error('  ' + err));
  process.exit(1);
} else {
  console.log('check:rtl: OK');
  process.exit(0);
}
