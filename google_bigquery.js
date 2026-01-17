/**
 * @fileoverview BigQuery Audit Module - GA4 Export Monitoring
 * @version 1.0
 */

// =================================================================
// MODULE CONSTANTS AND CONFIGURATION
// =================================================================

const BQ_DATASETS_HEADERS = [
  'Project ID', 'Dataset ID', 'Location', 'Created Date', 'Last Modified',
  'Default Expiration (Days)', 'Description', 'Is GA4 Export', 'Sync Date'
];

const BQ_GA4_TABLES_HEADERS = [
  'Project ID', 'Dataset ID', 'Table ID', 'Table Type', 'Row Count',
  'Size (GB)', 'Created Date', 'Last Modified', 'Partition Type', 'Clustering Fields', 'Sync Date'
];

const BQ_GA4_EXPORT_LINKS_HEADERS = [
  'GA4 Property ID', 'GA4 Property Name', 'BigQuery Project', 'BigQuery Dataset',
  'Daily Export Enabled', 'Streaming Export Enabled', 'Fresh Daily Export Enabled',
  'Excluded Events', 'Link Created Date', 'Export Status', 'Sync Date'
];

// =================================================================
// SYNCHRONIZATION FUNCTIONS (EXECUTABLE FROM MENU)
// =================================================================

/**
 * Main function to synchronize BigQuery data.
 * Supports incremental sync by filtering datasets modified since last sync.
 * @param {Object} options - Options object {forceFullAudit, incrementalEnabled}
 * @returns {Object} Sync status, record count, and sync mode.
 */
