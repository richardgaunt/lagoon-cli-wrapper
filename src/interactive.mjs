import chalk from 'chalk';
import ora from 'ora';
import {
  getLagoonInstances,
  getProjectsWithDetails,
  getEnvironments,
  getUsers,
  deleteEnvironment,
  generateLoginLink,
  clearDrupalCache,
  gitUrlToGithubUrl,
  extractPrNumber,
  getGitBranches,
  deployBranch,
  getSSHCommand
} from './lagoon-api.mjs';
import { logAction } from './logger.mjs';
import { configureSshKey } from './lagoon-ssh-key-configurator.mjs';

// Import the modern inquirer prompts
import { select, input, confirm, checkbox, search } from '@inquirer/prompts';

/**
 * Starts the interactive Lagoon CLI session for managing projects and environments.
 *
 * Guides the user through selecting a Lagoon instance and project, then presents a menu of actions such as listing
 * environments or users, deleting environments, generating login links, clearing Drupal cache, deploying branches,
 * configuring SSH keys, and changing selections. Handles errors gracefully and logs key actions throughout the session.
 */
/**
 * Launches the interactive Lagoon CLI wrapper, allowing users to manage projects and environments through a guided
 * command-line interface.
 *
 * Presents menus for selecting Lagoon instances and projects, and provides options to list environments or users,
 * delete environments, generate login links, clear Drupal cache, configure SSH keys, and change selections. Handles
 * errors gracefully and logs major actions throughout the session.
 */
