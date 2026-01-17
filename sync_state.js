/**
 * @fileoverview Sync State Management Module - Incremental Audit Support
 * Maintains sync metadata to enable progressive data synchronization
 * Tracks last sync timestamp, record counts, and sync modes for each service
 *
 * @version 1.0
 * @date January 2026
 */

// =================================================================
// SYNC STATE STORAGE CONSTANTS
// =================================================================

const SYNC_STATE_PREFIX = 'ADDOCU_SYNC_STATE_';
const SYNC_STATE_HISTORY_PREFIX = 'ADDOCU_SYNC_HISTORY_';

/**
 * Records the sync state for a service/resource type combination.
 * Enables incremental audits on subsequent runs.
 *
 * @param {string} service - Service name (e.g., 'GA4', 'GTM', 'BigQuery')
 * @param {string} resourceType - Resource type (e.g., 'Properties', 'Containers', 'Datasets')
 * @param {number} recordCount - Number of records processed in this sync
 * @param {string} status - Sync status ('SUCCESS', 'PARTIAL', 'ERROR')
 * @param {string} syncMode - Sync mode ('FULL', 'DELTA', 'INCREMENTAL')
 * @returns {Object} The recorded sync state
 */
function recordSyncState(service, resourceType, recordCount, status = 'SUCCESS', syncMode = 'DELTA') {
  try {
    // Validate inputs
    if (!service || !resourceType) {
      throw new Error('Service and resourceType are required parameters');
    }

    const userProperties = PropertiesService.getUserProperties();
    const stateKey = `${SYNC_STATE_PREFIX}${service.toUpperCase()}_${resourceType.toUpperCase()}`;
    const historyKey = `${SYNC_STATE_HISTORY_PREFIX}${service.toUpperCase()}_${resourceType.toUpperCase()}`;

    // Create sync state object
    const now = new Date();
    const newState = {
      service: service.toUpperCase(),
      resourceType: resourceType.toUpperCase(),
      lastSyncTimestamp: now.toISOString(),
      lastSyncCount: parseInt(recordCount) || 0,
      lastSyncStatus: status,
      syncMode: syncMode,
      syncDurationMs: 0 // Will be calculated by caller if needed
    };

    // Store current state
    userProperties.setProperty(stateKey, JSON.stringify(newState));

    // Keep history of last 10 syncs (optional, for analytics)
    storeHistoricalSync(userProperties, historyKey, newState);

    // Log the sync state recording
    logEvent('SYNC_STATE', `${service}/${resourceType}: ${status} | ${recordCount} records | Mode: ${syncMode}`);

    return newState;

  } catch (error) {
    logError('SYNC_STATE', `Failed to record sync state for ${service}/${resourceType}: ${error.message}`);
    return null;
  }
}

/**
 * Retrieves the sync state for a service/resource type combination.
 * Used to determine if subsequent sync should be full or incremental.
 *
 * @param {string} service - Service name (e.g., 'GA4', 'GTM')
 * @param {string} resourceType - Resource type (e.g., 'Properties', 'Containers')
 * @returns {Object|null} Sync state object or null if not found
 */
function getSyncState(service, resourceType) {
  try {
    if (!service || !resourceType) {
      return null;
    }

    const userProperties = PropertiesService.getUserProperties();
    const stateKey = `${SYNC_STATE_PREFIX}${service.toUpperCase()}_${resourceType.toUpperCase()}`;
    const stored = userProperties.getProperty(stateKey);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    // Validate timestamp format
    if (parsed.lastSyncTimestamp) {
      parsed.lastSyncDate = new Date(parsed.lastSyncTimestamp);
    }

    return parsed;

  } catch (error) {
    logWarning('SYNC_STATE', `Failed to retrieve sync state for ${service}/${resourceType}: ${error.message}`);
    return null;
  }
}

/**
 * Determines if this is the first sync for a service/resource type.
 * First syncs should use full audit mode, subsequent should use incremental.
 *
 * @param {string} service - Service name
 * @param {string} resourceType - Resource type
 * @returns {boolean} True if no previous sync exists
 */
function isFirstSync(service, resourceType) {
  const state = getSyncState(service, resourceType);
  return !state || !state.lastSyncTimestamp;
}

/**
 * Gets the last sync timestamp for a service/resource type.
 * Used as filter cutoff for incremental syncs.
 *
 * @param {string} service - Service name
 * @param {string} resourceType - Resource type
 * @returns {Date|null} Last sync timestamp or null if not found
 */
function getLastSyncTimestamp(service, resourceType) {
  const state = getSyncState(service, resourceType);
  if (!state || !state.lastSyncTimestamp) {
    return null;
  }
  return new Date(state.lastSyncTimestamp);
}

/**
 * Clears sync state for a service (forces full re-audit on next sync).
 * Useful for troubleshooting or resetting incremental sync.
 *
 * @param {string} service - Service name
 * @param {string} resourceType - Resource type (optional; if omitted, clears all for service)
 * @returns {boolean} True if successfully cleared
 */
