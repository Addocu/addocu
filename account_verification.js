/**
 * @fileoverview Addocu - Account Verification System (FIXED)
 * @version 2.0 - CORRECTED: No automatic account mismatch detection
 * 
 * FIXES: Remove false automatic detection of account mismatches
 * FOCUS: Manual verification only when user explicitly requests it
 */

// =================================================================
// MANUAL ACCOUNT VERIFICATION SYSTEM (NO AUTO-DETECTION)
// =================================================================

/**
 * Shows manual account verification instructions.
 * ONLY when explicitly requested by user - NO automatic assumptions.
 * Accessible from the troubleshooting menu.
 */
function mostrarVerificacionCuentas() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Get current Sheets account (if possible)
    let sheetsAccount = 'unknown';
    try {
      sheetsAccount = Session.getActiveUser().getEmail();
    } catch (e) {
      // If we can't get email, that's a permission error, not an account mismatch
    }
    
    let mensaje = '🔍 MANUAL ACCOUNT VERIFICATION\n\n';
    mensaje += '📖 IMPORTANT: Apps Script cannot automatically detect if your Chrome\n';
    mensaje += 'and Google Sheets accounts are different. You must verify this manually.\n\n';
    
    if (sheetsAccount !== 'unknown') {
      mensaje += `📧 Current Google Sheets account: ${sheetsAccount}\n\n`;
    }
    
    mensaje += '🔍 MANUAL VERIFICATION STEPS:\n\n';
    mensaje += '1. Look at the top-right corner of Chrome\n';
    mensaje += '   Check your current Google account profile\n\n';
    mensaje += '2. Look at the top-right corner of Google Sheets\n';
    mensaje += '   Check the account shown there\n\n';
    mensaje += '3. If they are DIFFERENT accounts:\n';
    mensaje += '   • Sign out of ALL Google accounts in Chrome\n';
    mensaje += '   • Sign in with only ONE account\n';
    mensaje += '   • Open Google Sheets with that same account\n';
    mensaje += '   • Try Addocu again\n\n';
    mensaje += '4. If they are the SAME account:\n';
    mensaje += '   • The problem is NOT account mismatch\n';
    mensaje += '   • Use "🔒 Force All Permissions" instead\n\n';
    mensaje += '💡 Account mismatches cause 95% of Addocu issues,\n';
    mensaje += 'but must be verified manually by you.';
    
    ui.alert('🔍 Manual Account Verification', mensaje, ui.ButtonSet.OK);
    
    logEvent('ACCOUNT_CHECK_MANUAL', `Manual verification shown for: ${sheetsAccount}`);
    
  } catch (error) {
    logError('ACCOUNT_CHECK_MANUAL', `Error in manual account verification: ${error.message}`);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        'Manual Verification Error',
        'Could not show manual verification instructions.\n\n' +
        'This suggests permission issues.\n\n' +
        'Solution: Extensions > Addocu > 🔄 Reauthorize Permissions',
        ui.ButtonSet.OK
      );
    } catch (e) {
      console.error('Critical error in manual account verification:', error.message);
    }
  }
}

// =================================================================
// SIMPLIFIED DIAGNOSTIC SYSTEM (NO ACCOUNT ASSUMPTIONS)
// =================================================================

/**
 * Simplified diagnostic focused on actual permission issues.
 * REMOVED: False automatic account mismatch detection.
 * @returns {Object} Accurate diagnostic results.
 */
