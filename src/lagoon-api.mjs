import chalk from 'chalk';
import { LagoonCommand, GitCommand, LagoonExecutor } from './command/index.mjs';
import { logAction, logError } from './logger.mjs';

// Create a singleton executor with logger
const executor = new LagoonExecutor({ logAction, logError });

/**
 * Executes a Lagoon command securely using the LagoonExecutor.
 * 
 * @param {LagoonCommand|GitCommand} command - The command to execute.
 * @param {string} action - Description of the action for logging.
 * @returns {Promise<Object>} - Promise resolving to { stdout, stderr }.
 * @throws {Error} If the command execution fails.
 */
export async function execCommand(command, action = 'Unknown Action') {
  return executor.execute(command, action);
}

/**
 * Get all Lagoon instances from the config.
 * 
 * @returns {Promise<string[]>} Array of Lagoon instance names.
 * @throws {Error} If the command fails or the response can't be parsed.
 */
export async function getLagoonInstances() {
  try {
    const command = new LagoonCommand()
      .listConfigs()
      .withJsonOutput();
    
    const { stdout } = await execCommand(command, 'List Lagoon Instances');

    // Parse the JSON output
    const configData = JSON.parse(stdout);

    // Extract instance names from the JSON data and clean them
    const instances = configData.data.map(instance => {
      // Extract just the base name without (default)(current) or other annotations
      const fullName = instance.name;
      // Extract just the base name before any parentheses or whitespace
      const baseName = fullName.split(/\s+|\(/).shift().trim();
      return baseName;
    });

    return instances;
  } catch (error) {
    throw new Error(`Failed to get Lagoon instances: ${error.message}`);
  }
}

/**
 * Get all projects for a Lagoon instance with full details.
 * 
 * @param {string} instance - Lagoon instance name.
 * @returns {Promise<Object[]>} Array of project details.
 * @throws {Error} If the command fails or the response can't be parsed.
 */
export async function getProjectsWithDetails(instance) {
  try {
    const command = new LagoonCommand()
      .withInstance(instance)
      .listProjects()
      .withJsonOutput();
    
    const { stdout } = await execCommand(command, `List Projects for ${instance}`);

    // Parse the JSON output
    const projectsData = JSON.parse(stdout);

    // Return the full project data
    return projectsData.data;
  } catch (error) {
    throw new Error(`Failed to get projects for instance ${instance}: ${error.message}`);
  }
}

/**
 * Get all project names for a Lagoon instance.
 * 
 * @param {string} instance - Lagoon instance name.
 * @returns {Promise<string[]>} Array of project names.
 * @throws {Error} If the command fails or the response can't be parsed.
 */
export async function getProjects(instance) {
  try {
    const command = new LagoonCommand()
      .withInstance(instance)
      .listProjects()
      .withJsonOutput();
    
    const { stdout } = await execCommand(command, `List Projects for ${instance}`);
    
    const projectsData = JSON.parse(stdout);
    return projectsData.data.map(project => project.projectname);
  } catch (error) {
    throw new Error(`Failed to get projects for instance ${instance}: ${error.message}`);
  }
}

/**
 * Get all environments for a project.
 * 
 * @param {string} instance - Lagoon instance name.
 * @param {string} project - Project name.
 * @returns {Promise<string[]>} Array of environment names.
 * @throws {Error} If the command fails or the response can't be parsed.
 */
export async function getEnvironments(instance, project) {
  try {
    const command = new LagoonCommand()
      .withInstance(instance)
      .withProject(project)
      .listEnvironments()
      .withJsonOutput();
    
    const { stdout } = await execCommand(command, `List Environments for ${project}`);

    // Parse the JSON output
    const environmentsData = JSON.parse(stdout);

    // Extract environment names from the JSON data
    const environments = environmentsData.data.map(env => env.name);

    return environments;
  } catch (error) {
    throw new Error(`Failed to get environments for project ${project}: ${error.message}`);
  }
}

/**
 * Retrieves the list of usernames associated with a Lagoon project.
 *
 * @param {string} instance - The Lagoon instance name.
 * @param {string} project - The project name.
 * @returns {Promise<string[]>} An array of usernames for the project.
 * @throws {Error} If the command fails or output cannot be parsed.
 */
export async function getUsers(instance, project) {
  try {
    const command = new LagoonCommand()
      .withInstance(instance)
      .withProject(project)
      .listUsers();
    
    const { stdout } = await execCommand(command, `List Users for ${project}`);
    const lines = stdout.split('\n').filter(line => line.trim() !== '');

    // Skip the header line and extract user names
    const users = lines.slice(1).map(line => {
      const parts = line.split('|').map(part => part.trim());
      return parts[0]; // First column is the user name
    });

    return users;
  } catch (error) {
    throw new Error(`Failed to get users for project ${project}: ${error.message}`);
  }
}

/**
 * Deletes a Lagoon environment unless it is protected.
 *
 * @param {string} instance - Name of the Lagoon instance.
 * @param {string} project - Name of the project.
 * @param {string} environment - Name of the environment to delete.
 * @returns {boolean} True if the environment was deleted successfully.
 * @throws {Error} If the environment is protected or if the deletion fails.
 */
export async function deleteEnvironment(instance, project, environment) {
  // Check if environment is protected
  if (
    environment === 'production' ||
    environment === 'master' ||
    environment === 'develop' ||
    environment.startsWith('project/')
  ) {
    throw new Error(`Cannot delete protected environment: ${environment}`);
  }

  try {
    const command = new LagoonCommand()
      .withInstance(instance)
      .withProject(project)
      .deleteEnvironment(environment)
      .withForce()
      .withJsonOutput();
    
    const { stdout } = await execCommand(command, `Delete Environment ${environment} from ${project}`);
    
    const response = JSON.parse(stdout);
    if (response.result === 'success') {
      console.log(chalk.green(`Environment ${environment} deleted successfully`));
      return true;
    } else {
      throw new Error(`Failed to delete environment ${environment}: ${response}`);
    }
  } catch (error) {
    throw new Error(`Failed to delete environment ${environment}: ${error.message}`);
  }
}

/**
 * Generates a one-time login link for a specified Lagoon environment using Drush.
 *
 * @param {string} instance - The Lagoon instance name.
 * @param {string} project - The Lagoon project name.
 * @param {string} environment - The environment for which to generate the login link.
 * @returns {string} The generated one-time login URL.
 * @throws {Error} If the environment is protected or if the login link generation fails.
 */
export async function generateLoginLink(instance, project, environment) {
  // Check if environment is protected
  if (environment === 'production' || environment === 'master') {
    throw new Error(`Cannot generate login link for protected environment: ${environment}`);
  }

  try {
    const command = new LagoonCommand()
      .withInstance(instance)
      .withProject(project)
      .withEnvironment(environment)
      .ssh("drush user:unblock --uid=1 && drush uli");
    
    const { stdout } = await execCommand(command, `Generate Login Link for ${environment} in ${project}`);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to generate login link for environment ${environment}: ${error.message}`);
  }
}

/**
 * Converts a GitHub SSH or HTTPS repository URL to a standard HTTPS URL without the `.git` suffix.
 *
 * @param {string} gitUrl - The Git repository URL to convert.
 * @returns {string|null} The normalized GitHub HTTPS URL, or `null` if the input is not a GitHub URL.
 */
export function gitUrlToGithubUrl(gitUrl) {
  // Handle null, undefined, or empty strings
  if (!gitUrl) {
    return null;
  }
  
  // Handle SSH URLs like git@github.com:org/repo.git
  if (gitUrl.startsWith('git@github.com:')) {
    const path = gitUrl.replace('git@github.com:', '').replace('.git', '');
    return `https://github.com/${path}`;
  } else if (gitUrl.includes('github.com')) {
    return gitUrl.replace('.git', '');
  }
  // Return null if not a GitHub URL
  return null;
}

/**
 * Helper function to extract PR number from environment name
 * 
 * @param {string} environmentName - Environment name to parse.
 * @returns {string|null} PR number or null if not found.
 */
export function extractPrNumber(environmentName) {
  // Handle null, undefined, or empty strings
  if (!environmentName) {
    return null;
  }
  
  const match = environmentName.match(/^pr-(\d+)$/i);
  return match ? match[1] : null;
}

/**
 * Clears the Drupal cache for a specified environment using Lagoon CLI and Drush.
 *
 * @param {string} instance - The Lagoon instance name.
 * @param {string} project - The project name within the Lagoon instance.
 * @param {string} environment - The environment name to clear the cache for.
 * @returns {string} The trimmed output from the Drush cache clear command.
 * @throws {Error} If the cache clearing operation fails for the specified environment.
 */
export async function clearDrupalCache(instance, project, environment) {
  try {
    const command = new LagoonCommand()
      .withInstance(instance)
      .withProject(project)
      .withEnvironment(environment)
      .ssh("drush cr");
    
    const { stdout } = await execCommand(command, `Clear Cache for ${environment} in ${project}`);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to clear cache for environment ${environment}: ${error.message}`);
  }
}

/**
 * Retrieves all branch names from a remote Git repository.
 *
 * @param {string} gitUrl - The URL of the Git repository.
 * @returns {Promise<string[]>} An array of branch names found in the repository.
 * @throws {Error} If the Git URL is missing, invalid, authentication fails, the repository is not found, or another
 * error occurs during command execution.
 */
export async function getGitBranches(gitUrl) {
  try {
    if (!gitUrl) {
      throw new Error('Git URL not provided or invalid');
    }

    const command = new GitCommand().lsRemote(gitUrl);
    
    console.log(chalk.blue(`Fetching branches from repository: ${chalk.bold(gitUrl)}`));
    
    try {
      const { stdout, stderr } = await execCommand(command, `List Branches for ${gitUrl}`);

      // Log any warnings from stderr
      if (stderr) {
        console.log(chalk.yellow(`Warning: ${stderr}`));
      }

      // Parse the branch names from the output
      const branches = stdout
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
          // Extract the branch name from lines like:
          // d7b0a24b046d00b6aeac1280e4d1a74297551444	refs/heads/main
          const match = line.match(/refs\/heads\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(branch => branch !== null);

      // Log the number of branches found
      console.log(chalk.green(`Found ${branches.length} branches in repository`));

      return branches;
    } catch (error) {
      // If the Git URL is using SSH, offer a hint about authentication
      if (gitUrl.startsWith('git@') && error.message.includes('Permission denied')) {
        throw new Error(`Authentication failed for ${gitUrl}. Please check your SSH key configuration.`);
      } else if (error.message.includes('not found')) {
        throw new Error(`Repository not found: ${gitUrl}. Please check if the URL is correct.`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    logError('List Branches', `git ls-remote ${gitUrl}`, error);
    throw new Error(`Failed to get git branches: ${error.message}`);
  }
}

/**
 * Deploys a specified branch to a Lagoon project environment.
 *
 * @param {string} instance - The Lagoon instance name.
 * @param {string} project - The project name.
 * @param {string} branch - The name of the branch to deploy.
 * @returns {{ success: true, message: string }} An object indicating successful initiation of the deployment and
 * a descriptive message.
 * @throws {Error} If the branch name is invalid, the Lagoon CLI command fails, or the deployment is unsuccessful.
 */
export async function deployBranch(instance, project, branch) {
  try {
    // Validate branch name to prevent command injection - allow slashes in addition to other safe characters
    if (!/^[a-zA-Z0-9_./-]+$/.test(branch)) {
      throw new Error('Invalid branch name. Branch names must contain only alphanumeric characters, slashes, underscores, hyphens, and periods.');
    }

    const command = new LagoonCommand()
      .withInstance(instance)
      .withProject(project)
      .deployBranch(branch)
      .withJsonOutput();
    
    const { stdout } = await execCommand(command, `Deploy Branch ${branch} to ${project}`);

    // Parse the JSON response
    const response = JSON.parse(stdout);

    if (response.result === 'success') {
      return {
        success: true,
        message: `Branch ${branch} is being deployed to ${project}`
      };
    } else if (response.result === 'error') {
      throw new Error(`Failed to deploy branch ${branch}: ${response.message || JSON.stringify(response)}`);
    } else {
      // Handle unexpected response formats
      throw new Error(`Unexpected response when deploying branch ${branch}: ${JSON.stringify(response)}`);
    }
  } catch (error) {
    throw new Error(`Failed to deploy branch ${branch}: ${error.message}`);
  }
}