import chalk from 'chalk';
import chokidar, { FSWatcher } from 'chokidar';
import { promises as fs } from 'fs';
import { WatcherProps } from './common/types.js';
import Phase from './models/Phase.js';

enum WatcherState {
  Idle,
  Processing,
  Aborted,
  ShuttingDown,
}

class Watcher {
  readonly paths: string[];
  readonly phases: Phase[];
  watcher?: FSWatcher;
  currentPhase?: Phase;
  state: WatcherState = WatcherState.Idle;

  constructor(props: WatcherProps) {
    this.phases = props.phases;
    this.paths = props.paths;
  }

  private async process() {
    if (
      this.state === WatcherState.Processing ||
      this.state === WatcherState.Aborted
    ) {
      if (this.currentPhase) {
        await this.currentPhase.abort();
      }
    } else {
      this.state = WatcherState.Processing;
    }

    console.info(chalk.white.bold('\nRunning sympack...\n'));

    for (const phase of this.phases) {
      this.currentPhase = phase;
      const { error } = await phase.run();
      if (error) {
        if (error.abort) {
          this.currentPhase = undefined;
          this.state = WatcherState.Aborted;
          return;
        }
        if (error.quit) {
          console.error(
            chalk.red(`\nError caused sympack to stop:\n${error.message}`),
          );
          return await this.stop();
        }
        this.currentPhase = undefined;
        this.state = WatcherState.Idle;
        console.error(
          chalk.red(
            `\n${error.message} Stopped sympack but will continue to watch for changes...`,
          ),
        );
        return;
      }
    }

    console.info(
      chalk.white.bold('\nCompleted sympack. Watching for changes...'),
    );
    this.currentPhase = undefined;
    this.state = WatcherState.Idle;
  }

  async start() {
    this.watcher = chokidar.watch(await Array.fromAsync(fs.glob(this.paths)), {
      awaitWriteFinish: {
        stabilityThreshold: 1000,
      },
      persistent: true,
    });

    this.watcher.on('ready', async () => await this.process());

    this.watcher.on('change', async () => await this.process());
  }

  async stop() {
    if (!this.watcher) {
      console.warn(chalk.yellow('Watcher is not running.'));
      return;
    }

    if (this.state === WatcherState.ShuttingDown) {
      console.warn(
        chalk.yellow('Force stopped watcher. Cleanup may be incomplete.'),
      );
      return;
    }

    this.state = WatcherState.ShuttingDown;

    if (this.currentPhase) {
      await this.currentPhase.abort();
    }

    await this.watcher.close();
  }
}

export default Watcher;
