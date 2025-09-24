import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { PhaseProps, PhaseResult } from '../common/types.js';
import { PhaseError, TaskError } from '../common/error.js';
import Task from './Task.js';

enum PhaseState {
  Ready,
  Running,
  Aborted,
  Completed,
}

class Phase {
  readonly name: string;
  readonly tasks: Task[] = [];
  readonly logger: Ora = ora({ indent: 2 });
  currentTask?: Task;
  state: PhaseState = PhaseState.Ready;

  constructor(props: PhaseProps) {
    this.name = props.name;
    this.tasks = props.tasks;
  }

  success(): PhaseResult {
    this.currentTask = undefined;
    this.state = PhaseState.Completed;
    return { status: 'success' };
  }

  error(
    error: unknown,
    abort: boolean = false,
    quit: boolean = false,
  ): PhaseResult {
    this.currentTask = undefined;
    this.state = abort ? PhaseState.Aborted : PhaseState.Completed;
    return { status: 'error', error: new PhaseError(error, abort, quit) };
  }

  async run(): Promise<PhaseResult> {
    const errors: TaskError[] = [];
    this.state = PhaseState.Running;
    console.info(`▸ ${this.name}`);

    for (const task of this.tasks) {
      this.currentTask = task;
      this.logger.start(task.message);

      const { error, message } = await task.execute(this);

      if (error) {
        if (error.abort) {
          this.logger.warn(chalk.dim(`${task.message} (aborted)`));
          return this.error('Process aborted', true);
        } else if (error.quit) {
          this.logger.fail(chalk.red(task.message));
          return this.error(error, false, true);
        } else {
          const errorMessage = `${' '.repeat(this.logger.indent + 2)}${chalk.red(error.message)}`;
          this.logger.fail(`${chalk.dim(task.message)}\n${errorMessage}`);
          errors.push(error);
        }
      } else {
        this.logger.succeed(message ?? task.message);
      }
    }

    if (errors.length > 0) {
      return this.error(`${errors.length} task(s) failed.`);
    }

    return this.success();
  }

  async abort() {
    if (this.currentTask) {
      this.currentTask.abort();
    }

    while (this.state !== PhaseState.Aborted) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
export default Phase;
