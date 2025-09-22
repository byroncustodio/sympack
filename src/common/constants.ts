import path from 'node:path';

export const CONFIG_FILE = 'sympack.config.js';
export const CONFIG_LOCAL_FILE = 'sympack.config.local.js';
export const CONFIG_VALUE_REGEX = /['"]?[^'"\s,}]+['"]?/;
export const TEMP_DIR = path.resolve(process.env.TMPDIR!, 'sympack');
export const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');
