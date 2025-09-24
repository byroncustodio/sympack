# Contributing Guidelines

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Development Setup

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

## Coding Standards

- Follow the existing [ESLint configuration](./eslint.config.ts)
- Format code using [Prettier](./prettier.config.ts)
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Write clear, descriptive code and comments

## Development Scripts

```bash
npm run build      # Build the project
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run format     # Format code with Prettier
npm run test       # Test the built package
```