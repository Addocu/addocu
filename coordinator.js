/**
 * @fileoverview Addocu Main Coordinator v2.0 - Google Workspace Add-on
 * @version 3.0 - Complete Open Source Model
 */

// =================================================================
// ADD-ON BOOTSTRAP AND MENU
// =================================================================

/**
 * Executed when a user installs the Add-on.
 * @param {Object} e - Google Apps Script event object.
 */
function onInstall(e) {
  onOpen(e);

  // Installation log
  logEvent('INSTALL', `Addocu installed for user: ${Session.getActiveUser().getEmail()}`);
  flushLogs();
}

/**
 * Executed when a user opens a spreadsheet with the Add-on.
 * @param {Object} e - Google Apps Script event object.
 */
function onOpen(e) {
  try {
    SpreadsheetApp.getUi()
      .createAddonMenu()
      .addItem('⚙️ Configure Addocu', 'openConfigurationSidebar')
      .addSeparator()
      .addItem('🚀 Audit Complete Stack', 'startCompleteAudit')
      .addSeparator()
      .addItem('📊 Audit GA4', 'syncGA4WithUI')
      .addItem('🏷️ Audit GTM', 'syncGTMWithUI')
      .addItem('📈 Audit Looker Studio', 'syncLookerStudioWithUI')
      .addItem('🔍 Audit Search Console', 'syncSearchConsoleWithUI')
      .addItem('🎥 Audit YouTube', 'syncYouTubeWithUI')
      .addItem('🏪 Audit Google Business Profile', 'syncGBPWithUI')
      .addItem('💰 Audit Google Ads', 'syncGoogleAdsWithUI')
      .addItem('🛍️ Audit Merchant Center', 'syncGMCWithUI')
      .addItem('🗄️ Audit BigQuery', 'syncBigQueryWithUI')
      .addItem('📰 Audit AdSense', 'syncAdSenseWithUI')
      .addItem('📋 Interactive Dashboard', 'openHtmlDashboard')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('🔧 Tools')
        .addItem('🔌 Test Connections', 'diagnoseConnections')
        .addItem('🔒 Test OAuth2', 'testOAuth2')
        .addItem('🔍 Analyze Changes', 'analyzeRecentChangesUI')
        .addItem('🧹 Clean Logs', 'cleanupLogsUI')
        .addItem('📋 Generate Dashboard', 'generateManualDashboard')
      )
      .addSubMenu(SpreadsheetApp.getUi().createMenu('🆘 Troubleshooting')
        .addItem('🔍 Verify Accounts (IMPORTANT)', 'showAccountVerification')
        .addItem('🔄 Reauthorize Permissions', 'forcedPermissionReauthorization')
        .addItem('🔒 Force All Permissions', 'forceAllPermissions')
        .addItem('📋 Simplified Diagnostics', 'showSimplifiedDiagnostics')
      )
      .addToUi();
  } catch (error) {
    // If complete menu fails, try creating a basic one
    try {
      SpreadsheetApp.getUi()
        .createAddonMenu()
        .addItem('🔄 Reauthorize Addocu', 'forcedPermissionReauthorization')
        .addItem('🔍 Diagnostics', 'showCompleteDiagnostics')
        .addToUi();
    } catch (e) {
      // If even this fails, log to console
      console.error('Critical error creating Addocu menu:', e.message);
    }
  }
}

// =================================================================
// USER INTERFACE MANAGEMENT (HTML)
// =================================================================

/**
 * Shows the new configuration sidebar v2.0.
 */
