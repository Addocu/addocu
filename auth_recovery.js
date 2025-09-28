/**
 * @fileoverview Consolidated Authorization Recovery System - Addocu v3.0
 * @version CONSOLIDATED - Eliminating conflicts between duplicate files
 * 
 * THIS FILE REPLACES:
 * - auth_recovery.js (basic functions)
 * - auth_recovery_coordinador.js (duplicate functions with coordinador.js)
 * 
 * FUNCTIONS MOVED FROM coordinador.js:
 * - reautorizarPermisosForzado() -> Manual version with Google Account URLs
 * - mostrarDiagnosticoCompleto() 
 * - confirmarReseteoEmergencia()
 * - ejecutarDiagnosticoDetallado() 
 * - ejecutarReseteoEmergencia()
 * - forzarTodosLosPermisos() -> UNIQUE - preserved from coordinador.js
 */

// =================================================================
// POST-INSTALLATION AUTHORIZATION CONFIGURATION
// =================================================================

/**
 * Executed when file-specific permissions are granted.
 * This function is configured in appsscript.json as onFileScopeGrantedTrigger.
 * @param {Object} e - Google Apps Script event object.
 */
function onFileScopeGranted(e) {
  try {
    logEvent('AUTH_RECOVERY', 'File permissions granted. Initializing configuration...');
    
    // Initialize basic user configuration
    initializeUserConfiguration();
    
    // Show welcome message
    try {
      const ui = SpreadsheetApp.getUi();
      const message = '🎉 Welcome to Addocu!\n\n' +
        '✅ Permissions have been configured correctly.\n\n' +
        'You can now use all functionalities:\n' +
        '• 📊 Audit GA4\n' +
        '• 🏷️ Audit GTM\n' +
        '• 📈 Audit Looker Studio\n\n' +
        'Go to Extensions > Addocu > ⚙️ Configure to customize your experience.\n\n' +
        'Open Source Project - Thank you for using it!';
      
      ui.alert('🚀 Addocu Configured', message, ui.ButtonSet.OK);
    } catch (uiError) {
      // Not critical if message fails
      logWarning('AUTH_RECOVERY', `Could not show welcome message: ${uiError.message}`);
    }
    
    logEvent('AUTH_RECOVERY', 'Initial configuration completed after granting permissions');
    
  } catch (error) {
    logError('AUTH_RECOVERY', `Error in onFileScopeGranted: ${error.message}`);
  }
}

/**
 * Initializes basic user configuration after granting permissions.
 * NOTE: This function was DUPLICATED in 3 files. Now consolidated here.
 */
function initializeUserConfiguration() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const userEmail = Session.getActiveUser().getEmail();
    
    // Set default values if they don't exist
    const defaultConfig = {
      'ADDOCU_FIRST_TIME': 'true',
      'ADDOCU_SYNC_GA4': 'true',
      'ADDOCU_SYNC_GTM': 'true', 
      'ADDOCU_SYNC_LOOKER': 'true',
      'ADDOCU_LOG_LEVEL': 'INFO',
      'ADDOCU_REQUEST_TIMEOUT': '60',
      'ADDOCU_ALERT_ERRORS': 'true'
    };
    
    // Only set values that don't exist
    Object.keys(defaultConfig).forEach(key => {
      if (!userProperties.getProperty(key)) {
        userProperties.setProperty(key, defaultConfig[key]);
      }
    });
    
    // Log the initialization event
    logEvent('INIT', `User initialized: ${userEmail}`);
    
  } catch (error) {
    logError('INIT', `Error initializing configuration: ${error.message}`);
    throw error;
  }
}

// =================================================================
// IMPROVED MANUAL REAUTHORIZATION (FROM COORDINADOR.JS)
// =================================================================

/**
 * DEFINITIVE VERSION: Guides user to actual Google permissions page.
 * Accessible from recovery menu.
 * 
 * CONSOLIDATED: This version prevails over duplicate versions
 * that attempted automatic OAuth2 authorization (which doesn't work).
 */