export async function startInteractiveMode() {
  console.log(chalk.green('Welcome to the Lagoon CLI Wrapper!'));
  logAction('Application Start', 'N/A', 'Interactive mode started');

  let exit = false;
  let currentInstance = null;
  let currentProject = null;
  let currentProjectDetails = null;
  let githubBaseUrl = null;

  while (!exit) {
    try {
      // If no instance is selected, prompt for one
      if (!currentInstance) {
        currentInstance = await selectLagoonInstance();
        logAction('Select Instance', 'N/A', `Selected instance: ${currentInstance}`);
      }

      // If no project is selected, prompt for one
      if (!currentProject) {
        const result = await selectProjectWithDetails(currentInstance);
        currentProject = result.projectName;
        currentProjectDetails = result.projectDetails;
        logAction('Select Project', 'N/A', `Selected project: ${currentProject}`);

        // Convert git URL to GitHub URL if possible
        if (currentProjectDetails.giturl) {
          githubBaseUrl = gitUrlToGithubUrl(currentProjectDetails.giturl);
        }
      }

      // Show main menu
      const action = await showMainMenu(currentInstance, currentProject);
      logAction('Menu Selection', 'N/A', `Selected action: ${action}`);

      switch (action) {
        case 'listEnvironments':
          await listEnvironments(currentInstance, currentProject, githubBaseUrl);
          break;
        case 'listUsers':
          await listUsers(currentInstance, currentProject);
          break;
        case 'deleteEnvironment':
          await deleteEnvironmentFlow(currentInstance, currentProject, githubBaseUrl);
          break;
        case 'generateLoginLink':
          await generateLoginLinkFlow(currentInstance, currentProject, githubBaseUrl);
          break;
        case 'clearCache':
          await clearCacheFlow(currentInstance, currentProject, githubBaseUrl);
          break;
        case 'deployBranch':
          await deployBranchFlow(currentInstance, currentProject, currentProjectDetails);
          break;
        case 'sshToEnvironment':
          await sshToEnvironmentFlow(currentInstance, currentProject, githubBaseUrl);
          break;
        case 'configureUserSshKey':
          await configureSshKey(currentInstance, currentProject);
          break;
        case 'changeProject':
          currentProject = null;
          currentProjectDetails = null;
          githubBaseUrl = null;
          logAction('Change Project', 'N/A', 'Project selection reset');
          break;
        case 'changeInstance':
          currentInstance = null;
          currentProject = null;
          currentProjectDetails = null;
          githubBaseUrl = null;
          logAction('Change Instance', 'N/A', 'Instance selection reset');
          break;
        case 'exit':
          exit = true;
          logAction('Exit Application', 'N/A', 'User exited the application');
          break;
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      const continueSession = await confirm({
        message: 'Do you want to continue?',
        default: true
      });

      if (!continueSession) {
        exit = true;
        logAction('Exit Application', 'N/A', 'User exited after error');
      }
    }
  }

  console.log(chalk.green('Thank you for using Lagoon CLI Wrapper!'));
}

async function selectLagoonInstance() {
  const spinner = ora('Loading Lagoon instances...').start();
  const instances = await getLagoonInstances();
  spinner.stop();

  const instance = await select({
    message: 'Select a Lagoon instance:',
    choices: instances.map(instance => ({
      value: instance,
      name: instance
    }))
  });

  return instance;
}

/**
 * Prompts the user to select a project from the specified Lagoon instance and returns selected project's details.
 *
 * @param {string} instance - The Lagoon instance from which to load projects.
 * @returns {{ projectName: string, projectDetails: object }} An object containing project's name & details.
 */
async function selectProjectWithDetails(instance) {
  const spinner = ora(`Loading projects for ${instance}...`).start();
  const projectsWithDetails = await getProjectsWithDetails(instance);
  spinner.stop();

  // Use search prompt with autocomplete functionality
  const projectChoices = projectsWithDetails.map(project => ({
    value: project.projectname,
    name: project.projectname
  }));
  const project = await search({
    message: 'Select a project (type to search):',
    source: (input) => {
      input = input || '';
      return projectChoices.filter(choice => choice.name.toLowerCase().includes(input.toLowerCase()));
    }
  });

  const projectDetails = projectsWithDetails.find(p => p.projectname === project);

  return {
    projectName: project,
    projectDetails: projectDetails
  };
}

/**
 * Presents the main menu for the interactive CLI session and returns the user's selected action.
 *
 * @param {string} instance - The currently selected Lagoon instance.
 * @param {string} project - The currently selected project.
 * @returns {Promise<string>} The action chosen by the user from the menu.
 */
async function showMainMenu(instance, project) {
  console.log(chalk.blue(`\nCurrent Instance: ${chalk.bold(instance)}`));
  console.log(chalk.blue(`Current Project: ${chalk.bold(project)}\n`));
  const actions = [
    { value: 'listEnvironments', name: 'List Environments' },
    { value: 'listUsers', name: 'List Users' },
    { value: 'deleteEnvironment', name: 'Delete Environment' },
    { value: 'generateLoginLink', name: 'Generate Login Link' },
    { value: 'clearCache', name: 'Clear Drupal Cache' },
    { value: 'deployBranch', name: 'Deploy Branch' },
    { value: 'sshToEnvironment', name: 'SSH to Environment' },
    { value: 'changeProject', name: 'Change Project' },
    { value: 'changeInstance', name: 'Change Instance' },
    { value: 'configureUserSshKey', name: 'Configure User SSH Key' },
    { value: 'exit', name: 'Exit' }
  ];
  return search({
    message: 'What would you like to do? (type to search)',
    source: (input) => {
      input = input || '';
      return actions.filter(action => action.name.toLowerCase().includes(input.toLowerCase()));
    }
  });
}

async function listEnvironments(instance, project, githubBaseUrl) {
  const spinner = ora(`Loading environments for ${project}...`).start();
  const environments = await getEnvironments(instance, project);
  spinner.stop();

  console.log(chalk.green('\nEnvironments:'));
  environments.forEach(env => {
    const prNumber = extractPrNumber(env);
    if (prNumber && githubBaseUrl) {
      const prUrl = `${githubBaseUrl}/pull/${prNumber}`;
      console.log(`- ${env} ${chalk.blue(`(PR #${prNumber}: ${prUrl})`)}`);
    } else {
      console.log(`- ${env}`);
    }
  });

  await input({
    message: 'Press Enter to continue...',
  });
}

async function listUsers(instance, project) {
  const spinner = ora(`Loading users for ${project}...`).start();
  const users = await getUsers(instance, project);
  spinner.stop();

  console.log(chalk.green('\nUsers:'));
  users.forEach(user => {
    console.log(`- ${user}`);
  });

  await input({
    message: 'Press Enter to continue...',
  });
}

async function deleteEnvironmentFlow(instance, project, githubBaseUrl) {
  const spinner = ora(`Loading environments for ${project}...`).start();
  const allEnvironments = await getEnvironments(instance, project);
  spinner.stop();

  // Filter out protected environments
  const eligibleEnvironments = allEnvironments.filter(env =>
    env !== 'production' &&
    env !== 'master' &&
    env !== 'develop' &&
    !env.startsWith('project/')
  );

  if (eligibleEnvironments.length === 0) {
    console.log(chalk.yellow('\nNo eligible environments to delete.'));
    await input({
      message: 'Press Enter to continue...'
    });
    return;
  }

  // Display environments with PR links before selection
  console.log(chalk.green('\nEligible environments for deletion:'));
  eligibleEnvironments.forEach(env => {
    const prNumber = extractPrNumber(env);
    if (prNumber && githubBaseUrl) {
      const prUrl = `${githubBaseUrl}/pull/${prNumber}`;
      console.log(`- ${env} ${chalk.blue(`(PR #${prNumber}: ${prUrl})`)}`);
    } else {
      console.log(`- ${env}`);
    }
  });
  console.log(''); // Add a blank line for better readability

  // Create choices with PR information for selection
  const choices = eligibleEnvironments.map(env => {
    const prNumber = extractPrNumber(env);
    if (prNumber && githubBaseUrl) {
      const prUrl = `${githubBaseUrl}/pull/${prNumber}`;
      return {
        value: env,
        name: `${env} (PR #${prNumber}: ${prUrl})`
      };
    }
    return {
      value: env,
      name: env
    };
  });

  const selectedEnvironments = await checkbox({
    message: 'Select environments to delete:',
    choices: choices
  });

  if (selectedEnvironments.length === 0) {
    console.log(chalk.yellow('\nNo environments selected.'));
    return;
  }

  const userConfirm = await confirm({
    message: `Are you sure you want to delete the following environment(s)?:\n${selectedEnvironments.map(env => `  - ${env}`).join('\n')}\n\nTotal: ${selectedEnvironments.length} environment(s)`,
    default: false
  });

  if (userConfirm) {
    for (const env of selectedEnvironments) {
      const spinner = ora(`Deleting environment ${env}...`).start();
      try {
        await deleteEnvironment(instance, project, env);
        spinner.succeed(`Environment ${env} deleted successfully.`);
      } catch (error) {
        spinner.fail(`Failed to delete environment ${env}: ${error.message}`);
      }
    }
  } else {
    console.log(chalk.yellow('\nDeletion cancelled.'));
  }

  await input({
    message: 'Press Enter to continue...'
  });
}

async function generateLoginLinkFlow(instance, project, githubBaseUrl) {
  const spinner = ora(`Loading environments for ${project}...`).start();
  const allEnvironments = await getEnvironments(instance, project);
  spinner.stop();

  // Filter out protected environments
  const eligibleEnvironments = allEnvironments.filter(env =>
    env !== 'production' &&
    env !== 'master'
  );

  if (eligibleEnvironments.length === 0) {
    console.log(chalk.yellow('\nNo eligible environments for login link generation.'));
    await input({
      message: 'Press Enter to continue...'
    });
    return;
  }

  // Create choices with PR information
  const choices = eligibleEnvironments.map(env => {
    const prNumber = extractPrNumber(env);
    if (prNumber && githubBaseUrl) {
      return {
        value: env,
        name: `${env} (PR #${prNumber})`
      };
    }
    return {
      value: env,
      name: env
    };
  });

  const selectedEnvironment = await select({
    message: 'Select an environment to generate a login link:',
    choices: choices
  });

  const spinner2 = ora(`Generating login link for ${selectedEnvironment}...`).start();
  try {
    const loginLink = await generateLoginLink(instance, project, selectedEnvironment);
    spinner2.succeed('Login link generated successfully.');

    console.log(chalk.green('\nLogin Link:'));
    console.log(chalk.cyan(loginLink));
  } catch (error) {
    spinner2.fail(`Failed to generate login link: ${error.message}`);
  }

  await input({
    message: 'Press Enter to continue...'
  });
}

/**
 * Guides the user through clearing the Drupal cache for a selected environment in a Lagoon project.
 *
 * Prompts the user to choose an environment, attempts to clear its Drupal cache, and displays the result or any
 * errors encountered.
 */
async function clearCacheFlow(instance, project, githubBaseUrl) {
  const spinner = ora(`Loading environments for ${project}...`).start();
  const allEnvironments = await getEnvironments(instance, project);
  spinner.stop();

  if (allEnvironments.length === 0) {
    console.log(chalk.yellow('\nNo environments found.'));
    await input({
      message: 'Press Enter to continue...'
    });
    return;
  }

  // Create choices with PR information
  const choices = allEnvironments.map(env => {
    const prNumber = extractPrNumber(env);
    if (prNumber && githubBaseUrl) {
      return {
        value: env,
        name: `${env} (PR #${prNumber})`
      };
    }
    return {
      value: env,
      name: env
    };
  });

  const selectedEnvironment = await select({
    message: 'Select an environment to clear cache:',
    choices: choices
  });

  const spinner2 = ora(`Clearing cache for ${selectedEnvironment}...`).start();
  try {
    const result = await clearDrupalCache(instance, project, selectedEnvironment);
    spinner2.succeed('Cache cleared successfully.');

    console.log(chalk.green('\nCache Clear Result:'));
    console.log(chalk.cyan(result || 'Cache cleared successfully.'));
  } catch (error) {
    spinner2.fail(`Failed to clear cache: ${error.message}`);
  }

  await input({
    message: 'Press Enter to continue...'
  });
}

/**
 * Guides the user through deploying a selected Git branch for a Lagoon project via the interactive CLI.
 *
 * Prompts the user to select a branch from the project's Git repository, confirms deployment, and initiates the
 * deployment process. Provides feedback on success or failure and informs the user that deployment is asynchronous.
 *
 * @param {string} instance - The Lagoon instance identifier.
 * @param {string} project - The Lagoon project name.
 * @param {object} projectDetails - Details of the Lagoon project, including the Git URL.
 */
async function deployBranchFlow(instance, project, projectDetails) {
  // Check if project has a git URL
  if (!projectDetails || !projectDetails.giturl) {
    console.log(chalk.yellow('\nThis project does not have a valid Git URL configured.'));
    await input({
      message: 'Press Enter to continue...'
    });
    return;
  }

  console.log(chalk.blue(`\nFetching branches from ${chalk.bold(projectDetails.giturl)}...`));

  const spinner = ora('Loading branches...').start();
  try {
    // Get branches from the git repository
    const branches = await getGitBranches(projectDetails.giturl);
    spinner.succeed(`Found ${branches.length} branches.`);

    if (branches.length === 0) {
      console.log(chalk.yellow('\nNo branches found in the git repository.'));
      await input({
        message: 'Press Enter to continue...'
      });
      return;
    }

    // Sort the branches to put main/master/develop first, then the rest alphabetically
    const sortedBranches = branches.sort((a, b) => {
      const priority = ['main', 'master', 'develop'];
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      } else {
        return a.localeCompare(b);
      }
    });

    // Create choices array for the select prompt
    const choices = sortedBranches.map(branch => ({
      value: branch,
      name: branch
    }));

    // Allow user to select a branch
    const selectedBranch = await search({
      message: 'Select a branch to deploy:',
      source: (input) => {
        input = input || '';
        return choices.filter(choice => choice.name.toLowerCase().includes(input.toLowerCase()));
      },
      // Modern select doesn't have autocomplete but we can set reasonable pagination
      loop: true,
      pageSize: 10
    });

    // Confirm the selection
    const userConfirm = await confirm({
      message: `Are you sure you want to deploy branch ${chalk.bold(selectedBranch)} to project ${chalk.bold(project)}?`,
      default: false
    });

    if (!userConfirm) {
      console.log(chalk.yellow('\nDeployment cancelled.'));
      await input({
        message: 'Press Enter to continue...'
      });
      return;
    }

    // Deploy the branch
    const spinner2 = ora(`Deploying branch ${selectedBranch}...`).start();
    try {
      const result = await deployBranch(instance, project, selectedBranch);
      spinner2.succeed('Deployment initiated successfully.');

      console.log(chalk.green('\nDeployment Status:'));
      console.log(chalk.cyan(result.message || 'Branch deployment initiated.'));
      console.log(chalk.blue('\nNote: The deployment process runs asynchronously and may take several minutes to complete.'));
      console.log(chalk.blue('You can check the status of the deployment in the Lagoon UI.'));
    } catch (error) {
      spinner2.fail(`Failed to deploy branch: ${error.message}`);
    }
  } catch (error) {
    spinner.fail(`Failed to fetch branches: ${error.message}`);
  }

  await input({
    message: 'Press Enter to continue...'
  });
}

/**
 * Guides the user through generating an SSH command for connecting to a Lagoon environment.
 *
 * @param {string} instance - The Lagoon instance identifier.
 * @param {string} project - The Lagoon project name.
 * @param {string} githubBaseUrl - The GitHub base URL for the project (for PR information).
 */
async function sshToEnvironmentFlow(instance, project, githubBaseUrl) {
  const spinner = ora(`Loading environments for ${project}...`).start();
  const allEnvironments = await getEnvironments(instance, project);
  spinner.stop();

  if (allEnvironments.length === 0) {
    console.log(chalk.yellow('\nNo environments found.'));
    await input({
      message: 'Press Enter to continue...'
    });
    return;
  }

  // Create choices with PR information
  const choices = allEnvironments.map(env => {
    const prNumber = extractPrNumber(env);
    if (prNumber && githubBaseUrl) {
      return {
        value: env,
        name: `${env} (PR #${prNumber})`
      };
    }
    return {
      value: env,
      name: env
    };
  });

  const selectedEnvironment = await select({
    message: 'Select an environment to SSH into:',
    choices: choices
  });

  // Ask for container with 'cli' as default
  const container = await input({
    message: 'Enter the container/service name (press Enter for default):',
    default: 'cli'
  });

  // Generate the SSH command
  const { command, message } = getSSHCommand(instance, project, selectedEnvironment, container);

  // Display the command
  console.log('\n' + chalk.cyan(message));
  console.log(chalk.yellow.bold('\n' + command + '\n'));

  // Offer to copy to clipboard (if clipboardy is available)
  try {
    const clipboardy = await import('clipboardy');
    const copyToClipboard = await confirm({
      message: 'Copy command to clipboard?',
      default: true
    });

    if (copyToClipboard) {
      try {
        await clipboardy.default.write(command);
        console.log(chalk.green('✓ Command copied to clipboard'));
      } catch (error) {
        console.log(chalk.yellow('Could not copy to clipboard. Please copy the command manually.'));
      }
    }
  } catch (error) {
    // clipboardy not available, skip clipboard option
    console.log(chalk.gray('Copy the command above and run it in a new terminal window.'));
  }

  console.log(chalk.gray('\nTip: Run this command in a new terminal window to maintain your SSH session while continuing to use this CLI.'));

  await input({
    message: 'Press Enter to continue...'
  });
}
