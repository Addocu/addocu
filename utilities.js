/**
 * @fileoverview Central Utilities Module for Addocu v3.0
 * @version 3.0
 *
 * BETA API MONITORING NOTES (January 2026):
 * ==========================================
 * Two Advanced Services are in BETA status. Monitor for stable v1 releases:
 *
 * 1. AnalyticsAdmin (v1beta)
 *    - Status: BETA - Currently using v1beta
 *    - Stability: High - stable despite beta label
 *    - Migration path: v1beta → v1 (when released)
 *    - Action: Monitor Google Developers blog for v1 stable release announcement
 *    - Deadline: None - can be used as-is for now
 *    - Files affected: ga4.js
 *
 * 2. AnalyticsData (v1beta)
 *    - Status: BETA - Currently using v1beta
 *    - Stability: High - stable despite beta label
 *    - Migration path: v1beta → v1 (when released)
 *    - Action: Monitor Google Developers blog for v1 stable release announcement
 *    - Deadline: None - can be used as-is for now
 *    - Files affected: ga4.js (if reporting features used)
 *    - Note: Used for GA4 reporting, Addocu focuses on config audit
 *
 * All other APIs are stable:
 * - TagManager v2: Stable, no deprecation announced
 * - All REST APIs: Using stable versions (v1, v2, v3)
 *
 * STACKDRIVER EXCEPTION LOGGING MONITORING (January 2026):
 * ========================================================
 * appsscript.json: "exceptionLogging": "STACKDRIVER"
 *
 * Cost Impact Analysis:
 * - StackDriver is Google Cloud Logging
 * - Free tier: 50 GB/month ingestion
 * - Addocu logging volume: Typically <1GB/month for normal usage
 * - Cost per GB after free tier: ~$0.50/GB
 * - Expected monthly cost: $0 (within free tier for most users)
 *
 * What Gets Logged:
 * - Script execution errors and exceptions (automatic)
 * - logEvent(), logError(), logWarning() from logging.js (manual)
 * - API errors and failures
 * - Authentication errors
 *
 * Log Retention:
 * - Default GCP retention: 30 days
 * - Logs older than 30 days are automatically deleted
 * - Can be adjusted in GCP Console if needed
 *
 * Optimization Recommendations:
 * - Current logging is appropriate for audit use case
 * - Only log errors and significant events (already implemented)
 * - Debug logging only in INFO level (can disable in config)
 * - Monitor LOGS sheet in Google Sheets as primary location
 *
 * Monitoring:
 * - Check GCP Console > Logging regularly for unusual patterns
 * - Watch for errors that might indicate API issues
 * - Review error patterns to improve script reliability
 *
 * When to Investigate:
 * - If GCP Logging shows quota limits reached
 * - If error rate suddenly increases
 * - If authentication failures spike
 * - If timeout or rate limiting errors appear
 */

// =================================================================
// ADDOCU V3.0 CENTRAL CONFIGURATION
// =================================================================

const ADDOCU_CONFIG = {
  services: {
    available: ['ga4', 'gtm', 'lookerStudio', 'searchConsole', 'youtube', 'googleBusinessProfile', 'googleAds', 'googleMerchantCenter', 'bigQuery', 'adSense']
  },
  apis: {
    ga4: {
      name: 'Google Analytics 4 Admin API',
      baseUrl: 'https://analyticsadmin.googleapis.com/v1alpha',
      testEndpoint: '/accounts'
    },
    gtm: {
      name: 'Google Tag Manager API',
      baseUrl: 'https://tagmanager.googleapis.com/tagmanager/v2',
      testEndpoint: '/accounts'
    },
    lookerStudio: {
      name: 'Looker Studio API',
      baseUrl: 'https://datastudio.googleapis.com/v1',
      testEndpoint: '/assets:search?assetTypes=REPORT&pageSize=1'
    },
    searchConsole: {
      name: 'Google Search Console API',
      baseUrl: 'https://www.googleapis.com/webmasters/v3',
      testEndpoint: '/sites'
    },
    youtube: {
      name: 'YouTube Data API',
      baseUrl: 'https://www.googleapis.com/youtube/v3',
      testEndpoint: '/channels?mine=true'
    },
    googleBusinessProfile: {
      name: 'Google Business Profile API',
      baseUrl: 'https://mybusinessaccountmanagement.googleapis.com/v1',
      testEndpoint: '/accounts'
    },
    googleAds: {
      name: 'Google Ads API',
      baseUrl: 'https://googleads.googleapis.com/v20/customers:listAccessibleCustomers',
      testEndpoint: '/customers:listAccessibleCustomers'
    },
    googleMerchantCenter: {
      name: 'Google Merchant Center API',
      baseUrl: 'https://merchantapi.googleapis.com/accounts/v1',
      testEndpoint: '/accounts'
    },
    bigQuery: {
      name: 'BigQuery API',
      baseUrl: 'https://bigquery.googleapis.com/bigquery/v2',
      testEndpoint: '/projects'
    },
    adSense: {
      name: 'AdSense Management API',
      baseUrl: 'https://adsense.googleapis.com/v2',
      testEndpoint: '/accounts'
    }
  },
  limits: {
    requestTimeout: 60000, // 60 seconds
    maxRetries: 3,
    retryDelay: 1000
  }
};