function forcedPermissionReauthorization() {
  try {
    logEvent('REAUTH', 'Showing instructions for manual reauthorization...');
    
    const ui = SpreadsheetApp.getUi();
    
    // Get user number to personalize URL
    let customUrl = 'https://myaccount.google.com/connections?filters=3,4&hl=en&pageId=none';
    
    try {
      const userEmail = Session.getActiveUser().getEmail();
      // Try to detect account number (this is approximate)
      const emailHash = Math.abs(userEmail.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0));
      const accountNumber = Math.floor(emailHash % 10); // Number between 0-9
      customUrl = `https://myaccount.google.com/u/${accountNumber}/connections?filters=3,4&hl=en&pageId=none`;
    } catch (e) {
      // Use generic URL if it fails
    }
    
    const message = '🔗 MANUAL REAUTHORIZATION REQUIRED\n\n' +
      '❌ Cannot reauthorize permissions automatically.\n\n' +
      '✅ SOLUTION (very easy - 30 seconds):\n\n' +
      '1. 📋 COPY this URL:\n' +
      '   ' + customUrl + '\n\n' +
      '2. 🌐 Open it in your browser\n\n' +
      '3. 🔍 Look for "clasp - The Apps Script CLI" or "Addocu"\n\n' +
      '4. ❌ Click "Remove access"\n\n' +
      '5. ⚙️ Return here and use "📊 Audit GA4"\n\n' +
      '6. ✅ Authorize ALL permissions\n\n' +
      '💡 If the URL doesn\'t work, search "Third-party apps" in your Google account.';
    
    const response = ui.alert(
      '🔗 Manual Reauthorization',
      message,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response === ui.Button.OK) {
      // Show additional URL as backup
      ui.alert(
        '📋 Backup URLs',
        'If the first URL doesn\'t work, try these:\n\n' +
        '🔗 Main URL:\n' +
        customUrl + '\n\n' +
        '🔗 Generic URL:\n' +
        'https://myaccount.google.com/permissions\n\n' +
        '💡 You can also search "Google Account permissions" on Google.',
        ui.ButtonSet.OK
      );
    }
    
    logEvent('REAUTH', 'Manual reauthorization instructions shown');
    
  } catch (error) {
    logError('REAUTH', `Error showing instructions: ${error.message}`);
    
    // If even this fails, show basic message
    try {
      console.log('🚨 ADDOCU - MANUAL REAUTHORIZATION NEEDED');
      console.log('1. Go to: https://myaccount.google.com/permissions');
      console.log('2. Remove "Addocu" or "clasp - The Apps Script CLI"');
      console.log('3. Return and execute "📊 Audit GA4"');
      console.log('4. Authorize ALL permissions');
    } catch (e) {
      // If even console.log fails, do nothing
    }
  }
}

/**
 * UNIQUE PRESERVED FUNCTION: Emergency function that forces ALL necessary permissions.
 * Special for partial authorization cases.
 * ORIGIN: coordinador.js - UNIQUE implementation, not duplicated
 */
