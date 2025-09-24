import { ExecaError } from 'execa';

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export class TaskError extends Error {
  constructor(
    error: unknown,
    public abort: boolean = false,
    public quit: boolean = false,
  ) {
    if (error instanceof ExecaError) {
      super(error.stderr || error.stdout);

      if (error.isCanceled) {
        this.abort = true;
      }
    } else if (error instanceof Error) {
      super(error.message);
    } else if (typeof error === 'string') {
      super(error);
    } else {
      super(JSON.stringify(error));
    }

    this.name = 'TaskError';
  }
}

export class PhaseError extends Error {
  constructor(
    error: unknown,
    public abort: boolean = false,
    public quit: boolean = false,
  ) {
    if (error instanceof ExecaError) {
      const execaError = error as ExecaError;
      const message = execaError.stderr || execaError.stdout;
      if (typeof message === 'string') {
        super(message);
        //logger.fail(chalk.red(message));
      } else {
        super(JSON.stringify(message));
        //logger.fail(chalk.red(JSON.stringify(message)));
      }
    } else if (error instanceof Error) {
      super((error as Error).message);
      //logger.fail(`${(error as Error).message}`);
    } else {
      super(typeof error === 'string' ? error : JSON.stringify(error));
      /*logger.fail(
        `${typeof error === 'string' ? error : JSON.stringify(error)}`,
      );*/
    }
    this.name = 'PhaseError';
  }
}
