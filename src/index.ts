#! /usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import nodemon from 'nodemon';
import { loadConfig, validateConfig } from './config.js';
import ora from 'ora';

const __dirname = import.meta.dirname;
const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
const program = new Command();

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version)
  .action(async () => {
    console.info('Loading configuration...');
    const config = await loadConfig();
    validateConfig(config);
    console.info(chalk.green('\nConfiguration loaded'));

    const watchPaths = config.watch!.paths;
    const watchExtensions = config.watch!.extensions!;
    const installScope = config.install!.scope;
    const installProjects = config.install!.projects!;

    const args: string[] = [];

    args.push('--scope');
    args.push(installScope);

    installProjects.forEach((p) => {
      args.push('--project');
      args.push(
        `path=${p.path}${p.noSave !== undefined ? `,noSave=${p.noSave}` : ',noSave=true'}${p.hasPeerDependencies !== undefined ? `,hasPeerDependencies=${p.hasPeerDependencies}` : ''}`,
      );
    });

    const nm = nodemon({
      script: path.resolve(__dirname, 'watcher.js'),
      args,
      watch: watchPaths,
      ext: watchExtensions.join(','),
      delay: 2000,
    });

    nm.on('restart', (event) => {
      const logger = ora({ indent: 2 });
      const files = event as string[];
      console.info('\nDetected changes in files:');

      files.forEach((file) => logger.info(file.replace(process.cwd(), '.')));

      console.info(chalk.green('\nRestarting sympack...'));
    });

    nm.on('crash', () => {
      process.exit(1);
    });

    nm.on('exit', (code) => {
      if (!code) {
        process.exit(0);
      }
    });
  });

program.parseAsync().catch((error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    process.exit(0);
  } else {
    console.error('Error:', error.message);
    process.exit(1);
  }
});