function syncBigQueryCore(options = {}) {
  const startTime = Date.now();
  const serviceName = 'bigquery';
  const results = { datasets: 0, ga4Tables: 0, exportLinks: 0 };

  const forceFullAudit = options.forceFullAudit || false;
  const incrementalEnabled = options.incrementalEnabled !== false;

  try {
    const config = getUserConfig();
    const auth = getAuthConfig(serviceName);
    logSyncStart('BigQuery_Sync', auth.authUser);

    // Get GCP Project ID from config
    const projectId = config.bqProjectId;
    if (!projectId) {
      logWarning('BigQuery', 'No BigQuery Project ID configured. Skipping BigQuery audit.');
      return {
        records: 0,
        status: 'SKIPPED',
        duration: Date.now() - startTime,
        syncMode: 'SKIPPED',
        error: 'No BigQuery Project ID configured'
      };
    }

    // Determine audit mode (FULL vs INCREMENTAL)
    const auditMode = getAuditMode('BigQuery', 'Datasets', forceFullAudit);
    const isIncremental = incrementalEnabled && auditMode === 'INCREMENTAL';
    const lastSyncTime = isIncremental ? new Date(getSyncState('BigQuery', 'Datasets')?.lastSyncTimestamp || 0) : null;

    logEvent('BigQuery', `Phase 1: Scanning project ${projectId}... (Mode: ${auditMode})`);

    // 1. LIST ALL DATASETS
    let datasets = listBigQueryDatasets(projectId);

    // Filter datasets if incremental and we have a last sync time
    if (isIncremental && lastSyncTime) {
      const originalCount = datasets.length;
      datasets = datasets.filter(d => {
        const lastModified = new Date(d['Last Modified'] || 0);
        return lastModified > lastSyncTime;
      });
      logEvent('BigQuery', `Incremental datasets: ${datasets.length} modified since last sync (from ${originalCount} total)`);
    }

    results.datasets = datasets.length;

    if (datasets.length > 0 || !isIncremental) {
      writeBQDatasetsToSheet(datasets);
    }

    // 2. GET GA4 EXPORT TABLES
    const ga4Datasets = datasets.filter(d => d['Is GA4 Export'] === 'Yes');
    logEvent('BigQuery', `Found ${ga4Datasets.length} GA4 export datasets`);

    const allGa4Tables = [];
    for (const dataset of ga4Datasets) {
      try {
        const tables = listGA4ExportTables(dataset['Project ID'], dataset['Dataset ID']);
        allGa4Tables.push(...tables);
      } catch (e) {
        logWarning('BigQuery', `Could not get tables for ${dataset['Dataset ID']}: ${e.message}`);
      }
      Utilities.sleep(100);
    }

    results.ga4Tables = allGa4Tables.length;

    if (allGa4Tables.length > 0 || !isIncremental) {
      writeBQGA4TablesToSheet(allGa4Tables);
    }

    // 3. GET GA4 EXPORT LINKS
    logEvent('BigQuery', 'Phase 2: Checking GA4 BigQuery export links...');
    const exportLinks = getGA4ExportLinks();
    results.exportLinks = exportLinks.length;

    writeBQExportLinksToSheet(exportLinks, datasets);

    // Record sync state for each resource type
    recordSyncState('BigQuery', 'Datasets', results.datasets, 'SUCCESS', auditMode);
    recordSyncState('BigQuery', 'GA4Tables', results.ga4Tables, 'SUCCESS', auditMode);
    recordSyncState('BigQuery', 'ExportLinks', results.exportLinks, 'SUCCESS', auditMode);

    const totalElements = results.datasets + results.ga4Tables + results.exportLinks;
    const duration = Date.now() - startTime;
    logSyncEnd('BigQuery_Sync', totalElements, duration, 'SUCCESS');

    return {
      records: totalElements,
      status: 'SUCCESS',
      duration: duration,
      syncMode: auditMode,
      details: results
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('BigQuery_Sync', 0, duration, 'ERROR');
    logError('BigQuery', `Synchronization failed: ${error.message}`);

    // Report error in the primary sheet
    writeDataToSheet('BQ_DATASETS', BQ_DATASETS_HEADERS, null, 'BigQuery', error.message);

    return {
      records: 0,
      status: 'ERROR',
      duration: duration,
      syncMode: 'ERROR',
      error: error.message
    };
  }
}

/**
 * Entry point for UI calls.
 */
function syncBigQueryWithUI() {
  showLoadingNotification('Syncing BigQuery datasets and GA4 exports...');
  const result = syncBigQueryCore();
  const ui = SpreadsheetApp.getUi();

  if (result.status === 'SUCCESS') {
    const details = result.details;
    const body = `Datasets: ${details.datasets} | GA4 Tables: ${details.ga4Tables} | Export Links: ${details.exportLinks}\n\n` +
      `Total: ${result.records} elements | Time: ${Math.round(result.duration / 1000)}s\n\n` +
      `Data written to BQ_DATASETS, BQ_GA4_TABLES, BQ_GA4_EXPORT_LINKS.`;
    ui.alert('BigQuery Synchronized', body, ui.ButtonSet.OK);
  } else if (result.status === 'SKIPPED') {
    const body = `BigQuery audit requires a GCP Project ID to be configured.\n\n` +
      `Action: Go to "Configure Addocu" > Advanced Settings and enter your GCP Project ID to enable BigQuery auditing.\n\n` +
      `Details: Check LOGS sheet for more information.`;
    ui.alert('BigQuery Skipped', body, ui.ButtonSet.OK);
  } else {
    const body = `Synchronization failed: ${result.error}\n\n` +
      `Action: Verify that your GCP Project ID is correctly configured and that you have BigQuery API access.\n\n` +
      `Details: Check LOGS sheet for more information.`;
    ui.alert('BigQuery Error', body, ui.ButtonSet.OK);
  }
}

// =================================================================
// DATA EXTRACTION HELPERS
// =================================================================

/**
 * Lists all BigQuery datasets in a project.
 * @param {string} projectId - GCP Project ID
 * @returns {Array<Object>} Array of dataset objects.
 */
function listBigQueryDatasets(projectId) {
  const auth = getAuthConfig('bigquery');
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets`;
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  const response = fetchWithRetry(url, options, 'BQ-Datasets');
  if (!response || !response.datasets) return [];

  return response.datasets.map(ds => {
    const datasetRef = ds.datasetReference;
    const isGA4 = datasetRef.datasetId.startsWith('analytics_') ? 'Yes' : 'No';

    // Convert expiration from milliseconds to days
    const expirationDays = ds.defaultTableExpirationMs
      ? Math.round(ds.defaultTableExpirationMs / (1000 * 60 * 60 * 24))
      : 'None';

    return {
      'Project ID': datasetRef.projectId,
      'Dataset ID': datasetRef.datasetId,
      'Location': ds.location || 'N/A',
      'Created Date': ds.creationTime ? formatTimestamp(ds.creationTime) : 'N/A',
      'Last Modified': ds.lastModifiedTime ? formatTimestamp(ds.lastModifiedTime) : 'N/A',
      'Default Expiration (Days)': expirationDays,
      'Description': ds.friendlyName || 'N/A',
      'Is GA4 Export': isGA4
    };
  });
}

/**
 * Lists GA4 export tables in a dataset.
 * Implements date range filtering to avoid timeout issues.
 * @param {string} projectId - GCP Project ID
 * @param {string} datasetId - Dataset ID
 * @returns {Array<Object>} Array of table objects.
 */
function listGA4ExportTables(projectId, datasetId) {
  const auth = getAuthConfig('bigquery');
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables`;
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  const response = fetchWithRetry(url, options, `BQ-Tables-${datasetId}`);
  if (!response || !response.tables) return [];

  // Get date range filter from user config (default: 30 days)
  const dateRangeDays = getBigQueryTableDateRange();

  // Filter tables by date before fetching metadata (critical optimization)
  const filteredTables = filterTablesByDateRange(response.tables, dateRangeDays);

  logEvent('BigQuery', `Dataset ${datasetId}: ${response.tables.length} total tables, ${filteredTables.length} within ${dateRangeDays}-day range`);

  // Get detailed metadata only for filtered tables
  return filteredTables.map(t => {
    const tableRef = t.tableReference;
    return getTableMetadata(projectId, datasetId, tableRef.tableId);
  }).filter(t => t !== null);
}

/**
 * Gets the BigQuery table date range from user config.
 * @returns {number} Number of days to look back (default: 30)
 */
function getBigQueryTableDateRange() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const range = userProperties.getProperty('ADDOCU_BQ_TABLE_DATE_RANGE');
    if (range === 'all') return -1; // -1 means no filtering
    const days = parseInt(range);
    return days > 0 ? days : 30; // Default: 30 days
  } catch (e) {
    return 30; // Default if error
  }
}

