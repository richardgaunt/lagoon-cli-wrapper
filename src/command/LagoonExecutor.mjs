import { execFile } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

/**
 * Executes Lagoon and Git commands securely using child_process.execFile.
 */
export class LagoonExecutor {
  /**
   * Creates a new LagoonExecutor instance.
   * @param {Object} logger - Logger object with logAction and logError methods.
   */
  constructor(logger) {
    this.logger = logger;
    this.execFileAsync = promisify(execFile);
  }

  /**
   * Executes a command securely using execFile.
   * @param {Object} command - A command object (LagoonCommand or GitCommand).
   * @param {string} action - Description of the action for logging.
   * @returns {Promise<Object>} - Promise resolving to { stdout, stderr }.
   * @throws {Error} If the command execution fails.
   */
  async execute(command, action = 'Unknown Action') {
    const baseCommand = command.getBaseCommand();
    const args = command.getArgs();
    
    console.log(chalk.blue(`Executing: ${chalk.bold(command.toString())}`));

    try {
      const result = await this.execFileAsync(baseCommand, args);
      if (this.logger && typeof this.logger.logAction === 'function') {
        this.logger.logAction(action, command.toString(), 'Success');
      }
      return result;
    } catch (error) {
      if (this.logger && typeof this.logger.logError === 'function') {
        this.logger.logError(action, command.toString(), error);
      }
      throw error;
    }
  }
}