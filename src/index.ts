#! /usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { Config, ProjectConfigInternal } from './common/types.js';
import { loadConfig, setConfig, validateConfig } from './common/config.js';
import Phase from './models/Phase.js';
import build from './phase/build/index.js';
import install from './phase/install/index.js';
import pack from './phase/pack/index.js';
import {
  getPackageVersionInProject,
  isPackageExtraneous,
} from './common/utils.js';
import Watcher from './watcher.js';

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
const program = new Command();
let watcher: Watcher;
let isShuttingDown = false;

function createWatcherPhases(): Phase[] {
  const phases: Phase[] = [];
  phases.push(build());
  phases.push(pack());
  phases.push(install());
  return phases;
}

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version)
  .action(async () => {
    console.info('▸ Config');
    const sympackConfig = await loadConfig();
    validateConfig(sympackConfig);

    const config: Config = {
      watch: {
        paths: sympackConfig.watch!.paths ?? ['src/**'],
        extensions: sympackConfig.watch!.extensions ?? ['js', 'ts'],
      },
      install: {
        scope: sympackConfig.install!.scope,
        projects: sympackConfig.install!.projects,
      },
    };

    for (const project of config.install.projects as ProjectConfigInternal[]) {
      const isExtraneous = await isPackageExtraneous(
        packageJson.name,
        project.path,
      );
      if (!isExtraneous) {
        const { type, version } = await getPackageVersionInProject(
          packageJson.name,
          project.path,
        );
        project.type = type;
        project.version = version;
      }
    }

    setConfig(config);

    /*const phase = await Phase.create({
      name: 'Config',
      setup: config
    });

    const result = await phase.run();
    const data = result.data! as Config;*/

    watcher = new Watcher({
      paths: config.watch.paths,
      phases: createWatcherPhases(),
    });

    await watcher.start();
  });

program.parse();

process.on('SIGINT', async () => {
  if (watcher && !isShuttingDown) {
    isShuttingDown = true;
    await watcher.stop();
    process.exit(0);
  }
});
