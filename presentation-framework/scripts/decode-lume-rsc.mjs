#!/usr/bin/env node
import fs from 'node:fs';
import JSZip from 'jszip';
import { parseDeckSummaryFromText } from '../src/lume/rsc/parseSummary.ts';

async function main(file) {
  const data = fs.readFileSync(file);
  const zip = await JSZip.loadAsync(data);
  const rscBuffer = await zip.file('lume.rsc').async('nodebuffer');
  const text = Buffer.from(rscBuffer).toString('utf8');
  const summary = parseDeckSummaryFromText(text);
  console.log(JSON.stringify(summary, null, 2));
}

const file = process.argv[2] ?? 'dist/jsconf-rsc.lume';
main(file).catch((err) => {
  console.error(err);
  process.exit(1);
});
