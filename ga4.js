/**
 * @fileoverview Google Analytics 4 Synchronization Module.
 */

// =================================================================
// MODULE CONSTANTS AND CONFIGURATION
// =================================================================

const GA4_PROPERTIES_HEADERS = [
  'Property Name', 'Property ID', 'Property Path', 'Property Type', 'Account Name', 'Account Path',
  'Currency Code', 'Time Zone', 'Created Time', 'Update Time', 'Expire Time', 'Industry Category',
  'Service Level', 'Analytics URL', 'Streams URL', 'Parent', 'Delete Time',
  'Data Retention', 'Reset User Data', 'Notes'
];
const GA4_DIMENSIONS_HEADERS = [
  'Property Name', 'Property ID', 'Display Name', 'Parameter Name', 'Scope',
  'Description', 'Disallow Ads Personalization', 'Archive Time', 'Property Created',
  'Property Updated', 'Notes'
];
const GA4_METRICS_HEADERS = [
  'Property Name', 'Property ID', 'Display Name', 'Parameter Name', 'Measurement Unit',
  'Scope', 'Description', 'Archive Time', 'Property Created', 'Property Updated',
  'Notes'
];
const GA4_STREAMS_HEADERS = [
  'Property Name', 'Property ID', 'Stream Name', 'Stream Type', 'Stream ID',
  'Measurement ID / Package / Bundle', 'Firebase App ID', 'Default URI', 'Stream Created',
  'Stream Updated', 'Property Created', 'Property Updated', 'Notes'
];
const GA4_CHANGE_HISTORY_HEADERS = [
  'Change Time', 'Property Name', 'Property ID', 'Actor Email', 'Actor Type',
  'Action', 'Resource Type', 'Resource Name', 'Changes', 'Notes'
];

// =================================================================
// SYNCHRONIZATION FUNCTIONS (EXECUTABLE FROM MENU)
// =================================================================

function syncGA4WithUI() {
  const result = syncGA4Core();
  const ui = SpreadsheetApp.getUi();
  if (result.status === 'SUCCESS') {
    const details = result.details;
    const body = `Properties: ${details.properties} | Dimensions: ${details.dimensions} | Metrics: ${details.metrics} | Streams: ${details.streams}\n\n` +
      `Total: ${result.records} elements | Time: ${Math.round(result.duration / 1000)}s\n\n` +
      `Data written to GA4_PROPERTIES, GA4_CUSTOM_DIMENSIONS, GA4_CUSTOM_METRICS, GA4_DATA_STREAMS.`;
    ui.alert('GA4 Synchronized', body, ui.ButtonSet.OK);
  } else {
    const body = `Synchronization failed: ${result.error}\n\n` +
      `Action: Verify that the "Google Analytics Admin API" is enabled in Google Cloud Console and that you have authorized the script.\n\n` +
      `Details: Check LOGS sheet for more information.`;
    ui.alert('GA4 Error', body, ui.ButtonSet.OK);
  }
}

// =================================================================
// CENTRAL SYNCHRONIZATION LOGIC (REUSABLE)
// =================================================================

/**
 * Main GA4 synchronization function with incremental audit support.
 * Detects if this is first sync (FULL) or subsequent (INCREMENTAL).
 * Uses append strategy for properties and sub-resources.
 *
 * @param {Object} options - Sync options
 * @param {boolean} options.forceFullAudit - Force full audit even if sync state exists
 * @param {boolean} options.incrementalEnabled - Enable incremental sync (default: true)
 * @returns {Object} Sync result
 */
