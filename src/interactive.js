import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import {
  getLagoonInstances,
  getProjects,
  getProjectsWithDetails,
  getEnvironments,
  getUsers,
  deleteEnvironment,
  generateLoginLink,
  clearDrupalCache,
  gitUrlToGithubUrl,
  extractPrNumber
} from './lagoon-api.js';
import { logAction } from './logger.js';
import { configureSshKey } from "./lagoon-ssh-key-configurator.js";

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
      await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Do you want to continue?',
          default: true
        }
      ]).then(answers => {
        if (!answers.continue) {
          exit = true;
          logAction('Exit Application', 'N/A', 'User exited after error');
        }
      });
    }
  }

  console.log(chalk.green('Thank you for using Lagoon CLI Wrapper!'));
}

async function selectLagoonInstance() {
  const spinner = ora('Loading Lagoon instances...').start();
  const instances = await getLagoonInstances();
  spinner.stop();

  const { instance } = await inquirer.prompt([
    {
      type: 'list',
      name: 'instance',
      message: 'Select a Lagoon instance:',
      choices: instances
    }
  ]);

  return instance;
}

async function selectProjectWithDetails(instance) {
  const spinner = ora(`Loading projects for ${instance}...`).start();
  const projectsWithDetails = await getProjectsWithDetails(instance);
  spinner.stop();

  const projectChoices = projectsWithDetails.map(project => ({
    name: project.projectname,
    value: project.projectname
  }));

  const { project } = await inquirer.prompt([
    {
      type: 'list',
      name: 'project',
      message: 'Select a project:',
      choices: projectChoices
    }
  ]);

  const projectDetails = projectsWithDetails.find(p => p.projectname === project);

  return {
    projectName: project,
    projectDetails: projectDetails
  };
}

async function showMainMenu(instance, project) {
  console.log(chalk.blue(`\nCurrent Instance: ${chalk.bold(instance)}`));
  console.log(chalk.blue(`Current Project: ${chalk.bold(project)}\n`));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'List Environments', value: 'listEnvironments' },
        { name: 'List Users', value: 'listUsers' },
        { name: 'Delete Environment', value: 'deleteEnvironment' },
        { name: 'Generate Login Link', value: 'generateLoginLink' },
        { name: 'Clear Drupal Cache', value: 'clearCache' },
        { name: 'Change Project', value: 'changeProject' },
        { name: 'Change Instance', value: 'changeInstance' },
        { name: 'Configure User SSH Key', value: 'configureUserSshKey'},
        { name: 'Exit', value: 'exit' }
      ]
    }
  ]);

  return action;
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

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }
  ]);
}

async function listUsers(instance, project) {
  const spinner = ora(`Loading users for ${project}...`).start();
  const users = await getUsers(instance, project);
  spinner.stop();

  console.log(chalk.green('\nUsers:'));
  users.forEach(user => {
    console.log(`- ${user}`);
  });

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }
  ]);
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
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...'
      }
    ]);
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
    const prUrl = `${githubBaseUrl}/pull/${prNumber}`;
    if (prNumber && githubBaseUrl) {
      return {
        name: `${env} (PR #${prUrl})`,
        value: env
      };
    }
    return env;
  });

  const { selectedEnvironments } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedEnvironments',
      message: 'Select environments to delete:',
      choices: choices
    }
  ]);

  if (selectedEnvironments.length === 0) {
    console.log(chalk.yellow('\nNo environments selected.'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete the following environment(s)?:\n${selectedEnvironments.map(env => `  - ${env}`).join('\n')}\n\nTotal: ${selectedEnvironments.length} environment(s)`,
      default: false
    }
  ]);

  if (confirm) {
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

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }
  ]);
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
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...'
      }
    ]);
    return;
  }

  // Create choices with PR information
  const choices = eligibleEnvironments.map(env => {
    const prNumber = extractPrNumber(env);
    if (prNumber && githubBaseUrl) {
      return {
        name: `${env} (PR #${prNumber})`,
        value: env
      };
    }
    return env;
  });

  const { selectedEnvironment } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedEnvironment',
      message: 'Select an environment to generate a login link:',
      choices: choices
    }
  ]);

  const spinner2 = ora(`Generating login link for ${selectedEnvironment}...`).start();
  try {
    const loginLink = await generateLoginLink(instance, project, selectedEnvironment);
    spinner2.succeed('Login link generated successfully.');

    console.log(chalk.green('\nLogin Link:'));
    console.log(chalk.cyan(loginLink));
  } catch (error) {
    spinner2.fail(`Failed to generate login link: ${error.message}`);
  }

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }
  ]);
}

async function clearCacheFlow(instance, project, githubBaseUrl) {
  const spinner = ora(`Loading environments for ${project}...`).start();
  const allEnvironments = await getEnvironments(instance, project);
  spinner.stop();

  if (allEnvironments.length === 0) {
    console.log(chalk.yellow('\nNo environments found.'));
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...'
      }
    ]);
    return;
  }

  // Create choices with PR information
  const choices = allEnvironments.map(env => {
    const prNumber = extractPrNumber(env);
    if (prNumber && githubBaseUrl) {
      return {
        name: `${env} (PR #${prNumber})`,
        value: env
      };
    }
    return env;
  });

  const { selectedEnvironment } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedEnvironment',
      message: 'Select an environment to clear cache:',
      choices: choices
    }
  ]);

  const spinner2 = ora(`Clearing cache for ${selectedEnvironment}...`).start();
  try {
    const result = await clearDrupalCache(instance, project, selectedEnvironment);
    spinner2.succeed('Cache cleared successfully.');

    console.log(chalk.green('\nCache Clear Result:'));
    console.log(chalk.cyan(result || 'Cache cleared successfully.'));
  } catch (error) {
    spinner2.fail(`Failed to clear cache: ${error.message}`);
  }

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }
  ]);
}
