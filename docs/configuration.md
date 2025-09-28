# Configuration

## sympack.config.js

This is the main configuration file that defines the watch settings and project templates.

### Root Configuration Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `watch` | `object` | Yes | Configuration for file watching behavior |
| `install` | `object` | No | Configuration for package installation behavior |

### Watch Configuration Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `paths` | `string[]` | Yes | `['src/**']` | Array of glob patterns to watch for changes |
| `extensions` | `string[]` | No | `['ts', 'js']` | Array of file extensions to watch for changes |

### Install Configuration Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `scope` | `'local' \| 'global'` | No | Scope of where to install the package. `local` installs to specified projects, `global` installs globally |
| `projects` | `SympackProjectConfig[]` | No | Array of project configurations (only needed for `local` scope) |

### Project Configuration Properties (sympack.config.js)

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | `string` | Yes | - | Arbitrary name for reference in `sympack.config.local.js` |
| `noSave` | `boolean` | No | `false` | Whether to save the installed package to project's `package.json`. If `true`, uses `--no-save` flag |
| `hasPeerDependencies` | `boolean` | No | `false` | Whether the project has peer dependencies. If `true`, uses `--legacy-peer-deps` flag |

---

## sympack.config.local.js

This is the local configuration file that defines the actual paths where packages should be installed. This file should not be committed to version control.

### Root Configuration Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `install` | `object` | Yes | Configuration for package installation with local paths |

### Install Configuration Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `projects` | `ProjectConfig[]` | Yes | Array of project configurations with actual paths |

### Project Configuration Properties (sympack.config.local.js)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Must match the name defined in `sympack.config.js` |
| `path` | `string` | Yes | Absolute or relative path to the project where the package will be installed |
| `skipInstall` | `boolean` | No | Whether to skip the installation for this project. If `true`, the project will be ignored during installation |

---

## Examples

Example `sympack.config.js`

```javascript
// @ts-check

/** @type {import('sympack').SympackConfig} */
const config = {
  watch: {
    paths: ['src/**', 'lib/**'],
    extensions: ['ts', 'js', 'json'],
  },
  install: {
    scope: 'local', // or 'global'
    // projects is only needed for 'local' scope
    projects: [
      { 
        name: 'project-name', // arbitrary name for reference in sympack.config.local.js
        noSave: true, 
        hasPeerDependencies: false 
      },
      { 
        name: 'another-project-name', // arbitrary name for reference in sympack.config.local.js
        noSave: false, 
        hasPeerDependencies: false 
      },
    ]
  }
};

export default config;
```



Example `sympack.config.local.js`:

```javascript
// @ts-check

/** @type {import('sympack').SympackConfig} */
const config = {
  install: {
    projects: [
      { 
        name: 'project-name', // must match name in sympack.config.js
        path: '../my-app',
        skipInstall: false
      },
      { 
        name: 'another-project-name', // must match name in sympack.config.js
        path: '/absolute/path/to/project',
        skipInstall: true
      },
    ],
  },
};

export default config;
```