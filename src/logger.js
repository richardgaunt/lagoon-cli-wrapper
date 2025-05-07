import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', '.logs');

// Ensure the log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Get the current log file name based on the date
 * @returns {string} The log file path
 */
function getLogFilePath() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
  return path.join(LOG_DIR, `log--${dateStr}.txt`);
}

/**
 * Log a message to the daily log file
 * @param {string} action - The action being performed in the CLI
 * @param {string} command - The Lagoon CLI command being executed
 * @param {string} [result] - Optional result of the command
 */
export function logAction(action, command, result = null) {
  const timestamp = new Date().toISOString(); // ISO8601 timestamp
  const logMessage = `[${timestamp}] ACTION: ${action} | COMMAND: ${command}${result ? ` | RESULT: ${result}` : ''}\n`;

  const logFilePath = getLogFilePath();

  fs.appendFileSync(logFilePath, logMessage);
}

/**
 * Log an error to the daily log file
 * @param {string} action - The action being performed in the CLI
 * @param {string} command - The Lagoon CLI command being executed
 * @param {Error} error - The error that occurred
 */
export function logError(action, command, error) {
  const timestamp = new Date().toISOString(); // ISO8601 timestamp
  const logMessage = `[${timestamp}] ERROR: ${action} | COMMAND: ${command} | ERROR: ${error.message}\n`;

  const logFilePath = getLogFilePath();

  fs.appendFileSync(logFilePath, logMessage);
}