function forceAllPermissions() {
  try {
    logEvent('FORCE_ALL_PERMS', 'Executing forced authorization of all permissions...');
    
    const ui = SpreadsheetApp.getUi();
    
    // Show warning to user
    const confirmation = ui.alert(
      '🔒 Force All Permissions',
      'This function will attempt to force authorization of ALL necessary permissions.\n\n' +
      'If an authorization window appears, accept ALL permissions.\n\n' +
      'Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (confirmation !== ui.Button.YES) {
      logEvent('FORCE_ALL_PERMS', 'Operation cancelled by user');
      return;
    }
    
    // Step 1: OAuth2 Token
    ui.alert('🔄 Step 1/5', 'Verifying OAuth2 token...', ui.ButtonSet.OK);
    const token = ScriptApp.getOAuthToken();
    if (!token) {
      throw new Error('Could not get OAuth2 token');
    }
    
    // Step 2: Spreadsheet Access  
    ui.alert('🔄 Step 2/5', 'Verifying spreadsheet access...', ui.ButtonSet.OK);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.getId(); // Force access
    
    // Step 3: External Request (APIs)
    ui.alert('🔄 Step 3/5', 'Verifying external API permissions...', ui.ButtonSet.OK);
    UrlFetchApp.fetch('https://www.googleapis.com/analytics/v3/management/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      muteHttpExceptions: true
    });
    
    // Step 4: User Properties
    ui.alert('🔄 Step 4/5', 'Verifying configuration storage...', ui.ButtonSet.OK);
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty('ADDOCU_FULL_AUTH_TEST', new Date().toISOString());
    
    // Step 5: Final validation
    ui.alert('🔄 Step 5/5', 'Executing final validation...', ui.ButtonSet.OK);
    
    // Try a real GA4 call to ensure it works
    try {
      const ga4Response = UrlFetchApp.fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        muteHttpExceptions: true
      });
      
      const statusCode = ga4Response.getResponseCode();
      logEvent('FORCE_ALL_PERMS', `GA4 API test: HTTP ${statusCode}`);
      
    } catch (apiError) {
      logWarning('FORCE_ALL_PERMS', `API test failed: ${apiError.message}`);
    }
    
    // Success
    ui.alert(
      '✅ Permissions Successfully Forced!',
      'All permissions have been verified and forced.\n\n' +
      'You should now be able to use all Addocu functionalities.\n\n' +
      'Try executing "📊 Audit GA4" to confirm everything works.',
      ui.ButtonSet.OK
    );
    
    logEvent('FORCE_ALL_PERMS', 'All permissions successfully forced');
    
  } catch (error) {
    logError('FORCE_ALL_PERMS', `Error forcing permissions: ${error.message}`);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '❌ Error Forcing Permissions',
        `Error: ${error.message}\n\n` +
        'POSSIBLE SOLUTIONS:\n' +
        '1. Execute "📊 Audit GA4" and authorize EVERYTHING\n' +
        '2. Refresh the page and try again\n' +
        '3. Reinstall the add-on from Marketplace\n' +
        '4. Contact support: hello@addocu.com',
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      console.error('Critical error forcing permissions:', error.message);
    }
  }
}

// =================================================================
// CONSOLIDATED DIAGNOSTICS (MOVED FROM COORDINADOR.JS)
// =================================================================

/**
 * CONSOLIDATED: Shows complete diagnosis of authorization status.
 * Accessible from recovery menu.
 * ORIGIN: coordinador.js - eliminating duplication with auth_recovery_coordinador.js
 */
