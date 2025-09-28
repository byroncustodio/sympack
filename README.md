# sympack

[![npm version](https://badge.fury.io/js/sympack.svg)](https://badge.fury.io/js/sympack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

sympack streamlines your local package development workflow by automatically detecting file changes, packaging your project, and installing it in specified locations. Perfect for developers working on npm packages who need real-time testing across multiple projects.

## Installation

### Prerequisites

- Node.js >= 22.x
- npm >= 7.x

### Install sympack

```bash
# Install globally for CLI usage
npm install -g sympack

# Or install locally in your project
npm install --save-dev sympack
```

### Configuration

On first run, sympack will create configuration files in your project root:

- `sympack.config.js` - Main configuration file
- `sympack.config.local.js` - Local-specific settings (gitignored by default)

Refer to the [Configuration](./docs/configuration.md) section for details on customizing these files.

## Basic Usage

Navigate to your package directory and run:

```bash
npx sympack
```

sympack will:

1. Load configuration from `sympack.config.js` (and `sympack.config.local.js` if it exists)
2. Start watching configured paths for file changes
3. Automatically pack and install your package when changes are detected
4. Exit gracefully by pressing `Ctrl+C`

## Common Use Cases

### Package Development Workflow

```bash
# In your package directory
sympack
# Now edit files in src/ - they'll automatically be packed and installed
```

### Global Package Testing

```javascript
// sympack.config.js
const config = {
  watch: {
    paths: ['src/**'],
  },
  install: {
    scope: 'global',
  },
};
```

### Multi-project Development

```javascript
// sympack.config.local.js
const config = {
  install: {
    projects: [
      { 
        name: 'frontend-app', // must match name in sympack.config.js
        path: '../frontend-app',
        skipInstall: false,
      },
      { 
        name: 'backend-service', // must match name in sympack.config.js
        path: '../backend-service',
        skipInstall: true,
      },
    ],
  },
};
```

## Known Issues & Limitations

- Currently, supports npm packages only
- File watching may consume system resources on large projects
- Installation delays may occur with very large packages

### Non-graceful Shutdown

> [!CAUTION]
> If sympack is terminated abruptly, it may leave temporary files in your project directory.
> Always try to exit gracefully using `Ctrl+C` to ensure cleanup.
> If you encounter issues, you can follow these steps:
> 1. Delete the temporary files in your user's temp directory (e.g., /var/folders/xx/xxxxxxxxxx/sympack on macOS).
> 2. With projects configured with "noSave: true", manually remove the package from `package.json` and run `npm install` to clean up.

### Running Multiple Instances of sympack

> [!CAUTION]
> Running multiple instances of sympack targeting the same project may lead to unexpected behavior.
> If needed, ensure each instance has "noSave: false" in its configuration to fall back to updating `package.json` directly and avoid conflicts.

## Acknowledgments

- Built with [chokidar](https://github.com/paulmillr/chokidar) for robust file watching
- Uses [chalk](https://github.com/chalk/chalk) for colorful terminal output
- Powered by [commander.js](https://github.com/tj/commander.js/) for CLI interface

## Contact & Support

- **GitHub Issues**: [https://github.com/byroncustodio/sympack/issues](https://github.com/byroncustodio/sympack/issues)
- **Author**: Byron Custodio
- **Repository**: [https://github.com/byroncustodio/sympack](https://github.com/byroncustodio/sympack)