function openConfigurationSidebar() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('configuration')
      .setTitle('Addocu Configuration')
      .setWidth(320); // Optimized width for Google Sheets

    SpreadsheetApp.getUi().showSidebar(html);

    logEvent('CONFIG', 'Configuration sidebar opened');
  } catch (e) {
    logError('CONFIG', `Error opening sidebar: ${e.message}`);
    SpreadsheetApp.getUi().alert(
      'Error',
      `Could not open configuration. Error: ${e.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Opens the interactive HTML dashboard.
 */
function openHtmlDashboard() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('interactive_dashboard')
      .setWidth(1400)
      .setHeight(850);

    SpreadsheetApp.getUi().showModalDialog(html, 'Dashboard - Addocu');

    logEvent('DASHBOARD', 'HTML dashboard opened');
  } catch (e) {
    logError('DASHBOARD', `Error opening dashboard: ${e.message}`);
    SpreadsheetApp.getUi().alert(
      'Error Opening Dashboard',
      `Could not open dashboard. Error: ${e.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Alias for openHtmlDashboard() - called from sidebar.
 */
function openDashboard() {
  return openHtmlDashboard();
}

// =================================================================
// SIDEBAR COMMUNICATION V2.0
// =================================================================

/**
 * Enhanced getUserConfig with robust error handling - used by sidebar.
 * @returns {Object} User configuration with safe fallbacks.
 */
function getUserConfig() {
  // Use enhanced version with better error handling
  return typeof getUserConfigSafe !== 'undefined' ?
    getUserConfigSafe() :
    readUserConfiguration();
}

/**
 * Executed when file-specific permissions are granted to the Add-on.
 * This function is required by the appsscript.json onFileScopeGrantedTrigger.
 * @param {Object} e - Google Apps Script event object.
 */
function onFileScopeGranted(e) {
  try {
    logEvent('PERMISSIONS', `File permissions granted for user: ${Session.getActiveUser().getEmail()}`);

    // Initialize user configuration safely
    initializeUserConfigurationSafe();

    logEvent('PERMISSIONS', 'File permission initialization completed');

  } catch (error) {
    logError('PERMISSIONS', `Error in onFileScopeGranted: ${error.message}`);
    // Don't throw - this should fail silently
  }
}

/**
 * Initializes user configuration safely.
 */
function initializeUserConfigurationSafe() {
  try {
    const userProperties = PropertiesService.getUserProperties();

    // Check if configuration already exists
    const existingConfig = userProperties.getProperty('ADDOCU_INITIALIZED');

    if (!existingConfig) {
      // Default initial configuration
      const defaultConfig = {
        'ADDOCU_INITIALIZED': 'true',
        'ADDOCU_FIRST_TIME': 'true',
        'ADDOCU_SYNC_GA4': 'true',
        'ADDOCU_SYNC_GTM': 'true',
        'ADDOCU_SYNC_LOOKER': 'true',
        'ADDOCU_SYNC_GSC': 'true',
        'ADDOCU_SYNC_YOUTUBE': 'true',
        'ADDOCU_LOG_LEVEL': 'INFO',
        'ADDOCU_REQUEST_TIMEOUT': '60'
      };

      userProperties.setProperties(defaultConfig);
      logEvent('INIT', 'Initial user configuration created');
    }

  } catch (error) {
    logError('INIT', `Error initializing configuration: ${error.message}`);
  }
}

/**
 * Gets user email safely.
 */
function getUserEmailSafe() {
  try {
    return Session.getActiveUser().getEmail() || 'unknown@unknown.com';
  } catch (error) {
    return 'permission-error@unknown.com';
  }
}

/**
 * Reads the complete configuration of the current user (OAuth2 + Looker API Key).
 * @returns {Object} User configuration with Looker API Key, services, etc.
 */
function readUserConfiguration() {
  try {
    const userProperties = PropertiesService.getUserProperties();

    const config = {
      // API Configuration (NOTE: Looker Studio now uses OAuth2, not API Key)
      lookerApiKey: userProperties.getProperty('ADDOCU_LOOKER_API_KEY') || '', // Kept for compatibility
      gtmFilter: userProperties.getProperty('ADDOCU_GTM_FILTER') || '',

      // Advanced Filters
      ga4Properties: userProperties.getProperty('ADDOCU_GA4_PROPERTIES_FILTER') || '',
      gtmWorkspaces: userProperties.getProperty('ADDOCU_GTM_WORKSPACES_FILTER') || '',

      // Service Configuration
      syncFrequency: userProperties.getProperty('ADDOCU_SYNC_FREQUENCY') || 'manual',
      requestTimeout: parseInt(userProperties.getProperty('ADDOCU_REQUEST_TIMEOUT')) || 60,

      // Services Status - All available
      syncLooker: userProperties.getProperty('ADDOCU_SYNC_LOOKER') !== 'false', // Default true
      syncGA4: userProperties.getProperty('ADDOCU_SYNC_GA4') !== 'false', // Default true
      syncGTM: userProperties.getProperty('ADDOCU_SYNC_GTM') !== 'false', // Default true
      syncSearchConsole: userProperties.getProperty('ADDOCU_SYNC_GSC') !== 'false', // Default true
      syncYouTube: userProperties.getProperty('ADDOCU_SYNC_YOUTUBE') !== 'false', // Default true
      syncGBP: userProperties.getProperty('ADDOCU_SYNC_GBP') !== 'false', // Default true
      syncGoogleAds: userProperties.getProperty('ADDOCU_SYNC_ADS') !== 'false', // Default true

      // OAuth2 Information
      oauth2Ready: true, // OAuth2 always available
      userEmail: getUserEmailSafe(),

      // Alert Configuration
      alertEmail: userProperties.getProperty('ADDOCU_ALERT_EMAIL') || '',
      alertErrors: userProperties.getProperty('ADDOCU_ALERT_ERRORS') !== 'false', // Default true
      alertChanges: userProperties.getProperty('ADDOCU_ALERT_CHANGES') === 'true',
      alertSuccess: userProperties.getProperty('ADDOCU_ALERT_SUCCESS') === 'true',
      alertWarnings: userProperties.getProperty('ADDOCU_ALERT_WARNINGS') === 'true',
      weeklySummary: userProperties.getProperty('ADDOCU_WEEKLY_SUMMARY') === 'true',

      // Advanced Configuration
      logLevel: userProperties.getProperty('ADDOCU_LOG_LEVEL') || 'INFO',
      logRetention: parseInt(userProperties.getProperty('ADDOCU_LOG_RETENTION')) || 30,

      // User Status - Open Source
      isFirstTime: userProperties.getProperty('ADDOCU_FIRST_TIME') !== 'false',
      isPro: true // All users have complete access
    };

    return config;

  } catch (e) {
    logError('CONFIG', `Error reading configuration: ${e.message}`);

    // Return default configuration with error indicator
    return {
      oauth2Ready: true,
      userEmail: getUserEmailSafe(),
      permissionsError: true,
      permissionsErrorMessage: e.message,
      isFirstTime: true,
      isPro: true,
      syncGA4: true,
      syncGTM: true,
      syncLooker: true,
      syncSearchConsole: true,
      lookerApiKey: '',
      gtmFilter: '',
      ga4Properties: '',
      gtmWorkspaces: '',
      syncFrequency: 'manual',
      requestTimeout: 60
    };
  }
}

/**
 * Enhanced saveUserConfiguration with better error handling.
 * @param {Object} config - Object with configuration to save.
 * @returns {Object} Operation result.
 */
function saveUserConfiguration(config) {
  // Use enhanced version if available
  if (typeof saveUserConfigurationEnhanced !== 'undefined') {
    return saveUserConfigurationEnhanced(config);
  }

  // Fallback to original implementation
  try {
    const userProperties = PropertiesService.getUserProperties();

    // Map configuration properties
    if (config.lookerApiKey !== undefined) {
      if (config.lookerApiKey.trim()) {
        userProperties.setProperty('ADDOCU_LOOKER_API_KEY', config.lookerApiKey.trim());
      } else {
        userProperties.deleteProperty('ADDOCU_LOOKER_API_KEY');
      }
    }

    if (config.gtmFilter !== undefined) {
      userProperties.setProperty('ADDOCU_GTM_FILTER', config.gtmFilter);
    }

    // Save advanced filters
    if (config.ga4Properties !== undefined) {
      if (config.ga4Properties.trim()) {
        userProperties.setProperty('ADDOCU_GA4_PROPERTIES_FILTER', config.ga4Properties.trim());
      } else {
        userProperties.deleteProperty('ADDOCU_GA4_PROPERTIES_FILTER');
      }
    }

    if (config.gtmWorkspaces !== undefined) {
      if (config.gtmWorkspaces.trim()) {
        userProperties.setProperty('ADDOCU_GTM_WORKSPACES_FILTER', config.gtmWorkspaces.trim());
      } else {
        userProperties.deleteProperty('ADDOCU_GTM_WORKSPACES_FILTER');
      }
    }

    // Mark as not first time (OAuth2 is always ready)
    userProperties.setProperty('ADDOCU_FIRST_TIME', 'false');

    logEvent('CONFIG', `Configuration saved: ${Object.keys(config).join(', ')}`);

    return { success: true };

  } catch (e) {
    logError('CONFIG', `Error saving configuration: ${e.message}`);
    return {
      success: false,
      error: e.message,
      requiresPermissionRecovery: e.message.includes('PERMISSION_DENIED')
    };
  }
}

/**
 * Enhanced connection testing with robust permission handling.
 * @returns {Array} Array with accurate service status.
 */
function testCompleteConnection() {
  try {
    // First test basic permissions using enhanced functions
    const permissionTest = testBasicPermissionsEnhanced();

    if (!permissionTest.success) {
      // If basic permissions fail, return enhanced diagnostic information
      return diagnoseConnectionsEnhanced();
    }

    // If permissions work, use normal diagnostics
    return typeof diagnoseConnectionsComplete !== 'undefined' ?
      diagnoseConnectionsComplete() :
      simplifiedConnectionDiagnostics();

  } catch (error) {
    logError('PROBE_CONNECTION', `Error in enhanced connection testing: ${error.message}`);

    return [
      ['Addocu System', 'Critical Error', 'ERROR', `System error: ${error.message}`],
      ['Solution', 'Reauthorize Permissions', 'ACTION', 'Extensions > Addocu > 🔄 Reauthorize Permissions'],
      ['Alternative', 'Manual Account Check', 'ACTION', 'Manually verify Chrome/Sheets use same account']
    ];
  }
}

/**
 * Enhanced permission recovery with robust error handling.
 * @returns {Object} Accurate recovery result.
 */
function attemptPermissionRecovery() {
  try {
    logEvent('RECOVERY_ENHANCED', 'Starting enhanced permission recovery...');

    // Use enhanced recovery function if available
    if (typeof attemptPermissionRecoveryEnhanced !== 'undefined') {
      return attemptPermissionRecoveryEnhanced();
    }

    // Fallback to basic recovery
    return {
      success: false,
      message: 'Enhanced recovery functions not available',
      requiresReauth: true
    };

  } catch (error) {
    logError('RECOVERY_ENHANCED', `Error in enhanced permission recovery: ${error.message}`);

    return {
      success: false,
      message: `Error: ${error.message}`,
      requiresReauth: true,
      recommendation: 'Try reauthorization first: Extensions > Addocu > 🔄 Reauthorize Permissions. If problems persist, manually verify account consistency.'
    };
  }
}

/**
 * Tests basic required permissions.
 * @returns {Object} Test results.
 */
function testBasicPermissions() {
  const results = {
    success: true,
    permissions: {},
    errors: []
  };

  // Test 1: UserProperties
  try {
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty('ADDOCU_PERMISSION_TEST', Date.now().toString());
    const testValue = userProps.getProperty('ADDOCU_PERMISSION_TEST');
    results.permissions.userProperties = !!testValue;
  } catch (error) {
    results.permissions.userProperties = false;
    results.errors.push(`UserProperties: ${error.message}`);
    results.success = false;
  }

  // Test 2: Spreadsheet
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    results.permissions.spreadsheet = !!ss;
  } catch (error) {
    results.permissions.spreadsheet = false;
    results.errors.push(`Spreadsheet: ${error.message}`);
    results.success = false;
  }

  // Test 3: OAuth Token
  try {
    const token = ScriptApp.getOAuthToken();
    results.permissions.oauth = !!token;
  } catch (error) {
    results.permissions.oauth = false;
    results.errors.push(`OAuth: ${error.message}`);
    results.success = false;
  }

  return results;
}

/**
 * Executes an audit with advanced filters.
 * @param {Object} auditConfig - Audit configuration with services and filters.
 * @returns {Object} Audit result.
 */
function executeAuditWithFilters(auditConfig) {
  const startTime = Date.now();
  logEvent('AUDIT_FILTERED', `Starting filtered audit: ${JSON.stringify(auditConfig)}`);

  try {
    const services = auditConfig.services || [];
    const filters = auditConfig.filters || {};
    const results = {};
    let totalRecords = 0;
    let sheetsCreated = 0;

    // Save filters to user configuration
    if (filters.ga4Properties || filters.gtmWorkspaces) {
      const userProperties = PropertiesService.getUserProperties();
      if (filters.ga4Properties && filters.ga4Properties.length > 0) {
        userProperties.setProperty('ADDOCU_GA4_PROPERTIES_FILTER', filters.ga4Properties.join(','));
      }
      if (filters.gtmWorkspaces && filters.gtmWorkspaces.length > 0) {
        userProperties.setProperty('ADDOCU_GTM_WORKSPACES_FILTER', filters.gtmWorkspaces.join(','));
      }
      logEvent('AUDIT_FILTERED', `Filters saved: GA4=${filters.ga4Properties?.length || 0}, GTM=${filters.gtmWorkspaces?.length || 0}`);
    }

    // Audit GA4 with filters
    if (services.includes('ga4')) {
      logEvent('AUDIT_FILTERED', 'Starting GA4 audit with property filters');
      const ga4Result = syncGA4Core();
      results.ga4 = ga4Result;
      if (ga4Result.status === 'SUCCESS') {
        totalRecords += ga4Result.records || 0;
        sheetsCreated += ga4Result.details ? Object.keys(ga4Result.details).length : 4; // GA4 creates ~4 sheets
      }
    }

    // Audit GTM with filters
    if (services.includes('gtm')) {
      logEvent('AUDIT_FILTERED', 'Starting GTM audit with workspace filters');
      const gtmResult = syncGTMCore();
      results.gtm = gtmResult;
      if (gtmResult.status === 'SUCCESS') {
        totalRecords += gtmResult.records || 0;
        sheetsCreated += 3; // GTM creates 3 sheets (tags, triggers, variables)
      }
    }

    // Audit Looker Studio
    if (services.includes('looker')) {
      logEvent('AUDIT_FILTERED', 'Starting Looker Studio audit');
      const lookerResult = syncLookerStudioCore();
      results.looker = lookerResult;
      if (lookerResult.status === 'SUCCESS') {
        totalRecords += lookerResult.records || 0;
        sheetsCreated += 1; // Looker creates 1 sheet
      }
    }

    // Audit Search Console
    if (services.includes('gsc') || services.includes('searchConsole')) {
      logEvent('AUDIT_FILTERED', 'Starting Search Console audit');
      try {
        const gscResult = syncSearchConsoleCore();
        results.searchConsole = gscResult;
        if (gscResult.status === 'SUCCESS') {
          totalRecords += gscResult.records || 0;
          sheetsCreated += 3; // GSC creates 3 sheets (sites, sitemaps, search appearance)
        }
      } catch (e) {
        logError('AUDIT_FILTERED', `Error in Search Console audit: ${e.message}`);
        results.searchConsole = { success: false, error: e.message };
      }
    }

    // Audit YouTube
    if (services.includes('youtube')) {
      logEvent('AUDIT_FILTERED', 'Starting YouTube audit');
      try {
        const youtubeResult = syncYouTubeCore();
        results.youtube = youtubeResult;
        if (youtubeResult.status === 'SUCCESS') {
          totalRecords += youtubeResult.records || 0;
          sheetsCreated += 3; // YouTube creates 3 sheets (channels, playlists, videos)
        }
      } catch (e) {
        logError('AUDIT_FILTERED', `Error in YouTube audit: ${e.message}`);
        results.youtube = { success: false, error: e.message };
      }
    }

    // Audit GBP
    if (services.includes('googleBusinessProfile') || services.includes('gbp')) {
      logEvent('AUDIT_FILTERED', 'Starting GBP audit');
      try {
        const gbpResult = syncGBPCore();
        results.googleBusinessProfile = gbpResult;
        if (gbpResult.status === 'SUCCESS' || gbpResult.success) {
          totalRecords += gbpResult.records || 0;
          sheetsCreated += 2; // GBP creates 2 sheets (accounts, locations)
        }
      } catch (e) {
        logError('AUDIT_FILTERED', `Error in GBP audit: ${e.message}`);
        results.googleBusinessProfile = { success: false, error: e.message };
      }
    }

    // Audit Merchant Center
    if (services.includes('googleMerchantCenter') || services.includes('gmc')) {
      logEvent('AUDIT_FILTERED', 'Starting Merchant Center audit');
      try {
        const gmcResult = syncGMCCore();
        results.googleMerchantCenter = gmcResult;
        if (gmcResult.status === 'SUCCESS' || gmcResult.success) {
          totalRecords += gmcResult.records || 0;
          sheetsCreated += 3; // GMC creates 3 sheets (accounts, data sources, products)
        }
      } catch (e) {
        logError('AUDIT_FILTERED', `Error in Merchant Center audit: ${e.message}`);
        results.googleMerchantCenter = { success: false, error: e.message };
      }
    }

    // Audit Google Ads
    if (services.includes('googleAds') || services.includes('ads')) {
      logEvent('AUDIT_FILTERED', 'Starting Google Ads audit');
      try {
        const adsResult = syncGoogleAdsCore();
        results.googleAds = adsResult;
        if (adsResult.status === 'SUCCESS' || adsResult.success) {
          totalRecords += adsResult.records || 0;
          sheetsCreated += 3; // Ads creates 3 sheets (campaigns, conversions, audiences)
        }
      } catch (e) {
        logError('AUDIT_FILTERED', `Error in Google Ads audit: ${e.message}`);
        results.googleAds = { success: false, error: e.message };
      }
    }

    // Audit BigQuery
    if (services.includes('bigquery')) {
      logEvent('AUDIT_FILTERED', 'Starting BigQuery audit');
      try {
        const bqResult = syncBigQueryCore();
        results.bigquery = bqResult;
        if (bqResult.status === 'SUCCESS' || bqResult.success) {
          totalRecords += bqResult.records || 0;
          sheetsCreated += 3; // BQ creates 3 sheets
        }
      } catch (e) {
        logError('AUDIT_FILTERED', `Error in BigQuery audit: ${e.message}`);
        results.bigquery = { success: false, error: e.message };
      }
    }

    // Audit AdSense
    if (services.includes('adsense')) {
      logEvent('AUDIT_FILTERED', 'Starting AdSense audit');
      try {
        const adsenseResult = syncAdSenseCore();
        results.adsense = adsenseResult;
        if (adsenseResult.status === 'SUCCESS' || adsenseResult.success) {
          totalRecords += adsenseResult.records || 0;
          sheetsCreated += 4; // AdSense creates 4 sheets
        }
      } catch (e) {
        logError('AUDIT_FILTERED', `Error in AdSense audit: ${e.message}`);
        results.adsense = { success: false, error: e.message };
      }
    }

    // Generate executive dashboard
    generateExecutiveDashboard(results);
    sheetsCreated += 1; // Dashboard sheet

    const duration = Date.now() - startTime;
    logEvent('AUDIT_FILTERED', `Filtered audit completed in ${Math.round(duration / 1000)}s. Total: ${totalRecords} records, ${sheetsCreated} sheets`);

    flushLogs();

    return {
      success: true,
      services: services,
      filters: filters,
      results: results,
      totalAssets: totalRecords,
      sheetsCreated: sheetsCreated,
      duration: duration
    };

  } catch (e) {
    const duration = Date.now() - startTime;
    logError('AUDIT_FILTERED', `Error in filtered audit: ${e.message}`);
    flushLogs();

    return {
      success: false,
      error: e.message,
      duration: duration
    };
  }
}

/**
 * Executes a complete audit of specified services.
 * @param {Array} services - Array with services to audit ['ga4', 'gtm', 'looker'].
 * @returns {Object} Audit result.
 */
function executeCompleteAudit(services) {
  const startTime = Date.now();
  logEvent('AUDIT', `Starting complete audit: ${services.join(', ')}`);

  try {
    const results = {};
    let totalRecords = 0;

    // Audit GA4 (Free)
    if (services.includes('ga4')) {
      try {
        logEvent('AUDIT', 'Starting GA4 audit');
        const ga4Result = syncGA4Core();
        results.ga4 = ga4Result;
        totalRecords += ga4Result.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in GA4 audit: ${e.message}`);
        results.ga4 = { success: false, error: e.message };
      }
    }

    // Audit GTM
    if (services.includes('gtm')) {
      try {
        logEvent('AUDIT', 'Starting GTM audit');
        const gtmResult = syncGTMCore();
        results.gtm = gtmResult;
        totalRecords += gtmResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in GTM audit: ${e.message}`);
        results.gtm = { success: false, error: e.message };
      }
    }

    // Audit Looker Studio
    if (services.includes('looker')) {
      try {
        logEvent('AUDIT', 'Starting Looker Studio audit');
        const lookerResult = syncLookerStudioCore();
        results.looker = lookerResult;
        totalRecords += lookerResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in Looker Studio audit: ${e.message}`);
        results.looker = { success: false, error: e.message };
      }
    }

    // Audit Search Console
    if (services.includes('searchConsole')) {
      try {
        logEvent('AUDIT', 'Starting Search Console audit');
        const gscResult = syncSearchConsoleCore();
        results.searchConsole = gscResult;
        totalRecords += gscResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in Search Console audit: ${e.message}`);
        results.searchConsole = { success: false, error: e.message };
      }
    }

    // Audit YouTube
    if (services.includes('youtube')) {
      try {
        logEvent('AUDIT', 'Starting YouTube audit');
        const youtubeResult = syncYouTubeCore();
        results.youtube = youtubeResult;
        totalRecords += youtubeResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in YouTube audit: ${e.message}`);
        results.youtube = { success: false, error: e.message };
      }
    }

    // Audit GBP
    if (services.includes('googleBusinessProfile')) {
      try {
        logEvent('AUDIT', 'Starting GBP audit');
        const gbpResult = syncGBPCore();
        results.googleBusinessProfile = gbpResult;
        totalRecords += gbpResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in GBP audit: ${e.message}`);
        results.googleBusinessProfile = { success: false, error: e.message };
      }
    }

    // Audit Google Ads
    if (services.includes('googleAds')) {
      try {
        logEvent('AUDIT', 'Starting Google Ads audit');
        const adsResult = syncGoogleAdsCore();
        results.googleAds = adsResult;
        totalRecords += adsResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in Google Ads audit: ${e.message}`);
        results.googleAds = { success: false, error: e.message };
      }
    }

    // Audit Merchant Center
    if (services.includes('googleMerchantCenter')) {
      try {
        logEvent('AUDIT', 'Starting Merchant Center audit');
        const gmcResult = syncGMCCore();
        results.googleMerchantCenter = gmcResult;
        totalRecords += gmcResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in Merchant Center audit: ${e.message}`);
        results.googleMerchantCenter = { success: false, error: e.message };
      }
    }

    // Audit BigQuery
    if (services.includes('bigquery')) {
      try {
        logEvent('AUDIT', 'Starting BigQuery audit');
        const bqResult = syncBigQueryCore();
        results.bigquery = bqResult;
        totalRecords += bqResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in BigQuery audit: ${e.message}`);
        results.bigquery = { success: false, error: e.message };
      }
    }

    // Audit AdSense
    if (services.includes('adsense')) {
      try {
        logEvent('AUDIT', 'Starting AdSense audit');
        const adSenseResult = syncAdSenseCore();
        results.adsense = adSenseResult;
        totalRecords += adSenseResult.records || 0;
      } catch (e) {
        logError('AUDIT', `Error in AdSense audit: ${e.message}`);
        results.adsense = { success: false, error: e.message };
      }
    }

    // Generate executive dashboard
    generateExecutiveDashboard(results);

    const duration = Date.now() - startTime;
    logEvent('AUDIT', `Audit completed in ${Math.round(duration / 1000)}s. Total: ${totalRecords} records`);

    flushLogs();

    return {
      success: true,
      services: services,
      results: results,
      totalRecords: totalRecords,
      duration: duration
    };

  } catch (e) {
    const duration = Date.now() - startTime;
    logError('AUDIT', `Error in audit: ${e.message}`);
    flushLogs();

    return {
      success: false,
      error: e.message,
      duration: duration
    };
  }
}

// =================================================================
// SYNCHRONIZATION ORCHESTRATION WITH UI
// =================================================================

/**
 * Function to start complete audit from menu.
 */
function startCompleteAudit() {
  const config = readUserConfiguration();

  // ALL services enabled by default in Open Source
  const services = ['ga4', 'gtm']; // GA4 and GTM always included

  // Looker Studio only if enabled (requires OAuth2)
  if (config.syncLooker) {
    services.push('looker');
  }

  // Search Console only if enabled
  if (config.syncSearchConsole) {
    services.push('searchConsole');
  }

  // YouTube only if enabled
  if (config.syncYouTube) {
    services.push('youtube');
  }

  // Google Business Profile only if enabled
  if (config.syncGBP) {
    services.push('googleBusinessProfile');
  }

  // Google Ads only if enabled
  if (config.syncGoogleAds) {
    services.push('googleAds');
  }

  // Merchant Center only if enabled
  if (config.syncGMC || config.syncMerchantCenter) {
    services.push('googleMerchantCenter');
  }

  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '🚀 Marketing Stack Audit (Open Source)',
    `Starting audit of: ${services.map(s => s.toUpperCase()).join(', ')}\n\n` +
    'This process may take several minutes depending on your setup size.\n\n' +
    'All features available for free!',
    ui.ButtonSet.OK
  );

  const result = executeCompleteAudit(services);

  if (result.success) {
    const message = `✅ Audit completed in ${Math.round(result.duration / 1000)} seconds\n\n` +
      `Total audited elements: ${result.totalRecords}\n\n` +
      'Check the generated sheets for complete details.';

    ui.alert('🎉 Audit Finished', message, ui.ButtonSet.OK);
  } else {
    ui.alert(
      '❌ Audit Error',
      `An error occurred: ${result.error}\n\nCheck the "LOGS" sheet for more details.`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Synchronize only GA4 (free function with OAuth2).
 */
function syncGA4WithUI() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '📊 GA4 Audit',
    'Starting complete Google Analytics 4 audit with OAuth2...',
    ui.ButtonSet.OK
  );

  try {
    const result = syncGA4Core();

    if (result.status === 'SUCCESS') {
      ui.alert(
        '✅ GA4 Synchronized',
        `Audit completed: ${result.records} elements processed\n\n` +
        'Check the GA4_* sheets for details.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '❌ GA4 Error',
        `Error: ${result.error}\n\nCheck the LOGS sheet for more information.`,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    logError('GA4_UI', `Error in GA4 synchronization: ${e.message}`);
    ui.alert('Error', `Could not synchronize GA4: ${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Synchronize GTM (function with OAuth2).
 */
function syncGTMWithUI() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '🏷️ GTM Audit',
    'Starting complete Google Tag Manager audit...',
    ui.ButtonSet.OK
  );

  try {
    const result = syncGTMCore();

    if (result.status === 'SUCCESS') {
      ui.alert(
        '✅ GTM Synchronized',
        `Audit completed: ${result.records} elements processed\n\n` +
        'Check the GTM_* sheets for details.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '❌ GTM Error',
        `Error: ${result.error}\n\nCheck the LOGS sheet for more information.`,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    logError('GTM_UI', `Error in GTM synchronization: ${e.message}`);
    ui.alert('Error', `Could not synchronize GTM: ${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Synchronize Looker Studio (function with OAuth2).
 */
function syncLookerStudioWithUI() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '📈 Looker Studio Audit',
    'Starting complete Looker Studio audit with OAuth2...\n\nNOTE: Looker Studio now requires OAuth2 (API Keys are no longer supported by Google).',
    ui.ButtonSet.OK
  );

  try {
    const result = syncLookerStudioCore();

    if (result.status === 'SUCCESS') {
      ui.alert(
        '✅ Looker Studio Synchronized',
        `Audit completed: ${result.records} elements processed\n\n` +
        'Check the LOOKER_STUDIO sheet for details.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '❌ Looker Studio Error',
        `Error: ${result.error}\n\nCheck the LOGS sheet for more information.`,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    logError('LOOKER_UI', `Error in Looker Studio synchronization: ${e.message}`);
    ui.alert('Error', `Could not synchronize Looker Studio: ${e.message}`, ui.ButtonSet.OK);
  }
}

// =================================================================
// DASHBOARD AND ANALYSIS
// =================================================================

/**
 * Generates manual executive dashboard.
 */
function generateManualDashboard() {
  try {
    logEvent('DASHBOARD', 'Generating manual executive dashboard');

    // Generate dashboard with current data
    generateExecutiveDashboard({});

    SpreadsheetApp.getUi().alert(
      '📊 Dashboard Generated',
      'The executive dashboard has been updated in the DASHBOARD sheet.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (e) {
    logError('DASHBOARD', `Error generating dashboard: ${e.message}`);
    SpreadsheetApp.getUi().alert(
      'Error',
      `Could not generate dashboard: ${e.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Generates and updates the DASHBOARD sheet with an executive summary.
 */
function generateExecutiveDashboard(results) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dashboardSheet = ss.getSheetByName('DASHBOARD');

    if (!dashboardSheet) {
      dashboardSheet = ss.insertSheet('DASHBOARD', 0);
    }

    dashboardSheet.clear();

    // Dashboard header - Write row by row to avoid dimension errors
    dashboardSheet.getRange(1, 1).setValue('🚀 ADDOCU - EXECUTIVE DASHBOARD (OPEN SOURCE)');
    dashboardSheet.getRange(2, 1).setValue(`Generated: ${new Date().toLocaleString('en-US')}`);
    dashboardSheet.getRange(3, 1).setValue('');
    dashboardSheet.getRange(4, 1).setValue('📊 AUDIT SUMMARY');

    // Service table headers
    const tableHeaders = ['Service', 'Status', 'Elements', 'Last Update'];
    dashboardSheet.getRange(5, 1, 1, 4).setValues([tableHeaders]);

    // Service data
    const servicesData = [
      ['Google Analytics 4', getServiceStatus('GA4'), countGA4Elements(), getLastUpdate('GA4')],
      ['Google Tag Manager', getServiceStatus('GTM'), countGTMElements(), getLastUpdate('GTM')],
      ['Looker Studio', getServiceStatus('LOOKER'), countLookerElements(), getLastUpdate('LOOKER')],
      ['Search Console', getServiceStatus('GSC'), countGSCElements(), getLastUpdate('GSC')]
    ];

    dashboardSheet.getRange(6, 1, servicesData.length, 4).setValues(servicesData);

    // Formatting
    dashboardSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    dashboardSheet.getRange(4, 1).setFontSize(14).setFontWeight('bold');
    dashboardSheet.getRange(5, 1, 1, 4).setFontWeight('bold').setBackground('#E8F0FE');

    // Auto-resize columns
    dashboardSheet.autoResizeColumns(1, 4);

    logEvent('DASHBOARD', 'Executive dashboard updated');

  } catch (e) {
    logError('DASHBOARD', `Error generating executive dashboard: ${e.message}`);
  }
}

// =================================================================
// DASHBOARD UTILITIES
// =================================================================

function getServiceStatus(service) {
  const config = readUserConfiguration();

  switch (service) {
    case 'GA4':
      return '✅ Available (OAuth2)';
    case 'GTM':
      return '✅ Available (OAuth2)';
    case 'LOOKER':
      return '✅ Available (OAuth2) - API Keys deprecated';
    case 'GSC':
      return '✅ Available (OAuth2)';
    default:
      return '❓ Unknown';
  }
}

function countGA4Elements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['GA4_PROPERTIES', 'GA4_CUSTOM_DIMENSIONS', 'GA4_CUSTOM_METRICS', 'GA4_DATA_STREAMS'];

    let total = 0;
    sheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        total += Math.max(0, sheet.getLastRow() - 1); // -1 to exclude header
      }
    });

    return total;
  } catch (e) {
    return 0;
  }
}

