import module from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const loaderPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'css-loader.mjs');
module.register(loaderPath, { parentURL: import.meta.url });