// =================================================================
// USER AUTHENTICATION AND CONFIGURATION
// =================================================================

/**
 * Shows a loading notification to the user.
 * Used during sync operations to indicate progress.
 * @param {string} message The message to display to the user.
 */
function showLoadingNotification(message) {
  try {
    SpreadsheetApp.getActiveSheet().toast(message, 'Syncing...', 3);
  } catch (e) {
    logWarning('UI', `Could not show loading notification: ${e.message}`);
  }
}

/**
 * Safely gets the API Key from user properties.
 * Only needed for Looker Studio (optional functionality).
 * @returns {string} The user's API Key.
 */
function getAPIKey() {
  const userProperties = PropertiesService.getUserProperties();
  const apiKey = userProperties.getProperty('ADDOCU_LOOKER_API_KEY');

  if (!apiKey) {
    throw new Error('Looker Studio API Key not configured. Set it up in Configure Addocu.');
  }

  // Basic format validation
  if (!apiKey.startsWith('AIza') || apiKey.length < 20) {
    throw new Error('Invalid API Key format. It should start with "AIza" and have at least 20 characters.');
  }

  return apiKey;
}

/**
 * Gets the complete user configuration.
 * Includes diagnostic logging for troubleshooting configuration issues.
 * @returns {Object} User configuration.
 */
function getUserConfig() {
  const userProperties = PropertiesService.getUserProperties();

  const devToken = userProperties.getProperty('ADDOCU_GOOGLE_ADS_DEV_TOKEN') || '';

  // Diagnostic logging for Dev Token (best practice: log configuration retrieval)
  if (devToken) {
    logEvent('CONFIG', 'Google Ads Dev Token retrieved from UserProperties');
  } else {
    logWarning('CONFIG', 'Google Ads Dev Token not found in UserProperties');
  }

  return {
    lookerApiKey: userProperties.getProperty('ADDOCU_LOOKER_API_KEY') || '',
    gtmFilter: userProperties.getProperty('ADDOCU_GTM_FILTER') || '',
    ga4Properties: userProperties.getProperty('ADDOCU_GA4_PROPERTIES_FILTER') || '',
    gtmWorkspaces: userProperties.getProperty('ADDOCU_GTM_WORKSPACES_FILTER') || '',
    requestTimeout: parseInt(userProperties.getProperty('ADDOCU_REQUEST_TIMEOUT')) || 60,
    logLevel: userProperties.getProperty('ADDOCU_LOG_LEVEL') || 'INFO',
    googleAdsDevToken: devToken,
    bqProjectId: userProperties.getProperty('ADDOCU_BQ_PROJECT_ID') || '',
    userEmail: Session.getActiveUser().getEmail()
  };
}

/**
 * Prepares credentials for an API call.
 * Normalizes service names to handle both camelCase and lowercase variations.
 * @param {string} serviceName - The service name (e.g., 'ga4', 'gtm', 'bigquery', 'adsense').
 * @returns {Object} An object with headers and authentication data.
 */
function getAuthConfig(serviceName) {
  try {
    // Normalize service names to handle case variations (best practice: handle input validation)
    // This follows Google Apps Script best practices for robust error handling
    const serviceNameMap = {
      'bigquery': 'bigQuery',
      'adsense': 'adSense',
      'googleads': 'googleAds',
      'googlemerchantcenter': 'googleMerchantCenter',
      'googlebusinessprofile': 'googleBusinessProfile',
      'searchconsole': 'searchConsole',
      'lookerstudio': 'lookerStudio',
      'looker': 'lookerStudio'
    };

    const normalizedService = serviceNameMap[serviceName.toLowerCase()] || serviceName;

    const config = getUserConfig();

    // Basic headers for Google APIs
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Addocu/3.0 (Google Sheets Add-on)'
    };

    // GA4, GTM, GSC, YouTube, GBP, Ads, GMC, BigQuery, and AdSense require OAuth2
    if (normalizedService === 'ga4' || normalizedService === 'gtm' || normalizedService === 'searchConsole' ||
      normalizedService === 'youtube' || normalizedService === 'googleBusinessProfile' ||
      normalizedService === 'googleAds' || normalizedService === 'googleMerchantCenter' ||
      normalizedService === 'bigQuery' || normalizedService === 'adSense') {
      const oauthToken = ScriptApp.getOAuthToken();
      if (!oauthToken) {
        throw new Error(`OAuth2 token required for ${normalizedService}. Authorize the script first.`);
      }
      headers['Authorization'] = `Bearer ${oauthToken}`;

      if (normalizedService === 'googleAds') {
        if (!config.googleAdsDevToken) {
          const diagMsg = 'Google Ads Developer Token is missing.\n\n' +
            'Troubleshooting steps:\n' +
            '1. Extensions > Addocu > Configuration\n' +
            '2. Enter your Developer Token and click Save\n' +
            '3. Verify Chrome and Sheets use the SAME Google account\n' +
            '4. Try: Extensions > Addocu > Troubleshooting > Reauthorize Permissions\n' +
            '5. Check LOGS sheet for detailed error information';
          throw new Error(diagMsg);
        }
        headers['developer-token'] = config.googleAdsDevToken;
      }

      return {
        headers: headers,
        authUser: config.userEmail,
        timeout: config.requestTimeout * 1000,
        serviceName: normalizedService,
        authType: 'oauth2',
        oauthToken: oauthToken
      };
    }

    // Looker Studio now requires OAuth2 (Google removed API Key support)
    if (normalizedService === 'lookerStudio') {
      // CRITICAL CHANGE: Looker Studio migrated to OAuth2 only
      const oauthToken = ScriptApp.getOAuthToken();
      if (!oauthToken) {
        throw new Error(`OAuth2 token required for Looker Studio. Looker Studio no longer accepts API Keys.`);
      }
      headers['Authorization'] = `Bearer ${oauthToken}`;

      return {
        headers: headers,
        authUser: config.userEmail,
        timeout: config.requestTimeout * 1000,
        serviceName: normalizedService,
        authType: 'oauth2',
        oauthToken: oauthToken
      };
    }

    throw new Error(`Unsupported service: ${serviceName} (normalized to: ${normalizedService})`);

  } catch (error) {
    logError('AUTH', `Authentication error for ${serviceName}: ${error.message}`);
    throw error;
  }
}

