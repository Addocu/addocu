/**
 * @fileoverview Additional functions for Sidebar v2.0 support
 * @version 2.0 - Specific functions for the new interface
 */

// =================================================================
// SPECIFIC FUNCTIONS FOR SIDEBAR V2.0
// =================================================================

/**
 * Function called from sidebar to read advanced configuration.
 * Specifically exposed for the new HTML interface.
 */
function readAdvancedConfiguration() {
  try {
    return readUserConfiguration();
  } catch (error) {
    logError('SIDEBAR', `Error reading advanced configuration: ${error.message}`);
    return {
      error: error.message,
      isFirstTime: true,
      isPro: true // Open source - all users have access
    };
  }
}

/**
 * Function called from sidebar to save advanced configuration.
 * Handles both basic and advanced configuration.
 */
function saveAdvancedConfiguration(config) {
  try {
    return saveUserConfiguration(config);
  } catch (error) {
    logError('SIDEBAR', `Error saving advanced configuration: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Function to reset configuration from sidebar.
 */
function resetConfiguration() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Confirm destructive action
    const response = ui.alert(
      '⚠️ Confirm Reset',
      'Are you sure you want to reset ALL configuration?\n\nThis action cannot be undone.',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return { success: false, cancelled: true };
    }

    const userProperties = PropertiesService.getUserProperties();
    const allProperties = userProperties.getProperties();

    // Delete all Addocu properties
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('ADDOCU_')) {
        userProperties.deleteProperty(key);
      }
    });

    // Restore default configuration
    setDefaultConfigurationV2();

    logEvent('RESET', 'Configuration reset from sidebar');
    flushLogs();

    return { success: true };

  } catch (error) {
    logError('SIDEBAR', `Error in configuration reset: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// =================================================================
// ONBOARDING AND QUICK SETUP FUNCTIONS
// =================================================================

/**
 * Function for Quick Setup - guided quick configuration.
 */
function executeQuickSetup(apiKey) {
  try {
    logEvent('ONBOARDING', 'Starting Quick Setup');

    // Step 1: Validate and save API Key (optional for OAuth2-only services)
    if (apiKey && (!apiKey.startsWith('AIza') || apiKey.length < 20)) {
      return {
        success: false,
        step: 1,
        error: 'Invalid API Key. Must start with "AIza" and have at least 20 characters.'
      };
    }

    // Save API Key if provided (optional for Looker Studio)
    if (apiKey) {
      const saveResult = saveUserConfiguration({ lookerApiKey: apiKey });
      if (!saveResult.success) {
        return {
          success: false,
          step: 1,
          error: saveResult.error
        };
      }
    }

    // Step 2: Test connections automatically (OAuth2 based)
    logEvent('ONBOARDING', 'Testing connections automatically');
    const connectionResults = testCompleteConnection();

    // Step 2: Configure default services (all available)
    const defaultServices = {
      syncGA4: true,     // Always enabled (OAuth2)
      syncGTM: true,     // Enabled (OAuth2)
      syncLooker: true,  // Enabled (OAuth2, API Key optional)
      isFirstTime: false // Mark as configured
    };

    saveUserConfiguration(defaultServices);

    logEvent('ONBOARDING', 'Quick Setup completed successfully');

    return {
      success: true,
      apiKey: apiKey || 'OAuth2 only',
      connections: connectionResults,
      message: 'Configuration completed! You can now audit your marketing stack.'
    };

  } catch (error) {
    logError('ONBOARDING', `Error in Quick Setup: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Function to get onboarding statistics.
 */
function getOnboardingStatistics() {
  try {
    const config = readUserConfiguration();

    return {
      isFirstTime: config.isFirstTime,
      hasApiKey: !!config.lookerApiKey,
      enabledServices: {
        ga4: config.syncGA4,
        gtm: config.syncGTM,
        looker: config.syncLooker
      },
      isPro: true, // Open source - all users have full access
      completionPercentage: calculateCompletionPercentage(config)
    };

  } catch (error) {
    return {
      isFirstTime: true,
      hasApiKey: false,
      enabledServices: { ga4: true, gtm: true, looker: true },
      isPro: true, // Open source - all users have full access
      completionPercentage: 80 // OAuth2 setup gives high completion
    };
  }
}

/**
 * Calculates configuration completion percentage.
 */
function calculateCompletionPercentage(config) {
  let completed = 0;
  let total = 3;

  // Step 1: OAuth2 always available (high weight)
  completed += 1;

  // Step 2: At least one connection tested (verify if there are recent connection logs)
  // For simplicity, assume if not first time, it was already tested
  if (!config.isFirstTime) completed++;

  // Step 3: At least one service enabled
  if (config.syncGA4 || config.syncGTM || config.syncLooker) completed++;

  return Math.round((completed / total) * 100);
}

// =================================================================
// ADVANCED VALIDATION FUNCTIONS
// =================================================================

/**
 * Advanced API Key validation with specific details.
 */
function validateAdvancedApiKey(apiKey) {
  try {
    const validation = {
      format: false,
      length: false,
      prefix: false,
      connection: null,
      permissions: {},
      required: false // API Key is optional
    };

    // Validate basic format
    if (apiKey && typeof apiKey === 'string') {
      validation.length = apiKey.length >= 20;
      validation.prefix = apiKey.startsWith('AIza');
      validation.format = validation.length && validation.prefix;
    }

    // API Key is optional - OAuth2 is primary
    validation.required = false;

    // If format is correct, test connections
    if (validation.format) {
      try {
        // Test OAuth2 connections (primary method)
        const connectionResults = testCompleteConnection();
        validation.connection = connectionResults;

        // Analyze permissions by service
        connectionResults.forEach(result => {
          validation.permissions[result.service] = result.status === 'OK';
        });

      } catch (error) {
        validation.connection = { error: error.message };
      }
    } else {
      // Even without API Key, test OAuth2
      try {
        const connectionResults = testCompleteConnection();
        validation.connection = connectionResults;
        validation.oauth2Available = true;
      } catch (error) {
        validation.connection = { error: error.message };
        validation.oauth2Available = false;
      }
    }

    return validation;

  } catch (error) {
    logError('VALIDATION', `Error in advanced validation: ${error.message}`);
    return {
      format: false,
      length: false,
      prefix: false,
      connection: { error: error.message },
      permissions: {},
      required: false
    };
  }
}

// =================================================================
// ANALYTICS AND METRICS FUNCTIONS
// =================================================================

/**
 * Gets usage metrics to display in sidebar.
 */
function getUsageMetrics() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const config = readUserConfiguration();

    const metrics = {
      totalAudits: 0,
      lastAudit: null,
      totalElements: 0,
      configuredServices: 0,
      usageTime: null
    };

    // Count generated sheets as audit proxy
    const sheets = ss.getSheets();
    const addocuSheets = sheets.filter(sheet => {
      const name = sheet.getName();
      return name.startsWith('GA4_') || name.startsWith('GTM_') || name.startsWith('LOOKER_') || name === 'DASHBOARD';
    });

    metrics.totalAudits = addocuSheets.length;

    // Count total elements
    metrics.totalElements = addocuSheets.reduce((total, sheet) => {
      return total + Math.max(0, sheet.getLastRow() - 1); // -1 to exclude header
    }, 0);

    // Configured services (all available)
    if (config.syncGA4) metrics.configuredServices++;
    if (config.syncGTM) metrics.configuredServices++;
    if (config.syncLooker) metrics.configuredServices++;

    // Estimated usage time (since first configuration)
    const userProperties = PropertiesService.getUserProperties();
    const migrationDate = userProperties.getProperty('ADDOCU_MIGRATION_DATE');
    const firstConfigDate = userProperties.getProperty('ADDOCU_FIRST_CONFIG_DATE');

    if (migrationDate || firstConfigDate) {
      const startDate = new Date(migrationDate || firstConfigDate);
      const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      metrics.usageTime = daysSinceStart;
    }

    return metrics;

  } catch (error) {
    logError('METRICS', `Error getting metrics: ${error.message}`);
    return {
      totalAudits: 0,
      lastAudit: null,
      totalElements: 0,
      configuredServices: 3, // All services available
      usageTime: null,
      error: error.message
    };
  }
}

/**
 * Records usage event for internal analytics.
 */
function recordUsageEvent(event, details = {}) {
  try {
    const timestamp = new Date().toISOString();
    const userEmail = Session.getActiveUser().getEmail();

    logEvent('USAGE', `${event}: ${JSON.stringify(details)}`);

    // Save usage metrics in user properties
    const userProperties = PropertiesService.getUserProperties();
    const usageKey = `ADDOCU_USAGE_${event.toUpperCase()}`;
    const currentCount = parseInt(userProperties.getProperty(usageKey) || '0');
    userProperties.setProperty(usageKey, String(currentCount + 1));

    // Record last usage
    userProperties.setProperty('ADDOCU_LAST_USAGE', timestamp);

  } catch (error) {
    // Not critical if usage recording fails
    console.warn('Error recording usage event:', error.message);
  }
}

// =================================================================
// SUPPORT AND HELP FUNCTIONS
// =================================================================

/**
 * Gets support and debug information to send to team.
 */
function getSupportInformation() {
  try {
    const config = readUserConfiguration();
    const userProperties = PropertiesService.getUserProperties();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Non-sensitive information for support
    const supportInfo = {
      version: 'Addocu v3.0',
      timestamp: new Date().toISOString(),
      user: {
        email: Session.getActiveUser().getEmail(),
        locale: Session.getActiveUserLocale(),
        timezone: Session.getScriptTimeZone()
      },
      configuration: {
        hasLookerApiKey: !!config.lookerApiKey,
        apiKeyFormat: config.lookerApiKey ? `${config.lookerApiKey.substring(0, 8)}...` : 'Not configured (OAuth2 used)',
        services: {
          ga4: config.syncGA4,
          gtm: config.syncGTM,
          looker: config.syncLooker
        },
        isPro: true, // Open source - all users have full access
        isFirstTime: config.isFirstTime,
        logLevel: config.logLevel,
        oauth2Available: true
      },
      spreadsheet: {
        id: ss.getId(),
        name: ss.getName(),
        sheetsCount: ss.getSheets().length,
        locale: ss.getSpreadsheetLocale(),
        timeZone: ss.getSpreadsheetTimeZone()
      },
      migration: {
        completed: userProperties.getProperty('ADDOCU_MIGRATION_V3_COMPLETED') === 'true',
        date: userProperties.getProperty('ADDOCU_MIGRATION_DATE')
      }
    };

    return supportInfo;

  } catch (error) {
    return {
      version: 'Addocu v3.0',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Generates unique support ID for issue tracking.
 */
function generateSupportId() {
  const timestamp = Date.now();
  const userEmail = Session.getActiveUser().getEmail();
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,
    `${timestamp}-${userEmail}`, Utilities.Charset.UTF_8)
    .map(byte => (byte + 256).toString(16).substring(1))
    .join('')
    .substring(0, 8);

  return `ADDOCU-${hash.toUpperCase()}`;
}

/**
 * Sets default configuration v2.
 */
function setDefaultConfigurationV2() {
  try {
    const userProperties = PropertiesService.getUserProperties();

    const defaultConfig = {
      'ADDOCU_INITIALIZED': 'true',
      'ADDOCU_FIRST_TIME': 'false',
      'ADDOCU_SYNC_GA4': 'true',
      'ADDOCU_SYNC_GTM': 'true',
      'ADDOCU_SYNC_LOOKER': 'true',
      'ADDOCU_LOG_LEVEL': 'INFO',
      'ADDOCU_REQUEST_TIMEOUT': '60',
      'ADDOCU_VERSION': '3.0'
    };

    userProperties.setProperties(defaultConfig);
    logEvent('CONFIG', 'Default configuration v2 set');

  } catch (error) {
    logError('CONFIG', `Error setting default configuration: ${error.message}`);
  }
}
