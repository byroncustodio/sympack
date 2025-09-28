import { confirm, checkbox, input, select } from '@inquirer/prompts';
import { merge } from 'merge';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'node:path';
import colors from 'yoctocolors';
import {
  CONFIG_FILE,
  CONFIG_FILE_TEMPLATE,
  DEFAULT_CONFIG,
  LOCAL_CONFIG_FILE,
} from '../common/constants.js';
import { ConfigValidationError } from '../common/error.js';
import { Config, ProjectConfig, SympackConfig } from '../common/types.js';
import {
  getPackageVersionInProject,
  isPackageExtraneous,
} from '../common/utils.js';
import Phase from '../models/Phase.js';
import Task from '../models/Task.js';

function getPromptPrefixStyle(level: number) {
  const indent = ' '.repeat(level);

  return {
    idle: `${indent}${colors.blue('?')}`,
    done: `${indent}${colors.green('✔')}`,
  };
}

function showDoneMessage(message: string) {
  return (text: string, status: string) => {
    if (status === 'done') {
      return chalk.reset(`${message}:`);
    }

    return chalk.white.bold(text);
  };
}

async function projectPathInput(name: string) {
  return input({
    message: `Enter local path to ${name} (absolute/relative, comma separated):`,
    required: true,
    theme: {
      prefix: getPromptPrefixStyle(4),
      style: {
        answer: (text: string) => chalk.green(text.trim()),
        message: showDoneMessage('Path'),
      },
    },
    validate: async (value) => {
      try {
        await fs.access(value);
        await fs.access(path.join(value, 'package.json'));
        return true;
      } catch {
        return `The path "${value}" does not exist or is not a node project.`;
      }
    },
  });
}

async function projectSettingsInput(project: Partial<ProjectConfig>) {
  const indent = ' '.repeat(3);

  return checkbox({
    message: `Select settings for ${project.name}:`,
    choices: [
      {
        name: `Do not save to package.json ${chalk.dim('(--no-save)')}`,
        short: '--no-save',
        value: 'noSave',
        checked: project.noSave === undefined ? true : project.noSave,
      },
      {
        name: `Has peer dependencies ${chalk.dim('(--legacy-peer-deps)')}`,
        short: '--legacy-peer-deps',
        value: 'hasPeerDependencies',
        checked: project.hasPeerDependencies,
      },
    ],
    theme: {
      prefix: getPromptPrefixStyle(4),
      style: {
        answer: (text: string) => chalk.green(text.trim() || 'No settings'),
        message: showDoneMessage('Settings'),
      },
      icon: {
        checked: `${indent}◉`,
        unchecked: `${indent}◯`,
        cursor: '❯',
      },
      helpMode: 'always',
    },
  });
}

function objectToUnquotedString(obj: unknown, indent = 0): string {
  if (Array.isArray(obj)) {
    return (
      '[\n' +
      obj
        .map(
          (item) =>
            ' '.repeat(indent + 2) + objectToUnquotedString(item, indent + 2),
        )
        .join(',\n') +
      '\n' +
      ' '.repeat(indent) +
      ']'
    );
  }
  if (typeof obj === 'object' && obj !== null) {
    return (
      '{\n' +
      Object.entries(obj)
        .map(
          ([key, value]) =>
            ' '.repeat(indent + 2) +
            `${key}: ${objectToUnquotedString(value, indent + 2)}`,
        )
        .join(',\n') +
      '\n' +
      ' '.repeat(indent) +
      '}'
    );
  }
  if (typeof obj === 'string') {
    return `'${obj.replace(/'/g, "\\'")}'`;
  }
  return String(obj);
}

function validateConfig(config: SympackConfig) {
  if (!config.watch) {
    throw new ConfigValidationError(`Missing watch in ${CONFIG_FILE}`);
  } else {
    if (!config.watch.paths || config.watch.paths.length === 0) {
      throw new ConfigValidationError(
        `watch.paths must be a non-empty array in ${CONFIG_FILE}`,
      );
    } else if (!Array.isArray(config.watch.paths)) {
      throw new ConfigValidationError(
        `watch.paths must be an array in ${CONFIG_FILE}`,
      );
    }

    if (!config.watch.extensions || config.watch.extensions.length === 0) {
      throw new ConfigValidationError(
        `watch.extensions must be a non-empty array in ${CONFIG_FILE}`,
      );
    } else if (!Array.isArray(config.watch.extensions)) {
      throw new ConfigValidationError(
        `watch.extensions must be an array in ${CONFIG_FILE}`,
      );
    }
  }

  if (!config.install) {
    throw new ConfigValidationError(`Missing install in ${CONFIG_FILE}`);
  } else {
    if (!config.install.scope) {
      throw new ConfigValidationError(
        `install.scope is required in ${CONFIG_FILE}`,
      );
    } else if (
      config.install.scope !== 'local' &&
      config.install.scope !== 'global'
    ) {
      throw new ConfigValidationError(
        `install.scope must be either 'local' or 'global' in ${CONFIG_FILE}`,
      );
    }

    if (config.install.scope === 'local') {
      if (!config.install.projects || config.install.projects.length === 0) {
        throw new ConfigValidationError(
          `install.projects is missing and must be an array when install.scope is 'local' in ${CONFIG_FILE}`,
        );
      } else {
        for (const project of config.install.projects) {
          if (!project.name) {
            throw new ConfigValidationError(
              `Each project in install.projects must have a name in ${CONFIG_FILE}`,
            );
          }
        }
      }
    }
  }
}

