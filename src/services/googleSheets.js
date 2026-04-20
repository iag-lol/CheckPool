/**
 * Google Sheets / Drive service layer stubs
 * These functions are designed to be filled in when integrating with Google APIs.
 * Currently they are no-ops that log actions for debugging.
 */

const SHEETS_CONFIG = {
  spreadsheetId: '', // Set this to your Google Sheets ID
  apiKey: '',         // Set this to your Google API key
  clientId: '',       // Set this for OAuth
};

let isConnected = false;

/**
 * Initialize Google Sheets connection
 */
export async function initGoogleSheets() {
  console.log('[GoogleSheets] init - not configured');
  return false;
}

/**
 * Check if Google Sheets is available
 */
export function isGoogleSheetsAvailable() {
  return isConnected;
}

/**
 * Sync a record to Google Sheets
 */
export async function syncRecord(record) {
  if (!isConnected) return null;
  console.log('[GoogleSheets] syncRecord', record);
  return null;
}

/**
 * Sync vehicle data
 */
export async function syncVehicle(vehicle) {
  if (!isConnected) return null;
  console.log('[GoogleSheets] syncVehicle', vehicle);
  return null;
}

/**
 * Upload photo to Google Drive
 */
export async function uploadPhotoToDrive(base64Data, filename, folderId) {
  if (!isConnected) return null;
  console.log('[GoogleSheets] uploadPhoto', filename, folderId, base64Data?.length || 0);
  return null;
}

/**
 * Get all records from Google Sheets
 */
export async function fetchRecordsFromSheets() {
  if (!isConnected) return [];
  console.log('[GoogleSheets] fetchRecords');
  return [];
}

/**
 * Batch sync all local data to Google Sheets
 */
export async function batchSync(data) {
  if (!isConnected) return false;
  console.log('[GoogleSheets] batchSync', Object.keys(data));
  return false;
}

export default {
  init: initGoogleSheets,
  isAvailable: isGoogleSheetsAvailable,
  syncRecord,
  syncVehicle,
  uploadPhoto: uploadPhotoToDrive,
  fetchRecords: fetchRecordsFromSheets,
  batchSync,
};
