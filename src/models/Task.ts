import { TaskProps, TaskResult } from '../common/types.js';
import { TaskError } from '../common/error.js';

class Task {
  readonly message: string;
  readonly onExecute: () => Promise<TaskResult>;
  abortController: AbortController = new AbortController();

  constructor(props: TaskProps) {
    this.message = props.message;
    this.onExecute = props.execute;
  }

  static success(): TaskResult {
    return { status: 'success' };
  }

  static error(error: unknown): TaskResult {
    return {
      status: 'error',
      error: error instanceof TaskError ? error : new TaskError(error),
    };
  }

  async execute(): Promise<TaskResult> {
    try {
      this.checkIfAborted();
      return await this.onExecute.apply(this);
    } catch (error) {
      return Task.error(error);
    }
  }

  abort() {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  checkIfAborted() {
    if (this.abortController.signal.aborted) {
      throw new TaskError('Task aborted', true);
    }
  }
}

export default Task;
