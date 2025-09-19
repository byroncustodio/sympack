import chalk from 'chalk';
import PackageError from './error.js';
import Package from './package.js';
import { ProjectConfig, ScopeType } from './types.js';
import { getPackageJSON } from './utils.js';

try {
  const args = process.argv.slice(2);
  const scope = args.includes('--scope')
    ? (args[args.indexOf('--scope') + 1] as ScopeType)
    : 'local';

  const projectRegex = /--project\s+(.+?)(?=\s--|$)/g;
  const projects: ProjectConfig[] = [];
  let match;

  while ((match = projectRegex.exec(args.join(' '))) !== null) {
    const props = match[1].split(',').map((p) => p.trim());
    let path = '';
    let hasPeerDependencies: boolean | undefined;
    props.forEach((prop) => {
      const [key, value] = prop.split('=');
      if (key === 'path') path = value;
      if (key === 'hasPeerDependencies') hasPeerDependencies = value === 'true';
    });
    projects.push({
      path,
      ...(hasPeerDependencies !== undefined ? { hasPeerDependencies } : {}),
    });
  }

  const { name, version } = await getPackageJSON();

  const pkg = new Package({
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
    process.exit(1);
  }
}
