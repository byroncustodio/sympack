import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PackageJson } from 'type-fest';
import { PACKAGE_JSON_PATH } from './constants.js';

export async function getPackageJSON(): Promise<
  Pick<PackageJson, 'name' | 'version'>
> {
  const content = await fs.readFile(PACKAGE_JSON_PATH, 'utf-8');
  return JSON.parse(content);
}

export function getPackageFileName(name: string, version: string) {
  name = name.replace('@', '').replace('/', '-');
  return `${name}-${version}.tgz`;
}

export async function isPackageExtraneous(
  name: string,
  installPath: string,
): Promise<boolean> {
  const packageJSONPath = path.join(installPath, 'package.json');
  const content = await fs.readFile(packageJSONPath, 'utf-8');
  const packageJSON = JSON.parse(content) as PackageJson;
  return !(
    packageJSON.dependencies?.[name] ||
    packageJSON.devDependencies?.[name] ||
    packageJSON.peerDependencies?.[name]
  );
}