/**
 * Filters tables by date range to reduce API calls.
 * Only GA4 daily export tables (events_YYYYMMDD) are filtered.
 * Streaming, intraday, and other tables are always included.
 * @param {Array} tables - Array of table objects from BigQuery API
 * @param {number} daysBack - Number of days to look back (-1 = all)
 * @returns {Array} Filtered array of tables
 */
function filterTablesByDateRange(tables, daysBack) {
  // If daysBack is -1, return all tables (no filtering)
  if (daysBack < 0) {
    logEvent('BigQuery', 'Date range filter disabled (processing all tables)');
    return tables;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  cutoffDate.setHours(0, 0, 0, 0);

  return tables.filter(table => {
    const tableId = table.tableReference.tableId;

    // Match GA4 daily export tables: events_YYYYMMDD
    const dailyMatch = tableId.match(/^events_(\d{8})$/);
    if (dailyMatch) {
      const dateStr = dailyMatch[1];
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      const tableDate = new Date(year, month, day);

      // Only include if within date range
      return tableDate >= cutoffDate;
    }

    // Always include non-daily tables (streaming, intraday, custom)
    return true;
  });
}

/**
 * Gets detailed metadata for a specific table.
 * @param {string} projectId - GCP Project ID
 * @param {string} datasetId - Dataset ID
 * @param {string} tableId - Table ID
 * @returns {Object} Table metadata.
 */
function getTableMetadata(projectId, datasetId, tableId) {
  try {
    const auth = getAuthConfig('bigquery');
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`;
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

    const table = fetchWithRetry(url, options, `BQ-Table-${tableId}`);
    if (!table) return null;

    // Determine table type from name pattern
    let tableType = 'Other';
    if (tableId.match(/^events_\d{8}$/)) tableType = 'Daily';
    else if (tableId.startsWith('events_intraday_')) tableType = 'Intraday';
    else if (tableId.startsWith('events_streaming_')) tableType = 'Streaming';

    // Get size in GB
    const sizeGB = table.numBytes ? (parseFloat(table.numBytes) / 1073741824).toFixed(2) : '0';

    // Get partition and clustering info
    const partitionType = table.timePartitioning ? table.timePartitioning.type : 'None';
    const clusteringFields = table.clustering
      ? table.clustering.fields.join(', ')
      : 'None';

    return {
      'Project ID': projectId,
      'Dataset ID': datasetId,
      'Table ID': tableId,
      'Table Type': tableType,
      'Row Count': table.numRows || '0',
      'Size (GB)': sizeGB,
      'Created Date': table.creationTime ? formatTimestamp(table.creationTime) : 'N/A',
      'Last Modified': table.lastModifiedTime ? formatTimestamp(table.lastModifiedTime) : 'N/A',
      'Partition Type': partitionType,
      'Clustering Fields': clusteringFields
    };
  } catch (e) {
    logWarning('BigQuery', `Could not get metadata for table ${tableId}: ${e.message}`);
    return null;
  }
}

/**
 * Gets GA4 BigQuery export links from all GA4 properties.
 * @returns {Array<Object>} Array of export link objects.
 */
function getGA4ExportLinks() {
  try {
    // Get all GA4 properties from the GA4_PROPERTIES sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ga4Sheet = ss.getSheetByName('GA4_PROPERTIES');

    if (!ga4Sheet || ga4Sheet.getLastRow() <= 1) {
      logWarning('BigQuery', 'No GA4 properties found. Run GA4 audit first.');
      return [];
    }

    const data = ga4Sheet.getDataRange().getValues();
    const headers = data[0];
    const propertyIdIndex = headers.indexOf('Property ID');
    const propertyNameIndex = headers.indexOf('Display Name');

    if (propertyIdIndex === -1) {
      logWarning('BigQuery', 'Could not find Property ID column in GA4_PROPERTIES sheet');
      return [];
    }

    const exportLinks = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const propertyId = data[i][propertyIdIndex];
      const propertyName = data[i][propertyNameIndex] || 'N/A';

      if (!propertyId) continue;

      try {
        const links = listBigQueryLinksForProperty(propertyId, propertyName);
        exportLinks.push(...links);
      } catch (e) {
        logWarning('BigQuery', `Could not get BQ links for property ${propertyId}: ${e.message}`);
      }

      Utilities.sleep(100);
    }

    return exportLinks;
  } catch (e) {
    logError('BigQuery', `Error getting GA4 export links: ${e.message}`);
    return [];
  }
}

/**
 * Lists BigQuery links for a specific GA4 property.
 * @param {string} propertyId - GA4 Property ID (e.g., "123456789")
 * @param {string} propertyName - GA4 Property Name
 * @returns {Array<Object>} Array of BigQuery link objects.
 */
function listBigQueryLinksForProperty(propertyId, propertyName) {
  const auth = getAuthConfig('ga4');
  const url = `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/bigQueryLinks`;
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  const response = fetchWithRetry(url, options, `GA4-BQLinks-${propertyId}`);
  if (!response || !response.bigQueryLinks) return [];

  return response.bigQueryLinks.map(link => ({
    'GA4 Property ID': propertyId,
    'GA4 Property Name': propertyName,
    'BigQuery Project': link.project || 'N/A',
    'BigQuery Dataset': `analytics_${propertyId}`,
    'Daily Export Enabled': link.dailyExportEnabled ? 'Yes' : 'No',
    'Streaming Export Enabled': link.streamingExportEnabled ? 'Yes' : 'No',
    'Fresh Daily Export Enabled': link.freshDailyExportEnabled ? 'Yes' : 'No',
    'Excluded Events': link.excludedEvents ? link.excludedEvents.join(', ') : 'None',
    'Link Created Date': link.createTime || 'N/A'
  }));
}

// =================================================================
// SHEET WRITING HELPERS
// =================================================================

function writeBQDatasetsToSheet(datasets) {
  const syncDate = formatDate(new Date());
  const data = datasets.map(d => [
    d['Project ID'],
    d['Dataset ID'],
    d['Location'],
    d['Created Date'],
    d['Last Modified'],
    d['Default Expiration (Days)'],
    d['Description'],
    d['Is GA4 Export'],
    syncDate
  ]);
  writeDataToSheet('BQ_DATASETS', BQ_DATASETS_HEADERS, data, 'BigQuery');
}

function writeBQGA4TablesToSheet(tables) {
  const syncDate = formatDate(new Date());
  const data = tables.map(t => [
    t['Project ID'],
    t['Dataset ID'],
    t['Table ID'],
    t['Table Type'],
    t['Row Count'],
    t['Size (GB)'],
    t['Created Date'],
    t['Last Modified'],
    t['Partition Type'],
    t['Clustering Fields'],
    syncDate
  ]);
  writeDataToSheet('BQ_GA4_TABLES', BQ_GA4_TABLES_HEADERS, data, 'BigQuery');
}

function writeBQExportLinksToSheet(links, datasets) {
  const syncDate = formatDate(new Date());
  const data = links.map(link => {
    // Check if the dataset actually exists in BigQuery
    const datasetExists = datasets.some(d =>
      d['Dataset ID'] === link['BigQuery Dataset'] &&
      d['Project ID'] === link['BigQuery Project']
    );

    const exportStatus = datasetExists ? 'Active' : 'Missing Dataset';

    return [
      link['GA4 Property ID'],
      link['GA4 Property Name'],
      link['BigQuery Project'],
      link['BigQuery Dataset'],
      link['Daily Export Enabled'],
      link['Streaming Export Enabled'],
      link['Fresh Daily Export Enabled'],
      link['Excluded Events'],
      link['Link Created Date'],
      exportStatus,
      syncDate
    ];
  });
  writeDataToSheet('BQ_GA4_EXPORT_LINKS', BQ_GA4_EXPORT_LINKS_HEADERS, data, 'BigQuery');
}

// =================================================================
// UTILITY HELPERS
// =================================================================

/**
 * Formats a BigQuery timestamp (milliseconds) to a readable date.
 * @param {string} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted date string
 */
function formatTimestamp(timestamp) {
  try {
    const date = new Date(parseInt(timestamp));
    return formatDate(date);
  } catch (e) {
    return 'N/A';
  }
}