function countGTMElements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['GTM_TAGS', 'GTM_TRIGGERS', 'GTM_VARIABLES'];

    let total = 0;
    sheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        total += Math.max(0, sheet.getLastRow() - 1);
      }
    });

    return total;
  } catch (e) {
    return 0;
  }
}

function countLookerElements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('LOOKER_STUDIO');

    return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
  } catch (e) {
    return 0;
  }
}

function countGSCElements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['GSC_SITES', 'GSC_SITEMAPS'];

    let total = 0;
    sheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        total += Math.max(0, sheet.getLastRow() - 1);
      }
    });

    return total;
  } catch (e) {
    return 0;
  }
}

/**
 * Counts the number of YouTube elements inventoried.
 * @returns {number} Total number of YouTube elements.
 */
function countYouTubeElements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['YOUTUBE_CHANNELS', 'YOUTUBE_PLAYLISTS'];

    let total = 0;
    sheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        total += Math.max(0, sheet.getLastRow() - 1);
      }
    });

    return total;
  } catch (e) {
    return 0;
  }
}

/**
 * Counts the number of Google Business Profile elements inventoried.
 * @returns {number} Total number of GBP elements.
 */
function countGBPElements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['GBP_ACCOUNTS', 'GBP_LOCATIONS'];

    let total = 0;
    sheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        total += Math.max(0, sheet.getLastRow() - 1);
      }
    });

    return total;
  } catch (e) {
    return 0;
  }
}