function diagnosticoSimplificadoCorregido() {
  const diagnostico = {
    timestamp: new Date().toISOString(),
    account: 'unknown',
    permissions: {
      ui: false,
      spreadsheet: false,
      userProperties: false,
      oauth2: false
    },
    realProblems: [],
    recommendedSolution: ''
  };
  
  try {
    // 1. Try to get current account (for info only)
    try {
      diagnostico.account = Session.getActiveUser().getEmail();
    } catch (e) {
      diagnostico.realProblems.push('Cannot access user information (permission error)');
    }
    
    // 2. Test actual permissions
    try {
      const ui = SpreadsheetApp.getUi();
      diagnostico.permissions.ui = true;
    } catch (e) {
      diagnostico.realProblems.push('Cannot access user interface');
    }
    
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      diagnostico.permissions.spreadsheet = true;
    } catch (e) {
      diagnostico.realProblems.push('Cannot access spreadsheet');
    }
    
    try {
      const userProps = PropertiesService.getUserProperties();
      userProps.setProperty('ADDOCU_TEST', 'test');
      diagnostico.permissions.userProperties = true;
    } catch (e) {
      // CORRECTED: Do NOT assume this is account mismatch
      diagnostico.realProblems.push('Cannot access user configuration (permission error)');
    }
    
    try {
      const token = ScriptApp.getOAuthToken();
      diagnostico.permissions.oauth2 = !!token;
    } catch (e) {
      diagnostico.realProblems.push('Cannot get OAuth2 token');
    }
    
    // 3. Determine solution based on ACTUAL problems (not assumptions)
    if (diagnostico.realProblems.length === 0) {
      diagnostico.recommendedSolution = 'All basic permissions working correctly.';
    } else {
      // CORRECTED: Do not automatically blame account mismatch
      diagnostico.recommendedSolution = 'Permission errors detected. Try reauthorizing permissions first.';
    }
    
  } catch (error) {
    diagnostico.error = error.message;
    diagnostico.recommendedSolution = 'Critical error - check permissions and authorization.';
  }
  
  return diagnostico;
}

/**
 * Shows corrected simplified diagnostic (no false account assumptions).
 */
function mostrarDiagnosticoSimplificadoCorregido() {
  try {
    const diagnostico = diagnosticoSimplificadoCorregido();
    const ui = SpreadsheetApp.getUi();
    
    let mensaje = '🔍 ADDOCU SIMPLIFIED DIAGNOSTIC (CORRECTED)\n\n';
    mensaje += `📧 Google Sheets account: ${diagnostico.account}\n`;
    mensaje += `🕐 Timestamp: ${new Date().toLocaleString('es-ES')}\n\n`;
    
    // Permission status
    mensaje += '📋 BASIC PERMISSIONS:\n';
    mensaje += `${diagnostico.permissions.ui ? '✅' : '❌'} User Interface\n`;
    mensaje += `${diagnostico.permissions.spreadsheet ? '✅' : '❌'} Spreadsheet\n`;
    mensaje += `${diagnostico.permissions.userProperties ? '✅' : '❌'} Configuration\n`;
    mensaje += `${diagnostico.permissions.oauth2 ? '✅' : '❌'} OAuth2\n\n`;
    
    // Real problems detected
    if (diagnostico.realProblems.length > 0) {
      mensaje += '🚨 ACTUAL PROBLEMS DETECTED:\n';
      diagnostico.realProblems.forEach((problem, i) => {
        mensaje += `${i + 1}. ${problem}\n`;
      });
      mensaje += '\n';
    }
    
    // Recommended solution
    mensaje += '💡 RECOMMENDED SOLUTION:\n';
    mensaje += diagnostico.recommendedSolution + '\n\n';
    
    // Specific steps
    if (diagnostico.realProblems.length > 0) {
      mensaje += '🎯 SPECIFIC STEPS:\n';
      mensaje += '1. Extensions > Addocu > 🔄 Reauthorize Permissions\n';
      mensaje += '2. Authorize ALL permissions\n';
      mensaje += '3. Try Addocu again\n\n';
      mensaje += '4. IF PROBLEMS PERSIST:\n';
      mensaje += '   • THEN manually verify Chrome and Sheets use same account\n';
      mensaje += '   • Use "🔍 Verify Accounts (IMPORTANT)" from menu';
    } else {
      mensaje += '🎯 EVERYTHING LOOKS CORRECT:\n';
      mensaje += 'Basic permissions are working.\n';
      mensaje += 'If you have issues, manually verify account consistency.';
    }
    
    ui.alert('🔍 Corrected Simplified Diagnostic', mensaje, ui.ButtonSet.OK);
    
    logEvent('DIAGNOSTIC_CORRECTED', `Corrected diagnostic completed for: ${diagnostico.account}`);
    
  } catch (error) {
    logError('DIAGNOSTIC_CORRECTED', `Error in corrected diagnostic: ${error.message}`);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        'Diagnostic Error',
        `Could not complete diagnostic: ${error.message}\n\n` +
        'This suggests serious permission problems.\n\n' +
        'SOLUTION: Extensions > Addocu > 🔄 Reauthorize Permissions',
        ui.ButtonSet.OK
      );
    } catch (e) {
      console.error('Critical error in diagnostic:', error.message);
    }
  }
}

