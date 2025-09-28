/**
 * @fileoverview Optimized Batch Logging System.
 */

// =================================================================
// LOGGER CORE (WITH BUFFER FOR BATCH PROCESSING)
// =================================================================

const Logger = {
  buffer: [],
  log: function(level, module, message, details = '') {
    // Always write to console for real-time debugging.
    const formattedMessage = `[${module}] ${message} ${details || ''}`;
    if (level === 'ERROR') console.error(formattedMessage);
    else if (level === 'WARNING') console.warn(formattedMessage);
    else console.log(formattedMessage);
    
    // Add log to buffer instead of writing immediately to sheet.
    this.buffer.push([new Date(), level, module, message, details]);
  },
  flush: function() {
    if (this.buffer.length === 0) return; // Do nothing if no logs to write.
    
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = spreadsheet.getSheetByName("LOGS");
      if (!sheet) {
        sheet = spreadsheet.insertSheet("LOGS");
        sheet.getRange(1, 1, 1, 5).setValues([['Timestamp', 'Level', 'Module', 'Message', 'Details']]).setFontWeight('bold');
      }
      
      // Write all logs from buffer at once. Much faster.
      sheet.getRange(sheet.getLastRow() + 1, 1, this.buffer.length, this.buffer[0].length)
           .setValues(this.buffer);
      
      // Clear buffer after writing.
      this.buffer = [];
      
    } catch (error) {
      console.error(`CRITICAL: Failed to flush logs to sheet. Error: ${error.message}`);
    }
  }
};

// =================================================================
// PUBLIC LOGGING FUNCTIONS (INTERFACE FOR OTHER MODULES)
// =================================================================

function logEvent(module, message, details) { Logger.log('INFO', module, message, details); }
function logError(module, message, details) { Logger.log('ERROR', module, message, details); }
function logWarning(module, message, details) { Logger.log('WARNING', module, message, details); }
function logSyncStart(service, account) { Logger.log('INFO', 'SYNC', `Starting synchronization: ${service}`, `Account: ${account}`); }
function logSyncEnd(service, recordCount, duration, status) {
  const details = `${recordCount} records, ${Math.round(duration/1000)}s, ${status}`;
  const level = status === 'SUCCESS' ? 'INFO' : 'ERROR';
  Logger.log(level, 'SYNC', `Synchronization completed: ${service}`, details);
}

/**
 * Flushes all accumulated logs in buffer to spreadsheet.
 */
function flushLogs() {
  Logger.flush();
}

// =================================================================
// ADMINISTRATION AND ALERTS UTILITIES
// =================================================================

/**
 * Cleans log records from LOGS sheet that are older than specified number of days.
 */
function cleanupLogs(daysToKeep = 30) {
  flushLogs();
  logEvent('LOGS', `Starting cleanup of logs older than ${daysToKeep} days.`);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LOGS");

    if (!sheet || sheet.getLastRow() < 2) {
      logWarning('LOGS', 'No logs to clean up.');
      flushLogs();
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Remove header row.
    
    const firstRowToKeepIndex = data.findIndex(row => new Date(row[0]) > cutoffDate);

    if (firstRowToKeepIndex > 0) {
      sheet.deleteRows(2, firstRowToKeepIndex);
      logEvent('LOGS', `${firstRowToKeepIndex} old log entries have been deleted.`);
    
    } else if (firstRowToKeepIndex === -1 && data.length > 0) {
      sheet.getRange(2, 1, data.length, headers.length).clearContent();
      logEvent('LOGS', `All ${data.length} old logs have been deleted.`);
    
    } else {
      logEvent('LOGS', 'No logs old enough to delete were found.');
    }

  } catch (error) {
    logError('LOGS', `Log cleanup operation failed: ${error.message}`);
  }
  
  flushLogs();
}

/**
 * Shows user interface to ask how many days of logs to keep.
 */
function cleanupLogsUI() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Clean Old Logs',
    'Enter the number of days of logs you want to keep (e.g. 30). All older records will be deleted.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const days = parseInt(response.getResponseText());
    if (isNaN(days) || days <= 0) {
      ui.alert('Error', 'Please enter a valid positive number of days.', ui.ButtonSet.OK);
      return;
    }
    
    cleanupLogs(days);
    
    flushLogs(); 
    
    ui.alert('Success', 'Old log cleanup has finished. Check the "LOGS" sheet to see the result.', ui.ButtonSet.OK);
  }
}