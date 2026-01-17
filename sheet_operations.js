/**
 * @fileoverview Sheet Operations Module - Incremental Update Strategies
 * Provides different strategies for updating sheets efficiently during incremental audits
 * Supports append-only, merge-update, and selective refresh modes
 *
 * @version 1.0
 * @date January 2026
 */

// =================================================================
// CONSTANTS
// =================================================================

const SHEET_OPS_BATCH_SIZE = 500; // Max rows to write in single batch
const SHEET_OPS_SLEEP_INTERVAL = 100; // Sleep between batches (ms)

/**
 * Append-only sheet update strategy.
 * Use for resources that are rarely deleted (GA4 Properties, GTM Containers, etc.)
 * Simply appends new rows at the end without checking for duplicates.
 *
 * @param {string} sheetName - Name of sheet to update
 * @param {Array<Array>} newRecords - Array of record arrays to append
 * @param {Object} options - Options object
 * @returns {Object} Update result with record count and status
 */
function appendNewRecords(sheetName, newRecords, options = {}) {
  try {
    if (!newRecords || newRecords.length === 0) {
      logEvent('SHEET_OPS', `No new records to append for ${sheetName}, skipping update`);
      return { status: 'SKIPPED', recordsAppended: 0, sheetName: sheetName };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    // Create sheet if it doesn't exist
    if (!sheet) {
      // Get headers from options or create default
      const headers = options.headers || getDefaultHeaders(sheetName);
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logEvent('SHEET_OPS', `Created sheet: ${sheetName}`);
    }

    // Get last row
    const lastRow = sheet.getLastRow();
    const colCount = newRecords[0].length;

    // Batch write to avoid hitting timeout limits
    let recordsWritten = 0;

    for (let i = 0; i < newRecords.length; i += SHEET_OPS_BATCH_SIZE) {
      const batch = newRecords.slice(i, i + SHEET_OPS_BATCH_SIZE);
      const insertRow = lastRow + 1 + i;

      // Write batch
      sheet.getRange(insertRow, 1, batch.length, colCount).setValues(batch);
      recordsWritten += batch.length;

      // Sleep between batches to avoid quota issues
      if (i + SHEET_OPS_BATCH_SIZE < newRecords.length) {
        Utilities.sleep(SHEET_OPS_SLEEP_INTERVAL);
      }
    }

    logEvent('SHEET_OPS', `Appended ${recordsWritten} records to ${sheetName}`);

    return {
      status: 'SUCCESS',
      recordsAppended: recordsWritten,
      sheetName: sheetName,
      totalRowsInSheet: lastRow + recordsWritten
    };

  } catch (error) {
    logError('SHEET_OPS', `Failed to append records to ${sheetName}: ${error.message}`);
    return { status: 'ERROR', error: error.message, sheetName: sheetName };
  }
}

/**
 * Merge-update sheet strategy.
 * Updates existing rows by primary key, appends new rows.
 * Use for resources that can be modified (BigQuery Tables, GTM Tags, etc.)
 *
 * @param {string} sheetName - Name of sheet to update
 * @param {Array<Array>} newRecords - Array of record arrays to merge
 * @param {number} primaryKeyColumnIndex - Column index of primary key (0-indexed)
 * @param {Object} options - Options object
 * @returns {Object} Update result with counts
 */
function mergeUpdateRecords(sheetName, newRecords, primaryKeyColumnIndex = 0, options = {}) {
  try {
    if (!newRecords || newRecords.length === 0) {
      logEvent('SHEET_OPS', `No records to merge for ${sheetName}, skipping update`);
      return { status: 'SKIPPED', recordsMerged: 0, sheetName: sheetName };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    // Create sheet if it doesn't exist
    if (!sheet) {
      const headers = options.headers || getDefaultHeaders(sheetName);
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logEvent('SHEET_OPS', `Created sheet: ${sheetName}`);
    }

    // Get all existing data
    const allData = sheet.getDataRange().getValues();
    const colCount = newRecords[0].length;

    // Build map of existing records by primary key
    // Key format: row number (1-indexed in sheet, so we need to adjust)
    const existingByKey = {};
    for (let i = 1; i < allData.length; i++) {
      const key = allData[i][primaryKeyColumnIndex];
      if (key) {
        existingByKey[key] = i + 1; // Sheet row number (1-indexed)
      }
    }

    // Process new records
    const toAppend = [];
    let updatedCount = 0;

    for (const newRecord of newRecords) {
      const key = newRecord[primaryKeyColumnIndex];

      if (!key) {
        logWarning('SHEET_OPS', `Record missing primary key in ${sheetName}, appending as new`);
        toAppend.push(newRecord);
        continue;
      }

      if (existingByKey[key]) {
        // Update existing row
        const rowNum = existingByKey[key];
        sheet.getRange(rowNum, 1, 1, colCount).setValues([newRecord]);
        updatedCount++;
      } else {
        // Collect new records for batch append
        toAppend.push(newRecord);
      }
    }

    // Batch append new records
    let appendedCount = 0;
    if (toAppend.length > 0) {
      const lastRow = sheet.getLastRow();

      for (let i = 0; i < toAppend.length; i += SHEET_OPS_BATCH_SIZE) {
        const batch = toAppend.slice(i, i + SHEET_OPS_BATCH_SIZE);
        const insertRow = lastRow + 1 + i;

        sheet.getRange(insertRow, 1, batch.length, colCount).setValues(batch);
        appendedCount += batch.length;

        if (i + SHEET_OPS_BATCH_SIZE < toAppend.length) {
          Utilities.sleep(SHEET_OPS_SLEEP_INTERVAL);
        }
      }
    }

    logEvent('SHEET_OPS', `Merged ${newRecords.length} records into ${sheetName}: ${updatedCount} updated, ${appendedCount} appended`);

    return {
      status: 'SUCCESS',
      recordsProcessed: newRecords.length,
      recordsUpdated: updatedCount,
      recordsAppended: appendedCount,
      sheetName: sheetName,
      totalRowsInSheet: sheet.getLastRow()
    };

  } catch (error) {
    logError('SHEET_OPS', `Failed to merge records in ${sheetName}: ${error.message}`);
    return { status: 'ERROR', error: error.message, sheetName: sheetName };
  }
}

/**
 * Selective refresh strategy.
 * Compares records by hash, only updates rows that actually changed.
 * Most efficient for large datasets with few changes.
 * Use for frequently modified resources (GTM Tags, etc.)
 *
 * @param {string} sheetName - Name of sheet to update
 * @param {Array<Array>} newRecords - Array of record arrays to process
 * @param {number} primaryKeyColumnIndex - Column index of primary key (0-indexed)
 * @param {Object} options - Options object with skipHashCheck flag
 * @returns {Object} Update result with detailed counts
 */
function selectiveRefreshRecords(sheetName, newRecords, primaryKeyColumnIndex = 0, options = {}) {
  try {
    if (!newRecords || newRecords.length === 0) {
      logEvent('SHEET_OPS', `No records to process for ${sheetName}, skipping update`);
      return { status: 'SKIPPED', recordsProcessed: 0, sheetName: sheetName };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    // Create sheet if it doesn't exist
    if (!sheet) {
      const headers = options.headers || getDefaultHeaders(sheetName);
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logEvent('SHEET_OPS', `Created sheet: ${sheetName}`);
    }

    // Get all existing data
    const allData = sheet.getDataRange().getValues();
    const colCount = newRecords[0].length;

    // Build hash map of existing records
    const existingHashes = {};
    for (let i = 1; i < allData.length; i++) {
      const key = allData[i][primaryKeyColumnIndex];
      if (key) {
        existingHashes[key] = {
          rowNum: i + 1,
          hash: hashArray(allData[i])
        };
      }
    }

    // Find changed and new records
    const changed = [];
    const newOnly = [];
    let unchangedCount = 0;

    for (const newRecord of newRecords) {
      const key = newRecord[primaryKeyColumnIndex];

      if (!key) {
        logWarning('SHEET_OPS', `Record missing primary key in ${sheetName}`);
        newOnly.push(newRecord);
        continue;
      }

      if (existingHashes[key]) {
        // Compare hashes
        const newHash = hashArray(newRecord);
        if (newHash !== existingHashes[key].hash) {
          changed.push({ key: key, record: newRecord, rowNum: existingHashes[key].rowNum });
        } else {
          unchangedCount++;
        }
      } else {
        // New record
        newOnly.push(newRecord);
      }
    }

    // Update changed rows
    let updatedCount = 0;
    for (const { rowNum, record } of changed) {
      sheet.getRange(rowNum, 1, 1, colCount).setValues([record]);
      updatedCount++;
    }

    // Append new rows
    let appendedCount = 0;
    if (newOnly.length > 0) {
      const lastRow = sheet.getLastRow();

      for (let i = 0; i < newOnly.length; i += SHEET_OPS_BATCH_SIZE) {
        const batch = newOnly.slice(i, i + SHEET_OPS_BATCH_SIZE);
        const insertRow = lastRow + 1 + i;

        sheet.getRange(insertRow, 1, batch.length, colCount).setValues(batch);
        appendedCount += batch.length;

        if (i + SHEET_OPS_BATCH_SIZE < newOnly.length) {
          Utilities.sleep(SHEET_OPS_SLEEP_INTERVAL);
        }
      }
    }

    logEvent('SHEET_OPS', `Selectively refreshed ${sheetName}: ${updatedCount} updated, ${appendedCount} appended, ${unchangedCount} unchanged`);

    return {
      status: 'SUCCESS',
      recordsProcessed: newRecords.length,
      recordsChanged: updatedCount,
      recordsAppended: appendedCount,
      recordsUnchanged: unchangedCount,
      sheetName: sheetName,
      totalRowsInSheet: sheet.getLastRow()
    };

  } catch (error) {
    logError('SHEET_OPS', `Failed to selectively refresh ${sheetName}: ${error.message}`);
    return { status: 'ERROR', error: error.message, sheetName: sheetName };
  }
}

/**
 * Creates or clears and writes a sheet completely (fallback to legacy behavior).
 * Use only when you need to completely reset a sheet.
 * NOT recommended for incremental audits - use append/merge instead.
 *
 * @param {string} sheetName - Name of sheet
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array>} data - Data rows
 * @returns {Object} Write result
 */
function writeDataToSheetIncremental(sheetName, headers, data) {
  try {
    if (!headers || headers.length === 0) {
      throw new Error('Headers are required');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      logEvent('SHEET_OPS', `Created sheet: ${sheetName}`);
    } else {
      // Clear all existing content
      sheet.clearContents();
    }

    // Write headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Write data
    if (data && data.length > 0) {
      // Batch write data
      for (let i = 0; i < data.length; i += SHEET_OPS_BATCH_SIZE) {
        const batch = data.slice(i, i + SHEET_OPS_BATCH_SIZE);
        const startRow = 2 + i;

        sheet.getRange(startRow, 1, batch.length, headers.length).setValues(batch);

        if (i + SHEET_OPS_BATCH_SIZE < data.length) {
          Utilities.sleep(SHEET_OPS_SLEEP_INTERVAL);
        }
      }
    }

    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');

    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    logEvent('SHEET_OPS', `Wrote ${data ? data.length : 0} records to ${sheetName}`);

    return {
      status: 'SUCCESS',
      sheetName: sheetName,
      recordsWritten: data ? data.length : 0
    };

  } catch (error) {
    logError('SHEET_OPS', `Failed to write data to ${sheetName}: ${error.message}`);
    return { status: 'ERROR', error: error.message, sheetName: sheetName };
  }
}

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Computes a simple hash of an array for change detection.
 * Used for comparison in selective refresh operations.
 *
 * @private
 * @param {Array} arr - Array to hash
 * @returns {string} Hash of the array
 */
function hashArray(arr) {
  try {
    // Convert array to JSON string and compute hash
    const str = JSON.stringify(arr);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString();

  } catch (error) {
    logWarning('SHEET_OPS', `Hash computation failed: ${error.message}`);
    return '';
  }
}

/**
 * Gets default headers for a sheet based on its name.
 * Used when creating sheets if headers aren't provided.
 *
 * @private
 * @param {string} sheetName - Name of the sheet
 * @returns {Array<string>} Default headers for this sheet
 */
function getDefaultHeaders(sheetName) {
  const headerMap = {
    'GA4_PROPERTIES': ['Property ID', 'Display Name', 'Create Time', 'Industry Category', 'Time Zone', 'Sync Date'],
    'GA4_CUSTOM_DIMENSIONS': ['Property ID', 'Dimension Name', 'Scope', 'Description', 'Sync Date'],
    'GA4_CUSTOM_METRICS': ['Property ID', 'Metric Name', 'Scope', 'Unit', 'Description', 'Sync Date'],
    'GTM_CONTAINERS': ['Account ID', 'Container ID', 'Name', 'Usage Context', 'Created By', 'Sync Date'],
    'GTM_TAGS': ['Container ID', 'Tag ID', 'Name', 'Type', 'Fire On', 'Workspace', 'Sync Date'],
    'BQ_DATASETS': ['Project ID', 'Dataset ID', 'Location', 'Created Date', 'Last Modified', 'Sync Date'],
    'BQ_TABLES': ['Project ID', 'Dataset ID', 'Table ID', 'Row Count', 'Size (GB)', 'Created Date', 'Sync Date'],
    '_AUDIT_METADATA': ['Service', 'Resource Type', 'Last Sync Timestamp', 'Record Count', 'Status', 'Sync Mode']
  };

  return headerMap[sheetName] || ['ID', 'Name', 'Value', 'Sync Date'];
}

/**
 * Gets count of rows (excluding header) in a sheet.
 *
 * @param {string} sheetName - Name of sheet
 * @returns {number} Number of data rows
 */
function getSheetRecordCount(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return 0;
    }

    const lastRow = sheet.getLastRow();
    return lastRow > 1 ? lastRow - 1 : 0; // Subtract 1 for header row

  } catch (error) {
    logWarning('SHEET_OPS', `Could not get record count for ${sheetName}: ${error.message}`);
    return 0;
  }
}

/**
 * Clears all data from a sheet (but keeps headers if they exist).
 *
 * @param {string} sheetName - Name of sheet
 * @returns {boolean} True if successful
 */
function clearSheetData(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return false;
    }

    // Get last row/column
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // Keep header row (row 1), delete everything else
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    logEvent('SHEET_OPS', `Cleared data from ${sheetName} (kept header row)`);
    return true;

  } catch (error) {
    logError('SHEET_OPS', `Failed to clear sheet data: ${error.message}`);
    return false;
  }
}
