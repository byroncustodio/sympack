import chalk from 'chalk';
import { execa } from 'execa';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ora from 'ora';
import { TEMP_DIR } from './constants.js';
import PackageError from './error.js';
import { PackageProps, ProjectConfigInternal, ScopeType } from './types.js';
import { getPackageFileName } from './utils.js';

class Package {
  readonly rootDir: string;
  readonly name: string;
  readonly version: string;
  readonly scope: ScopeType;
  readonly projects: ProjectConfigInternal[];
  readonly file: string;

  constructor(props: PackageProps) {
    this.rootDir = props.rootDir;
    this.name = props.name;
    this.version = props.version;
    this.scope = props.scope;
    this.projects = props.projects ?? [];
    this.file = getPackageFileName(props.name, props.version);
  }

  async build() {
    const logger = ora({ indent: 2 });

    try {
      logger.start('Type checking...');
      await execa`tsc --project ${this.rootDir} --noEmit`;
      logger.succeed('Type check passed');

      logger.start('Building project...');
      await execa('npm', ['run', 'build'], { cwd: this.rootDir });
      logger.succeed('Project built');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Missing script: "build"')) {
          logger.fail('No build script found in package.json');
          throw new Error('sympack ran into an error. Exiting...');
        }
        throw error;
      }
      throw new PackageError(error, logger);
    }
  }

  async pack() {
    const tempDir = TEMP_DIR;
    const logger = ora({ indent: 2 });

    try {
      logger.start('Creating package...');
      await fs.access(tempDir).catch(async () => {
        await fs.mkdir(tempDir, { recursive: false });
      });
      await execa('npm', ['pack'], { cwd: this.rootDir });
      await fs.rename(
        path.resolve(this.rootDir, this.file),
        path.resolve(tempDir, this.file),
      );
      logger.succeed('Package created');
      logger.indent = 4;
      logger.info(chalk.dim('Created in:', tempDir));
      logger.info(chalk.dim('File:', this.file));
    } catch (error) {
      throw new PackageError(error, logger);
    }
  }

  async install() {
    const logger = ora({ indent: 2 });

    if (this.scope === 'global') {
      try {
        logger.start('Installing globally...');
        await execa('npm', [
          'i',
          '-g',
          path.join(TEMP_DIR, this.file),
          '--no-save',
          '--ignore-scripts',
        ]);
        logger.succeed('Package installed globally');
      } catch (error) {
        throw new PackageError(error, logger);
      }
    } else {
      for (const project of this.projects) {
        try {
          logger.start(`Installing in ${project.path}...`);
          const args = ['i', path.join(TEMP_DIR, this.file)];
          if (project.noSave) {
            args.push('--no-save');
          }
          if (project.hasPeerDependencies) {
            args.push('--legacy-peer-deps');
          }
          args.push('--ignore-scripts');
          await execa('npm', args, { cwd: project.path });
          logger.succeed(`Package installed in ${project.path}`);
          logger.indent = 4;
          logger.info(chalk.dim('hasNoSave:', !!project.noSave));
          logger.info(
            chalk.dim('hasPeerDependencies:', !!project.hasPeerDependencies),
          );
          logger.indent = 2;
        } catch (error) {
          throw new PackageError(error, logger);
        }
      }
    }
  }
}

export default Package;