function validateLocalConfig(config: SympackConfig, mainConfig: SympackConfig) {
  if (!config.install) {
    throw new ConfigValidationError(`Missing install in ${LOCAL_CONFIG_FILE}`);
  } else {
    if (!config.install.projects || config.install.projects.length === 0) {
      throw new ConfigValidationError(
        `install.projects must be a non-empty array in ${LOCAL_CONFIG_FILE}`,
      );
    }

    for (const project of config.install.projects) {
      if (!project.name) {
        throw new ConfigValidationError(
          `Each project in install.projects must have a name in ${LOCAL_CONFIG_FILE}`,
        );
      }
      if (!project.path) {
        throw new ConfigValidationError(
          `Each project in install.projects must have a path in ${LOCAL_CONFIG_FILE}`,
        );
      }

      if (
        mainConfig.install?.projects &&
        !mainConfig.install.projects.find((p) => p.name === project.name)
      ) {
        throw new ConfigValidationError(
          `Project name "${project.name}" in ${LOCAL_CONFIG_FILE} does not exist in ${CONFIG_FILE}`,
        );
      }
    }
  }
}

async function attachProjectMetadata(name: string, project: ProjectConfig) {
  const isExtraneous = await isPackageExtraneous(name, project.path!);
  if (!isExtraneous) {
    const { type, version } = await getPackageVersionInProject(
      name,
      project.path!,
    );
    project.type = type;
    project.version = version;
  }
}

export const CONFIG: Config = {
  ...DEFAULT_CONFIG,
  watch: DEFAULT_CONFIG.watch ?? {
    paths: ['src/**'],
    extensions: ['js', 'ts'],
  },
};