function syncGA4Core(options = {}) {
  const startTime = Date.now();
  const serviceName = 'ga4';
  const forceFullAudit = options.forceFullAudit || false;
  const incrementalEnabled = options.incrementalEnabled !== false;

  const results = { properties: 0, dimensions: 0, metrics: 0, streams: 0, changes: 0 };

  try {
    getAuthConfig(serviceName); // Only to verify that the service is enabled

    // Determine audit mode (FULL or INCREMENTAL)
    const auditMode = getAuditMode('GA4', 'Properties', forceFullAudit);
    const isIncremental = incrementalEnabled && auditMode === 'INCREMENTAL';
    const syncStateGA4 = isIncremental ? getSyncState('GA4', 'Properties') : null;
    const lastSyncTime = syncStateGA4 ? new Date(syncStateGA4.lastSyncTimestamp) : null;

    logSyncStart('GA4_Complete', 'Analytics Admin Service');
    logEvent('GA4', `Starting ${isIncremental ? 'INCREMENTAL' : 'FULL'} audit...`);

    // 1. GET ACCOUNTS AND PROPERTIES
    logEvent('GA4', `Phase 1: Extracting ${isIncremental ? 'new' : 'all'} accounts and properties...`);
    let properties = getGA4AccountsAndProperties();

    // Filter by timestamp if incremental
    if (isIncremental && lastSyncTime) {
      const newProperties = properties.filter(p => {
        const createdTime = new Date(p.property.createTime || 0);
        return createdTime > lastSyncTime;
      });
      logEvent('GA4', `Filtered: ${properties.length} total properties → ${newProperties.length} new properties since last sync`);
      properties = newProperties;
    }

    if (properties.length > 0) {
      const processedProperties = properties.map(p => processGA4Property(p.property, p.account));
      const appendResult = appendNewRecords('GA4_PROPERTIES', processedProperties, {
        headers: GA4_PROPERTIES_HEADERS
      });
      results.properties = appendResult.recordsAppended;
      logEvent('GA4', `Properties: ${appendResult.status} - ${appendResult.recordsAppended} appended`);
    } else {
      logEvent('GA4', 'No new properties to sync');
    }

    // If incremental and no new properties, skip sub-resources
    if (isIncremental && properties.length === 0) {
      logEvent('GA4', 'Skipping sub-resources (no new properties)');
      recordSyncState('GA4', 'Properties', 0, 'SUCCESS', 'INCREMENTAL');
      recordSyncState('GA4', 'Dimensions', 0, 'SUCCESS', 'INCREMENTAL');
      recordSyncState('GA4', 'Metrics', 0, 'SUCCESS', 'INCREMENTAL');
      recordSyncState('GA4', 'Streams', 0, 'SUCCESS', 'INCREMENTAL');
      recordSyncState('GA4', 'ChangeHistory', 0, 'SUCCESS', 'INCREMENTAL');

      const duration = Date.now() - startTime;
      return {
        records: 0,
        status: 'SUCCESS',
        duration: duration,
        details: results,
        syncMode: 'INCREMENTAL',
        message: 'No new properties to sync'
      };
    }

    // 2. GET SUB-RESOURCES (only for new/all properties)
    logEvent('GA4', 'Phase 2: Extracting custom dimensions...');
    const dimensions = getGA4SubResources(properties, 'customDimensions', processGA4Dimension);
    if (dimensions.length > 0) {
      const appendDimResult = appendNewRecords('GA4_CUSTOM_DIMENSIONS', dimensions, {
        headers: GA4_DIMENSIONS_HEADERS
      });
      results.dimensions = appendDimResult.recordsAppended;
      logEvent('GA4', `Dimensions: ${appendDimResult.status} - ${appendDimResult.recordsAppended} appended`);
    }

    logEvent('GA4', 'Phase 3: Extracting custom metrics...');
    const metrics = getGA4SubResources(properties, 'customMetrics', processGA4Metric);
    if (metrics.length > 0) {
      const appendMetResult = appendNewRecords('GA4_CUSTOM_METRICS', metrics, {
        headers: GA4_METRICS_HEADERS
      });
      results.metrics = appendMetResult.recordsAppended;
      logEvent('GA4', `Metrics: ${appendMetResult.status} - ${appendMetResult.recordsAppended} appended`);
    }

    logEvent('GA4', 'Phase 4: Extracting data streams...');
    const streams = getGA4SubResources(properties, 'dataStreams', processGA4Stream);
    if (streams.length > 0) {
      const appendStreamResult = appendNewRecords('GA4_DATA_STREAMS', streams, {
        headers: GA4_STREAMS_HEADERS
      });
      results.streams = appendStreamResult.recordsAppended;
      logEvent('GA4', `Streams: ${appendStreamResult.status} - ${appendStreamResult.recordsAppended} appended`);
    }

    // 3. GET CHANGE HISTORY (Phase 5 - New)
    // We fetch this for ALL properties in the list, as changes happen independently of property creation
    logEvent('GA4', 'Phase 5: Extracting change history (last 30 days)...');
    const changeHistory = fetchGA4ChangeHistory(properties, processGA4Change);
    if (changeHistory.length > 0) {
      // Always overwrite Change History (or append if you prefer, but history lists can get long)
      // For this implementation, we will use appendNewRecords but since we don't have a unique ID for changes easily
      // mapped for deduping in the generic helper, we might want to just Clear & Write for the simplest approach.
      // However, to stay consistent with the framework, we'll append.
      // A better approach for history logs is usually "Write Latest", but let's stick to the pattern.
      const appendChangeResult = appendNewRecords('GA4_CHANGE_HISTORY', changeHistory, {
        headers: GA4_CHANGE_HISTORY_HEADERS
      });
      results.changes = appendChangeResult.recordsAppended;
      logEvent('GA4', `Changes: ${appendChangeResult.status} - ${appendChangeResult.recordsAppended} appended`);
    }

    // Record sync state for future incremental audits
    recordSyncState('GA4', 'Properties', results.properties, 'SUCCESS', isIncremental ? 'INCREMENTAL' : 'FULL');
    recordSyncState('GA4', 'Dimensions', results.dimensions, 'SUCCESS', isIncremental ? 'INCREMENTAL' : 'FULL');
    recordSyncState('GA4', 'Metrics', results.metrics, 'SUCCESS', isIncremental ? 'INCREMENTAL' : 'FULL');
    recordSyncState('GA4', 'Streams', results.streams, 'SUCCESS', isIncremental ? 'INCREMENTAL' : 'FULL');
    recordSyncState('GA4', 'ChangeHistory', results.changes, 'SUCCESS', isIncremental ? 'INCREMENTAL' : 'FULL');

    const totalElements = Object.values(results).reduce((sum, count) => sum + count, 0);
    const duration = Date.now() - startTime;
    logSyncEnd('GA4_Complete', totalElements, duration, 'SUCCESS');

    return {
      records: totalElements,
      status: 'SUCCESS',
      duration: duration,
      details: results,
      syncMode: isIncremental ? 'INCREMENTAL' : 'FULL'
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('GA4_Complete', 0, duration, 'ERROR');

    // Use granular error handler for better user messaging
    const authError = handleAuthError('GA4', error);
    if (authError.status === 'AUTH_FAILED') {
      logError('GA4', `Authentication error: ${authError.userMessage}`);
      return {
        records: 0,
        status: 'AUTH_FAILED',
        duration: duration,
        error: authError.userMessage,
        actionItems: authError.actionItems
      };
    }

    logError('GA4', `Complete synchronization failed: ${error.message}`);
    let errMsg = error.message;
    if (errMsg.includes('403') || errMsg.includes('401')) {
      errMsg += ' | SOLUTION: Verify that the "Google Analytics Admin API" is enabled in Google Cloud Console and that the script has OAuth2 permissions.';
    }

    // Record error state
    recordSyncState('GA4', 'Properties', 0, 'ERROR', 'FULL');

    // Report error in the primary sheet (only if it's a full audit)
    writeDataToSheet('GA4_PROPERTIES', GA4_PROPERTIES_HEADERS, null, 'GA4', errMsg);

    return {
      records: 0, status: 'ERROR', duration: duration, error: error.message
    };
  }
}

// =================================================================
// DATA EXTRACTION FUNCTIONS (HELPERS)
// =================================================================

function getGA4AccountsAndProperties() {
  try {
    const auth = getAuthConfig('ga4');
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

    // Get property filters from configuration
    const userProperties = PropertiesService.getUserProperties();
    const propertyFilters = userProperties.getProperty('ADDOCU_GA4_PROPERTIES_FILTER') || '';
    const targetProperties = propertyFilters ?
      propertyFilters.split(',').map(p => p.trim()).filter(p => p.length > 0) : [];

    if (targetProperties.length > 0) {
      logEvent('GA4', `Applying property filter: ${targetProperties.join(', ')}`);
    } else {
      logEvent('GA4', 'No property filters - getting all accessible properties');
    }

    // Get accounts using REST API
    const accountsUrl = 'https://analyticsadmin.googleapis.com/v1alpha/accounts?pageSize=200';
    const accountsResponse = fetchWithRetry(accountsUrl, options, 'GA4-Accounts');

    if (!accountsResponse.accounts || accountsResponse.accounts.length === 0) {
      logWarning('GA4', 'No accessible GA4 accounts found.');
      return [];
    }

    const allProperties = [];
    for (const account of accountsResponse.accounts) {
      try {
        // Get properties using REST API
        const propertiesUrl = `https://analyticsadmin.googleapis.com/v1alpha/properties?filter=parent:${account.name}&pageSize=200`;
        const propertiesResponse = fetchWithRetry(propertiesUrl, options, 'GA4-Properties');

        if (propertiesResponse.properties) {
          for (const property of propertiesResponse.properties) {
            // Apply filter if exists
            if (targetProperties.length > 0) {
              const propertyId = property.name.split('/').pop();
              const fullPropertyName = `properties/${propertyId}`;

              // Check if this property is in the filter list
              const isInFilter = targetProperties.some(filter =>
                filter === fullPropertyName ||
                filter === propertyId ||
                filter === property.name
              );

              if (isInFilter) {
                allProperties.push({ property, account });
                logEvent('GA4', `Property included by filter: ${property.displayName} (${fullPropertyName})`);
              }
            } else {
              // No filters, include all
              allProperties.push({ property, account });
            }
          }
        }

        Utilities.sleep(300); // Pause between accounts

      } catch (e) {
        logWarning('GA4', `Could not get properties for account ${account.displayName}: ${e.message}`);
      }
    }

    if (targetProperties.length > 0) {
      logEvent('GA4', `Filter applied: ${allProperties.length} properties from ${targetProperties.length} specified`);
    } else {
      logEvent('GA4', `No filters: ${allProperties.length} properties found`);
    }

    return allProperties;
  } catch (error) {
    logError('GA4', `Error getting GA4 accounts and properties: ${error.message}`);
    throw error;
  }
}

function getGA4SubResources(properties, resourceType, processor) {
  const allResources = [];
  const auth = getAuthConfig('ga4');
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  for (const { property, account } of properties) {
    try {
      let url, resourceKey;

      // Determine URL and resource key based on type
      switch (resourceType) {
        case 'customDimensions':
          url = `https://analyticsadmin.googleapis.com/v1alpha/${property.name}/customDimensions?pageSize=200`;
          resourceKey = 'customDimensions';
          break;
        case 'customMetrics':
          url = `https://analyticsadmin.googleapis.com/v1alpha/${property.name}/customMetrics?pageSize=200`;
          resourceKey = 'customMetrics';
          break;
        case 'dataStreams':
          url = `https://analyticsadmin.googleapis.com/v1alpha/${property.name}/dataStreams?pageSize=200`;
          resourceKey = 'dataStreams';
          break;
        default:
          throw new Error(`Unsupported resource type: ${resourceType}`);
      }

      const response = fetchWithRetry(url, options, `GA4-${resourceType}`);

      if (response[resourceKey]) {
        for (const item of response[resourceKey]) {
          allResources.push(processor(item, property, account));
        }
      }

      Utilities.sleep(200); // Pause between properties

    } catch (e) {
      logWarning('GA4', `Could not get '${resourceType}' for property ${property.displayName}: ${e.message}`);
    }
  }
  return allResources;
}

function fetchGA4ChangeHistory(properties, processor) {
  const allChanges = [];
  const auth = getAuthConfig('ga4');
  const options = { method: 'POST', headers: auth.headers, muteHttpExceptions: true };

  // Calculate 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const earliestChangeTime = thirtyDaysAgo.toISOString();

  for (const { property, account } of properties) {
    try {
      // POST request to searchChangeHistoryEvents - using v1alpha for consistency
      // Note: The endpoint is on the account resource, not property. We filter by property in the payload.
      const accountId = account.name.split('/').pop();
      const url = `https://analyticsadmin.googleapis.com/v1alpha/accounts/${accountId}:searchChangeHistoryEvents`;

      const payload = {
        property: property.name, // Filter by specific property
        earliestChangeTime: earliestChangeTime,
        pageSize: 50 // Fetch last 50 changes per property to avoid request timeouts
      };

      const payloadOptions = {
        ...options,
        payload: JSON.stringify(payload),
        headers: { ...options.headers, 'Content-Type': 'application/json' }
      };

      const response = fetchWithRetry(url, payloadOptions, 'GA4-ChangeHistory');

      if (response && response.changeHistoryEvents) {
        for (const event of response.changeHistoryEvents) {
          allChanges.push(processor(event, property));
        }
      }

      Utilities.sleep(100);

    } catch (e) {
      logWarning('GA4', `Could not get Change History for property ${property.displayName}: ${e.message}`);
    }
  }
  return allChanges;
}

// =================================================================
// DATA PROCESSING FUNCTIONS (TRANSFORMATION)
// =================================================================

function processGA4Property(property, account) {
  const propertyId = property.name.split('/').pop();
  return {
    'Property Name': property.displayName || 'Unnamed',
    'Property ID': propertyId,
    'Property Path': property.name,
    'Property Type': property.propertyType || 'ORDINARY_PROPERTY',
    'Account Name': account.displayName,
    'Account Path': account.name,
    'Currency Code': property.currencyCode || 'N/A',
    'Time Zone': property.timeZone || 'N/A',
    'Created Time': formatDate(property.createTime),
    'Update Time': formatDate(property.updateTime),
    'Expire Time': formatDate(property.expireTime) || '',
    'Industry Category': property.industryCategory || 'N/A',
    'Service Level': property.serviceLevel || 'STANDARD',
    'Analytics URL': `https://analytics.google.com/analytics/web/#/p${propertyId}`,
    'Streams URL': `https://analytics.google.com/analytics/web/#/a${account.name.split('/').pop()}p${propertyId}/admin/streams`,
    'Parent': property.parent || account.name,
    'Delete Time': formatDate(property.deleteTime) || '',
    'Data Retention': property.dataRetentionSettings?.eventDataRetention || 'N/A',
    'Reset User Data': property.dataRetentionSettings?.resetUserDataOnNewActivity || false,
    'Notes': `Account: ${account.displayName} | Level: ${property.serviceLevel} | Type: ${property.propertyType || 'ORDINARY'}`
  };
}

function processGA4Dimension(dimension, property) {
  return {
    'Property Name': property.displayName,
    'Property ID': property.name.split('/').pop(),
    'Display Name': dimension.displayName,
    'Parameter Name': dimension.parameterName,
    'Scope': dimension.scope,
    'Description': dimension.description || '',
    'Disallow Ads Personalization': dimension.disallowAdsPersonalization || false,
    'Archive Time': dimension.archiveTime ? 'Archived' : 'Active',
    'Property Created': formatDate(property.createTime),
    'Property Updated': formatDate(property.updateTime),
    'Notes': `${dimension.scope} | ${dimension.archiveTime ? '🗄️ Archived' : '✅ Active'}`
  };
}

function processGA4Metric(metric, property) {
  return {
    'Property Name': property.displayName,
    'Property ID': property.name.split('/').pop(),
    'Display Name': metric.displayName,
    'Parameter Name': metric.parameterName,
    'Measurement Unit': metric.measurementUnit,
    'Scope': metric.scope,
    'Description': metric.description || '',
    'Archive Time': metric.archiveTime ? 'Archived' : 'Active',
    'Property Created': formatDate(property.createTime),
    'Property Updated': formatDate(property.updateTime),
    'Notes': `${metric.measurementUnit} | ${metric.archiveTime ? '🗄️ Archived' : '✅ Active'}`
  };
}

function processGA4Stream(stream, property) {
  const firebaseAppId = stream.webStreamData?.firebaseAppId || stream.androidAppStreamData?.firebaseAppId || stream.iosAppStreamData?.firebaseAppId || '';
  return {
    'Property Name': property.displayName,
    'Property ID': property.name.split('/').pop(),
    'Stream Name': stream.displayName,
    'Stream Type': stream.type,
    'Stream ID': stream.name.split('/').pop(),
    'Measurement ID / Package / Bundle': stream.webStreamData?.measurementId || stream.androidAppStreamData?.packageName || stream.iosAppStreamData?.bundleId || '',
    'Firebase App ID': firebaseAppId,
    'Default URI': stream.webStreamData?.defaultUri || '',
    'Stream Created': formatDate(stream.createTime),
    'Stream Updated': formatDate(stream.updateTime),
    'Property Created': formatDate(property.createTime),
    'Property Updated': formatDate(property.updateTime),
    'Notes': `Type: ${stream.type} | Created: ${formatDate(stream.createTime)}${firebaseAppId ? ' | Firebase: ' + firebaseAppId : ''}`
  };
}

function processGA4Change(changeEvent, property) {
  // Extract changes summary
  let changesDesc = 'No details';
  if (changeEvent.changes && changeEvent.changes.length > 0) {
    changesDesc = changeEvent.changes.map(c => {
      const field = c.resourceAfterChange ? Object.keys(c.resourceAfterChange).join(', ') : 'Deleted Resource';
      return `${c.action} ${field}`;
    }).join('; ');
  }

  // Determine resource type and name from the first change (usually grouped)
  const firstChange = changeEvent.changes ? changeEvent.changes[0] : {};
  const resourceName = firstChange.resourceAfterChange ?
    (firstChange.resourceAfterChange.displayName || firstChange.resource || 'Unknown Resource') :
    (firstChange.resourceBeforeChange ? firstChange.resourceBeforeChange.displayName : 'Deleted Resource');

  return {
    'Change Time': formatDate(changeEvent.changeTime),
    'Property Name': property.displayName,
    'Property ID': property.name.split('/').pop(),
    'Actor Email': changeEvent.userActorEmail || 'System/Unknown',
    'Actor Type': changeEvent.actorType || 'UNKNOWN',
    'Action': firstChange.action || 'UNKNOWN',
    'Resource Type': firstChange.resource || 'Unknown',
    'Resource Name': resourceName,
    'Changes': changesDesc,
    'Notes': `ID: ${changeEvent.id}`
  };
}
