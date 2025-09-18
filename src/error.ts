import { ExecaError } from 'execa';
import { Ora } from 'ora';

class PackageError extends Error {
  constructor(error: ExecaError | Error | string | unknown, logger: Ora) {
    if (error instanceof ExecaError) {
      super(
        typeof error.stderr === 'string'
          ? error.stderr
          : JSON.stringify(error.stderr),
      );
      logger.fail(`${error.stderr}`);
    } else if (error instanceof Error) {
      super((error as Error).message);
      logger.fail(`${(error as Error).message}`);
    } else {
      super(typeof error === 'string' ? error : JSON.stringify(error));
      logger.fail(
        `${typeof error === 'string' ? error : JSON.stringify(error)}`,
      );
    }
    this.name = 'PackageError';
  }
}

export default PackageError;
