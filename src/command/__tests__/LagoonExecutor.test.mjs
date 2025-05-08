import { jest } from '@jest/globals';
import { LagoonExecutor } from '../LagoonExecutor.mjs';
import { LagoonCommand } from '../LagoonCommand.mjs';

// This is a simple mock logger for testing
const createMockLogger = () => ({
  logAction: jest.fn(),
  logError: jest.fn()
});

// Manually mock execFileAsync method
const mockExecFileResults = { stdout: 'mock stdout', stderr: '' };

describe('LagoonExecutor', () => {
  let executor;
  let mockLogger;
  let command;

  // We'll overwrite the execFileAsync method with our mock
  beforeEach(() => {
    mockLogger = createMockLogger();

    // Create a test LagoonCommand
    command = new LagoonCommand()
      .withInstance('amazee.io')
      .withProject('test-project')
      .listEnvironments()
      .withJsonOutput();

    // Create executor with the mock logger
    executor = new LagoonExecutor(mockLogger);

    // Override the execFileAsync method with our mock
    executor.execFileAsync = jest.fn().mockResolvedValue(mockExecFileResults);

    // Mock console.log to avoid cluttering test output
    console.log = jest.fn();
  });

  test('should execute command with correct parameters', async () => {
    // Execute the command
    const result = await executor.execute(command, 'Test Action');

    // Verify execFileAsync was called with correct arguments
    expect(executor.execFileAsync).toHaveBeenCalledWith(
      'lagoon',
      ['-l', 'amazee.io', '-p', 'test-project', 'list', 'environments', '--output-json']
    );

    // Verify result is what we expect
    expect(result).toEqual(mockExecFileResults);

    // Verify logger was called correctly
    expect(mockLogger.logAction).toHaveBeenCalledWith(
      'Test Action',
      expect.any(String),
      'Success'
    );
  });

  test('should handle errors correctly', async () => {
    // Set up mock to reject with error
    const mockError = new Error('Command failed');
    executor.execFileAsync = jest.fn().mockRejectedValue(mockError);

    // Execute and expect rejection
    await expect(executor.execute(command, 'Test Action')).rejects.toThrow('Command failed');

    // Verify logger was called with error
    expect(mockLogger.logError).toHaveBeenCalledWith(
      'Test Action',
      expect.any(String),
      mockError
    );
  });
});
