import { execa } from 'execa';
import { getConfig } from '../../common/config.js';
import { ProjectConfigInternal } from '../../common/types.js';
import { getPackageJSON, isPackageExtraneous } from '../../common/utils.js';
import Phase from '../../models/Phase.js';
import Task from '../../models/Task.js';

function phase() {
  const config = getConfig();
  const projects = config.install.projects as ProjectConfigInternal[];
  const tasks: Task[] = [];

  for (const project of projects) {
    tasks.push(
      new Task({
        message: 'Cleaning up in ' + project.path,
        execute: async function (this: Task) {
          const projectPath = project.path;
          const projectVersion = project.version;
          const { name } = await getPackageJSON();

          try {
            if (await isPackageExtraneous(name!, project.path)) {
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
              } else if (project.type === 'devDependencies' && projectVersion) {
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

  return new Phase({
    name: 'Cleanup',
    tasks,
  });
}

export default phase;
