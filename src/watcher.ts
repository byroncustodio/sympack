import chalk from 'chalk';
import ora from 'ora';
import PackageError from './error.js';
import Package from './package.js';
import { ScopeType } from './types.js';
import { getPackageJSON } from './utils.js';

const logger = ora();

try {
  const args = process.argv.slice(2);
  const scope = args.includes('--scope')
    ? (args[args.indexOf('--scope') + 1] as ScopeType)
    : 'local';
  const pathsArg = args.includes('--paths')
    ? scope === 'local'
      ? args[args.indexOf('--paths') + 1]
      : ''
    : '';
  const paths = pathsArg
    ? pathsArg
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p)
    : [];

  const { name, version } = await getPackageJSON();

  const pkg = new Package({
    rootDir: process.cwd(),
    name: name!,
    version: version!,
    scope,
    paths,
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
    logger.fail(`${chalk.red(message)}`);
    process.exit(1);
  }
}
