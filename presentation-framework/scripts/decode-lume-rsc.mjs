#!/usr/bin/env node
import fs from 'node:fs';
import JSZip from 'jszip';

async function decode(file) {
  const data = fs.readFileSync(file);
  const zip = await JSZip.loadAsync(data);
  const rsc = await zip.file('lume.rsc').async('nodebuffer');
  const text = Buffer.from(rsc).toString('utf8');
  const lines = text.split('\n').filter(Boolean);
  const payloads = lines
    .filter((line) => line.startsWith('1:'))
    .map((line) => JSON.parse(line.substring(2)));
  const deck = payloads[payloads.length - 1].props.deck;
  console.log(JSON.stringify(deck, null, 2));
}

decode(process.argv[2] ?? 'dist/jsconf-rsc.lume').catch((err) => {
  console.error(err);
  process.exit(1);
});
