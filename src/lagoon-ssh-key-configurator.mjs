import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { execLagoonCommand } from './lagoon-api.mjs';
import { logAction, logError } from './logger.mjs';

// Path to the .lagoon.yml file
const LAGOON_CONFIG_PATH = path.join('~/.lagoon.yml');

// Read the Lagoon configuration file
export async function readLagoonConfig() {
  try {
    const fileContent = await fs.readFile(LAGOON_CONFIG_PATH, 'utf8');
    return yaml.load(fileContent);
  } catch (error) {
    logError('Read Config', LAGOON_CONFIG_PATH, error);
    throw new Error(`Failed to read Lagoon configuration: ${error.message}`);
  }
}

// Write the updated configuration back to the file
async function writeLagoonConfig(config) {
  try {
    const yamlString = yaml.dump(config);
    await fs.writeFile(LAGOON_CONFIG_PATH, yamlString, 'utf8');
    logAction('Write Config', LAGOON_CONFIG_PATH, 'Successfully updated Lagoon configuration');
  } catch (error) {
    logError('Write Config', LAGOON_CONFIG_PATH, error);
    throw new Error(`Failed to write Lagoon configuration: ${error.message}`);
  }
}

// List all SSH private keys in the ~/.ssh directory
async function listSshKeys() {
  try {
    const sshDir = path.join(os.homedir(), '.ssh');
    const files = await fs.readdir(sshDir);

    // Filter for private keys (files without .pub extension)
    const privateKeys = files.filter(file => {
      // Don't include public keys (.pub) or known_hosts files, config files, etc.
      return !file.endsWith('.pub') &&
             file !== 'known_hosts' &&
             file !== 'authorized_keys' &&
             file !== 'config';
    });

    return privateKeys.map(key => ({
      name: key,
      value: path.join(sshDir, key)
    }));
  } catch (error) {
    logError('List SSH Keys', '~/.ssh', error);
    throw new Error(`Failed to list SSH keys: ${error.message}`);
  }
}

// Configure SSH key for a Lagoon instance
export async function configureSshKey(instanceName) {
  try {
    // Read the current configuration
    const config = await readLagoonConfig();

    // Check if the instance exists
    if (!config.lagoons || !config.lagoons[instanceName]) {
      throw new Error(`Lagoon instance "${instanceName}" not found in configuration`);
    }

    const instance = config.lagoons[instanceName];
    const currentSshKey = instance.sshkey || 'Not configured';

    console.log(chalk.blue(`Current SSH key for ${chalk.bold(instanceName)}: ${chalk.yellow(currentSshKey)}`));

    // Get available SSH keys
    const sshKeys = await listSshKeys();

    if (sshKeys.length === 0) {
      console.log(chalk.yellow('No SSH keys found in ~/.ssh directory'));
      return false;
    }

    // Add option to cancel
    sshKeys.push({
      label: 'Cancel',
      value: null
    });

    // Prompt user to select an SSH key
    const sshKey = await select({
      message: 'Select an SSH key:',
      choices: sshKeys.map(key => ({
        value: key.value,
        label: key.name || key.label || key.value
      }))
    });

    // If user cancels, return
    if (!sshKey) {
      console.log(chalk.yellow('SSH key configuration cancelled'));
      return false;
    }

    // Update the configuration
    config.lagoons[instanceName].sshkey = sshKey;
    await writeLagoonConfig(config);

    console.log(chalk.green(`SSH key for ${chalk.bold(instanceName)} updated to: ${chalk.bold(sshKey)}`));

    // Refresh the token
    await refreshLagoonToken(instanceName);

    return true;
  } catch (error) {
    console.error(chalk.red(`Error configuring SSH key: ${error.message}`));
    return false;
  }
}

// Refresh the Lagoon token using the configured SSH key
export async function refreshLagoonToken(instanceName) {
  try {
    console.log(chalk.blue(`Refreshing token for ${chalk.bold(instanceName)}...`));
    const command = `lagoon -l ${instanceName} login`;
    await execLagoonCommand(command, `Refresh Token for ${instanceName}`);
    console.log(chalk.green(`Successfully refreshed token for ${chalk.bold(instanceName)}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error refreshing token: ${error.message}`));
    return false;
  }
}
