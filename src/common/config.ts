import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import { merge } from 'merge';
import path from 'node:path';
import ora from 'ora';
import {
  CONFIG_FILE,
  CONFIG_LOCAL_FILE,
  CONFIG_VALUE_REGEX,
} from './constants.js';
import { Config, ProjectConfig, SympackConfig } from './types.js';

const __dirname = import.meta.dirname;
let config: Config;

export function getConfig(): Config {
  return config;
}

export function setConfig(c: Config) {
  config = c;
}

export async function loadConfig(): Promise<SympackConfig> {
  const logger = ora({ indent: 2 });
  const defaultConfigPath = path.resolve(__dirname, 'files', CONFIG_FILE);
  const defaultLocalConfigPath = path.resolve(
    __dirname,
    'files',
    CONFIG_LOCAL_FILE,
  );
  const configPath = path.resolve(process.cwd(), CONFIG_FILE);
  const localConfigPath = path.resolve(process.cwd(), CONFIG_LOCAL_FILE);
  let config: SympackConfig = (await import(defaultConfigPath)).default;
  let localConfig: SympackConfig = (await import(defaultLocalConfigPath))
    .default;

  try {
    await fs.access(configPath);
    config = (await import(configPath)).default;
    logger.succeed(chalk.dim('Using:', CONFIG_FILE));
  } catch {
    console.warn(chalk.yellow('Config not found.'));
    logger.start(chalk.dim('Creating config file...'));
    await fs.copyFile(defaultConfigPath, configPath);
    logger.succeed(chalk.dim('Created:', CONFIG_FILE));
  }

  try {
    await fs.access(localConfigPath);
    localConfig = (await import(localConfigPath)).default;
    logger.succeed(chalk.dim('Using:', CONFIG_LOCAL_FILE));
  } catch {
    const scope = await select({
      message: 'Select scope for package installation:',
      choices: [
        {
          name: 'Global',
          description: 'Package will be installed globally (npm i -g)',
          value: 'global',
        },
        {
          name: 'Local',
          description:
            'Package will be installed per project (npm i -D --no-save)',
          value: 'local',
        },
      ],
      default: 'local',
      theme: {
        style: {
          answer: (text: string) => text.trim(),
        },
      },
    });

    const paths = (
      await input({
        message:
          'Enter paths to project for package installation (absolute/relative, comma separated):',
        required: true,
        validate: async (value) => {
          const paths = value.split(',').map((s) => s.trim());
          const invalidPaths: string[] = [];
          for (const p of paths) {
            try {
              await fs.access(p);
              await fs.access(path.join(p, 'package.json'));
            } catch {
              invalidPaths.push(p);
            }
          }
          return invalidPaths.length > 0
            ? `The following path(s) do not exist or is not a node project:${invalidPaths.map((p) => `\n    "${p}"`)}`
            : true;
        },
      })
    )
      .split(',')
      .map((s) => s.trim());

    const saveToLocalConfig = await confirm({
      message:
        'Do you want to save these inputs to a local config file? (file will be ignored by git)',
      default: true,
    });

    if (saveToLocalConfig) {
      logger.start(chalk.dim('Creating config file...'));
      let content = await fs.readFile(defaultLocalConfigPath, 'utf-8');
      content = content.replace(
        new RegExp(`scope: ${CONFIG_VALUE_REGEX.source}`),
        `scope: '${scope}'`,
      );
      content = content.replace(
        new RegExp(`projects: ${CONFIG_VALUE_REGEX.source}`),
        `projects: [${paths.map((p) => `{ path: '${p}' }`).join(', ')}]`,
      );
      await fs.writeFile(localConfigPath, content, 'utf-8');
      logger.succeed(chalk.dim('Created:', CONFIG_LOCAL_FILE));

      const gitignorePath = path.resolve(process.cwd(), '.gitignore');
      let gitignoreContent = '';

      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      } catch {
        console.warn(chalk.yellow('.gitignore file not found.'));
        const createGitignore = await confirm({
          message: 'Do you want to create one?',
          default: true,
        });

        if (createGitignore) {
          logger.indent = 2;
          logger.start(chalk.dim('Creating .gitignore file...'));
          await fs.writeFile(gitignorePath, '', 'utf-8');
          logger.succeed(chalk.dim('Created: .gitignore'));
        }
      }

      if (!gitignoreContent.includes(CONFIG_LOCAL_FILE)) {
        logger.indent = 2;
        logger.start(chalk.dim('Updating .gitignore...'));
        gitignoreContent += `\n# sympack local config\n${CONFIG_LOCAL_FILE}\n`;
        await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
        logger.succeed(chalk.dim('Added to .gitignore:', CONFIG_LOCAL_FILE));
      }
    }

    merge(localConfig, {
      install: {
        scope,
        projects: paths.map((p) => ({ path: p }) as ProjectConfig),
      },
    } as SympackConfig);
  }

  return merge(config, localConfig);
}

export function validateConfig(config: SympackConfig): void {
  const logger = ora({ indent: 2 });
  logger.start('Validating config...');

  if (!config.watch) {
    logger.fail(`Missing watch in ${CONFIG_FILE}`);
    process.exit(1);
  }

  if (!config.watch.paths || config.watch.paths.length === 0) {
    logger.fail(`Missing watch.paths in ${CONFIG_FILE}`);
    process.exit(1);
  }

  if (!config.watch.extensions || config.watch.extensions.length === 0) {
    logger.fail(`Missing watch.extensions in ${CONFIG_FILE}`);
    process.exit(1);
  }

  if (!config.install) {
    logger.fail(`Missing install in ${CONFIG_LOCAL_FILE}`);
    process.exit(1);
  }

  if (!config.install.scope) {
    logger.fail(`Missing install.scope in ${CONFIG_LOCAL_FILE}`);
    process.exit(1);
  }

  if (
    config.install.scope === 'local' &&
    (!config.install.projects || config.install.projects.length === 0)
  ) {
    logger.fail(`Missing install.projects in ${CONFIG_LOCAL_FILE}`);
    process.exit(1);
  }

  logger.succeed(chalk.dim('Config is valid'));
}
