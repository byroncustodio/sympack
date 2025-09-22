import { execa } from 'execa';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { TEMP_DIR } from '../../common/constants.js';
import Phase from '../../models/Phase.js';
import Task from '../../models/Task.js';
import { getPackageFileName, getPackageJSON } from '../../common/utils.js';

const createPackage = new Task({
  message: 'Creating package file...',
  execute: async function (this: Task) {
    try {
      await execa({
        cwd: process.cwd(),
        cancelSignal: this.abortController.signal,
      })`npm pack`;
      return Task.success();
    } catch (error) {
      return Task.error(error);
    }
  },
});

const movePackage = new Task({
  message: 'Moving file to temp directory...',
  execute: async function (this: Task) {
    const tempDir = TEMP_DIR;
    const { name, version } = await getPackageJSON();
    const file = getPackageFileName(name!, version!);

    try {
      await fs.access(tempDir).catch(async () => {
        await fs.mkdir(tempDir, { recursive: false });
      });

      await fs.rename(
        path.resolve(process.cwd(), file),
        path.resolve(tempDir, file),
      );

      return Task.success();
    } catch (error) {
      return Task.error(error);
    }
  },
});

function phase() {
  return new Phase({
    name: 'Pack',
    tasks: [createPackage, movePackage],
  });
}

export default phase;
