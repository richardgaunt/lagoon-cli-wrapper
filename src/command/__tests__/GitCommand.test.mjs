import { GitCommand } from '../GitCommand.mjs';

describe('GitCommand', () => {
  let command;

  beforeEach(() => {
    command = new GitCommand();
  });

  test('should initialize with git as base command', () => {
    expect(command.getBaseCommand()).toBe('git');
    expect(command.args).toEqual([]);
  });

  test('lsRemote should set the ls-remote command with heads option', () => {
    command.lsRemote('https://github.com/example/repo.git');
    expect(command.getArgs()).toEqual([
      'ls-remote',
      '--heads',
      'https://github.com/example/repo.git'
    ]);
  });

  test('lsRemote should not add arguments if gitUrl is falsy', () => {
    command.lsRemote('');
    expect(command.getArgs()).toEqual([]);
  });

  test('getCommandArray should return full command array', () => {
    command.lsRemote('https://github.com/example/repo.git');
    expect(command.getCommandArray()).toEqual([
      'git',
      'ls-remote',
      '--heads',
      'https://github.com/example/repo.git'
    ]);
  });

  test('toString should return properly formatted command string', () => {
    command.lsRemote('https://github.com/example/repo.git');
    expect(command.toString()).toBe('git ls-remote --heads https://github.com/example/repo.git');
  });
});
