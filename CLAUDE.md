# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm start` - Runs the application

## Code Style Guidelines
- **Imports**: ES Modules with explicit .js extensions. Node modules first, third-party next, local last.
- **Formatting**: 2-space indentation, single quotes, semicolons, consistent spacing.
- **Functions**: Use async/await pattern, descriptive names, and proper error handling.
- **Naming**: camelCase for variables/functions, PascalCase for constructors, ALL_CAPS for constants.
- **Error Handling**: Use try/catch with specific error messages, log errors with logger.js.
- **Logging**: Use the custom logger module for consistent logging patterns.

## Project Structure
- Main entry: index.js
- Core functionality in src/ directory
- Modular design with focused files for specific features

## Libraries
- Commander.js for CLI
- Inquirer.js for interactive prompts
- Chalk for terminal styling
- Ora for loading spinners


## Development workflow

- Checkout Github issues for outstanding issues
- Implement each issue in a feature branch based on main
- Create a pull request with changes using the PR template located in `.github/PULL_REQUEST_TEMPLATE.md`
- Add tests as required to prove the work
