# sympack

[![npm version](https://badge.fury.io/js/sympack.svg)](https://badge.fury.io/js/sympack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Project Title & Description

**sympack** - A local development tool that packs and installs packages on file changes.

sympack streamlines your local package development workflow by automatically detecting file changes, packaging your project, and installing it in specified locations. Perfect for developers working on npm packages who need real-time testing across multiple projects.

**Key Features:**

- 🔄 **Automatic file watching** - Monitors your source files for changes
- 📦 **Smart packaging** - Automatically runs `npm pack` when changes are detected
- 🚀 **Instant installation** - Installs the packed package to configured locations
- 🎯 **Flexible targeting** - Support for both global and local installation scopes
- ⚙️ **Easy configuration** - Simple setup with sensible defaults
- 🔧 **TypeScript support** - Built with TypeScript, works seamlessly with TS projects

---

## Installation Instructions

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

---

## Usage Examples

### Basic Usage

Navigate to your package directory and run:

```bash
npx sympack
```

sympack will:

1. Load configuration from `sympack.config.js` (and `sympack.config.local.js` if it exists)
2. Start watching configured paths for file changes
3. Automatically pack and install your package when changes are detected

### Watch Configuration

Example `sympack.config.js`:

```javascript
// @ts-check

/** @type {import('sympack').SympackConfig} */
const config = {
  watch: {
    paths: ['src/**', 'lib/**'],
    extensions: ['ts', 'js', 'json'],
  },
};

export default config;
```

Example `sympack.config.local.js`:

```javascript
// @ts-check

/** @type {import('sympack').SympackConfig} */
const config = {
  install: {
    scope: 'local',
    projects: [
      { path: '../my-app' },
      { path: '/absolute/path/to/project' },
      { path: '../project-with-peers', hasPeerDependencies: true },
    ],
  },
};

export default config;
```

### Common Use Cases

**Package Development Workflow:**

```bash
# In your package directory
sympack
# Now edit files in src/ - they'll automatically be packed and installed
```

**Global Package Testing:**

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

**Multi-project Development:**

```javascript
// sympack.config.local.js
const config = {
  install: {
    scope: 'local',
    projects: [
      { path: '../frontend-app' },
      { path: '../backend-service' },
      { path: '../shared-components', hasPeerDependencies: true },
    ],
  },
};
```

---

## API Documentation

### Configuration Options

#### `watch`

- **paths**: `string[]` - Glob patterns to watch for changes (default: `['src/**']`)
- **extensions**: `string[]` - File extensions to monitor (default: `['ts', 'js']`)

#### `install`

- **scope**: `'global' | 'local'` - Installation scope
  - `'global'`: Install package globally using `npm install -g`
  - `'local'`: Install package in specified local projects
- **projects**: `ProjectConfig[]` - Array of project configurations for local installation

#### `ProjectConfig`

- **path**: `string` - Absolute or relative path to the project directory
- **hasPeerDependencies**: `boolean` (optional) - Whether to use `--legacy-peer-deps` flag during installation (default: `false`)

### CLI Commands

```bash
# Start sympack with default configuration
sympack

# Show version
sympack --version

# Show help
sympack --help
```

---

## Contributing Guidelines

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/byroncustodio/sympack.git
cd sympack

# Install dependencies
npm install

# Build the project
npm run build

# Test locally
npm test
```

### Coding Standards

- Follow the existing [ESLint configuration](./eslint.config.ts)
- Format code using [Prettier](./prettier.config.ts)
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Write clear, descriptive code and comments

### Development Scripts

```bash
npm run build      # Build the project
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run format     # Format code with Prettier
npm run test       # Test the built package
```

---

## Additional Sections

### License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

### Changelog

See [Releases](https://github.com/byroncustodio/sympack/releases) for version history and changelog.

### Known Issues & Limitations

- Currently, supports npm packages only (no yarn/pnpm support yet)
- File watching may consume system resources on large projects
- Installation delays may occur with very large packages

### Acknowledgments

- Built with [chokidar](https://github.com/paulmillr/chokidar) for robust file watching
- Uses [chalk](https://github.com/chalk/chalk) for colorful terminal output
- Powered by [commander.js](https://github.com/tj/commander.js/) for CLI interface

### Contact & Support

- **GitHub Issues**: [https://github.com/byroncustodio/sympack/issues](https://github.com/byroncustodio/sympack/issues)
- **Author**: Byron Custodio
- **Repository**: [https://github.com/byroncustodio/sympack](https://github.com/byroncustodio/sympack)