function getLastUpdate(service) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const timestamp = userProperties.getProperty(`ADDOCU_LAST_SYNC_${service}`);

    if (timestamp) {
      return new Date(parseInt(timestamp)).toLocaleString('en-US');
    }

    return 'Never';
  } catch (e) {
    return 'Error';
  }
}

// =================================================================
// TOOLS AND DIAGNOSTICS
// =================================================================

/**
 * Simplified diagnostics focused on the main problem: different accounts.
 */
function diagnoseConnections() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Show initial message about the most common problem
    const initialResponse = ui.alert(
      '🔍 Connectivity Diagnostics',
      '💡 BEFORE CONTINUING:\n\n' +
      '95% of Addocu problems are due to using different accounts in Chrome and Google Sheets.\n\n' +
      'Have you verified that both use the SAME Google account?',
      ui.ButtonSet.YES_NO
    );

    if (initialResponse === ui.Button.NO) {
      // User admits they haven't verified - show instructions
      showAccountVerification();
      return;
    }

    // User says they have verified - run diagnostics
    const results = simplifiedConnectionDiagnostics();

    let message = '🔍 SIMPLIFIED DIAGNOSTICS\n\n';
    results.forEach(result => {
      const status = result[2] === 'OK' ? '✅' :
        result[2] === 'PENDING' ? '⏳' : '❌';
      message += `${status} ${result[0]}: ${result[2]}\n`;
      if (result[3]) {
        message += `   ${result[3]}\n`;
      }
    });

    // Add recommendation based on results
    const hasErrors = results.some(r => r[2] === 'ERROR');
    const hasPending = results.some(r => r[2] === 'PENDING');

    if (hasErrors) {
      message += '\n🚨 PROBLEM DETECTED:\n';
      message += 'There are errors suggesting different accounts problem.\n';
      message += 'SOLUTION: Verify accounts again.\n';
    } else if (hasPending) {
      message += '\n🔄 ACTION REQUIRED:\n';
      message += 'Execute "Audit GA4" to complete authorization.';
    } else {
      message += '\n✅ EVERYTHING LOOKS GOOD:\n';
      message += 'Basic permissions work correctly.';
    }

    ui.alert('Connectivity Diagnostics', message, ui.ButtonSet.OK);

  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Diagnostics Error',
      `Could not complete diagnostics: ${e.message}\n\n` +
      'This suggests serious permission problems.\n\n' +
      'MAIN SOLUTION: Verify that Chrome and Google Sheets\n' +
      'use the same Google account.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Tests OAuth2 specifically for GA4 and GTM.
 */
