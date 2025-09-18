import { execa } from 'execa';
import { PackageJson } from 'type-fest';
import { promises as fs } from 'node:fs';
import { PACKAGE_JSON_PATH } from './constants.js';

export async function getPackageJSON(): Promise<
  Pick<PackageJson, 'name' | 'version'>
> {
  const packageJSONPath = PACKAGE_JSON_PATH;
  await fs.access(packageJSONPath);
  const content = await fs.readFile(packageJSONPath, 'utf-8');
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
  const { stdout } = await execa('npm', ['ls', name, '--json', '--depth=0'], {
    cwd: installPath,
  });
  const result = JSON.parse(stdout);
  return result.dependencies?.[name]?.extraneous === true;
}
