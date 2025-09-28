import { execa } from 'execa';
import { ProjectConfig } from '../common/types.js';
import { getPackageJSON, isPackageExtraneous } from '../common/utils.js';
import Phase from '../models/Phase.js';
import Task from '../models/Task.js';
import { CONFIG } from './config.js';

function phase() {
  const projects = CONFIG.install?.projects as ProjectConfig[];
  const tasks: Task[] = [];

  if (CONFIG.install!.scope === 'global') {
    tasks.push(
      new Task({
        message: 'Cleaning up global installation',
        execute: async function (this: Task) {
          const { name } = await getPackageJSON();

          try {
            await execa({
              cancelSignal: this.abortController.signal,
            })`npm un -g ${name!}`;
            return Task.success();
          } catch (error) {
            return Task.error(error);
          }
        },
      }),
    );
  } else {
    for (const project of projects.filter((p) => p.skipInstall === false)) {
      tasks.push(
        new Task({
          message: 'Cleaning up in ' + project.path,
          execute: async function (this: Task) {
            const projectPath = project.path;
            const projectVersion = project.version;
            const { name } = await getPackageJSON();

            try {
              if (await isPackageExtraneous(name!, project.path!)) {
                await execa({
                  cwd: projectPath,
                  cancelSignal: this.abortController.signal,
                })`npm un ${name!}`;
              } else {
                if (project.type === 'dependencies' && projectVersion) {
                  await execa({
                    cwd: projectPath,
                    cancelSignal: this.abortController.signal,
                  })`npm i ${name!}@${projectVersion}`;
                } else if (
                  project.type === 'devDependencies' &&
                  projectVersion
                ) {
                  await execa({
                    cwd: projectPath,
                    cancelSignal: this.abortController.signal,
                  })`npm i -D ${name!}@${projectVersion}`;
                }
              }

              return Task.success();
            } catch (error) {
              return Task.error(error);
            }
          },
        }),
      );
    }
  }

  return new Phase({
    name: 'Cleanup',
    tasks,
  });
}

export default phase;
