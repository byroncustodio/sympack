import chalk from 'chalk';
import { execa, ExecaError } from 'execa';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ora from 'ora';
import { TEMP_DIR } from './constants.js';
import PackageError from './error.js';
import Package from './package.js';
import { ProjectConfigInternal, ScopeType } from './types.js';
import {
  getPackageFileName,
  getPackageJSON,
  isPackageExtraneous,
} from './utils.js';

let isExiting = false;
let scope: ScopeType;
let pkg: Package;

async function handleReinstall(name: string, project: ProjectConfigInternal) {
  const projectPath = project.path;
  const projectVersion = project.version;

  if (await isPackageExtraneous(name!, project.path)) {
    await execa('npm', ['un', name!], { cwd: projectPath });
  } else {
    if (project.type === 'dependencies' && projectVersion) {
      await execa('npm', ['i', `${name}@${projectVersion}`], {
        cwd: projectPath,
      });
    } else if (project.type === 'devDependencies' && projectVersion) {
      await execa('npm', ['i', '-D', `${name}@${projectVersion}`], {
        cwd: projectPath,
      });
    }
  }
}

try {
  const args = process.argv.slice(2);
  scope = args.includes('--scope')
    ? (args[args.indexOf('--scope') + 1] as ScopeType)
    : 'local';

  const projectRegex = /--project\s+(.+?)(?=\s--|$)/g;
  const projects: ProjectConfigInternal[] = [];
  let match;

  while ((match = projectRegex.exec(args.join(' '))) !== null) {
    const props = match[1].split(',').map((p) => p.trim());
    let path = '';
    let noSave: boolean | undefined;
    let hasPeerDependencies: boolean | undefined;
    props.forEach((prop) => {
      const [key, value] = prop.split('=');
      if (key === 'path') path = value;
      if (key === 'noSave') noSave = value === 'true';
      if (key === 'hasPeerDependencies') hasPeerDependencies = value === 'true';
    });
    projects.push({
      path,
      ...(noSave !== undefined ? { noSave } : { noSave: true }),
      ...(hasPeerDependencies !== undefined ? { hasPeerDependencies } : {}),
    });
  }

  const { name, version } = await getPackageJSON();

  pkg = new Package({
    rootDir: process.cwd(),
    name: name!,
    version: version!,
    scope,
    projects,
  });

  console.info(`\nRunning sympack for ${chalk.white.bold(pkg.name)}`);

  await pkg.build();
  await pkg.pack();
  await pkg.install();

  console.info(
    `\n${chalk.green('sympack completed. Watching for changes...')}`,
  );
  console.info(chalk.dim('Press Ctrl+C at any time to stop and exit'));
} catch (error) {
  if (error instanceof PackageError) {
    console.warn(
      chalk.yellow(
        '\nError during sympack. Fix any issues and save to restart...',
      ),
    );
    console.info(chalk.dim('Press Ctrl+C at any time to stop and exit'));
  } else {
    const message = (error as Error).message;
    console.error(chalk.red(`\n${message}`));
    process.kill(process.pid);
  }
}

process.on('SIGINT', async () => {
  if (isExiting) return;
  isExiting = true;
  const logger = ora({ indent: 2 });

  try {
    console.info('\nStopping sympack...');

    const tempDir = TEMP_DIR;
    const { name, version } = await getPackageJSON();

    if (scope === 'global') {
      logger.start('Cleaning up global installation');
      try {
        await execa('npm', ['un', '-g', name!]);
      } catch {
        logger.fail('Failed to clean up global installation');
      }
      logger.succeed();
    } else {
      for (const project of pkg.projects) {
        const projectPath = project.path;
        logger.start(`Cleaning up ${chalk.white.bold(projectPath)}`);
        try {
          await handleReinstall(name!, project);
        } catch (error) {
          if (
            error instanceof ExecaError &&
            (error.signal === 'SIGINT' || error.isCanceled)
          ) {
            await handleReinstall(name!, project);
            logger.succeed();
          } else {
            logger.fail(`Failed to clean up ${chalk.white.bold(projectPath)}`);
          }
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
    process.exit(0);
  } catch (error) {
    logger.fail((error as Error).message);
    process.exit(1);
  }
});

setInterval(() => {}, 100); // Keep the process alive
