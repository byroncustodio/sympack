#! /usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { execa } from 'execa';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import nodemon from 'nodemon';
import { loadConfig, validateConfig } from './config.js';
import ora from 'ora';
import { TEMP_DIR } from './constants.js';
import {
  getPackageFileName,
  getPackageJSON,
  isPackageExtraneous,
} from './utils.js';

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
    const installPaths = config.install!.paths!;

    const nm = nodemon({
      script: path.resolve(__dirname, 'watcher.js'),
      args: ['--scope', installScope, '--paths', installPaths.join(',')],
      watch: watchPaths,
      ext: watchExtensions.join(','),
      delay: 2000,
      signal: 'SIGINT',
    });

    nm.on('restart', (event) => {
      const logger = ora({ indent: 2 });
      const files = event as string[];
      console.info('\nDetected changes in files:');

      files.forEach((file) => logger.info(file.replace(process.cwd(), '.')));

      console.info(chalk.green('\nRestarting sympack...'));
    });

    nm.on('crash', () => {
      nm.emit('quit');
    });

    nm.on('quit', async () => {
      const tempDir = TEMP_DIR;
      const logger = ora({ indent: 2 });
      const { name, version } = await getPackageJSON();

      console.info('\nStopping sympack...');

      if (installScope === 'global') {
        logger.start('Cleaning up global installation');
        try {
          await execa('npm', ['un', '-g', name!]);
        } catch {
          logger.fail('Failed to clean up global installation');
        }
        logger.succeed();
      } else {
        for (const installPath of installPaths) {
          logger.start(`Cleaning up ${chalk.white.bold(installPath)}`);
          try {
            if (await isPackageExtraneous(name!, installPath)) {
              await execa('npm', ['un', name!], { cwd: installPath });
            } else {
              await execa('npm', ['ci'], { cwd: installPath });
            }
          } catch {
            logger.fail(`Failed to clean up ${chalk.white.bold(installPath)}`);
            continue;
          }
          logger.succeed();
        }
      }

      logger.start('Removing temp package file');
      await fs.rm(path.resolve(tempDir, getPackageFileName(name!, version!)), {
        force: true,
      });
      logger.succeed();

      console.info('\nStopped sympack. Exiting...');
      process.exit();
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