/**
 * Handles OAuth authentication errors gracefully with user-friendly messaging.
 * Detects missing scopes and provides actionable error messages.
 * @param {string} serviceName - The service name attempting to authenticate.
 * @param {Error} error - The error object from authentication attempt.
 * @returns {Object} Graceful error response with status and message.
 */
function handleAuthError(serviceName, error) {
  const errorMsg = error.message || error.toString();

  // Detect specific auth error patterns
  const isMissingToken = errorMsg.includes('OAuth2 token') || errorMsg.includes('getOAuthToken');
  const isMissingDevToken = serviceName === 'googleAds' && errorMsg.includes('Developer Token');
  const isMissingConfig = errorMsg.includes('missing') || errorMsg.includes('not configured');
  const isPermissionDenied = errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('403');
  const isScopeIssue = errorMsg.includes('insufficient') || errorMsg.includes('scope');

  let userMessage = '';
  let actionItems = [];

  if (isMissingToken) {
    userMessage = `${serviceName} authentication requires authorization.`;
    actionItems = [
      'Go to Extensions > Addocu > Reauthorize Permissions',
      'Grant all requested scopes when prompted',
      'Try the sync again'
    ];
  } else if (isMissingDevToken) {
    userMessage = 'Google Ads Developer Token is not configured.';
    actionItems = [
      'Open Extensions > Addocu > Configuration',
      'Enter your Google Ads Developer Token',
      'Save the configuration',
      'Try the sync again'
    ];
  } else if (isMissingConfig) {
    userMessage = `${serviceName} requires additional configuration.`;
    actionItems = [
      'Check Extensions > Addocu > Configuration',
      'Ensure all required fields are filled',
      'Try the sync again'
    ];
  } else if (isPermissionDenied) {
    userMessage = `You don't have access to ${serviceName} or insufficient permissions.`;
    actionItems = [
      'Verify you have access to this service in your Google account',
      'Ensure your account has the necessary roles/permissions',
      'Try reauthorizing: Extensions > Addocu > Reauthorize Permissions'
    ];
  } else if (isScopeIssue) {
    userMessage = `${serviceName} requires additional OAuth scopes.`;
    actionItems = [
      'Reauthorize the script: Extensions > Addocu > Reauthorize Permissions',
      'Grant all requested scopes',
      'Try the sync again'
    ];
  } else {
    userMessage = `${serviceName} synchronization encountered an error.`;
    actionItems = [
      `Error details: ${errorMsg.substring(0, 100)}`,
      'Check the LOGS sheet for more information',
      'Try Extensions > Addocu > Troubleshooting > Simplified Diagnostics'
    ];
  }

  logError('AUTH_HANDLER', `${serviceName} auth error: ${errorMsg}`);

  return {
    status: 'AUTH_FAILED',
    serviceName: serviceName,
    success: false,
    records: 0,
    userMessage: userMessage,
    actionItems: actionItems,
    error: errorMsg,
    canRetry: true
  };
}

/**
 * Checks if a service is available for the user.
 * @param {string} serviceName - Service name.
 * @returns {boolean} True if the service is available.
 */
function isServiceAvailable(serviceName) {
  // All services available
  return ADDOCU_CONFIG.services.available.includes(serviceName);
}

/**
 * Reads GTM container configuration from user properties.
 * @returns {Array<string>} An array with container IDs.
 */
function getTargetContainersFromConfig() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const value = userProperties.getProperty('ADDOCU_GTM_FILTER');

    if (!value || value.trim() === '') {
      logEvent('GTM', 'No container filter defined. All accessible containers will be audited.');
      return []; // Empty array = all containers
    }

    // Clean and validate GTM container format
    const containers = value.split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .filter(id => id.startsWith('GTM-') || /^[0-9]+$/.test(id)); // GTM-XXXXXX or numbers only

    logEvent('GTM', `Container filter configured: ${containers.join(', ')}`);
    return containers;
  } catch (e) {
    if (e.message.includes('PERMISSION_DENIED')) {
      console.warn('UTILS: UserProperties not accessible for GTM filters, using default configuration');
      logEvent('GTM', 'UserProperties not accessible. All accessible containers will be audited.');
      return []; // Empty array = all containers
    }
    throw e;
  }
}

