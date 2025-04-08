#!/usr/bin/env node

import { program } from 'commander';
import { startInteractiveMode } from './src/interactive.js';

program
  .name('lagoon-wrapper')
  .description('A CLI wrapper for Lagoon CLI')
  .version('1.0.0');

program
  .command('interactive')
  .description('Start interactive mode')
  .action(startInteractiveMode);

// Default to interactive mode if no command is specified
if (process.argv.length === 2) {
  startInteractiveMode();
} else {
  program.parse(process.argv);
} 