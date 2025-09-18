import { ExecaError } from 'execa';
import { Ora } from 'ora';

class PackageError extends Error {
  constructor(error: ExecaError | Error | unknown, logger: Ora) {
    if (error instanceof ExecaError) {
      super(
        typeof error.stderr === 'string'
          ? error.stderr
          : JSON.stringify(error.stderr),
      );
      logger.fail(`${error.stderr}`);
    } else {
      super((error as Error).message);
      logger.fail(`${(error as Error).message}`);
    }
    this.name = 'PackageError';
  }
}

export default PackageError;
