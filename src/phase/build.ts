import { execa } from 'execa';
import { TaskResult } from '../common/types.js';
import { TaskError } from '../common/error.js';
import Phase from '../models/Phase.js';
import Task from '../models/Task.js';

const compileFiles = new Task({
  message: 'Compiling files',
  execute: async function (this: Task): Promise<TaskResult> {
    try {
      await execa({
        cancelSignal: this.abortController.signal,
      })`tsc --project ${process.cwd()} --noEmit`;
      return Task.success();
    } catch (error) {
      return Task.error(error);
    }
  },
});

const runBuildScript = new Task({
  message: 'Running build script',
  execute: async function (this: Task): Promise<TaskResult> {
    try {
      await execa({
        cwd: process.cwd(),
        cancelSignal: this.abortController.signal,
      })`npm run build`;
      return Task.success();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Missing script: "build"')) {
          return Task.error(
            new TaskError(
              'No build script found in package.json',
              false,
              false,
            ),
          );
        }
      }
      return Task.error(error);
    }
  },
});

function phase() {
  return new Phase({
    name: 'Build',
    tasks: [compileFiles, runBuildScript],
  });
}

export default phase;
