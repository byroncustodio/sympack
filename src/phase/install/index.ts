import { execa } from 'execa';
import path from 'node:path';
import { ProjectConfigInternal } from '../../common/types.js';
import { getConfig } from '../../common/config.js';
import { TEMP_DIR } from '../../common/constants.js';
import Phase from '../../models/Phase.js';
import Task from '../../models/Task.js';
import { getPackageFileName, getPackageJSON } from '../../common/utils.js';

const installGlobal = new Task({
  message: 'Installing to global prefix...',
  execute: async function (this: Task) {
    const tempDir = TEMP_DIR;
    const { name, version } = await getPackageJSON();
    const file = getPackageFileName(name!, version!);

    try {
      await execa({
        cancelSignal: this.abortController.signal,
      })`npm i -g ${path.join(tempDir, file)} --no-save --ignore-scripts`;
      return Task.success();
    } catch (error) {
      return Task.error(error);
    }
  },
});

function phase() {
  const config = getConfig();
  const scope = config.install.scope;
  const projects = config.install.projects as ProjectConfigInternal[];
  const tasks: Task[] = [];

  if (scope === 'global') {
    tasks.push(installGlobal);
  } else {
    for (const project of projects) {
      tasks.push(
        new Task({
          message: 'Installing in ' + project.path + '...',
          execute: async function (this: Task) {
            const tempDir = TEMP_DIR;
            const { name, version } = await getPackageJSON();
            const file = getPackageFileName(name!, version!);

            try {
              const args = ['i', path.join(tempDir, file)];
              if (project.noSave) {
                args.push('--no-save');
              }
              if (project.hasPeerDependencies) {
                args.push('--legacy-peer-deps');
              }
              args.push('--ignore-scripts');
              await execa('npm', args, {
                cwd: project.path,
                cancelSignal: this.abortController.signal,
              });
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
    name: 'Install',
    tasks,
  });
}

export default phase;
