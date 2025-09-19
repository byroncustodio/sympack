#! /usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import nodemon from 'nodemon';
import { loadConfig, validateConfig } from './config.js';
import ora from 'ora';
import { ProjectConfigInternal } from './types.js';
import { getPackageVersionInProject, isPackageExtraneous } from './utils.js';

const __dirname = import.meta.dirname;
const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
const program = new Command();

function buildProjectArgs(project: ProjectConfigInternal) {
  const args: string[] = [];

  args.push(`path=${project.path}`);

  if (project.noSave !== undefined) {
    args.push(`noSave=${project.noSave}`);
  } else {
    args.push('noSave=true');
  }

  if (project.hasPeerDependencies !== undefined) {
    args.push(`hasPeerDependencies=${project.hasPeerDependencies}`);
  }

  if (project.type) {
    args.push(`type=${project.type}`);
  }

  if (project.version) {
    args.push(`version=${project.version}`);
  }

  return args.join(',');
}

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
    const installProjects = config.install!
      .projects! as ProjectConfigInternal[];

    for (const project of installProjects) {
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

    const args: string[] = [];

    args.push('--scope');
    args.push(installScope);

    installProjects.forEach((p) => {
      args.push('--project');
      args.push(buildProjectArgs(p));
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
