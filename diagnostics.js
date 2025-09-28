/**
 * @fileoverview Missing Diagnostic Functions for Addocu v3.0
 * @version 3.1 - Complete diagnostic functions for menu and coordinator
 */

// =================================================================
// MENU DIAGNOSTIC FUNCTIONS
// =================================================================

/**
 * Shows account verification instructions from the troubleshooting menu.
 */
function showAccountVerification() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const message = '🔍 ACCOUNT VERIFICATION GUIDE\n\n' +
      '95% of Addocu problems are caused by using different Google accounts\n' +
      'in Chrome vs Google Sheets.\n\n' +
      '🚩 MANUAL VERIFICATION REQUIRED:\n\n' +
      '1. 👤 Check CHROME profile (top-right corner)\n' +
      '   • Which Google account are you signed in with?\n\n' +
      '2. 📊 Check GOOGLE SHEETS account (top-right corner)\n' +
      '   • Which Google account is shown?\n\n' +
      '3. 🔍 COMPARE the two accounts:\n' +
      '   • Are they THE SAME account?\n' +
      '   • Same email address?\n\n' +
      '❌ IF THEY\'RE DIFFERENT:\n' +
      '• Sign out of ALL Google accounts in Chrome\n' +
      '• Sign in with only ONE account\n' +
      '• Open Google Sheets with that same account\n' +
      '• Try Addocu again\n\n' +
      '✅ IF THEY\'RE THE SAME:\n' +
      '• The problem is NOT account mismatch\n' +
      '• Try: Extensions > Addocu > 🔄 Reauthorize Permissions\n\n' +
      '💡 This is the #1 cause of authorization problems!';
    
    ui.alert('🔍 Manual Account Verification', message, ui.ButtonSet.OK);
    
    logEvent('ACCOUNT_VERIFICATION', 'Account verification guide shown to user');
    
  } catch (error) {
    logError('ACCOUNT_VERIFICATION', `Error showing account verification: ${error.message}`);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        'Account Verification Error',
        `Could not show verification guide: ${error.message}`,
        ui.ButtonSet.OK
      );
    } catch (e) {
      console.error('Critical error in account verification:', error.message);
    }
  }
}

/**
 * Shows simplified diagnostics from the troubleshooting menu.
 */
function showSimplifiedDiagnostics() {
  try {
    logEvent('DIAGNOSTIC_MENU', 'Starting simplified diagnostics from menu...');
    
    const results = simplifiedConnectionDiagnostics();
    
    // Format results for display
    let message = '🔍 SIMPLIFIED DIAGNOSTICS\n\n';
    
    results.forEach(result => {
      const serviceName = result[0];
      const account = result[1];
      const status = result[2];
      const details = result[3];
      
      let indicator = '❓';
      if (status === 'OK' || status === 'SUCCESS') {
        indicator = '✅';
      } else if (status === 'ERROR' || status === 'PERMISSION_ERROR') {
        indicator = '❌';
      } else if (status === 'PENDING') {
        indicator = '⏳';
      }
      
      message += `${indicator} ${serviceName}\n`;
      if (account && account !== 'N/A') {
        message += `   Account: ${account}\n`;
      }
      if (details) {
        message += `   ${details}\n`;
      }
      message += '\n';
    });
    
    // Add recommendations
    const hasErrors = results.some(r => r[2] === 'ERROR' || r[2] === 'PERMISSION_ERROR');
    const hasPending = results.some(r => r[2] === 'PENDING');
    
    if (hasErrors) {
      message += '🚨 ISSUES DETECTED:\n';
      message += 'Try: Extensions > Addocu > 🔄 Reauthorize Permissions\n';
      message += 'If problems persist: Manual account verification\n';
    } else if (hasPending) {
      message += '🔄 ACTION NEEDED:\n';
      message += 'Execute "📊 Audit GA4" to complete authorization\n';
    } else {
      message += '✅ ALL SYSTEMS WORKING:\n';
      message += 'Addocu is ready to use!\n';
    }
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('🔍 Simplified Diagnostics', message, ui.ButtonSet.OK);
    
    logEvent('DIAGNOSTIC_MENU', 'Simplified diagnostics completed and shown');
    
  } catch (error) {
    logError('DIAGNOSTIC_MENU', `Error in simplified diagnostics: ${error.message}`);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        'Diagnostic Error',
        `Could not complete diagnostics: ${error.message}\n\n` +
        'Try manually verifying that Chrome and Google Sheets use the same account.',
        ui.ButtonSet.OK
      );
    } catch (e) {
      console.error('Critical error in simplified diagnostics:', error.message);
    }
  }
}

// =================================================================
// COORDINATOR CONNECTION DIAGNOSTIC FUNCTIONS
// =================================================================

/**
 * Simplified connection diagnostics for coordinator and sidebar.
 * @returns {Array} Array with diagnostic results.
 */
