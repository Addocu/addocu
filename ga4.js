/**
 * @fileoverview Google Analytics 4 Synchronization Module.
 */

// =================================================================
// MODULE CONSTANTS AND CONFIGURATION
// =================================================================

const GA4_PROPERTIES_HEADERS = [
  'Property Name', 'Property ID', 'Property Path', 'Account Name', 'Account Path',
  'Currency Code', 'Time Zone', 'Created Time', 'Update Time', 'Industry Category',
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
  'Measurement ID / Package / Bundle', 'Default URI', 'Stream Created',
  'Stream Updated', 'Property Created', 'Property Updated', 'Notes'
];

// =================================================================
// SYNCHRONIZATION FUNCTIONS (EXECUTABLE FROM MENU)
// =================================================================

function syncGA4WithUI() {
  const result = syncGA4Core();
  const ui = SpreadsheetApp.getUi();
  if (result.status === 'SUCCESS') {
    const details = result.details;
    const message = `✅ GA4 Synchronized Successfully\n\n` +
      `🏠 Properties: ${details.properties}\n` +
      `📏 Dimensions: ${details.dimensions}\n` +
      `📊 Metrics: ${details.metrics}\n` +
      `📄 Data Streams: ${details.streams}\n\n` +
      `Total: ${result.records} elements\n` +
      `Time: ${Math.round(result.duration / 1000)}s`;
    ui.alert('📈 GA4 Completed', message, ui.ButtonSet.OK);
  } else {
    ui.alert(
      '❌ GA4 Error',
      `Synchronization failed: ${result.error}\n\nCheck the LOGS sheet for more details.`,
      ui.ButtonSet.OK
    );
  }
}

// =================================================================
// CENTRAL SYNCHRONIZATION LOGIC (REUSABLE)
// =================================================================

function syncGA4Core() {
  const startTime = Date.now();
  const serviceName = 'ga4';
  const results = { properties: 0, dimensions: 0, metrics: 0, streams: 0 };

  try {
    getAuthConfig(serviceName); // Only to verify that the service is enabled
    logSyncStart('GA4_Complete', 'Analytics Admin Service');

    // 1. GET ACCOUNTS AND PROPERTIES (ONCE)
    logEvent('GA4', 'Phase 1: Extracting all accounts and properties...');
    const properties = getGA4AccountsAndProperties();
    results.properties = properties.length;
    writeDataToSheet('GA4_PROPERTIES', GA4_PROPERTIES_HEADERS, properties.map(p => processGA4Property(p.property, p.account)), 'GA4');

    // 2. GET SUB-RESOURCES REUSING THE PROPERTIES LIST
    logEvent('GA4', 'Phase 2: Extracting custom dimensions...');
    const dimensions = getGA4SubResources(properties, 'customDimensions', processGA4Dimension);
    results.dimensions = dimensions.length;
    writeDataToSheet('GA4_CUSTOM_DIMENSIONS', GA4_DIMENSIONS_HEADERS, dimensions, 'GA4');

    logEvent('GA4', 'Phase 3: Extracting custom metrics...');
    const metrics = getGA4SubResources(properties, 'customMetrics', processGA4Metric);
    results.metrics = metrics.length;
    writeDataToSheet('GA4_CUSTOM_METRICS', GA4_METRICS_HEADERS, metrics, 'GA4');

    logEvent('GA4', 'Phase 4: Extracting data streams...');
    const streams = getGA4SubResources(properties, 'dataStreams', processGA4Stream);
    results.streams = streams.length;
    writeDataToSheet('GA4_DATA_STREAMS', GA4_STREAMS_HEADERS, streams, 'GA4');

    const totalElements = Object.values(results).reduce((sum, count) => sum + count, 0);
    const duration = Date.now() - startTime;
    logSyncEnd('GA4_Complete', totalElements, duration, 'SUCCESS');

    return {
      records: totalElements,
      status: 'SUCCESS',
      duration: duration,
      details: results
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('GA4_Complete', 0, duration, 'ERROR');
    logError('GA4', `Complete synchronization failed: ${error.message}`);

    if (error.message.includes('403') || error.message.includes('401')) {
      error.message += ' | SOLUTION: Verify that the "Google Analytics Admin API" is enabled in Google Cloud Console and that the script has OAuth2 permissions.';
    }

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

// =================================================================
// DATA PROCESSING FUNCTIONS (TRANSFORMATION)
// =================================================================

function processGA4Property(property, account) {
  const propertyId = property.name.split('/').pop();
  return {
    'Property Name': property.displayName || 'Unnamed',
    'Property ID': propertyId,
    'Property Path': property.name,
    'Account Name': account.displayName,
    'Account Path': account.name,
    'Currency Code': property.currencyCode || 'N/A',
    'Time Zone': property.timeZone || 'N/A',
    'Created Time': formatDate(property.createTime),
    'Update Time': formatDate(property.updateTime),
    'Industry Category': property.industryCategory || 'N/A',
    'Service Level': property.serviceLevel || 'STANDARD',
    'Analytics URL': `https://analytics.google.com/analytics/web/#/p${propertyId}`,
    'Streams URL': `https://analytics.google.com/analytics/web/#/a${account.name.split('/').pop()}p${propertyId}/admin/streams`,
    'Parent': property.parent || account.name,
    'Delete Time': formatDate(property.deleteTime) || '',
    'Data Retention': property.dataRetentionSettings?.eventDataRetention || 'N/A',
    'Reset User Data': property.dataRetentionSettings?.resetUserDataOnNewActivity || false,
    'Notes': `Account: ${account.displayName} | Level: ${property.serviceLevel}`
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
  return {
    'Property Name': property.displayName,
    'Property ID': property.name.split('/').pop(),
    'Stream Name': stream.displayName,
    'Stream Type': stream.type,
    'Stream ID': stream.name.split('/').pop(),
    'Measurement ID / Package / Bundle': stream.webStreamData?.measurementId || stream.androidAppStreamData?.packageName || stream.iosAppStreamData?.bundleId || '',
    'Default URI': stream.webStreamData?.defaultUri || '',
    'Stream Created': formatDate(stream.createTime),
    'Stream Updated': formatDate(stream.updateTime),
    'Property Created': formatDate(property.createTime),
    'Property Updated': formatDate(property.updateTime),
    'Sync Date': syncDate,
    'Notes': `Type: ${stream.type} | Created: ${formatDate(stream.createTime)}`
  };
}