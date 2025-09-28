/**
 * @fileoverview Permission Recovery Enhanced Functions - Addocu v3.0
 * @version 3.1 - Enhanced permission functions WITHOUT duplicates
 * 
 * IMPORTANT: onFileScopeGranted is handled by auth_recovery.js
 * This file contains only ENHANCED permission recovery functions
 */

// =================================================================
// ENHANCED PERMISSION TESTING FUNCTIONS
// =================================================================

/**
 * Tests basic permissions required for Add-on functionality.
 * Enhanced version with more detailed error reporting.
 * @returns {Object} Permission test results.
 */
function testBasicPermissionsEnhanced() {
  const results = {
    success: true,
    permissions: {},
    errors: []
  };
  
  // Test 1: Spreadsheet access
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    results.permissions.spreadsheet = !!ss;
  } catch (error) {
    results.permissions.spreadsheet = false;
    results.errors.push(`Spreadsheet: ${error.message}`);
    results.success = false;
  }
  
  // Test 2: UserProperties
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
  
  // Test 3: OAuth Token
  try {
    const token = ScriptApp.getOAuthToken();
    results.permissions.oauth = !!token;
  } catch (error) {
    results.permissions.oauth = false;
    results.errors.push(`OAuth: ${error.message}`);
    results.success = false;
  }
  
  // Test 4: UI Access
  try {
    const ui = SpreadsheetApp.getUi();
    results.permissions.ui = !!ui;
  } catch (error) {
    results.permissions.ui = false;
    results.errors.push(`UI: ${error.message}`);
    results.success = false;
  }
  
  return results;
}

/**
 * Initializes user configuration safely.
 * Enhanced version with better error handling.
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
        'ADDOCU_LOG_LEVEL': 'INFO',
        'ADDOCU_LOG_RETENTION': '30',
        'ADDOCU_REQUEST_TIMEOUT': '60',
        'ADDOCU_SYNC_FREQUENCY': 'manual'
      };
      
      // Apply default configuration
      userProperties.setProperties(defaultConfig);
      
      logEvent('INIT', 'Initial user configuration created');
    } else {
      logEvent('INIT', 'User configuration already exists');
    }
    
  } catch (error) {
    logError('INIT', `Error initializing user configuration: ${error.message}`);
    // No rethrow - user can use Add-on without persistent configuration
  }
}

// =================================================================
// ENHANCED CONFIGURATION WITH ERROR HANDLING
// =================================================================

/**
 * Enhanced version of getUserConfig with robust error handling.
 * @returns {Object} User configuration with safe fallbacks.
 */
function getUserConfigSafe() {
  // Try to load normal configuration first
  try {
    return readUserConfiguration();
  } catch (error) {
    logError('CONFIG_SAFE', `Error reading normal configuration: ${error.message}`);
    
    // Fallback: return default configuration
    return getDefaultUserConfig(error.message);
  }
}

/**
 * Gets user email safely.
 * @returns {string} User email or default value.
 */
function getUserEmailSafe() {
  try {
    return Session.getActiveUser().getEmail() || 'unknown@unknown.com';
  } catch (error) {
    logError('EMAIL_SAFE', `Error getting user email: ${error.message}`);
    return 'permission-error@unknown.com';
  }
}

/**
 * Gets default configuration when there are permission errors.
 * @param {string} errorMessage - Optional error message.
 * @returns {Object} Default configuration.
 */
function getDefaultUserConfig(errorMessage = null) {
  return {
    // API Configuration
    lookerApiKey: '',
    gtmFilter: '',
    
    // Advanced Filters
    ga4Properties: '',
    gtmWorkspaces: '',
    
    // Service Configuration
    syncFrequency: 'manual',
    requestTimeout: 60,
    
    // Services Status - All enabled by default
    syncLooker: true,
    syncGA4: true,
    syncGTM: true,
    
    // OAuth2 Information
    oauth2Ready: true,
    userEmail: getUserEmailSafe(),
    
    // Status
    isFirstTime: true,
    isPro: true,
    
    // Error status
    permissionsError: !!errorMessage,
    permissionsErrorMessage: errorMessage,
    needsReauthorization: !!errorMessage
  };
}

// =================================================================
// AUTOMATIC PERMISSION RECOVERY FUNCTION
// =================================================================

/**
 * Attempts to automatically recover permissions when there are PERMISSION_DENIED errors.
 * @returns {Object} Recovery attempt result.
 */
