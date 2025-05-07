import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { logAction, logError } from './logger.mjs';

const execAsync = promisify(exec);

// Helper function to execute and log Lagoon commands
export async function execLagoonCommand(command, action = 'Unknown Action') {
  console.log(chalk.blue(`Executing: ${chalk.bold(command)}`));

  try {
    const result = await execAsync(command);
    logAction(action, command, 'Success');
    return result;
  } catch (error) {
    logError(action, command, error);
    throw error;
  }
}

// Get all Lagoon instances from the config
export async function getLagoonInstances() {
  try {
    const command = 'lagoon config list --output-json';
    const { stdout } = await execLagoonCommand(command, 'List Lagoon Instances');

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

// Get all projects for a Lagoon instance with full details
export async function getProjectsWithDetails(instance) {
  try {
    const command = `lagoon -l ${instance} list projects --output-json`;
    const { stdout } = await execLagoonCommand(command, `List Projects for ${instance}`);

    // Parse the JSON output
    const projectsData = JSON.parse(stdout);

    // Return the full project data
    return projectsData.data;
  } catch (error) {
    throw new Error(`Failed to get projects for instance ${instance}: ${error.message}`);
  }
}

// Get all projects for a Lagoon instance
export async function getProjects(instance) {
  try {
    const command = `lagoon -l ${instance} list projects --output-json`;
    const { stdout } = await execLagoonCommand(command, `List Projects for ${instance}`);

    // Parse the JSON output
    const projectsData = JSON.parse(stdout);

    // Extract project names from the JSON data
    const projects = projectsData.data.map(project => project.projectname);

    return projects;
  } catch (error) {
    throw new Error(`Failed to get projects for instance ${instance}: ${error.message}`);
  }
}

// Get all environments for a project
export async function getEnvironments(instance, project) {
  try {
    const command = `lagoon -l ${instance} -p ${project} list environments --output-json`;
    const { stdout } = await execLagoonCommand(command, `List Environments for ${project}`);

    // Parse the JSON output
    const environmentsData = JSON.parse(stdout);

    // Extract environment names from the JSON data
    const environments = environmentsData.data.map(env => env.name);

    return environments;
  } catch (error) {
    throw new Error(`Failed to get environments for project ${project}: ${error.message}`);
  }
}

// Get all users for a project
export async function getUsers(instance, project) {
  try {
    const command = `lagoon -l ${instance} -p ${project} list all-users`;
    const { stdout } = await execLagoonCommand(command, `List Users for ${project}`);
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
 * Throws an error if the environment is protected (such as 'production', 'master', 'develop', or names starting with 'project/'). Executes the Lagoon CLI to delete the specified environment and returns true if successful.
 *
 * @param {string} instance - The Lagoon instance name.
 * @param {string} project - The project name.
 * @param {string} environment - The environment name to delete.
 * @returns {boolean} True if the environment was deleted successfully.
 *
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
    const command = `lagoon -l ${instance} -p ${project} delete environment --environment ${environment} --force --output-json`;
    // response if successful is a JSON {"result":"success"}
    const { stdout } = await execLagoonCommand(command, `Delete Environment ${environment} from ${project}`);
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

// Generate login link for an environment
export async function generateLoginLink(instance, project, environment) {
  // Check if environment is protected
  if (environment === 'production' || environment === 'master') {
    throw new Error(`Cannot generate login link for protected environment: ${environment}`);
  }

  try {
    const command = `lagoon ssh -l ${instance} -p ${project} -e ${environment} -C "drush user:unblock --uid=1 && drush uli"`;
    const { stdout } = await execLagoonCommand(command, `Generate Login Link for ${environment} in ${project}`);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to generate login link for environment ${environment}: ${error.message}`);
  }
}

/**
 * Converts a Git SSH or HTTPS URL to a standard GitHub HTTPS URL without the `.git` suffix.
 *
 * @param {string} gitUrl - The Git repository URL to convert.
 * @returns {string|null} The corresponding GitHub HTTPS URL, or {@code null} if the input is not a GitHub URL.
 */
export function gitUrlToGithubUrl(gitUrl) {
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

// Helper function to extract PR number from environment name
export function extractPrNumber(environmentName) {
  const match = environmentName.match(/^pr-(\d+)$/i);
  return match ? match[1] : null;
}

// Clear Drupal cache for an environment
export async function clearDrupalCache(instance, project, environment) {
  try {
    const command = `lagoon ssh -l ${instance} -p ${project} -e ${environment} -C "drush cr"`;
    const { stdout } = await execLagoonCommand(command, `Clear Cache for ${environment} in ${project}`);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to clear cache for environment ${environment}: ${error.message}`);
  }
}

// No helper functions needed for the more efficient git ls-remote approach

// Get all branches from a git repository using ls-remote (much more efficient)
export async function getGitBranches(gitUrl) {
  try {
    if (!gitUrl) {
      throw new Error('Git URL not provided or invalid');
    }

    // Use git ls-remote to list all references (only the heads/branches)
    const command = `git ls-remote --heads ${gitUrl}`;
    console.log(chalk.blue(`Executing: ${chalk.bold(command)}`));

    try {
      const { stdout, stderr } = await execAsync(command);

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

// Deploy a branch to Lagoon
export async function deployBranch(instance, project, branch) {
  try {
    // Validate branch name to prevent command injection - allow slashes in addition to other safe characters
    if (!/^[a-zA-Z0-9_./\-]+$/.test(branch)) {
      throw new Error('Invalid branch name. Branch names must contain only alphanumeric characters, slashes, underscores, hyphens, and periods.');
    }

    // Properly escape the branch name for use in command line
    // More comprehensive escaping for shell safety
    const escapedBranch = branch.replace(/["\\$`]/g, '\\$&');

    const command = `lagoon -l ${instance} -p ${project} deploy branch --branch "${escapedBranch}" --output-json`;
    const { stdout } = await execLagoonCommand(command, `Deploy Branch ${branch} to ${project}`);

    // Parse the JSON response
    const response = JSON.parse(stdout);

    if (response.result === 'success') {
      return {
        success: true,
        message: `Branch ${branch} is being deployed to ${project}`
      };
    } else {
      throw new Error(`Failed to deploy branch ${branch}: ${JSON.stringify(response)}`);
    }
  } catch (error) {
    throw new Error(`Failed to deploy branch ${branch}: ${error.message}`);
  }
}