function clearSyncState(service, resourceType = null) {
  try {
    if (!service) {
      throw new Error('Service name is required');
    }

    const userProperties = PropertiesService.getUserProperties();
    const prefix = `${SYNC_STATE_PREFIX}${service.toUpperCase()}`;

    if (resourceType) {
      // Clear specific resource type
      const stateKey = `${prefix}_${resourceType.toUpperCase()}`;
      userProperties.deleteProperty(stateKey);
      logEvent('SYNC_STATE', `Cleared: ${service}/${resourceType} (will force FULL sync on next run)`);
    } else {
      // Clear all states for this service
      const allProperties = userProperties.getKeys();
      allProperties.forEach(key => {
        if (key.startsWith(prefix)) {
          userProperties.deleteProperty(key);
        }
      });
      logEvent('SYNC_STATE', `Cleared all sync states for ${service} (will force FULL sync on next run)`);
    }

    return true;

  } catch (error) {
    logError('SYNC_STATE', `Failed to clear sync state: ${error.message}`);
    return false;
  }
}

/**
 * Gets a summary of all sync states for a service (for dashboard/reporting).
 *
 * @param {string} service - Service name (optional; if omitted, returns all)
 * @returns {Object} Map of resource types to their sync states
 */
function getAllSyncStates(service = null) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const allProperties = userProperties.getKeys();
    const states = {};

    allProperties.forEach(key => {
      if (key.startsWith(SYNC_STATE_PREFIX)) {
        const serviceMatch = key.match(/ADDOCU_SYNC_STATE_(\w+)_(\w+)/);
        if (serviceMatch) {
          const [, srv, rtype] = serviceMatch;

          // Filter by service if specified
          if (service && srv.toUpperCase() !== service.toUpperCase()) {
            return;
          }

          const stored = userProperties.getProperty(key);
          if (stored) {
            const state = JSON.parse(stored);
            if (!states[srv]) states[srv] = {};
            states[srv][rtype] = state;
          }
        }
      }
    });

    return states;

  } catch (error) {
    logError('SYNC_STATE', `Failed to retrieve all sync states: ${error.message}`);
    return {};
  }
}

/**
 * Stores historical sync data for analytics and debugging.
 * Keeps last 10 syncs per service/resource type.
 *
 * @private
 * @param {Properties} userProperties - User properties service
 * @param {string} historyKey - History key for this service/resource
 * @param {Object} newState - Current sync state
 */
function storeHistoricalSync(userProperties, historyKey, newState) {
  try {
    const stored = userProperties.getProperty(historyKey);
    let history = stored ? JSON.parse(stored) : [];

    // Keep history array as array (not exceeding 10 entries)
    if (!Array.isArray(history)) {
      history = [];
    }

    history.push(newState);

    // Keep only last 10 syncs
    if (history.length > 10) {
      history = history.slice(-10);
    }

    userProperties.setProperty(historyKey, JSON.stringify(history));

  } catch (error) {
    logWarning('SYNC_STATE', `Could not store historical sync: ${error.message}`);
    // Don't fail if history storage fails - it's optional
  }
}

/**
 * Gets sync state summary for metadata sheet.
 * Returns data formatted for writing to _AUDIT_METADATA sheet.
 *
 * @returns {Array<Array>} Array of formatted sync state rows
 */
function getSyncStateForSheet() {
  try {
    const allStates = getAllSyncStates();
    const rows = [];

    // Header row (if needed by caller)
    // Column order: Service, Resource Type, Last Sync Timestamp, Record Count, Status, Sync Mode

    for (const [service, resources] of Object.entries(allStates)) {
      for (const [resourceType, state] of Object.entries(resources)) {
        rows.push([
          service,                        // Service
          resourceType,                   // Resource Type
          state.lastSyncTimestamp || '',  // Last Sync Timestamp
          state.lastSyncCount || 0,       // Record Count
          state.lastSyncStatus || '',     // Status
          state.syncMode || 'DELTA'       // Sync Mode
        ]);
      }
    }

    return rows;

  } catch (error) {
    logError('SYNC_STATE', `Failed to format sync state for sheet: ${error.message}`);
    return [];
  }
}

/**
 * Updates the _AUDIT_METADATA sheet with current sync states.
 * Creates sheet if it doesn't exist.
 */
function updateAuditMetadataSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('_AUDIT_METADATA');

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('_AUDIT_METADATA', 0);
      logEvent('AUDIT_METADATA', 'Created _AUDIT_METADATA sheet');
    }

    // Clear existing content
    sheet.clearContents();

    // Add headers
    const headers = ['Service', 'Resource Type', 'Last Sync Timestamp', 'Record Count', 'Status', 'Sync Mode'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Get and write sync states
    const rows = getSyncStateForSheet();
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    // Format headers (bold)
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');

    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    logEvent('AUDIT_METADATA', `Updated _AUDIT_METADATA sheet with ${rows.length} service states`);

  } catch (error) {
    logError('AUDIT_METADATA', `Failed to update metadata sheet: ${error.message}`);
  }
}
