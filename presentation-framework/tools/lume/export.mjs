#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const helpText = `
Lume Export CLI
===============

Usage:
  npm run lume:export -- --deck <presentation> [--output dist/my-deck.lume]
  npm run lume:export -- --input <path/to/module.tsx> [--output ...]
  npm run lume:export -- --help

Options:
  --deck <name>        Presentation key registered in src/presentations/index.ts
  --input <file>       Path to standalone presentation module to import dynamically
  --output <file>      Destination .lume file (default: ./dist/<deck>.lume)
  --assets <dir>       Optional assets directory for standalone input
  --no-rsc             Disable RSC payload generation (JSON only)
  --help               Show this message
`;

void main();

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(helpText);
    return;
  }

  const { deck, input, output, assets, noRsc } = parseArgs(args);

  const cwd = process.cwd();
  const resolvedAssets = assets ? path.resolve(cwd, assets) : undefined;

  const presentationModule = await loadPresentationModule({ deck, input, cwd });
  const slides = await loadSlides(presentationModule, resolvedAssets);

  const assetEntries = resolvedAssets ? await collectAssets(resolvedAssets) : {};

  const deckId = deck ?? deriveDeckId(input);
  const title = deck ? toTitle(deck) : deriveTitleFromPath(input);

  const { createLumePackageFromSlides } = await import('../../src/lume/transform.ts');
  const pkg = createLumePackageFromSlides(slides, {
    deckId,
    title,
  });

  let tempPackagePath = null;
  let rscPayload = null;

  if (!noRsc) {
    tempPackagePath = await writePackageToTemp(pkg);
    rscPayload = await generateRscPayload({
      packagePath: tempPackagePath,
      cwd,
    });
    if (rscPayload) {
      assetEntries['lume.rsc'] = rscPayload;
    } else {
      console.warn('⚠️  RSC payload could not be generated. Exporting JSON + assets only.');
    }
  }

  const { exportSlidesAsLume } = await import('../../src/services/LumePackageService.ts');
  const { archive, package: exportedPkg } = await exportSlidesAsLume(
    slides,
    {
      deckId,
      title,
    },
    assetEntries,
    {
      includeRsc: false,
    },
  );

  if (tempPackagePath) {
    await fs.rm(path.dirname(tempPackagePath), { recursive: true, force: true });
  }

  const outputPath = path.resolve(cwd, output ?? defaultOutput(deckId));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(archive));

  console.log(`✅ Exported ${exportedPkg.meta.title} to ${outputPath}`);
  if (rscPayload) {
    console.log('   • Embedded lume.rsc payload');
  }
  if (resolvedAssets) {
    console.log(`   • Packaged assets from ${resolvedAssets}`);
  }
}

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--deck':
        result.deck = args[++i];
        break;
      case '--input':
        result.input = args[++i];
        break;
      case '--output':
        result.output = args[++i];
        break;
      case '--assets':
        result.assets = args[++i];
        break;
      case '--no-rsc':
        result.noRsc = true;
        break;
      default:
        console.warn(`⚠️  Unknown argument: ${arg}`);
        break;
    }
  }

  if (!result.deck && !result.input) {
    throw new Error('Provide --deck <name> or --input <path>.');
  }

  return result;
}

function defaultOutput(deckId) {
  return path.join('dist', `${deckId}.lume`);
}

function deriveDeckId(input) {
  if (!input) return 'deck';
  return path.basename(input, path.extname(input));
}

function deriveTitleFromPath(input) {
  if (!input) return 'Deck';
  return toTitle(deriveDeckId(input));
}

function toTitle(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function loadPresentationModule({ deck, input, cwd }) {
  const { register } = await import('tsx/esm/api');
  register();
  await import('./preload-css.mjs');

  if (deck) {
    const { loadPresentation } = await import('../../src/presentations/index.ts');
    return loadPresentation(deck);
  }

  if (!input) {
    throw new Error('Missing --input path');
  }

  const fullPath = path.resolve(cwd, input);
  if (!existsSync(fullPath)) {
    throw new Error(`Presentation module not found: ${fullPath}`);
  }

  return import(pathToFileURL(fullPath).href);
}

async function loadSlides(presentationModule, assetsPath) {
  if (!presentationModule || typeof presentationModule.getSlides !== 'function') {
    throw new Error('Presentation module must export getSlides(assetsPath: string)');
  }

  return presentationModule.getSlides(assetsPath ?? '');
}

async function collectAssets(directory) {
  const map = {};
  const rootName = path.basename(directory);

  async function walk(current, relativeBase) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      const relPath = path.join(relativeBase, entry.name);
      if (entry.isDirectory()) {
        await walk(absPath, relPath);
      } else if (entry.isFile()) {
        const data = await fs.readFile(absPath);
        map[path.join('assets', relPath)] = data;
      }
    }
  }

  await walk(directory, rootName);
  return map;
}

async function writePackageToTemp(pkg) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lume-rsc-'));
  const filePath = path.join(tmpDir, 'package.json');
  await fs.writeFile(filePath, JSON.stringify(pkg));
  return filePath;
}

async function generateRscPayload({ packagePath, cwd }) {
  const preloadTsx = path.resolve(__dirname, 'preload-tsx.mjs');
  const preloadCss = path.resolve(__dirname, 'preload-css.mjs');
  const runner = path.resolve(__dirname, 'render-rsc-runner.mjs');

  const spawnArgs = [
    '--conditions=react-server',
    '--import', preloadTsx,
    '--import', preloadCss,
    runner,
    '--package', packagePath,
  ];

  return new Promise((resolve) => {
    const child = spawn(process.execPath, spawnArgs, {
      stdio: ['ignore', 'pipe', 'inherit'],
      cwd,
    });

    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
      stdout += data;
    });

    child.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const buffer = Buffer.from(stdout.trim(), 'base64');
          resolve(new Uint8Array(buffer));
          return;
        } catch (err) {
          console.error('Failed to decode RSC payload:', err);
        }
      }
      resolve(null);
    });
  });
}
