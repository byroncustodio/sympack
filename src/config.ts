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
import { ProjectConfig, SympackConfig } from './types.js';

const __dirname = import.meta.dirname;

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
    logger.succeed(`Found: ${chalk.green(CONFIG_FILE)}`);
  } catch {
    logger.warn('No config file found');

    logger.start('Creating config file...');
    await fs.copyFile(defaultConfigPath, configPath);
    logger.succeed(`Created: ${chalk.green(CONFIG_FILE)}`);
  }

  try {
    await fs.access(localConfigPath);
    localConfig = (await import(localConfigPath)).default;
    logger.succeed(`Found: ${chalk.green(CONFIG_LOCAL_FILE)}`);
  } catch {
    const scope = await select({
      message: 'Select scope for package installation:',
      choices: [
        {
          name: '  Global',
          description: 'Package will be installed globally (npm i -g)',
          value: 'global',
        },
        {
          name: '  Local',
          description:
            'Package will be installed per project (npm i -D --no-save)',
          value: 'local',
        },
      ],
      default: 'local',
      theme: {
        prefix: `  ${chalk.blue('?')}`,
        style: {
          answer: (text: string) => text.trim(),
          description: (text: string) => `  ${text}`,
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
        theme: {
          prefix: `  ${chalk.blue('?')}`,
          style: {
            error: (text: string) => chalk.red(`  ${text}`),
          },
        },
      })
    )
      .split(',')
      .map((s) => s.trim());

    const saveToLocalConfig = await confirm({
      message:
        'Do you want to save these inputs to a local config file? (file will be ignored by git)',
      default: true,
      theme: {
        prefix: `  ${chalk.blue('?')}`,
      },
    });

    if (saveToLocalConfig) {
      logger.start('Creating config file...');
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
      logger.succeed(`Created: ${chalk.green(CONFIG_LOCAL_FILE)}`);

      const gitignorePath = path.resolve(process.cwd(), '.gitignore');
      let gitignoreContent = '';

      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      } catch {
        logger.warn('.gitignore file not found.');
        const createGitignore = await confirm({
          message: 'Do you want to create one?',
          default: true,
        });

        if (createGitignore) {
          await fs.writeFile(gitignorePath, '', 'utf-8');
          logger.succeed(`Created: ${chalk.green('.gitignore')}`);
        }
      }

      if (!gitignoreContent.includes(CONFIG_LOCAL_FILE)) {
        logger.start('Updating .gitignore...');
        gitignoreContent += `\n# sympack local config\n${CONFIG_LOCAL_FILE}\n`;
        await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
        logger.succeed(
          `Added to .gitignore: ${chalk.green(CONFIG_LOCAL_FILE)}`,
        );
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
  logger.start('Validating configuration...');

  if (!config.watch) {
    logger.fail(`Missing watch configuration in ${CONFIG_FILE}`);
    process.exit(1);
  }

  if (!config.watch.paths || config.watch.paths.length === 0) {
    logger.fail(`Missing watch.paths configuration in ${CONFIG_FILE}`);
    process.exit(1);
  }

  if (!config.watch.extensions || config.watch.extensions.length === 0) {
    logger.fail(`Missing watch.extensions configuration in ${CONFIG_FILE}`);
    process.exit(1);
  }

  if (!config.install) {
    logger.fail(`Missing install configuration in ${CONFIG_LOCAL_FILE}`);
    process.exit(1);
  }

  if (!config.install.scope) {
    logger.fail(`Missing install.scope configuration in ${CONFIG_LOCAL_FILE}`);
    process.exit(1);
  }

  if (
    config.install.scope === 'local' &&
    (!config.install.projects || config.install.projects.length === 0)
  ) {
    logger.fail(`Missing install.paths configuration in ${CONFIG_LOCAL_FILE}`);
    process.exit(1);
  }

  logger.succeed('Validated configuration');
}