function attemptPermissionRecoveryEnhanced() {
  try {
    logEvent('RECOVERY', 'Attempting automatic permission recovery...');
    
    // Step 1: Force initialization
    initializeUserConfigurationSafe();
    
    // Step 2: Test basic permissions
    const permissionTest = testBasicPermissionsEnhanced();
    
    if (permissionTest.success) {
      logEvent('RECOVERY', 'Permission recovery successful');
      return { success: true, message: 'Permissions recovered correctly' };
    } else {
      logWarning('RECOVERY', `Partial recovery: ${permissionTest.errors.join(', ')}`);
      return { 
        success: false, 
        message: 'Partial recovery - manual reauthorization required',
        errors: permissionTest.errors
      };
    }
    
  } catch (error) {
    logError('RECOVERY', `Error in permission recovery: ${error.message}`);
    return { 
      success: false, 
      message: `Recovery error: ${error.message}`,
      requiresManualAuth: true
    };
  }
}

// =================================================================
// ENHANCED SIDEBAR DIAGNOSTICS
// =================================================================

/**
 * Enhanced version of connection diagnostics for sidebar.
 * @returns {Array} Diagnostic results with permission information.
 */
function diagnoseConnectionsEnhanced() {
  try {
    // First verify basic permissions
    const permissionTest = testBasicPermissionsEnhanced();
    
    if (!permissionTest.success) {
      // If there are permission problems, return specific information
      return [
        ['System Permissions', 'Authorization Error', 'ERROR', 'Reauthorization required - use Recovery menu'],
        ['Google Analytics 4 Admin API', 'Pending Authorization', 'PENDING', 'OAuth2 pending'],
        ['Google Tag Manager API', 'Pending Authorization', 'PENDING', 'OAuth2 pending'],
        ['Looker Studio API', 'Pending Authorization', 'PENDING', 'OAuth2 pending']
      ];
    }
    
    // If permissions work, do normal diagnostics
    return diagnoseConnectionsComplete();
    
  } catch (error) {
    logError('DIAGNOSTIC_ENHANCED', `Error in enhanced diagnostics: ${error.message}`);
    
    return [
      ['Addocu System', 'Critical Error', 'ERROR', `System error: ${error.message}`],
      ['Recommended Solution', 'Reauthorization', 'ACTION', 'Extensions > Addocu > 🔄 Reauthorize Permissions']
    ];
  }
}

// =================================================================
// ENHANCED CONFIGURATION SAVE FUNCTION
// =================================================================

/**
 * Saves configuration with enhanced error handling.
 * @param {Object} config - Configuration to save.
 * @returns {Object} Operation result.
 */
function saveUserConfigurationEnhanced(config) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    
    // Map properties with validation
    const propertiesToSet = {};
    
    if (config.lookerApiKey !== undefined) {
      if (config.lookerApiKey.trim()) {
        propertiesToSet.ADDOCU_LOOKER_API_KEY = config.lookerApiKey.trim();
      }
    }
    
    if (config.gtmFilter !== undefined) {
      propertiesToSet.ADDOCU_GTM_FILTER = config.gtmFilter;
    }
    
    if (config.ga4Properties !== undefined) {
      if (config.ga4Properties.trim()) {
        propertiesToSet.ADDOCU_GA4_PROPERTIES_FILTER = config.ga4Properties.trim();
      }
    }
    
    if (config.gtmWorkspaces !== undefined) {
      if (config.gtmWorkspaces.trim()) {
        propertiesToSet.ADDOCU_GTM_WORKSPACES_FILTER = config.gtmWorkspaces.trim();
      }
    }
    
    // Mark as configured
    propertiesToSet.ADDOCU_FIRST_TIME = 'false';
    propertiesToSet.ADDOCU_LAST_CONFIG_UPDATE = Date.now().toString();
    
    // Apply all properties at once
    if (Object.keys(propertiesToSet).length > 0) {
      userProperties.setProperties(propertiesToSet);
    }
    
    logEvent('CONFIG_SAVE', `Configuration saved: ${Object.keys(config).join(', ')}`);
    
    return { success: true };
    
  } catch (error) {
    logError('CONFIG_SAVE', `Error saving configuration: ${error.message}`);
    
    return { 
      success: false, 
      error: error.message,
      requiresPermissionRecovery: error.message.includes('PERMISSION_DENIED')
    };
  }
}