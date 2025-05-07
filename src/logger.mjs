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
 * Returns the file path for the current day's log file in the `.logs` directory.
 *
 * The log file is named using the format `log--YYYYMMDD.txt`, where `YYYYMMDD` is the current date.
 *
 * @returns {string} Absolute path to the log file for today.
 */
function getLogFilePath() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
  return path.join(LOG_DIR, `log--${dateStr}.txt`);
}

/**
 * Appends a timestamped action entry to the current day's log file.
 *
 * The log entry includes the action description, executed CLI command, and an optional result string.
 *
 * @param {string} action - Description of the action performed.
 * @param {string} command - The CLI command that was executed.
 * @param {string} [result] - Optional result or output of the command.
 */
export function logAction(action, command, result = null) {
  const timestamp = new Date().toISOString(); // ISO8601 timestamp
  const logMessage = `[${timestamp}] ACTION: ${action} | COMMAND: ${command}${result ? ` | RESULT: ${result}` : ''}\n`;

  const logFilePath = getLogFilePath();

  fs.appendFileSync(logFilePath, logMessage);
}

/**
 * Logs an error entry with a timestamp, action description, command, and error message to the current day's log file.
 *
 * @param {string} action - Description of the action during which the error occurred.
 * @param {string} command - The CLI command that was executed.
 * @param {Error} error - The error encountered.
 */
export function logError(action, command, error) {
  const timestamp = new Date().toISOString(); // ISO8601 timestamp
  const logMessage = `[${timestamp}] ERROR: ${action} | COMMAND: ${command} | ERROR: ${error.message}\n`;

  const logFilePath = getLogFilePath();

  fs.appendFileSync(logFilePath, logMessage);
}