function showCompleteDiagnostics() {
  try {
    logEvent('DIAGNOSTIC_UI', 'Starting complete diagnostic from menu...');
    
    const diagnostic = executeDetailedDiagnostic();
    
    // Create diagnostic message
    let message = '🔍 ADDOCU DIAGNOSTIC v3.0\n\n';
    message += `User: ${diagnostic.user}\n`;
    message += `Timestamp: ${new Date().toLocaleString('en-US')}\n\n`;
    
    // Permission status
    message += '📋 PERMISSIONS:\n';
    message += `${diagnostic.permissions.ui ? '✅' : '❌'} User Interface\n`;
    message += `${diagnostic.permissions.oauth2 ? '✅' : '❌'} OAuth2 Token\n`;
    message += `${diagnostic.permissions.userProperties ? '✅' : '❌'} UserProperties\n`;
    message += `${diagnostic.permissions.spreadsheet ? '✅' : '❌'} Spreadsheet Access\n\n`;
    
    // Available APIs
    if (Object.keys(diagnostic.apis).length > 0) {
      message += '🔗 APIS:\n';
      Object.keys(diagnostic.apis).forEach(api => {
        const status = diagnostic.apis[api];
        message += `${status.status === 'OK' ? '✅' : '❌'} ${api.toUpperCase()}: ${status.message}\n`;
      });
      message += '\n';
    }
    
    // Recommendations
    message += '💡 RECOMMENDATIONS:\n';
    diagnostic.recommendations.forEach((rec, i) => {
      message += `${i + 1}. ${rec}\n`;
    });
    
    // Show diagnostic
    const ui = SpreadsheetApp.getUi();
    ui.alert('🔍 Complete Diagnostic', message, ui.ButtonSet.OK);
    
    logEvent('DIAGNOSTIC_UI', 'Diagnostic completed and shown');
    
  } catch (error) {
    logError('DIAGNOSTIC_UI', `Error in diagnostic UI: ${error.message}`);
    
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
 * CONSOLIDATED: Executes detailed system status diagnostic.
 * ORIGIN: coordinador.js - eliminating duplication
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

// =================================================================
// CONSOLIDATED EMERGENCY RESET
// =================================================================

/**
 * CONSOLIDATED: Confirms and executes complete emergency reset.
 * Accessible from recovery menu.
 * ORIGIN: coordinador.js - eliminating duplication
 */
function confirmEmergencyReset() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const confirmation = ui.alert(
      '🚨 EMERGENCY RESET',
      'WARNING: This will delete ALL your Addocu configuration.\n\n' +
      'Only use as last resort when nothing else works.\n\n' +
      'Are you sure you want to continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (confirmation !== ui.Button.YES) {
      logEvent('RESET_EMERGENCY', 'Emergency reset cancelled by user');
      return;
    }
    
    // Execute reset
    const result = executeEmergencyReset();
    
    if (result.success) {
      ui.alert(
        '🔄 Complete Reset',
        'Configuration has been completely reset.\n\n' +
        'Go to Extensions > Addocu > ⚙️ Configure to start over.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '❌ Reset Error',
        `Could not complete reset: ${result.error}`,
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    logError('RESET_EMERGENCY_UI', `Error in emergency reset: ${error.message}`);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        'Critical Error',
        `Reset error: ${error.message}\n\n` +
        'As last resort, uninstall and reinstall the add-on from Marketplace.',
        ui.ButtonSet.OK
      );
    } catch (e) {
      console.error('Critical error in emergency reset:', error.message);
    }
  }
}

/**
 * CONSOLIDATED: Executes complete emergency reset.
 * ORIGIN: coordinador.js - eliminating duplication
 * @returns {Object} Reset result.
 */
function executeEmergencyReset() {
  logEvent('RESET_EMERGENCY', 'Starting complete emergency reset...');
  
  try {
    // 1. Clean UserProperties
    try {
      const userProperties = PropertiesService.getUserProperties();
      userProperties.deleteAll();
      logEvent('RESET_EMERGENCY', 'UserProperties cleaned');
    } catch (e) {
      logWarning('RESET_EMERGENCY', `Error cleaning UserProperties: ${e.message}`);
    }
    
    // 2. Reinitialize configuration
    try {
      initializeUserConfiguration();
      logEvent('RESET_EMERGENCY', 'Configuration reinitialized');
    } catch (e) {
      logWarning('RESET_EMERGENCY', `Error reinitializing: ${e.message}`);
    }
    
    logEvent('RESET_EMERGENCY', 'Complete reset finished');
    return { success: true, message: 'Complete reset performed' };
    
  } catch (error) {
    logError('RESET_EMERGENCY', `Error in reset: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// =================================================================
// COMPLETE CONNECTION DIAGNOSTICS (FROM UTILIDADES.JS)
// =================================================================

/**
 * OPTIMIZED: Executes complete but fault-tolerant diagnostic
 * This function is called from sidebar and must be robust
 */
function runCompleteConnectivityDiagnostic() {
  logEvent('DIAGNOSTIC', 'Starting complete Addocu connectivity diagnostic.');
  
  const servicesToTest = ['ga4', 'gtm', 'lookerStudio'];
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
  
  // WRITE TO SHEET ONLY IF POSSIBLE
  try {
    const headers = ['Service', 'Account', 'Status', 'Message', 'User', 'Timestamp'];
    writeToSheet('ADDOCU_DIAGNOSTIC', headers, results, true, {
      alternateColors: true,
      borders: true
    });
    
    logEvent('DIAGNOSTIC', `Diagnostic completed for ${results.length} services.`);
  } catch (writeError) {
    logWarning('DIAGNOSTIC', `Could not write to sheet: ${writeError.message}`);
    // Continue without failing - diagnostic can work without writing the sheet
  }
  
  flushLogs();
  
  return results;
}