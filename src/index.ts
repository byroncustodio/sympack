#! /usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import Phase from './models/Phase.js';
import build from './phase/build.js';
import config, { CONFIG } from './phase/config.js';
import install from './phase/install.js';
import pack from './phase/pack.js';
import Watcher from './watcher.js';

const program = new Command();
const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
let watcher: Watcher;
let isShuttingDown = false;

function createInitialPhases(): Phase[] {
  const phases: Phase[] = [];
  phases.push(config());
  return phases;
}

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
    for (const phase of createInitialPhases()) {
      await phase.run();
    }

    watcher = new Watcher({
      paths: CONFIG.watch.paths,
      phases: createWatcherPhases(),
    });

    await watcher.start();
  });

program.parseAsync().catch((error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    process.exit(0);
  } else {
    console.error('Error:', error.message);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  if (watcher && !isShuttingDown) {
    isShuttingDown = true;
    await watcher.stop();
    process.exit(0);
  }
});