function testOAuth2() {
  try {
    const token = ScriptApp.getOAuthToken();

    if (!token) {
      SpreadsheetApp.getUi().alert(
        '⚠️ OAuth2 Not Authorized',
        'The script does not have OAuth2 permissions. Execute "Audit GA4" to authorize automatically.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    // Test GA4
    const ga4Result = validateService('ga4');

    // Test GTM
    const gtmResult = validateService('gtm');

    const message = `🔒 OAUTH2 TEST\n\n` +
      `✅ OAuth2 Token: Available\n` +
      `📈 GA4: ${ga4Result.status} - ${ga4Result.message}\n` +
      `🏷️ GTM: ${gtmResult.status} - ${gtmResult.message}\n\n` +
      `User: ${Session.getActiveUser().getEmail()}`;

    SpreadsheetApp.getUi().alert('OAuth2 Test', message, SpreadsheetApp.getUi().ButtonSet.OK);

  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'OAuth2 Error',
      `Error testing OAuth2: ${e.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * UI function to start recent changes analysis.
 */
function analyzeRecentChangesUI() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Analyze Recent Changes',
    'Enter the number of days back you want to analyze (e.g. 7).',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const days = parseInt(response.getResponseText());
  if (isNaN(days) || days <= 0) {
    ui.alert('Error', 'Please enter a valid positive number.', ui.ButtonSet.OK);
    return;
  }

  // TODO: Implement recent changes analysis
  ui.alert(
    'Feature in Development',
    `Recent changes analysis for the last ${days} days will be available soon.`,
    ui.ButtonSet.OK
  );
}

/**
 * Cleans old logs.
 */
function cleanupLogsUI() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'Clean Logs',
    'Are you sure you want to clean all old logs?',
    ui.ButtonSet.YES_NO
  );

  if (result === ui.Button.YES) {
    try {
      // TODO: Implement log cleanup based on retention configuration
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logsSheet = ss.getSheetByName('LOGS');

      if (logsSheet) {
        logsSheet.clear();
        // Recreate header
        logsSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Level', 'Module', 'Message']]);
        logsSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#E8F0FE');
      }

      ui.alert('✅ Logs Cleaned', 'Logs have been cleaned successfully.', ui.ButtonSet.OK);

      logEvent('MAINTENANCE', 'Logs cleaned manually');

    } catch (e) {
      ui.alert('Error', `Could not clean logs: ${e.message}`, ui.ButtonSet.OK);
    }
  }
}

// =================================================================
// CORE SYNCHRONIZATION FUNCTIONS (for sidebar)
// =================================================================

/**
 * GA4 synchronization function for sidebar.
 * @returns {Object} Synchronization result.
 */
function syncGA4() {
  try {
    logEvent('GA4_SYNC', 'Starting GA4 synchronization from sidebar');

    const result = syncGA4Core();

    return {
      success: result.status === 'SUCCESS',
      error: result.error || null,
      records: result.records || 0
    };

  } catch (e) {
    logError('GA4_SYNC', `Error in GA4 synchronization: ${e.message}`);
    return {
      success: false,
      error: e.message,
      records: 0
    };
  }
}

/**
 * GTM synchronization function for sidebar.
 * @returns {Object} Synchronization result.
 */
function syncGTM() {
  try {
    logEvent('GTM_SYNC', 'Starting GTM synchronization from sidebar');

    const result = syncGTMCore();

    return {
      success: result.status === 'SUCCESS',
      error: result.error || null,
      records: result.records || 0
    };

  } catch (e) {
    logError('GTM_SYNC', `Error in GTM synchronization: ${e.message}`);
    return {
      success: false,
      error: e.message,
      records: 0
    };
  }
}

/**
 * Core GA4 synchronization function with OAuth2.
 * @returns {Object} Detailed synchronization result.
 */
function syncGA4Core() {
  const startTime = Date.now();
  logEvent('GA4_CORE', 'Starting GA4 core synchronization with OAuth2');

  try {
    // Verify OAuth2 authentication
    const oauthToken = ScriptApp.getOAuthToken();
    if (!oauthToken) {
      throw new Error('Could not get OAuth2 token. Authorize the script first.');
    }

    let totalRecords = 0;

    // 1. Synchronize GA4 accounts
    const accounts = syncGA4Accounts();
    totalRecords += accounts.length;

    // 2. Synchronize GA4 properties
    const properties = syncGA4Properties(accounts);
    totalRecords += properties.length;

    // 3. Synchronize custom dimensions
    const dimensions = syncGA4Dimensions(properties);
    totalRecords += dimensions.length;

    // 4. Synchronize custom metrics
    const metrics = syncGA4Metrics(properties);
    totalRecords += metrics.length;

    // 5. Synchronize data streams
    const streams = syncGA4DataStreams(properties);
    totalRecords += streams.length;

    const duration = Date.now() - startTime;

    // Update last synchronization timestamp
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('ADDOCU_LAST_SYNC_GA4', Date.now().toString());

    logEvent('GA4_CORE', `GA4 synchronization completed in ${Math.round(duration / 1000)}s. Total: ${totalRecords} records`);

    flushLogs();

    return {
      status: 'SUCCESS',
      records: totalRecords,
      duration: duration,
      details: {
        accounts: accounts.length,
        properties: properties.length,
        dimensions: dimensions.length,
        metrics: metrics.length,
        streams: streams.length
      }
    };

  } catch (e) {
    const duration = Date.now() - startTime;
    logError('GA4_CORE', `Error in GA4 synchronization: ${e.message}`);
    flushLogs();

    return {
      status: 'ERROR',
      error: e.message,
      records: 0,
      duration: duration
    };
  }
}

// =================================================================
// RECOVERY AND REAUTHORIZATION FUNCTIONS
// =================================================================

/**
 * Forces complete authorization of all required permissions.
 * @returns {Object} Authorization result.
 */
function forceCompleteAuthorization() {
  try {
    logEvent('FULL_AUTH', 'Starting complete authorization of all permissions...');

    // 1. Verify OAuth2 token
    const token = ScriptApp.getOAuthToken();
    if (!token) {
      throw new Error('Could not get OAuth2 token');
    }

    // 2. Force Spreadsheet access
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('Cannot access current spreadsheet');
    }

    // 3. Test UrlFetchApp (external_request permissions)
    const testUrl = 'https://www.google.com';
    UrlFetchApp.fetch(testUrl, {
      method: 'HEAD',
      muteHttpExceptions: true
    });

    // 4. Verify UserProperties
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty('ADDOCU_AUTH_TEST', Date.now().toString());

    // 5. Verify UI access
    const ui = SpreadsheetApp.getUi();

    logEvent('FULL_AUTH', 'All permissions verified successfully');

    return {
      success: true,
      permissions: {
        oauth2: true,
        spreadsheet: true,
        urlFetch: true,
        userProperties: true,
        ui: true
      }
    };

  } catch (error) {
    logError('FULL_AUTH', `Error in complete authorization: ${error.message}`);

    return {
      success: false,
      error: error.message,
      solution: 'Manually execute a function that requires all permissions'
    };
  }
}

/**
 * Shows corrected complete diagnostic (no false account assumptions).
 * Accessible from the recovery menu.
 */
function showCompleteDiagnostics() {
  try {
    logEvent('DIAGNOSTIC_UI_CORRECTED', 'Starting corrected complete diagnostic from menu...');

    // Use corrected diagnostic function
    showCorrectedSimplifiedDiagnostics();

  } catch (error) {
    logError('DIAGNOSTIC_UI_CORRECTED', `Error in corrected diagnostic UI: ${error.message}`);

    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        'Diagnostic Error',
        `Could not complete diagnostic: ${error.message}`,
        ui.ButtonSet.OK
      );
    } catch (e) {
      console.error('Critical error in diagnostic:', error.message);
    }
  }
}

/**
 * Executes a detailed system status diagnostic.
 * @returns {Object} Diagnostic result.
 */
function executeDetailedDiagnostic() {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    user: 'Unknown',
    permissions: {},
    apis: {},
    configuration: {},
    recommendations: []
  };

  try {
    // 1. Current user
    try {
      diagnostic.user = Session.getActiveUser().getEmail();
    } catch (e) {
      diagnostic.permissions.userAccess = false;
    }

    // 2. UI permissions
    try {
      const ui = SpreadsheetApp.getUi();
      diagnostic.permissions.ui = true;
    } catch (e) {
      diagnostic.permissions.ui = false;
      diagnostic.permissions.uiError = e.message;
      diagnostic.recommendations.push('Execute manual reauthorization');
    }

    // 3. OAuth2 Token
    try {
      const token = ScriptApp.getOAuthToken();
      diagnostic.permissions.oauth2 = !!token;
    } catch (e) {
      diagnostic.permissions.oauth2 = false;
      diagnostic.permissions.oauth2Error = e.message;
      diagnostic.recommendations.push('Authorize script for OAuth2');
    }

    // 4. UserProperties
    try {
      const userProps = PropertiesService.getUserProperties();
      userProps.getProperty('test'); // Test access
      diagnostic.permissions.userProperties = true;
    } catch (e) {
      diagnostic.permissions.userProperties = false;
      diagnostic.permissions.userPropertiesError = e.message;
    }

    // 5. Spreadsheet Access
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      diagnostic.permissions.spreadsheet = !!ss;
    } catch (e) {
      diagnostic.permissions.spreadsheet = false;
      diagnostic.permissions.spreadsheetError = e.message;
    }

    // 6. Test APIs (only if we have OAuth2)
    if (diagnostic.permissions.oauth2) {
      ['ga4', 'gtm'].forEach(service => {
        try {
          const result = validateService(service);
          diagnostic.apis[service] = {
            status: result.status,
            message: result.message
          };
        } catch (e) {
          diagnostic.apis[service] = {
            status: 'ERROR',
            message: e.message
          };
        }
      });
    }

    // 7. Final recommendations
    if (!diagnostic.permissions.ui) {
      diagnostic.recommendations.push('CRITICAL: Execute reauthorization function');
    }

    if (!diagnostic.permissions.oauth2) {
      diagnostic.recommendations.push('Authorize access to Google APIs');
    }

    if (!diagnostic.permissions.spreadsheet) {
      diagnostic.recommendations.push('CRITICAL: No spreadsheet access - reauthorize complete permissions');
    }

    // Check API errors
    const apiErrors = Object.values(diagnostic.apis).filter(api => api.status !== 'OK');
    if (apiErrors.length > 0) {
      diagnostic.recommendations.push('CRITICAL: Missing API permissions - execute complete reauthorization');
      diagnostic.recommendations.push('Solution: Extensions > Addocu > 🔄 Reauthorize Permissions');
    }

    // Only say everything is fine if there really are no problems
    const hasProblems = !diagnostic.permissions.ui ||
      !diagnostic.permissions.oauth2 ||
      !diagnostic.permissions.spreadsheet ||
      apiErrors.length > 0;

    if (!hasProblems && diagnostic.recommendations.length === 0) {
      diagnostic.recommendations.push('Everything appears to be working correctly');
    }

  } catch (error) {
    diagnostic.error = error.message;
  }

  return diagnostic;
}

/**
 * Synchronizes GA4 accounts using OAuth2.
 * @returns {Array} Array of accounts.
 */
function syncGA4Accounts() {
  try {
    const auth = getAuthConfig('ga4');
    const url = 'https://analyticsadmin.googleapis.com/v1beta/accounts';

    const response = fetchWithOAuth2(url);
    const accounts = response.accounts || [];

    // Write to sheet
    const headers = ['Account Name', 'Account ID', 'Display Name', 'Region Code', 'Create Time', 'Update Time'];
    const data = accounts.map(account => [
      account.name || '',
      account.name ? account.name.split('/')[1] : '',
      account.displayName || '',
      account.regionCode || '',
      formatDate(account.createTime),
      formatDate(account.updateTime)
    ]);

    writeToSheet('GA4_ACCOUNTS', headers, data, true);

    logEvent('GA4_ACCOUNTS', `${accounts.length} GA4 accounts synchronized`);
    return accounts;

  } catch (e) {
    logError('GA4_ACCOUNTS', `Error synchronizing GA4 accounts: ${e.message}`);
    return [];
  }
}

/**
 * Synchronizes GA4 properties.
 * @param {Array} accounts - Array of GA4 accounts.
 * @returns {Array} Array of properties.
 */
function syncGA4Properties(accounts) {
  try {
    const allProperties = [];

    accounts.forEach(account => {
      try {
        const url = `https://analyticsadmin.googleapis.com/v1beta/${account.name}/properties`;
        const response = fetchWithOAuth2(url);
        const properties = response.properties || [];

        properties.forEach(prop => {
          prop.parentAccount = account.name;
          allProperties.push(prop);
        });

      } catch (e) {
        logWarning('GA4_PROPERTIES', `Error in account ${account.name}: ${e.message}`);
      }
    });

    // Write to sheet
    const headers = ['Property Name', 'Property ID', 'Display Name', 'Parent Account', 'Industry Category', 'Time Zone', 'Currency Code', 'Create Time'];
    const data = allProperties.map(prop => [
      prop.name || '',
      prop.name ? prop.name.split('/')[1] : '',
      prop.displayName || '',
      prop.parentAccount || '',
      prop.industryCategory || '',
      prop.timeZone || '',
      prop.currencyCode || '',
      formatDate(prop.createTime)
    ]);

    writeToSheet('GA4_PROPERTIES', headers, data, true);

    logEvent('GA4_PROPERTIES', `${allProperties.length} GA4 properties synchronized`);
    return allProperties;

  } catch (e) {
    logError('GA4_PROPERTIES', `Error synchronizing GA4 properties: ${e.message}`);
    return [];
  }
}

