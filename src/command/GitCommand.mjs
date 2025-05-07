/**
 * GitCommand class for building secure, structured Git commands.
 * 
 * Similar to LagoonCommand, but for Git operations. Uses the same builder pattern
 * for secure command execution.
 */
export class GitCommand {
  /**
   * Creates a new GitCommand instance.
   */
  constructor() {
    this.baseCommand = 'git';
    this.args = [];
  }

  /**
   * Configures command for ls-remote with --heads option.
   * @param {string} gitUrl - The Git repository URL.
   * @returns {GitCommand} - The current command instance for chaining.
   */
  lsRemote(gitUrl) {
    if (gitUrl) {
      this.args = ['ls-remote', '--heads', gitUrl];
    }
    return this;
  }

  /**
   * Gets the array of arguments for this command.
   * @returns {string[]} - The array of command arguments.
   */
  getArgs() {
    return this.args;
  }

  /**
   * Gets the base command name.
   * @returns {string} - The base command name.
   */
  getBaseCommand() {
    return this.baseCommand;
  }

  /**
   * Returns the full command as an array (base command + args).
   * @returns {string[]} - Array with the base command and all args.
   */
  getCommandArray() {
    return [this.baseCommand, ...this.args];
  }

  /**
   * Returns a string representation of the command for logging purposes.
   * Note: This should not be used for command execution to avoid security issues.
   * @returns {string} - String representation of the command.
   */
  toString() {
    return `${this.baseCommand} ${this.args.join(' ')}`;
  }
}