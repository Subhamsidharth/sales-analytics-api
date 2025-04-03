import { UUID } from 'bson';
import logger from './logger.js';

/**
 * Safely converts a string to UUID
 * @param {string} id - The ID to convert
 * @returns {UUID} - UUID object
 * @throws {Error} - If ID format is invalid
 */
export const safeUUID = (id) => {
  try {
    return new UUID(id);
  } catch (err) {
    logger.warn(`Invalid UUID format: ${id}`);
    throw new Error(`Invalid UUID format: ${id}`);
  }
};

/**
 * Validates ISO date format and returns a Date object
 * @param {string} dateString - ISO date string
 * @returns {Date} - Date object
 * @throws {Error} - If date format is invalid
 */
export const validateDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format. Please use ISO format (YYYY-MM-DDTHH:mm:ssZ)');
  }
  return date;
};