/**
 * Reads GTM workspace configuration from user properties.
 * @returns {Array<string>} An array with workspace names.
 */
function getTargetWorkspacesFromConfig() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const value = userProperties.getProperty('ADDOCU_GTM_WORKSPACES_FILTER');

    if (!value || value.trim() === '') {
      logEvent('GTM', 'No workspace filter defined. Default workspace will be used.');
      return []; // Empty array = default workspace
    }

    // Clean and validate workspace format
    const workspaces = value.split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    logEvent('GTM', `Workspace filter configured: ${workspaces.join(', ')}`);
    return workspaces;
  } catch (e) {
    if (e.message.includes('PERMISSION_DENIED')) {
      console.warn('UTILS: UserProperties not accessible for GTM workspace filters, using default configuration');
      logEvent('GTM', 'UserProperties not accessible. Default workspace will be used.');
      return []; // Empty array = default workspace
    }
    throw e;
  }
}

/**
 * Reads GA4 properties configuration from user properties.
 * @returns {Array<string>} An array with property IDs.
 */
function getTargetGA4PropertiesFromConfig() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const value = userProperties.getProperty('ADDOCU_GA4_PROPERTIES_FILTER');

    if (!value || value.trim() === '') {
      logEvent('GA4', 'No property filter defined. All accessible properties will be audited.');
      return []; // Empty array = all properties
    }

    // Clean and validate GA4 property format
    const properties = value.split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    logEvent('GA4', `Property filter configured: ${properties.join(', ')}`);
    return properties;
  } catch (e) {
    if (e.message.includes('PERMISSION_DENIED')) {
      console.warn('UTILS: UserProperties not accessible for GA4 filters, using default configuration');
      logEvent('GA4', 'UserProperties not accessible. All accessible properties will be audited.');
      return []; // Empty array = all properties
    }
    throw e;
  }
}

// =================================================================
// NETWORK AND DATA UTILITIES
// =================================================================

/**
 * Performs an HTTP request with retries and best practices.
 * @param {string} url - Request URL.
 * @param {Object} options - Request options.
 * @param {string} serviceName - Service name for logging.
 * @param {number} maxRetries - Maximum number of retries.
 * @returns {Object} Response parsed as JSON.
 */
function fetchWithRetry(url, options = {}, serviceName = 'API', maxRetries = null) {
  if (maxRetries === null) {
    maxRetries = ADDOCU_CONFIG.limits.maxRetries;
  }

  let lastError = null;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logEvent('HTTP', `${serviceName}: Request ${attempt}/${maxRetries} to ${getUrlForLogging(url)}`);

      // Configure default options
      const requestOptions = {
        method: 'GET',
        muteHttpExceptions: true,
        ...options
      };

      // Apply timeout if configured
      const config = getUserConfig();
      if (config.requestTimeout && config.requestTimeout > 0) {
        // Apps Script doesn't support custom timeout, but we log it
        logEvent('HTTP', `${serviceName}: Timeout configured: ${config.requestTimeout}s`);
      }

      const response = UrlFetchApp.fetch(url, requestOptions);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();
      const duration = Date.now() - startTime;

      // Detect HTML responses (common permission error)
      if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html')) {
        logError('HTTP', `${serviceName}: Received HTML instead of JSON. Possible permission error or API not enabled.`);
        throw new Error(`Error ${statusCode}: Received HTML instead of JSON. Check API permissions and that it's enabled in Google Cloud Console.`);
      }

      // Successful responses
      if (statusCode >= 200 && statusCode < 300) {
        logEvent('HTTP', `${serviceName}: Success (${statusCode}) in ${duration}ms`);

        if (!responseText || responseText.trim() === '') {
          return {}; // Valid empty response
        }

        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          logWarning('HTTP', `${serviceName}: Response is not valid JSON, returning as text`);
          return { rawResponse: responseText };
        }
      }

      // Rate limiting (429)
      if (statusCode === 429) {
        const waitTime = Math.pow(2, attempt) * ADDOCU_CONFIG.limits.retryDelay;
        logWarning('HTTP', `${serviceName}: Rate limit (429), waiting ${waitTime / 1000}s before next attempt`);
        Utilities.sleep(waitTime);
        lastError = new Error(`Rate limit exceeded. Attempt ${attempt}/${maxRetries}.`);
        continue;
      }

      // Server errors (5xx) - retry
      if (statusCode >= 500) {
        const waitTime = attempt * ADDOCU_CONFIG.limits.retryDelay;
        logError('HTTP', `${serviceName}: Server error (${statusCode}), retrying in ${waitTime / 1000}s...`);
        lastError = new Error(`Server error ${statusCode}. Response: ${responseText.substring(0, 200)}`);
        if (attempt < maxRetries) {
          Utilities.sleep(waitTime);
          continue;
        }
      }

      // Client errors (4xx) - don't retry
      let errorMessage = `API error ${statusCode}`;
      try {
        const errorResponse = JSON.parse(responseText);
        if (errorResponse.error?.message) {
          errorMessage += `: ${errorResponse.error.message}`;
        }
      } catch (e) {
        errorMessage += `: ${responseText.substring(0, 200)}`;
      }

      throw new Error(errorMessage);

    } catch (e) {
      lastError = e;
      const duration = Date.now() - startTime;

      if (attempt === maxRetries) {
        logError('HTTP', `${serviceName}: Final failure after ${maxRetries} attempts in ${duration}ms: ${e.message}`);
        throw new Error(`Failure in ${serviceName} after ${maxRetries} attempts: ${e.message}`);
      }

      logWarning('HTTP', `${serviceName}: Error in attempt ${attempt}/${maxRetries}: ${e.message}`);

      // Wait before next attempt (except for the last one)
      if (attempt < maxRetries) {
        const waitTime = attempt * ADDOCU_CONFIG.limits.retryDelay;
        Utilities.sleep(waitTime);
      }
    }
  }

  throw lastError || new Error(`Unknown error in ${serviceName}`);
}

