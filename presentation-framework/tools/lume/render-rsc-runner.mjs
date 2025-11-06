#!/usr/bin/env node

import fs from 'node:fs/promises';

import { renderDeckToRSC } from '../../src/lume/rsc/renderDeck.ts';
import { readableStreamToUint8Array } from './stream-utils.mjs';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.packagePath) {
    throw new Error('Missing --package path');
  }

  const contents = await fs.readFile(args.packagePath, 'utf8');
  const pkg = JSON.parse(contents);

  const stream = await renderDeckToRSC(pkg, {
    presentationName: pkg.meta?.id ?? args.packagePath,
    presentationTitle: pkg.meta?.title,
  });

  const bytes = await readableStreamToUint8Array(stream);
  const payload = Buffer.from(bytes).toString('base64');
  process.stdout.write(payload);
}

function parseArgs(argv) {
  const result = {
    packagePath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--package') {
      result.packagePath = argv[++i];
    }
  }

  return result;
}

main().catch((error) => {
  console.error('[RSC runner] failed:', error);
  process.exitCode = 1;
});