// =================================================================
// CORRECTED FUNCTIONS FOR COORDINADOR.JS
// =================================================================

/**
 * CORRECTED: Simplified function for sidebar - no false account assumptions.
 * @returns {Array} Corrected simplified diagnostic results.
 */
function diagnosticarConexionesSimplificadoCorregido() {
  try {
    const diagnostico = diagnosticoSimplificadoCorregido();
    const resultados = [];
    
    // 1. Account status (for info only)
    resultados.push([
      'Current Account',
      diagnostico.account || 'Unknown',
      diagnostico.account ? 'INFO' : 'WARNING',
      diagnostico.account ? 
        'Account information available' : 
        'Cannot access account info - permission error'
    ]);
    
    // 2. Basic permissions (NO ASSUMPTIONS)
    resultados.push([
      'Basic Permissions',
      diagnostico.permissions.userProperties ? 'Configuration OK' : 'Configuration Error',
      diagnostico.permissions.userProperties ? 'OK' : 'ERROR',
      diagnostico.permissions.userProperties ? 
        'UserProperties working' : 
        'Permission error - try reauthorizing permissions first'
    ]);
    
    // 3. OAuth2 (factual)
    resultados.push([
      'OAuth2 Token',
      diagnostico.permissions.oauth2 ? 'Token available' : 'No token',
      diagnostico.permissions.oauth2 ? 'OK' : 'PENDING',
      diagnostico.permissions.oauth2 ? 
        'OAuth2 working' : 
        'Run audit to authorize'
    ]);
    
    return resultados;
    
  } catch (error) {
    logError('DIAGNOSTIC_CORRECTED_SIDEBAR', `Error in corrected sidebar diagnostic: ${error.message}`);
    
    return [
      ['Addocu System', 'Critical Error', 'ERROR', `System error: ${error.message}`],
      ['Primary Solution', 'Reauthorize Permissions', 'ACTION', 'Extensions > Addocu > 🔄 Reauthorize Permissions'],
      ['IF STILL PROBLEMS', 'Manual Account Check', 'ACTION', 'Manually verify Chrome/Sheets use same account']
    ];
  }
}

/**
 * CORRECTED: Simplified permission recovery (no automatic account assumptions).
 * @returns {Object} Accurate recovery results.
 */
function recuperacionSimplificadaCorregida() {
  try {
    logEvent('RECOVERY_CORRECTED', 'Starting corrected simplified recovery...');
    
    // Test basic permissions (no account assumptions)
    const diagnostico = diagnosticoSimplificadoCorregido();
    
    if (diagnostico.permissions.userProperties && 
        diagnostico.permissions.spreadsheet && 
        diagnostico.permissions.ui) {
      logEvent('RECOVERY_CORRECTED', 'Recovery successful - basic permissions working');
      return {
        success: true,
        message: 'Basic permissions working correctly'
      };
    } else {
      logWarning('RECOVERY_CORRECTED', `Missing permissions: ${JSON.stringify(diagnostico.permissions)}`);
      return {
        success: false,
        message: 'Missing basic permissions',
        requiresReauth: true,
        recommendation: 'Execute complete permission reauthorization. If problems persist, manually verify account consistency.'
      };
    }
    
  } catch (error) {
    logError('RECOVERY_CORRECTED', `Error in corrected simplified recovery: ${error.message}`);
    return {
      success: false,
      message: `Error: ${error.message}`,
      requiresManualAuth: true,
      recommendation: 'Try reauthorization first. If that fails, manually check account consistency.'
    };
  }
}