/**
 * Synchronizes GA4 custom dimensions.
 * @param {Array} properties - Array of GA4 properties.
 * @returns {Array} Array of dimensions.
 */
function syncGA4Dimensions(properties) {
  try {
    const allDimensions = [];

    properties.forEach(property => {
      try {
        const url = `https://analyticsadmin.googleapis.com/v1beta/${property.name}/customDimensions`;
        const response = fetchWithOAuth2(url);
        const dimensions = response.customDimensions || [];

        dimensions.forEach(dim => {
          dim.parentProperty = property.name;
          dim.propertyDisplayName = property.displayName;
          allDimensions.push(dim);
        });

      } catch (e) {
        logWarning('GA4_DIMENSIONS', `Error in property ${property.name}: ${e.message}`);
      }
    });

    // Write to sheet
    const headers = ['Dimension Name', 'Parameter Name', 'Display Name', 'Description', 'Scope', 'Property', 'Property Display Name'];
    const data = allDimensions.map(dim => [
      dim.name || '',
      dim.parameterName || '',
      dim.displayName || '',
      dim.description || '',
      dim.scope || '',
      dim.parentProperty || '',
      dim.propertyDisplayName || ''
    ]);

    writeToSheet('GA4_CUSTOM_DIMENSIONS', headers, data, true);

    logEvent('GA4_DIMENSIONS', `${allDimensions.length} GA4 custom dimensions synchronized`);
    return allDimensions;

  } catch (e) {
    logError('GA4_DIMENSIONS', `Error synchronizing GA4 dimensions: ${e.message}`);
    return [];
  }
}

