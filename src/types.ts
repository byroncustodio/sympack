export type ScopeType = 'global' | 'local';
export type SympackConfig = Partial<Config>;

interface Config {
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
  install: {
    /**
     * Scope of where to install the package.
     * - `global`: The package will be installed globally and will ignore `install.paths`.
     * - `local`: The package will be installed in the paths defined in `install.paths`.
     */
    scope: ScopeType;
    /**
     * An array of absolute or relative paths where the package will be installed.
     * @example ['/path/to/project1', '../path/to/project2']
     */
    paths?: string[];
  };
}

export interface PackageProps {
  rootDir: string;
  name: string;
  version: string;
  scope: ScopeType;
  paths?: string[];
}
