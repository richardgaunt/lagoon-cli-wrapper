/**
 * LagoonCommand class for building secure, structured Lagoon CLI commands.
 *
 * This class uses a builder pattern to construct commands with proper argument separation
 * for secure execution using child_process.execFile (instead of string interpolation).
 */
export class LagoonCommand {
  /**
   * Creates a new LagoonCommand instance.
   */
  constructor() {
    this.baseCommand = 'lagoon';
    this.args = [];
  }

  /**
   * Adds Lagoon instance argument to the command.
   * @param {string} instance - The Lagoon instance name.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  withInstance(instance) {
    if (instance) {
      this.args.push('-l', instance);
    }
    return this;
  }

  /**
   * Adds project argument to the command.
   * @param {string} project - The project name.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  withProject(project) {
    if (project) {
      this.args.push('-p', project);
    }
    return this;
  }

  /**
   * Adds environment argument to the command.
   * @param {string} environment - The environment name.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  withEnvironment(environment) {
    if (environment) {
      this.args.push('-e', environment);
    }
    return this;
  }

  /**
   * Adds JSON output flag to the command.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  withJsonOutput() {
    this.args.push('--output-json');
    return this;
  }

  /**
   * Adds force flag to the command.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  withForce() {
    this.args.push('--force');
    return this;
  }

  /**
   * Configures command to list Lagoon configs.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  listConfigs() {
    this.args.push('config', 'list');
    return this;
  }

  /**
   * Configures command to list projects.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  listProjects() {
    this.args.push('list', 'projects');
    return this;
  }

  /**
   * Configures command to list environments.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  listEnvironments() {
    this.args.push('list', 'environments');
    return this;
  }

  /**
   * Configures command to list all users.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  listUsers() {
    this.args.push('list', 'all-users');
    return this;
  }

  /**
   * Configures command to delete an environment.
   * @param {string} environmentName - The name of the environment to delete.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  deleteEnvironment(environmentName) {
    if (environmentName) {
      this.args.push('delete', 'environment', '--environment', environmentName);
    }
    return this;
  }

  /**
   * Configures command to deploy a branch.
   * @param {string} branchName - The name of the branch to deploy.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  deployBranch(branchName) {
    if (branchName) {
      this.args.push('deploy', 'branch', '--branch', branchName);
    }
    return this;
  }

  /**
   * Configures command for login.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  login() {
    this.args.push('login');
    return this;
  }

  /**
   * Configures command for SSH operation with a remote command.
   * @param {string} command - The command to execute on the remote environment.
   * @returns {LagoonCommand} - The current command instance for chaining.
   */
  ssh(command) {
    if (command) {
      this.args.push('ssh', '-C', command);
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
