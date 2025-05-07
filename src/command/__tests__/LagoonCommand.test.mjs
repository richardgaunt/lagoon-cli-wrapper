import { LagoonCommand } from '../LagoonCommand.mjs';

describe('LagoonCommand', () => {
  let command;

  beforeEach(() => {
    command = new LagoonCommand();
  });

  test('should initialize with lagoon as base command', () => {
    expect(command.getBaseCommand()).toBe('lagoon');
    expect(command.args).toEqual([]);
  });

  test('withInstance should add instance argument', () => {
    command.withInstance('amazee.io');
    expect(command.getArgs()).toEqual(['-l', 'amazee.io']);
  });

  test('withInstance should not add anything if instance is falsy', () => {
    command.withInstance('');
    command.withInstance(null);
    command.withInstance(undefined);
    expect(command.getArgs()).toEqual([]);
  });

  test('withProject should add project argument', () => {
    command.withProject('test-project');
    expect(command.getArgs()).toEqual(['-p', 'test-project']);
  });

  test('withEnvironment should add environment argument', () => {
    command.withEnvironment('dev');
    expect(command.getArgs()).toEqual(['-e', 'dev']);
  });

  test('withJsonOutput should add output-json flag', () => {
    command.withJsonOutput();
    expect(command.getArgs()).toEqual(['--output-json']);
  });

  test('withForce should add force flag', () => {
    command.withForce();
    expect(command.getArgs()).toEqual(['--force']);
  });

  test('listConfigs should add config list arguments', () => {
    command.listConfigs();
    expect(command.getArgs()).toEqual(['config', 'list']);
  });

  test('listProjects should add list projects arguments', () => {
    command.listProjects();
    expect(command.getArgs()).toEqual(['list', 'projects']);
  });

  test('listEnvironments should add list environments arguments', () => {
    command.listEnvironments();
    expect(command.getArgs()).toEqual(['list', 'environments']);
  });

  test('listUsers should add list all-users arguments', () => {
    command.listUsers();
    expect(command.getArgs()).toEqual(['list', 'all-users']);
  });

  test('deleteEnvironment should add delete environment arguments', () => {
    command.deleteEnvironment('dev');
    expect(command.getArgs()).toEqual(['delete', 'environment', '--environment', 'dev']);
  });

  test('deployBranch should add deploy branch arguments', () => {
    command.deployBranch('main');
    expect(command.getArgs()).toEqual(['deploy', 'branch', '--branch', 'main']);
  });

  test('ssh should add ssh arguments with command', () => {
    command.ssh('drush cr');
    expect(command.getArgs()).toEqual(['ssh', '-C', 'drush cr']);
  });

  test('getCommandArray should return full command array', () => {
    command.withInstance('amazee.io').listProjects().withJsonOutput();
    expect(command.getCommandArray()).toEqual(['lagoon', '-l', 'amazee.io', 'list', 'projects', '--output-json']);
  });

  test('toString should return properly formatted command string', () => {
    command.withInstance('amazee.io').withProject('test-project').listEnvironments().withJsonOutput();
    expect(command.toString()).toBe('lagoon -l amazee.io -p test-project list environments --output-json');
  });

  test('should chain multiple commands correctly', () => {
    command
      .withInstance('amazee.io')
      .withProject('test-project')
      .withEnvironment('dev')
      .withJsonOutput()
      .withForce();
    
    expect(command.getArgs()).toEqual([
      '-l', 'amazee.io',
      '-p', 'test-project',
      '-e', 'dev',
      '--output-json',
      '--force'
    ]);
  });
});