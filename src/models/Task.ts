import { Ora } from 'ora';
import { TaskProps, TaskResult } from '../common/types.js';
import { TaskError } from '../common/error.js';
import Phase from './Phase.js';

class Task {
  readonly message: string;
  readonly onExecute: () => Promise<TaskResult>;
  abortController: AbortController = new AbortController();
  logger?: Ora;

  constructor(props: TaskProps) {
    this.message = props.message;
    this.onExecute = props.execute;
  }

  static success(message?: string): TaskResult {
    return { status: 'success', message };
  }

  static error(error: unknown): TaskResult {
    return {
      status: 'error',
      error: error instanceof TaskError ? error : new TaskError(error),
    };
  }

  async execute(phase: Phase): Promise<TaskResult> {
    try {
      this.checkIfAborted();
      this.logger = phase.logger;
      return await this.onExecute.apply(this);
    } catch (error) {
      if (error instanceof TaskError) {
        if (error.abort) {
          this.abortController = new AbortController();
        }
      }
      return Task.error(error);
    }
  }

  abort() {
    this.abortController.abort();
  }

  checkIfAborted() {
    if (this.abortController.signal.aborted) {
      throw new TaskError('Task aborted', true);
    }
  }
}

export default Task;
