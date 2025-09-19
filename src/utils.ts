import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PackageJson } from 'type-fest';
import { PACKAGE_JSON_PATH } from './constants.js';

function getVersion(dep: string) {
  const match = dep.match(/\d+(?:\.\d+){0,2}/);
  return match ? match[0] : undefined;
}

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
  projectPath: string,
): Promise<boolean> {
  const packageJSONPath = path.join(projectPath, 'package.json');
  const content = await fs.readFile(packageJSONPath, 'utf-8');
  const packageJSON = JSON.parse(content) as PackageJson;
  return !(
    packageJSON.dependencies?.[name] ||
    packageJSON.devDependencies?.[name] ||
    packageJSON.peerDependencies?.[name]
  );
}

export async function getPackageVersionInProject(
  name: string,
  projectPath: string,
): Promise<{ type: string; version?: string }> {
  const packageJSONPath = path.join(projectPath, 'package.json');
  const content = await fs.readFile(packageJSONPath, 'utf-8');
  const packageJSON = JSON.parse(content) as PackageJson;

  if (packageJSON.dependencies?.[name]) {
    return {
      type: 'dependencies',
      version: getVersion(packageJSON.dependencies[name]),
    };
  }
  if (packageJSON.devDependencies?.[name]) {
    return {
      type: 'devDependencies',
      version: getVersion(packageJSON.devDependencies[name]),
    };
  }
  if (packageJSON.peerDependencies?.[name]) {
    return {
      type: 'peerDependencies',
      version: getVersion(packageJSON.peerDependencies[name]),
    };
  }

  throw new Error(`Package ${name} not found in project dependencies.`);
}
