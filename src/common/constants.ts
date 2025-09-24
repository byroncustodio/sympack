import path from 'node:path';
import { SympackConfig } from './types.js';

export const DEFAULT_CONFIG: SympackConfig = {
  watch: {
    paths: ['src/**'],
    extensions: ['ts', 'js'],
  },
};
export const CONFIG_FILE = 'sympack.config.js';
export const LOCAL_CONFIG_FILE = 'sympack.config.local.js';
export const TEMP_DIR = path.resolve(process.env.TMPDIR!, 'sympack');
export const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');
export const CONFIG_FILE_TEMPLATE =
  "// @ts-check\n\n/** @type {import('sympack').SympackConfig} */\nCONFIG_HERE\n\nexport default config;\n";
