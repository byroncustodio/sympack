import { PhaseError, TaskError } from './error.js';
import Phase from '../models/Phase.js';
import Task from '../models/Task.js';

export type SympackConfig = Partial<Config>;
export type ScopeType = 'local' | 'global';
export type PhaseStatus = 'success' | 'error' | 'abort';
export type TaskStatus = 'success' | 'error';

export interface SympackProjectConfig {
  /**
   * The name of the project where the package will be installed.
   *
   * This is only used when creating `sympack.config.local.js`
   *
   * @example 'My Project' or 'my-project'
   */
  name: string;
  /**
   * The path to the project where the package will be installed.
   *
   * This can be an absolute path or a path relative to the current working directory.
   *
   * @example '/absolute/path/to/project' or '../relative/path/to/project'
   */
  path?: string;
  /**
   * Indicates whether to save the installed package to the project's `package.json` dependencies.
   * If set to true, the installation command will include the `--no-save` flag.
   *
   * @default false
   */
  noSave?: boolean;
  /**
   * Indicates whether the project has peer dependencies that need to be resolved during installation.
   * If set to true, the installation command will include the `--legacy-peer-deps` flag.
   *
   * @default false
   */
  hasPeerDependencies?: boolean;
}

export interface ProjectConfig extends SympackProjectConfig {
  type?: string;
  version?: string;
}

export interface Config {
  watch: {
    /**
     * An array of glob patterns to watch for changes.
     * @example ['src/**', 'lib/**']
     * @default ['src/**']
     */
    paths: string[];
    /**
     * An array of file extensions to watch for changes.
     * @example ['ts', 'js']
     * @default ['ts', 'js']
     */
    extensions?: string[];
  };
  install?: {
    /**
     * Scope of where to install the package.
     * - `local`: The package will be installed in the paths defined in `install.paths`.
     * - `global`: The package will be installed globally and will ignore `install.paths`.
     */
    scope?: ScopeType;
    /**
     * An array of project configurations where the package will be installed when `scope` is set to `local`.
     */
    projects?: SympackProjectConfig[] | ProjectConfig[];
  };
}

export interface TaskResult {
  status: TaskStatus;
  error?: TaskError;
  message?: string;
}

export interface TaskProps {
  message: string;
  execute: () => Promise<TaskResult>;
}

export interface PhaseResult {
  status: PhaseStatus;
  error?: PhaseError;
  data?: unknown;
}

export interface PhaseProps {
  name: string;
  tasks: Task[];
}

export interface WatcherProps {
  paths: string[];
  phases: Phase[];
}
