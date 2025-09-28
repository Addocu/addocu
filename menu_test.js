/**
 * @fileoverview Menu Function Verification Script - Addocu v3.0
 * @version Test script to verify all menu functions exist and work properly
 */

/**
 * Tests all menu functions to ensure they exist and are callable.
 * Run this function to verify the menu structure is correct.
 */
function testAllMenuFunctions() {
  const results = [];
  
  console.log('🔍 Testing Addocu Menu Functions...\n');
  
  // Test main menu functions
  const mainFunctions = [
    'openConfigurationSidebar',
    'startCompleteAudit', 
    'syncGA4WithUI',
    'syncGTMWithUI',
    'syncLookerStudioWithUI',
    'openHtmlDashboard'
  ];
  
  // Test tools submenu functions
  const toolsFunctions = [
    'diagnoseConnections',
    'testOAuth2',
    'analyzeRecentChangesUI',
    'cleanupLogsUI',
    'generateManualDashboard'
  ];
  
  // Test troubleshooting submenu functions
  const troubleshootingFunctions = [
    'showAccountVerification',
    'forcedPermissionReauthorization', 
    'forceAllPermissions',
    'showSimplifiedDiagnostics'
  ];
  
  // Test all function groups
  testFunctionGroup('Main Menu', mainFunctions, results);
  testFunctionGroup('Tools Submenu', toolsFunctions, results);
  testFunctionGroup('Troubleshooting Submenu', troubleshootingFunctions, results);
  
  // Show results
  console.log('\n📋 MENU FUNCTION TEST RESULTS:\n');
  results.forEach(result => {
    const status = result.exists ? '✅' : '❌';
    console.log(`${status} ${result.category}: ${result.function}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Summary
  const totalFunctions = results.length;
  const workingFunctions = results.filter(r => r.exists).length;
  const failedFunctions = results.filter(r => !r.exists).length;
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total functions: ${totalFunctions}`);
  console.log(`   Working: ${workingFunctions}`);
  console.log(`   Failed: ${failedFunctions}`);
  
  if (failedFunctions === 0) {
    console.log(`\n🎉 ALL MENU FUNCTIONS ARE AVAILABLE!`);
  } else {
    console.log(`\n🚨 ${failedFunctions} FUNCTIONS NEED ATTENTION`);
  }
  
  return results;
}

/**
 * Tests a group of functions.
 * @param {string} category - Function category name.
 * @param {Array} functions - Array of function names to test.
 * @param {Array} results - Results array to populate.
 */
function testFunctionGroup(category, functions, results) {
  console.log(`\n🔧 Testing ${category}:`);
  
  functions.forEach(functionName => {
    try {
      // Test if function exists
      const functionExists = typeof this[functionName] === 'function';
      
      console.log(`   ${functionExists ? '✅' : '❌'} ${functionName}`);
      
      results.push({
        category: category,
        function: functionName,
        exists: functionExists,
        error: functionExists ? null : 'Function not found'
      });
      
    } catch (error) {
      console.log(`   ❌ ${functionName} - Error: ${error.message}`);
      results.push({
        category: category,
        function: functionName,
        exists: false,
        error: error.message
      });
    }
  });
}

/**
 * Tests critical system functions used by the menu.
 */
function testCriticalSystemFunctions() {
  console.log('🔍 Testing Critical System Functions...\n');
  
  const criticalFunctions = [
    'onFileScopeGranted',
    'getUserConfig',
    'saveUserConfiguration', 
    'testCompleteConnection',
    'executeCompleteAudit',
    'syncGA4Core',
    'syncGTMCore',
    'syncLookerStudioCore'
  ];
  
  const results = [];
  
  criticalFunctions.forEach(functionName => {
    try {
      const functionExists = typeof this[functionName] === 'function';
      const status = functionExists ? '✅' : '❌';
      console.log(`${status} ${functionName}`);
      
      results.push({
        function: functionName,
        exists: functionExists
      });
      
    } catch (error) {
      console.log(`❌ ${functionName} - Error: ${error.message}`);
      results.push({
        function: functionName,
        exists: false,
        error: error.message
      });
    }
  });
  
  return results;
}

/**
 * Quick test specifically for troubleshooting menu functions.
 */
function testTroubleshootingMenuFunctions() {
  console.log('🆘 Testing Troubleshooting Menu Functions...\n');
  
  const functions = {
    'showAccountVerification': 'Should show account verification guide',
    'forcedPermissionReauthorization': 'Should show manual reauthorization instructions', 
    'forceAllPermissions': 'Should force all permission authorization',
    'showSimplifiedDiagnostics': 'Should show simplified diagnostics'
  };
  
  Object.keys(functions).forEach(functionName => {
    try {
      const exists = typeof this[functionName] === 'function';
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${functionName}`);
      console.log(`   Purpose: ${functions[functionName]}`);
      
      if (!exists) {
        console.log(`   🚨 MISSING: This function is called from the menu but doesn't exist!`);
      }
      
    } catch (error) {
      console.log(`❌ ${functionName} - Error: ${error.message}`);
    }
  });
}

/**
 * Verifies onFileScopeGranted trigger function.
 */
function verifyOnFileScopeGrantedFunction() {
  console.log('🔧 Verifying onFileScopeGranted Function...\n');
  
  try {
    const exists = typeof onFileScopeGranted === 'function';
    
    if (exists) {
      console.log('✅ onFileScopeGranted function exists');
      console.log('   This function is specified in appsscript.json');
      console.log('   It should be defined only in auth_recovery.js');
    } else {
      console.log('❌ onFileScopeGranted function NOT FOUND');
      console.log('   🚨 CRITICAL: This function is required by appsscript.json');
    }
    
  } catch (error) {
    console.log(`❌ Error checking onFileScopeGranted: ${error.message}`);
  }
}