const loadConfig = new Task({
  message: 'Loading config',
  execute: async function (this: Task) {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
    const configPath = path.resolve(process.cwd(), CONFIG_FILE);
    const localConfigPath = path.resolve(process.cwd(), LOCAL_CONFIG_FILE);

    try {
      try {
        await fs.access(configPath);
        const importedConfig: SympackConfig = (await import(configPath))
          .default;
        validateConfig(importedConfig);
        if (importedConfig.install!.scope === 'local') {
          try {
            await fs.access(configPath);
            const importedLocalConfig: SympackConfig = (
              await import(localConfigPath)
            ).default;
            validateLocalConfig(importedLocalConfig, importedConfig);

            for (let project of importedConfig.install!.projects!) {
              const localProject = importedLocalConfig.install!.projects!.find(
                (p) => p.name === project.name,
              )!;
              await attachProjectMetadata(packageJson.name, localProject);
              project = merge(project, localProject);
            }
          } catch (error) {
            if (error instanceof ConfigValidationError) {
              return Task.error(error);
            }

            this.logger!.stop();
            console.warn(
              chalk.yellow(
                `⚠ ${LOCAL_CONFIG_FILE} not found. Creating a new one...`,
              ),
            );
            const localConfig: SympackConfig = { install: { projects: [] } };

            for (const project of importedConfig.install!.projects!) {
              console.info(
                chalk.green('  ✔'),
                'Found project:',
                chalk.green(project.name),
              );
              const projectPath = await projectPathInput(project.name);
              localConfig.install!.projects!.push({
                name: project.name,
                path: projectPath,
                skipInstall: false,
              });
            }

            const localContent = CONFIG_FILE_TEMPLATE.replace(
              'CONFIG_HERE',
              `const config = ${objectToUnquotedString(localConfig)};`,
            );
            await fs.writeFile(localConfigPath, localContent, 'utf-8');

            for (let project of importedConfig.install!.projects!) {
              const localProject = localConfig.install!.projects!.find(
                (p) => p.name === project.name,
              )!;
              await attachProjectMetadata(packageJson.name, localProject);
              project = merge(project, localProject);
            }
          }
        }
        merge(CONFIG, importedConfig);
        return Task.success(
          `Using: ${chalk.green(`${CONFIG_FILE}${importedConfig.install!.scope === 'local' ? `, ${LOCAL_CONFIG_FILE}` : ''}`)}`,
        );
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') {
          process.exit(0);
        }

        if (error instanceof ConfigValidationError) {
          return Task.error(error);
        }

        this.logger!.stop();
        const defaultConfig = DEFAULT_CONFIG;
        const localConfig: SympackConfig = { install: { projects: [] } };

        defaultConfig.install = {
          scope: await select({
            message: 'Select scope of package installation:',
            choices: [
              {
                name: `  Local`,
                short: 'local',
                value: 'local',
              },
              {
                name: `  Global`,
                short: 'global',
                value: 'global',
              },
            ],
            default: 'local',
            theme: {
              prefix: getPromptPrefixStyle(2),
              style: {
                answer: (text: string) => chalk.green(text.trim()),
                message: showDoneMessage('Scope'),
              },
            },
          }),
        };

        if (defaultConfig.install.scope === 'local') {
          defaultConfig.install.projects = [];
          let addingProject = true;

          while (addingProject) {
            const projectName = await input({
              message: 'Enter a name for the project:',
              required: true,
              theme: {
                prefix: getPromptPrefixStyle(2),
                style: {
                  answer: (text: string) => chalk.green(text.trim()),
                  message: showDoneMessage('Project'),
                },
              },
            });
            const projectPath = await projectPathInput(projectName);
            const projectSettings = await projectSettingsInput({
              name: projectName,
            });

            defaultConfig.install.projects.push({
              name: projectName,
              noSave: projectSettings.includes('noSave'),
              hasPeerDependencies: projectSettings.includes(
                'hasPeerDependencies',
              ),
            });

            localConfig.install!.projects!.push({
              name: projectName,
              path: projectPath,
              skipInstall: false,
            });

            addingProject = await select({
              message: 'Do you want to add another project?',
              default: false,
              choices: [
                { name: `  Yes`, value: true },
                { name: `  No`, value: false },
              ],
              theme: {
                prefix: getPromptPrefixStyle(2),
                style: {
                  answer: (text: string) => chalk.green(text.trim()),
                  message: showDoneMessage('Add another project?'),
                },
              },
            });
          }

          const localContent = CONFIG_FILE_TEMPLATE.replace(
            'CONFIG_HERE',
            `const config = ${objectToUnquotedString(localConfig)};`,
          );
          await fs.writeFile(localConfigPath, localContent, 'utf-8');
        }

        const content = CONFIG_FILE_TEMPLATE.replace(
          'CONFIG_HERE',
          `const config = ${objectToUnquotedString(defaultConfig)};`,
        );
        await fs.writeFile(configPath, content, 'utf-8');

        if (defaultConfig.install.scope === 'local') {
          for (let project of defaultConfig.install!.projects!) {
            const localProject = localConfig.install!.projects!.find(
              (p) => p.name === project.name,
            )!;
            await attachProjectMetadata(packageJson.name, localProject);
            project = merge(project, localProject);
          }
        }

        merge(CONFIG, defaultConfig);
        return Task.success(
          `Created: ${chalk.green(`${CONFIG_FILE}${defaultConfig.install.scope === 'local' ? `, ${LOCAL_CONFIG_FILE}` : ''}`)}`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        process.exit(0);
      }

      return Task.error(error);
    }
  },
});

const verifyGitignore = new Task({
  message: 'Verifying .gitignore',
  execute: async function (this: Task) {
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    let gitignoreContent = '';
    this.logger!.stop();

    try {
      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      } catch {
        const createGitignore = await confirm({
          message: '.gitignore file not found. Do you want to create one?',
          default: true,
          theme: {
            prefix: getPromptPrefixStyle(2),
            style: {
              answer: (text: string) => chalk.green(text.trim()),
              message: showDoneMessage('Create .gitignore file?'),
            },
          },
        });

        if (createGitignore) {
          await fs.writeFile(gitignorePath, '', 'utf-8');
        }
      }

      if (!gitignoreContent.includes(LOCAL_CONFIG_FILE)) {
        if (gitignoreContent.length > 0 && !gitignoreContent.endsWith('\n')) {
          gitignoreContent += '\n\n';
        }
        gitignoreContent += `# sympack\n${LOCAL_CONFIG_FILE}\n`;
        await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
      }

      return Task.success();
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        process.exit(0);
      }

      return Task.error(error);
    }
  },
});

function phase() {
  return new Phase({
    name: 'Config',
    tasks: [loadConfig, verifyGitignore],
  });
}

export default phase;