/**
 * Synchronizes GA4 custom metrics.
 * @param {Array} properties - Array of GA4 properties.
 * @returns {Array} Array of metrics.
 */
function syncGA4Metrics(properties) {
  try {
    const allMetrics = [];

    properties.forEach(property => {
      try {
        const url = `https://analyticsadmin.googleapis.com/v1beta/${property.name}/customMetrics`;
        const response = fetchWithOAuth2(url);
        const metrics = response.customMetrics || [];

        metrics.forEach(metric => {
          metric.parentProperty = property.name;
          metric.propertyDisplayName = property.displayName;
          allMetrics.push(metric);
        });

      } catch (e) {
        logWarning('GA4_METRICS', `Error in property ${property.name}: ${e.message}`);
      }
    });

    // Write to sheet
    const headers = ['Metric Name', 'Parameter Name', 'Display Name', 'Description', 'Measurement Unit', 'Scope', 'Property', 'Property Display Name'];
    const data = allMetrics.map(metric => [
      metric.name || '',
      metric.parameterName || '',
      metric.displayName || '',
      metric.description || '',
      metric.measurementUnit || '',
      metric.scope || '',
      metric.parentProperty || '',
      metric.propertyDisplayName || ''
    ]);

    writeToSheet('GA4_CUSTOM_METRICS', headers, data, true);

    logEvent('GA4_METRICS', `${allMetrics.length} GA4 custom metrics synchronized`);
    return allMetrics;

  } catch (e) {
    logError('GA4_METRICS', `Error synchronizing GA4 metrics: ${e.message}`);
    return [];
  }
}

/**
 * Synchronizes GA4 data streams.
 * @param {Array} properties - Array of GA4 properties.
 * @returns {Array} Array of data streams.
 */
