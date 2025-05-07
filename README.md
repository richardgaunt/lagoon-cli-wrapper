# Lagoon CLI Wrapper

[![Tests](https://github.com/richardgaunt/lagoon-cli-wrapper/actions/workflows/tests.yml/badge.svg)](https://github.com/richardgaunt/lagoon-cli-wrapper/actions/workflows/tests.yml)
[![Linting](https://github.com/richardgaunt/lagoon-cli-wrapper/actions/workflows/lint.yml/badge.svg)](https://github.com/richardgaunt/lagoon-cli-wrapper/actions/workflows/lint.yml)

A Node.js CLI wrapper for the Lagoon CLI that provides an interactive interface for common operations.

## Prerequisites

- Node.js (v14 or higher)
- Lagoon CLI installed and configured
- A valid `.lagoon.yml` file in your home directory
- SSH key(s) in your ~/.ssh directory for Lagoon authentication

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Link the CLI globally:

```bash
npm link
```

## Commands

- `npm start` - Run the CLI without global installation
- `lagoon-wrapper` - Run the CLI if globally installed
- `lagoon-wrapper interactive` - Explicitly start in interactive mode

## Usage

Simply run the command:

```bash
lagoon-wrapper
```

This will start the interactive mode, which will guide you through:

1. Selecting a Lagoon instance
2. Selecting a project
3. Performing operations on the selected project:
   - Listing environments
   - Listing users
   - Deleting environments (except protected ones)
   - Generating login links for environments
   - Clearing Drupal caches
   - Deploying branches to environments
   - Viewing GitHub PR links for PR environments

## Features

- Interactive CLI interface with autocomplete search
- Easy navigation between instances and projects
- Type-to-search project selection with autocomplete
- Fast action selection with search capability
- Safe environment deletion (prevents deletion of protected environments)
- GitHub PR integration for PR environments
- One-click login link generation for Drupal environments
- Quick Drupal cache clearing for any environment
- Branch deployment with autocomplete selection
- SSH key configuration for Lagoon authentication
- Comprehensive logging of all operations
- Extensible architecture for adding new commands

## Protected Environments

The following environments cannot be deleted:
- production
- master
- develop
- Any environment starting with `project/`

## GitHub Integration

For projects hosted on GitHub, the CLI will:
- Automatically detect PR environments (environments named `pr-XX`)
- Display links to the corresponding GitHub pull requests
- Show PR information when listing, deleting, or generating login links for environments

## Login Link Generation

The CLI can generate login links for Drupal environments by:
- Unblocking the admin user (uid=1)
- Generating a one-time login link
- Displaying the link in the terminal

Note: Login links cannot be generated for production or master environments.

## Cache Clearing

The CLI can clear Drupal caches on any environment:
- Works on all environments including production and master
- Executes the `drush cr` command on the selected environment
- Shows the command output in the terminal

## Branch Deployment

The CLI can deploy any branch from a project's git repository:
- Automatically fetches and lists all available branches with autocomplete search
- Prioritizes main branches (main, master, develop) at the top of the list
- Initiates deployment of the selected branch to the Lagoon environment
- Provides real-time feedback about the deployment status
- Validates branch names to prevent command injection

Note: Branch deployment is asynchronous and may take several minutes to complete. You can check the status in the Lagoon UI.

## Logging

All operations performed by the CLI are logged to daily log files in the `.logs` directory:
- Log files are named in the format `log--YYYYMMDD.txt`
- Each log entry includes a timestamp, the action performed, and the Lagoon command executed
- Errors are also logged with detailed error messages
- The logs directory is excluded from Git

## Adding New Commands

To add new commands, modify the `src/interactive.js` file to add new menu options and implement the corresponding functionality in the appropriate modules.
