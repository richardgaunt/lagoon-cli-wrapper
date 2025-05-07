/**
 * Comprehensive tests for all helper functions in the Lagoon CLI Wrapper
 */
import { gitUrlToGithubUrl, extractPrNumber } from './lagoon-api.mjs';

describe('gitUrlToGithubUrl', () => {
  test('should handle empty input', () => {
    expect(gitUrlToGithubUrl('')).toBeNull();
  });

  test('should handle null input', () => {
    expect(gitUrlToGithubUrl(null)).toBeNull();
  });

  test('should handle undefined input', () => {
    expect(gitUrlToGithubUrl(undefined)).toBeNull();
  });

  test('should convert SSH format with username', () => {
    expect(gitUrlToGithubUrl('git@github.com:username/repo.git')).toBe('https://github.com/username/repo');
  });

  test('should convert SSH format with organization', () => {
    expect(gitUrlToGithubUrl('git@github.com:org-name/repo-name.git')).toBe('https://github.com/org-name/repo-name');
  });

  test('should handle HTTPS format correctly', () => {
    expect(gitUrlToGithubUrl('https://github.com/user/repo.git')).toBe('https://github.com/user/repo');
  });

  test('should handle HTTPS format without .git suffix', () => {
    expect(gitUrlToGithubUrl('https://github.com/user/repo')).toBe('https://github.com/user/repo');
  });

  test('should return null for non-GitHub URLs', () => {
    expect(gitUrlToGithubUrl('https://gitlab.com/user/repo.git')).toBeNull();
    expect(gitUrlToGithubUrl('https://bitbucket.org/user/repo.git')).toBeNull();
    expect(gitUrlToGithubUrl('git@gitlab.com:user/repo.git')).toBeNull();
    expect(gitUrlToGithubUrl('git@ssh.dev.azure.com:v3/org/project/repo')).toBeNull();
  });

  test('should handle repo names with dots', () => {
    expect(gitUrlToGithubUrl('git@github.com:user/repo.name.git')).toBe('https://github.com/user/repo.name');
  });

  test('should handle repo names with hyphens', () => {
    expect(gitUrlToGithubUrl('git@github.com:user/repo-name.git')).toBe('https://github.com/user/repo-name');
  });

  test('should handle repo paths with slashes', () => {
    expect(gitUrlToGithubUrl('https://github.com/org/project/repo.git')).toBe('https://github.com/org/project/repo');
  });
});

describe('extractPrNumber', () => {
  test('should handle empty input', () => {
    expect(extractPrNumber('')).toBeNull();
  });

  test('should handle null input', () => {
    expect(extractPrNumber(null)).toBeNull();
  });

  test('should handle undefined input', () => {
    expect(extractPrNumber(undefined)).toBeNull();
  });

  test('should extract simple PR numbers', () => {
    expect(extractPrNumber('pr-1')).toBe('1');
    expect(extractPrNumber('pr-42')).toBe('42');
    expect(extractPrNumber('pr-999')).toBe('999');
  });

  test('should be case insensitive', () => {
    expect(extractPrNumber('PR-123')).toBe('123');
    expect(extractPrNumber('Pr-123')).toBe('123');
    expect(extractPrNumber('pR-123')).toBe('123');
  });

  test('should return null for non-PR environment names', () => {
    expect(extractPrNumber('master')).toBeNull();
    expect(extractPrNumber('develop')).toBeNull();
    expect(extractPrNumber('feature/branch')).toBeNull();
    expect(extractPrNumber('release-1.0')).toBeNull();
  });

  test('should not match PR- in the middle of a string', () => {
    expect(extractPrNumber('feature-pr-123')).toBeNull();
  });

  test('should not match without a hyphen', () => {
    expect(extractPrNumber('pr123')).toBeNull();
  });

  test('should handle PR numbers of varying lengths', () => {
    expect(extractPrNumber('pr-1')).toBe('1');
    expect(extractPrNumber('pr-12')).toBe('12');
    expect(extractPrNumber('pr-123')).toBe('123');
    expect(extractPrNumber('pr-1234')).toBe('1234');
    expect(extractPrNumber('pr-12345')).toBe('12345');
  });
});