/**
 * Builds a URL with query parameters (compatible with Google Apps Script).
 * @param {string} baseUrl - Base URL.
 * @param {Object} params - Query parameters.
 * @returns {string} Complete URL.
 */
function buildUrl(baseUrl, params = {}) {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const queryParams = [];

  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== undefined && value !== null) {
      queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });

  if (queryParams.length === 0) {
    return baseUrl;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${queryParams.join('&')}`;
}

/**
 * Safe URL version for logging (hides API keys) - Compatible with Google Apps Script.
 * @param {string} url - Original URL.
 * @returns {string} Sanitized URL for logs.
 */
function getUrlForLogging(url) {
  try {
    // Find and hide API key manually
    let sanitizedUrl = url;

    // Find 'key=' parameter and replace it
    const keyPattern = /([?&])key=([^&]*)/g;
    sanitizedUrl = sanitizedUrl.replace(keyPattern, '$1key=AIza***HIDDEN***');

    // Limit length for logs
    return sanitizedUrl.length > 100 ? sanitizedUrl.substring(0, 100) + '...' : sanitizedUrl;

  } catch (e) {
    return url.substring(0, 100) + (url.length > 100 ? '...' : '');
  }
}

// =================================================================
// DATE AND FORMAT UTILITIES
// =================================================================

/**
 * Formats a date for display in spreadsheets.
 * @param {string|Date} dateInput - Date in string format or Date object.
 * @returns {string} Formatted date.
 */
function formatDate(dateInput) {
  if (!dateInput) return 'N/A';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    if (isNaN(date.getTime())) {
      return typeof dateInput === 'string' ? dateInput : 'Invalid date';
    }

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/New_York'
    });
  } catch (e) {
    logWarning('FORMAT', `Error formatting date: ${e.message}`);
    return dateInput ? dateInput.toString() : 'N/A';
  }
}

/**
 * Formats text for display in cells (handles null/undefined values).
 * @param {*} value - Value to format.
 * @returns {string} Formatted value.
 */
function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') return JSON.stringify(value);
  return value.toString();
}

/**
 * Truncates long text to avoid cell problems.
 * @param {string} text - Text to truncate.
 * @param {number} maxLength - Maximum length.
 * @returns {string} Truncated text.
 */
function truncateText(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') return '';

  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength - 3) + '...';
}

// =================================================================
// SPREADSHEET UTILITIES
// =================================================================

/**
 * Writes data to a spreadsheet with improved formatting.
 * @param {string} sheetName - Sheet name.
 * @param {Array} headers - Array with column names.
 * @param {Array} data - Two-dimensional array with data.
 * @param {boolean} clearFirst - Whether to clear the sheet first.
 * @param {Object} options - Additional formatting options.
 */
function writeToSheet(sheetName, headers, data, clearFirst = true, options = {}) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(sheetName);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      logEvent('SHEET', `Sheet "${sheetName}" created.`);
    }

    // Apply tab color if provided in options or derived from name
    if (options.tabColor) {
      sheet.setTabColor(options.tabColor);
    }

    // Clear sheet if requested
    if (clearFirst) {
      sheet.clear();
    }

    // Write headers if provided
    if (headers && headers.length > 0) {
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);

      // Header formatting
      headerRange
        .setFontWeight('bold')
        .setBackground('#4285F4')
        .setFontColor('white')
        .setBorder(true, true, true, true, true, true);

      sheet.setFrozenRows(1);
    }

    // Write data if exists
    if (data && data.length > 0 && data[0].length > 0) {
      const startRow = clearFirst ? 2 : sheet.getLastRow() + 1;
      const numRows = data.length;
      const numColumns = data[0].length;

      // Ensure all data are valid strings or numbers
      const cleanData = data.map(row =>
        row.map(cell => formatCellValue(cell))
      );

      const dataRange = sheet.getRange(startRow, 1, numRows, numColumns);
      dataRange.setValues(cleanData);

      // Alternating colors for rows
      if (options.alternateColors !== false) {
        for (let i = 0; i < numRows; i++) {
          if (i % 2 === 1) { // Even rows (odd index)
            sheet.getRange(startRow + i, 1, 1, numColumns)
              .setBackground('#F8F9FA');
          }
        }
      }

      // Auto-resize columns
      sheet.autoResizeColumns(1, numColumns);

      // Apply borders
      if (options.borders !== false) {
        dataRange.setBorder(true, true, true, true, true, true);
      }
    }

    // Sheet metadata
    if (options.addMetadata !== false) {
      addSheetMetadata(sheet, {
        generatedBy: 'Addocu v3.0',
        timestamp: new Date().toISOString(),
        recordCount: data ? data.length : 0,
        userEmail: Session.getActiveUser().getEmail()
      });
    }

    logEvent('SHEET', `${data ? data.length : 0} records written to "${sheetName}".`);

  } catch (error) {
    logError('SHEET', `Error writing to "${sheetName}": ${error.message}`);
    throw new Error(`Could not write to sheet "${sheetName}": ${error.message}`);
  }
}

/**
 * High-level utility to write structured data to a sheet.
 * Handles both Array of Objects and Array of Arrays.
 * If data is empty, it writes a "No account found" message.
 *
 * @param {string} sheetName - Target sheet name
 * @param {Array} headers - Column headers
 * @param {Array} data - The data (Array of Objects or Arrays)
 * @param {string} platformName - Optional platform name for empty message
 */
function writeDataToSheet(sheetName, headers, data, platformName = 'this platform', errorMsg = null) {
  // Always ensure sheet exists and is formatted
  if (errorMsg) {
    logWarning('SHEET', `Reporting error for ${platformName} in sheet ${sheetName}: ${errorMsg}`);

    // Clear sheet and write headers
    writeToSheet(sheetName, headers, [], true);

    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (sheet) {
        const message = `Error: ${errorMsg}`;
        sheet.getRange(2, 1).setValue(message);
        sheet.getRange(2, 1, 1, Math.max(1, headers.length)).merge()
          .setFontWeight('bold')
          .setFontColor('#ea4335')
          .setBackground('#fce8e6');

        // Add a secondary help message if it looks like a permission issue
        if (errorMsg.includes('403') || errorMsg.includes('permissions') || errorMsg.includes('authorized')) {
          sheet.getRange(3, 1).setValue('Tip: Verify that the required API is enabled in Google Cloud Console and you have authorized the add-on.');
          sheet.getRange(3, 1, 1, Math.max(1, headers.length)).merge().setFontStyle('italic').setFontColor('#666666');
        }
      }
    } catch (e) {
      logError('SHEET', `Error writing error message to ${sheetName}: ${e.message}`);
    }

    // Ensure tab is colored even on error
    const platformColors = {
      'GA4': '#E37400', 'GTM': '#00838F', 'YouTube': '#FF0000', 'Google Ads': '#FBBC05',
      'AdSense': '#34A853', 'Merchant': '#F9AB00', 'Search Console': '#4285F4',
      'Looker': '#4285F4', 'GBP': '#4285F4', 'BigQuery': '#4285F4'
    };
    let tabColor = null;
    for (const key in platformColors) {
      if (platformName && platformName.includes(key)) {
        tabColor = platformColors[key];
        break;
      }
    }
    if (tabColor) {
      try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (sheet) sheet.setTabColor(tabColor);
      } catch (e) { }
    }

    return;
  }

  if (!data || data.length === 0) {
    logWarning('SHEET', `No data to write to sheet ${sheetName}.`);

    // Clear sheet and write headers
    writeToSheet(sheetName, headers, [], true);

    // Write "No account found" message in the second row
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (sheet) {
        const message = `No account or assets found associated with ${platformName}.`;
        sheet.getRange(2, 1).setValue(message);
        sheet.getRange(2, 1, 1, Math.max(1, headers.length)).merge().setFontStyle('italic').setFontColor('#666666');
      }
    } catch (e) {
      logError('SHEET', `Error writing empty message to ${sheetName}: ${e.message}`);
    }
    return;
  }

  // Detect data format
  let dataAsArrays;
  if (Array.isArray(data[0])) {
    // Already Array of Arrays
    dataAsArrays = data;
  } else {
    // Array of Objects - map to headers
    dataAsArrays = data.map(obj => headers.map(header => obj[header] !== undefined ? obj[header] : ''));
  }

  // Determine tab color based on platform name
  const platformColors = {
    'GA4': '#E37400',       // Orange
    'GTM': '#00838F',       // Teal
    'YouTube': '#FF0000',   // Red
    'Google Ads': '#FBBC05', // Yellow
    'AdSense': '#34A853',   // Green
    'Merchant Center': '#F9AB00',  // Orange/Yellow
    'Merchant': '#F9AB00',  // Orange/Yellow (alias)
    'Search Console': '#4285F4', // Blue
    'Looker Studio': '#4285F4',   // Blue
    'Looker': '#4285F4',    // Blue (alias)
    'Google Business Profile': '#4285F4', // Blue
    'GBP': '#4285F4',       // Blue (alias)
    'BigQuery': '#4285F4',  // Blue
    'Business Profile': '#4285F4' // Blue (alias)
  };

  // Find a matching color
  let tabColor = null;
  if (platformName) {
    for (const key in platformColors) {
      if (platformName.includes(key)) {
        tabColor = platformColors[key];
        break;
      }
    }
  }

  writeToSheet(sheetName, headers, dataAsArrays, true, { tabColor: tabColor });
}

/**
 * Adds metadata to a sheet in hidden cells.
 * @param {Sheet} sheet - Spreadsheet sheet.
 * @param {Object} metadata - Metadata to add.
 */
function addSheetMetadata(sheet, metadata) {
  try {
    // Use columns far to the right for metadata (columns ZZ, ZA, etc.)
    const metaStartCol = 26 * 26 + 26; // Column ZZ
    let row = 1;

    Object.keys(metadata).forEach(key => {
      sheet.getRange(row, metaStartCol).setValue(key);
      sheet.getRange(row, metaStartCol + 1).setValue(metadata[key]);
      row++;
    });

    // Hide these columns
    sheet.hideColumns(metaStartCol, 2);

  } catch (e) {
    // Not critical if it fails
    logWarning('SHEET', `Could not add metadata: ${e.message}`);
  }
}

/**
 * Gets the number of records in a sheet (excluding header).
 * @param {string} sheetName - Sheet name.
 * @returns {number} Number of records.
 */
function getSheetRecordCount(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return 0;

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 0;

    // Check for "No account found" message in the first row of data
    const firstCell = sheet.getRange(2, 1).getValue();
    if (typeof firstCell === 'string' && firstCell.includes('No account')) {
      return 0;
    }

    return lastRow - 1; // -1 to exclude header

  } catch (e) {
    return 0;
  }
}

// =================================================================
// DIAGNOSTICS AND VALIDATION
// =================================================================

/**
 * Validates connectivity and permissions for a specific service.
 * @param {string} serviceName - Service name ('ga4', 'gtm', 'looker').
 * @returns {Object} Validation result.
 */
function validateService(serviceName) {
  try {
    // Normalize service names (same as getAuthConfig)
    const serviceNameMap = {
      'bigquery': 'bigQuery',
      'adsense': 'adSense',
      'googleads': 'googleAds',
      'googlemerchantcenter': 'googleMerchantCenter',
      'googlebusinessprofile': 'googleBusinessProfile',
      'searchconsole': 'searchConsole',
      'lookerstudio': 'lookerStudio',
      'looker': 'lookerStudio'
    };

    const normalizedService = serviceNameMap[serviceName.toLowerCase()] || serviceName;

    const auth = getAuthConfig(normalizedService);
    const apiConfig = ADDOCU_CONFIG.apis[normalizedService];

    if (!apiConfig) {
      throw new Error(`Configuration not found for service: ${normalizedService}`);
    }

    logEvent('VALIDATION', `Validating ${normalizedService} with ${auth.authType}...`);

    let testUrl, requestOptions;

    if (auth.authType === 'oauth2') {
      // For GA4 and GTM: use OAuth2 only
      testUrl = apiConfig.baseUrl + apiConfig.testEndpoint;
      requestOptions = {
        method: 'GET',
        headers: auth.headers,
        muteHttpExceptions: true
      };
    } else if (auth.authType === 'apikey') {
      // For Looker Studio: use API Key
      testUrl = buildUrl(apiConfig.baseUrl + apiConfig.testEndpoint, {
        key: auth.apiKey,
        pageSize: 1
      });
      requestOptions = {
        method: 'GET',
        headers: auth.headers,
        muteHttpExceptions: true
      };
    } else {
      throw new Error(`Unsupported authentication type: ${auth.authType}`);
    }

    const response = UrlFetchApp.fetch(testUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    let status = 'ERROR';
    let message = '';
    let account = 'N/A';

    // Initialize account with more descriptive value for Looker Studio
    if (normalizedService === 'lookerStudio') {
      account = 'Pending';
    }

    if (statusCode === 200) {
      status = 'OK';
      message = 'Connected successfully';

      // Assign more descriptive account message based on authentication type
      if (normalizedService === 'ga4') {
        account = 'OAuth2 authorized';
      } else if (normalizedService === 'gtm') {
        account = 'OAuth2 authorized';
      } else if (normalizedService === 'lookerStudio') {
        account = 'OAuth2 connected';
      } else if (normalizedService === 'searchConsole') {
        account = 'OAuth2 authorized';
      } else if (normalizedService === 'youtube') {
        account = 'OAuth2 authorized';
      } else if (normalizedService === 'googleBusinessProfile') {
        account = 'OAuth2 authorized';
      } else if (normalizedService === 'googleMerchantCenter') {
        account = 'OAuth2 connected';
      } else if (normalizedService === 'bigQuery') {
        account = 'OAuth2 authorized';
      } else if (normalizedService === 'adSense') {
        account = 'OAuth2 connected';
      }

      // Try to extract additional account information (optional)
      try {
        const data = JSON.parse(responseText);
        if (normalizedService === 'ga4' && data.accounts) {
          account = `OAuth2 authorized (${data.accounts.length} accounts)`;
        } else if (normalizedService === 'gtm' && data.account) {
          account = `OAuth2 authorized (${data.account.length} accounts)`;
        } else if (normalizedService === 'searchConsole' && data.siteEntry) {
          account = `OAuth2 authorized (${data.siteEntry.length} sites)`;
        } else if (normalizedService === 'youtube' && data.items) {
          account = `OAuth2 authorized (${data.items.length} channels)`;
        } else if (normalizedService === 'googleBusinessProfile' && data.accounts) {
          account = `OAuth2 authorized (${data.accounts.length} accounts)`;
        }
        // For debugging: log actual response structure
        logEvent('VALIDATION', `${normalizedService} response structure: ${JSON.stringify(Object.keys(data)).substring(0, 200)}`);
      } catch (e) {
        // Keep base message if can't parse
        logEvent('VALIDATION', `${normalizedService} response parsing failed, using base message`);
      }

    } else if (statusCode === 403) {
      status = 'PERMISSION_ERROR';
      if (auth.authType === 'oauth2') {
        message = 'No OAuth2 permissions. Verify that the API is enabled and the script is authorized.';
      } else {
        message = 'No permissions. Verify that the API is enabled and the key has permissions.';
      }
    } else if (statusCode === 401) {
      status = 'AUTH_ERROR';
      if (auth.authType === 'oauth2') {
        message = 'OAuth2 authentication error. The script needs authorization.';
      } else {
        message = 'Authentication error. Verify your API Key.';
      }
    } else if (statusCode === 404) {
      status = 'API_NOT_FOUND';
      message = 'API not found. Verify that it\'s enabled in Google Cloud Console.';
    } else {
      status = `HTTP_${statusCode}`;
      message = `HTTP error ${statusCode}`;
    }

    return {
      service: apiConfig.name,
      account: account,
      status: status,
      user: auth.authUser,
      timestamp: new Date(),
      message: message
    };

  } catch (error) {
    logError('VALIDATION', `Error validating ${serviceName}: ${error.message}`);

    return {
      service: ADDOCU_CONFIG.apis[serviceName]?.name || serviceName,
      account: "N/A",
      status: 'EXCEPTION',
      user: Session.getActiveUser().getEmail(),
      timestamp: new Date(),
      message: error.message
    };
  }
}

/**
 * Executes a complete connectivity diagnostic.
 * @returns {Array} Array with results for each service.
 */
function runCompleteConnectivityDiagnostic() {
  logEvent('DIAGNOSTIC', 'Starting complete Addocu connectivity diagnostic.');

  const servicesToTest = ['ga4', 'gtm', 'lookerStudio', 'searchConsole', 'youtube', 'googleBusinessProfile'];
  const results = [];

  servicesToTest.forEach(service => {
    try {
      const result = validateService(service);
      results.push([
        result.service,
        result.account,
        result.status,
        result.message,
        result.user,
        formatDate(result.timestamp)
      ]);

      logEvent('DIAGNOSTIC', `${service}: ${result.status} - ${result.message}`);

    } catch (e) {
      logError('DIAGNOSTIC', `Error diagnosing ${service}: ${e.message}`);
      results.push([
        service,
        'N/A',
        'ERROR',
        e.message,
        Session.getActiveUser().getEmail(),
        formatDate(new Date())
      ]);
    }
  });

  // Write results to sheet
  const headers = ['Service', 'Account', 'Status', 'Message', 'User', 'Timestamp'];
  writeToSheet('ADDOCU_DIAGNOSTIC', headers, results, true, {
    alternateColors: true,
    borders: true
  });

  logEvent('DIAGNOSTIC', `Diagnostic completed for ${results.length} services.`);
  flushLogs();

  return results;
}

// =================================================================
// TIME AND PERFORMANCE UTILITIES
// =================================================================

/**
 * Marks the start of an operation to measure performance.
 * @param {string} operationName - Operation name.
 * @returns {number} Start timestamp.
 */
function startTimer(operationName) {
  const startTime = Date.now();
  logEvent('TIMER', `Starting: ${operationName}`);
  return startTime;
}

/**
 * Marks the end of an operation and logs the duration.
 * @param {string} operationName - Operation name.
 * @param {number} startTime - Start timestamp.
 * @returns {number} Duration in milliseconds.
 */
function endTimer(operationName, startTime) {
  const endTime = Date.now();
  const duration = endTime - startTime;
  logEvent('TIMER', `Completed: ${operationName} in ${duration}ms`);
  return duration;
}

/**
 * Executes a function with automatic time measurement.
 * @param {string} operationName - Operation name.
 * @param {Function} func - Function to execute.
 * @returns {*} Function result.
 */
function timeOperation(operationName, func) {
  const startTime = startTimer(operationName);
  try {
    const result = func();
    endTimer(operationName, startTime);
    return result;
  } catch (error) {
    endTimer(operationName, startTime);
    throw error;
  }
}

/**
 * Helper function to make API calls with OAuth2.
 * @param {string} url - API URL.
 * @param {string} method - HTTP method (GET, POST, etc.).
 * @param {Object} payload - Data to send (optional).
 * @returns {Object} Response parsed as JSON.
 */
function fetchWithOAuth2(url, method = 'GET', payload = null) {
  try {
    const token = ScriptApp.getOAuthToken();
    if (!token) {
      throw new Error('Could not get OAuth2 token. Authorize the script first.');
    }

    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Addocu/2.0 (Google Sheets Add-on)'
      },
      muteHttpExceptions: true
    };

    if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.payload = JSON.stringify(payload);
    }

    return fetchWithRetry(url, options, 'OAuth2-API');

  } catch (error) {
    logError('OAuth2', `Error in OAuth2 call to ${url}: ${error.message}`);
    throw error;
  }
}