function simplifiedConnectionDiagnostics() {
  try {
    logEvent('DIAGNOSTIC', 'Starting simplified connection diagnostics...');
    
    const results = [];
    const servicesToTest = [
      { id: 'ga4', name: 'Google Analytics 4 Admin API' },
      { id: 'gtm', name: 'Google Tag Manager API' },
      { id: 'looker', name: 'Looker Studio API' }
    ];
    
    // First check basic permissions
    const permissionTest = typeof testBasicPermissionsEnhanced !== 'undefined' ? 
      testBasicPermissionsEnhanced() : 
      testBasicPermissions();
    
    if (!permissionTest.success) {
      // If basic permissions fail, return permission error information
      return [
        ['System Permissions', 'Authorization Required', 'ERROR', 'Execute reauthorization via menu'],
        ['Google Analytics 4 Admin API', 'Pending Authorization', 'PENDING', 'OAuth2 pending'],
        ['Google Tag Manager API', 'Pending Authorization', 'PENDING', 'OAuth2 pending'],
        ['Looker Studio API', 'Pending Authorization', 'PENDING', 'OAuth2 pending']
      ];
    }
    
    // Test each service
    servicesToTest.forEach(service => {
      try {
        const result = validateService(service.id);
        
        let status = 'ERROR';
        let account = 'Unknown';
        let message = result.message || 'Unknown error';
        
        if (result.status === 'OK') {
          status = 'OK';
          account = result.account || 'OAuth2 connected';
          message = 'Working correctly';
        } else if (result.status === 'PERMISSION_ERROR') {
          status = 'ERROR';
          account = 'No permissions';
          message = 'Reauthorization required';
        } else if (result.status === 'AUTH_ERROR') {
          status = 'ERROR';
          account = 'Auth error';
          message = 'OAuth2 authorization needed';
        } else {
          status = 'ERROR';
          account = 'Error';
          message = result.message || 'Unknown error';
        }
        
        results.push([service.name, account, status, message]);
        
      } catch (e) {
        logError('DIAGNOSTIC', `Error testing ${service.id}: ${e.message}`);
        results.push([
          service.name,
          'Error',
          'ERROR',
          `Test failed: ${e.message}`
        ]);
      }
    });
    
    logEvent('DIAGNOSTIC', `Simplified diagnostics completed for ${results.length} services`);
    return results;
    
  } catch (error) {
    logError('DIAGNOSTIC', `Error in simplified diagnostics: ${error.message}`);
    
    return [
      ['Addocu System', 'Critical Error', 'ERROR', `Diagnostic error: ${error.message}`],
      ['Recommended Action', 'Reauthorization', 'ACTION', 'Extensions > Addocu > 🔄 Reauthorize Permissions']
    ];
  }
}

/**
 * Complete connection diagnostics with detailed information.
 * @returns {Array} Array with complete diagnostic results.
 */
function diagnoseConnectionsComplete() {
  try {
    logEvent('DIAGNOSTIC_COMPLETE', 'Starting complete connection diagnostics...');
    
    // Use the existing complete diagnostic function if available
    if (typeof runCompleteConnectivityDiagnostic !== 'undefined') {
      const detailedResults = runCompleteConnectivityDiagnostic();
      
      // Convert to expected format
      return detailedResults.map(result => [
        result[0], // Service name
        result[1], // Account
        result[2], // Status
        result[3]  // Message
      ]);
    }
    
    // Fallback to simplified diagnostics
    return simplifiedConnectionDiagnostics();
    
  } catch (error) {
    logError('DIAGNOSTIC_COMPLETE', `Error in complete diagnostics: ${error.message}`);
    
    return [
      ['Diagnostic System', 'Error', 'ERROR', `Complete diagnostic failed: ${error.message}`],
      ['Fallback', 'Simplified Mode', 'INFO', 'Using simplified diagnostics instead']
    ];
  }
}

// =================================================================
// BASIC PERMISSION TESTING (FALLBACK)
// =================================================================

/**
 * Tests basic permissions required for Add-on functionality.
 * Fallback version when enhanced version is not available.
 * @returns {Object} Permission test results.
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

// =================================================================
// FALLBACK DIAGNOSTIC FUNCTIONS
// =================================================================

/**
 * Emergency diagnostic function when all else fails.
 * @returns {Array} Basic diagnostic information.
 */
function emergencyDiagnostic() {
  try {
    const user = Session.getActiveUser().getEmail();
    const timestamp = new Date().toISOString();
    
    return [
      ['Emergency Diagnostic', 'Active', 'INFO', `User: ${user}`],
      ['Timestamp', timestamp, 'INFO', 'Diagnostic executed'],
      ['Recommendation', 'Manual Reauthorization', 'ACTION', 'Extensions > Addocu > 🔄 Reauthorize Permissions'],
      ['Alternative', 'Account Verification', 'ACTION', 'Verify Chrome/Sheets use same account']
    ];
    
  } catch (error) {
    return [
      ['Emergency Diagnostic', 'Failed', 'ERROR', error.message],
      ['Critical Issue', 'System Error', 'ERROR', 'Contact support'],
      ['Immediate Action', 'Reinstall Add-on', 'ACTION', 'Uninstall and reinstall from Marketplace']
    ];
  }
}