function syncGA4DataStreams(properties) {
  try {
    const allStreams = [];

    properties.forEach(property => {
      try {
        const url = `https://analyticsadmin.googleapis.com/v1beta/${property.name}/dataStreams`;
        const response = fetchWithOAuth2(url);
        const streams = response.dataStreams || [];

        streams.forEach(stream => {
          stream.parentProperty = property.name;
          stream.propertyDisplayName = property.displayName;
          allStreams.push(stream);
        });

      } catch (e) {
        logWarning('GA4_STREAMS', `Error in property ${property.name}: ${e.message}`);
      }
    });

    // Write to sheet
    const headers = ['Stream Name', 'Stream ID', 'Display Name', 'Type', 'Web Stream Data', 'Property', 'Property Display Name', 'Create Time'];
    const data = allStreams.map(stream => [
      stream.name || '',
      stream.name ? stream.name.split('/').pop() : '',
      stream.displayName || '',
      stream.type || '',
      stream.webStreamData ? JSON.stringify(stream.webStreamData) : '',
      stream.parentProperty || '',
      stream.propertyDisplayName || '',
      formatDate(stream.createTime)
    ]);

    writeToSheet('GA4_DATA_STREAMS', headers, data, true);

    logEvent('GA4_STREAMS', `${allStreams.length} GA4 data streams synchronized`);
    return allStreams;

  } catch (e) {
    logError('GA4_STREAMS', `Error synchronizing GA4 data streams: ${e.message}`);
    return [];
  }
}

/**
 * Core GTM synchronization function with OAuth2 (coordinator).
 * @returns {Object} Synchronization result.
 */
function syncGTMCore() {
  const startTime = Date.now();

  try {
    logEvent('GTM_COORD', 'Starting GTM synchronization from coordinator');

    // Verify authentication
    const auth = getAuthConfig('gtm');
    if (!auth.oauthToken) {
      throw new Error('OAuth2 token not available for GTM');
    }

    // Call directly to the function implemented in gtm.js
    const result = timeOperation('GTM_Core_Sync', () => {
      // Verify function exists before calling
      if (typeof syncGTMCore !== 'undefined' && syncGTMCore !== arguments.callee) {
        // Avoid infinite recursion
        logWarning('GTM_COORD', 'Duplicate GTM function detected, using direct implementation');
      }

      // Execute GTM logic directly here
      return executeDirectGTMSynchronization();
    });

    const duration = Date.now() - startTime;
    logEvent('GTM_COORD', `GTM coordination completed in ${Math.round(duration / 1000)}s`);

    return result;

  } catch (e) {
    const duration = Date.now() - startTime;
    logError('GTM_COORD', `Error in GTM coordination: ${e.message}`);

    return {
      status: 'ERROR',
      error: e.message,
      records: 0,
      duration: duration
    };
  }
}

/**
 * Executes GTM synchronization using the gtm.js module implementation
 * @returns {Object} Synchronization result.
 */
function executeDirectGTMSynchronization() {
  try {
    // Call the main GTM synchronization function
    // This function is defined in gtm.js
    const result = syncGTMCore_Internal();

    return result;

  } catch (error) {
    logError('GTM_DIRECT', `Error in direct GTM synchronization: ${error.message}`);
    return {
      status: 'ERROR',
      records: 0,
      duration: 0,
      error: error.message
    };
  }
}

/**
 * Internal GTM synchronization implementation (clean copy from gtm.js)
 * @returns {Object} Synchronization result.
 */
function syncGTMCore_Internal() {
  const startTime = Date.now();
  const serviceName = 'gtm';
  const results = {
    containersFound: 0,
    containersProcessed: 0,
    tags: 0,
    variables: 0,
    triggers: 0,
    errors: []
  };

  try {
    // Verify authentication
    const authConfig = getAuthConfig(serviceName);
    logSyncStart('GTM_Sync', authConfig.authUser);

    // Get containers
    const allContainers = getAllGTMContainers() || [];
    results.containersFound = allContainers.length;

    logEvent('GTM', `📦 Containers found: ${allContainers.length}`);

    if (allContainers.length === 0) {
      logWarning('GTM', 'No accessible GTM containers found');

      // ALWAYS create GTM sheets, even without containers
      const emptyData = { tags: [], variables: [], triggers: [] };
      writeAggregatedGTMData(emptyData);

      const duration = Date.now() - startTime;
      logSyncEnd('GTM_Sync', 0, duration, 'SUCCESS');
      return { status: 'SUCCESS', records: 0, duration: duration, details: results };
    }

    // Filter containers according to configuration
    const targetContainers = getTargetContainersFromConfig();
    const containersToProcess = targetContainers.length > 0
      ? allContainers.filter(c => targetContainers.includes(c.name))
      : allContainers;

    logEvent('GTM', `🎯 Containers to process: ${containersToProcess.length} of ${allContainers.length}`);

    if (containersToProcess.length === 0) {
      logWarning('GTM', 'No containers to process after filtering');

      // ALWAYS create GTM sheets, even without filtered containers
      const emptyData = { tags: [], variables: [], triggers: [] };
      writeAggregatedGTMData(emptyData);

      const duration = Date.now() - startTime;
      logSyncEnd('GTM_Sync', 0, duration, 'SUCCESS');
      return { status: 'SUCCESS', records: 0, duration: duration, details: results };
    }

    // Collect data from all containers
    const aggregatedData = collectDataFromContainers(containersToProcess, results.errors);

    // Write data to sheets
    writeAggregatedGTMData(aggregatedData);

    // Update results
    results.tags = aggregatedData.tags.length;
    results.variables = aggregatedData.variables.length;
    results.triggers = aggregatedData.triggers.length;
    results.containersProcessed = containersToProcess.length - results.errors.length;

    const totalElements = results.tags + results.variables + results.triggers;
    const duration = Date.now() - startTime;

    // Update last synchronization timestamp
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('ADDOCU_LAST_SYNC_GTM', Date.now().toString());

    logEvent('GTM', `✅ Synchronization completed: ${totalElements} elements`);
    logSyncEnd('GTM_Sync', totalElements, duration, 'SUCCESS');

    return { status: 'SUCCESS', records: totalElements, duration: duration, details: results };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('GTM_Sync', 0, duration, 'ERROR');
    logError('GTM', `❌ Synchronization error: ${error.message}`, error.stack);

    // Try to create empty sheets as fallback in case of error
    try {
      const emptyData = { tags: [], variables: [], triggers: [] };
      writeAggregatedGTMData(emptyData);
      logWarning('GTM', 'GTM sheets created as fallback after error');
    } catch (fallbackError) {
      logError('GTM', `Critical error creating GTM fallback sheets: ${fallbackError.message}`);
    }

    return { status: 'ERROR', records: 0, duration: duration, error: error.message };
  }
}

/**
 * Core Looker Studio synchronization function with OAuth2.
 * @returns {Object} Synchronization result.
 */
function syncLookerStudioCore() {
  const startTime = Date.now();
  logEvent('LOOKER_CORE', 'Starting Looker Studio core synchronization with OAuth2');

  try {
    // Verify we have OAuth2 (API Keys are no longer supported)
    const auth = getAuthConfig('lookerStudio');

    if (auth.authType !== 'oauth2') {
      throw new Error('Looker Studio API requires OAuth2. API Keys are no longer supported by Google.');
    }

    if (!auth.oauthToken) {
      throw new Error('OAuth2 token required for Looker Studio. Authorize the script first.');
    }

    // Call the looker_studio.js function
    const result = timeOperation('Looker_Studio_Sync', () => {
      return typeof syncLookerStudioCore !== 'undefined' ?
        syncLookerStudioCore() :
        { status: 'ERROR', error: 'Looker Studio module not available', records: 0 };
    });

    const duration = Date.now() - startTime;

    // Update last synchronization timestamp
    if (result.status === 'SUCCESS') {
      const userProperties = PropertiesService.getUserProperties();
      userProperties.setProperty('ADDOCU_LAST_SYNC_LOOKER', Date.now().toString());
    }

    logEvent('LOOKER_CORE', `Looker Studio synchronization completed in ${Math.round(duration / 1000)}s`);

    return {
      status: result.status || 'SUCCESS',
      records: result.records || 0,
      duration: duration,
      error: result.error
    };

  } catch (e) {
    const duration = Date.now() - startTime;
    logError('LOOKER_CORE', `Error in Looker Studio synchronization: ${e.message}`);

    return {
      status: 'ERROR',
      error: e.message,
      records: 0,
      duration: duration
    };
  }
}