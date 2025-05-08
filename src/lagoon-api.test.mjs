import { jest } from '@jest/globals';
import {
  gitUrlToGithubUrl,
  extractPrNumber,
} from './lagoon-api.mjs';

// Mock the execCommand function
jest.unstable_mockModule('./command/index.mjs', () => ({
  LagoonCommand: jest.fn().mockImplementation(() => ({
    withInstance: jest.fn().mockReturnThis(),
    withProject: jest.fn().mockReturnThis(),
    withEnvironment: jest.fn().mockReturnThis(),
    withJsonOutput: jest.fn().mockReturnThis(),
    withForce: jest.fn().mockReturnThis(),
    listConfigs: jest.fn().mockReturnThis(),
    listProjects: jest.fn().mockReturnThis(),
    listEnvironments: jest.fn().mockReturnThis(),
    listUsers: jest.fn().mockReturnThis(),
    deleteEnvironment: jest.fn().mockReturnThis(),
    deployBranch: jest.fn().mockReturnThis(),
    login: jest.fn().mockReturnThis(),
    ssh: jest.fn().mockReturnThis(),
    getArgs: jest.fn().mockReturnValue([]),
    getBaseCommand: jest.fn().mockReturnValue('lagoon'),
    getCommandArray: jest.fn().mockReturnValue(['lagoon']),
    toString: jest.fn().mockReturnValue('lagoon')
  })),
  GitCommand: jest.fn().mockImplementation(() => ({
    lsRemote: jest.fn().mockReturnThis(),
    getArgs: jest.fn().mockReturnValue([]),
    getBaseCommand: jest.fn().mockReturnValue('git'),
    getCommandArray: jest.fn().mockReturnValue(['git']),
    toString: jest.fn().mockReturnValue('git ls-remote')
  })),
  LagoonExecutor: jest.fn().mockImplementation(() => ({
    execute: jest.fn()
  }))
}));

// Mock the execCommand function
jest.mock('./lagoon-api.mjs', () => {
  const originalModule = jest.requireActual('./lagoon-api.mjs');

  // Only mock the async API functions, keep the helper functions as is
  return {
    ...originalModule,
    execCommand: jest.fn()
  };
}, { virtual: true });

// Unit tests for pure helper functions
describe('Helper Functions', () => {
  describe('gitUrlToGithubUrl', () => {
    test('should convert SSH GitHub URL to HTTPS URL', () => {
      const sshUrl = 'git@github.com:richardgaunt/lagoon-cli-wrapper.git';
      expect(gitUrlToGithubUrl(sshUrl)).toBe('https://github.com/richardgaunt/lagoon-cli-wrapper');
    });

    test('should clean HTTPS GitHub URL', () => {
      const httpsUrl = 'https://github.com/richardgaunt/lagoon-cli-wrapper.git';
      expect(gitUrlToGithubUrl(httpsUrl)).toBe('https://github.com/richardgaunt/lagoon-cli-wrapper');
    });

    test('should return null for non-GitHub URLs', () => {
      const nonGithubUrl = 'https://gitlab.com/some/project.git';
      expect(gitUrlToGithubUrl(nonGithubUrl)).toBeNull();
    });

    // This test uses a spied/mocked version of the function
    test('should handle URLs with github.com in them', () => {
      // Create a URL that definitely contains 'github.com'
      const githubUrl = 'https://github.com/user/repo.git';
      expect(gitUrlToGithubUrl(githubUrl)).toBe('https://github.com/user/repo');
    });
  });

  describe('extractPrNumber', () => {
    test('should extract PR number from environment name', () => {
      expect(extractPrNumber('pr-123')).toBe('123');
    });

    test('should be case insensitive', () => {
      expect(extractPrNumber('PR-456')).toBe('456');
    });

    test('should return null for non-PR environment names', () => {
      expect(extractPrNumber('develop')).toBeNull();
      expect(extractPrNumber('feature-123')).toBeNull();
      expect(extractPrNumber('master')).toBeNull();
      expect(extractPrNumber('pr123')).toBeNull(); // Missing hyphen
    });

    test('should handle multi-digit PR numbers', () => {
      expect(extractPrNumber('pr-1')).toBe('1');
      expect(extractPrNumber('pr-9999')).toBe('9999');
    });
  });
});
