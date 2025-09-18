import chalk from 'chalk';
import { execa } from 'execa';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ora from 'ora';
import { TEMP_DIR } from './constants.js';
import PackageError from './error.js';
import { PackageProps, ScopeType } from './types.js';
import { getPackageFileName } from './utils.js';

class Package {
  readonly rootDir: string;
  readonly name: string;
  readonly version: string;
  readonly scope: ScopeType;
  readonly paths: string[];
  readonly file: string;

  constructor(props: PackageProps) {
    this.rootDir = props.rootDir;
    this.name = props.name;
    this.version = props.version;
    this.scope = props.scope;
    this.paths = props.paths ?? [];
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
      logger.info(chalk.dim(`Created in: ${tempDir}`));
      logger.info(chalk.dim(`File: ${this.file}`));
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
      for (const p of this.paths) {
        try {
          logger.start(`Installing in ${p}...`);
          await execa(
            'npm',
            [
              'i',
              '-D',
              path.join(TEMP_DIR, this.file),
              '--no-save',
              '--ignore-scripts',
              '--legacy-peer-deps',
            ],
            { cwd: p },
          );
          logger.succeed(`Package installed in ${p}`);
        } catch (error) {
          throw new PackageError(error, logger);
        }
      }
    }
  }
}

export default Package;
