import fs from 'node:fs';

const targets = [
  'server/core/prompt-directive.mjs',
  'scripts/validate-phase150-prompt-directive-output.mjs',
  'PHASE150_PROMPT_DIRECTIVE_OUTPUT_COMPRESSION_20260501_KO.md',
  'PHASE150_PROMPT_DIRECTIVE_OUTPUT_VALIDATION_20260501.json',
  'README_PATCH_P150_KO.txt'
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { force: true });
    console.log(`[removed] ${target}`);
  } else {
    console.log(`[skip] ${target}`);
  }
}

console.log('Phase150 prompt-directive cleanup complete.');
