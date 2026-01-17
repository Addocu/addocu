/**
 * @fileoverview Google Business Profile (formerly GMB) integration for Addocu.
 * Handles fetching accounts and locations.
 */

/**
 * Main function to sync Google Business Profile data.
 * @returns {Object} Sync result.
 */
function syncGBPWithUI() {
  const ui = SpreadsheetApp.getUi();
  try {
    const result = syncGBPCore();
    if (result.success || result.status === 'SUCCESS') {
      const details = result.details || {};
      const body = `Accounts: ${result.accounts || details.accounts || 0} | Locations: ${result.locations || details.locations || 0}\n\n` +
        `Total: ${result.records} elements | Time: ${Math.round(result.duration / 1000)}s\n\n` +
        `Data written to GBP_ACCOUNTS, GBP_LOCATIONS.`;
      ui.alert('Google Business Profile Synchronized', body, ui.ButtonSet.OK);
    } else {
      const body = `Synchronization failed: ${result.error}\n\n` +
        `Action: Verify that you have access to Google Business Profile and that the script has been authorized.\n\n` +
        `Details: Check LOGS sheet for more information.`;
      ui.alert('Google Business Profile Error', body, ui.ButtonSet.OK);
    }
    return result;
  } catch (e) {
    logError('GBP_UI', 'Error in GBP sync: ' + e.message);
    const body = `Synchronization failed: ${e.message}\n\n` +
      `Action: Verify that you have access to Google Business Profile and that the script has been authorized.\n\n` +
      `Details: Check LOGS sheet for more information.`;
    ui.alert('Google Business Profile Error', body, ui.ButtonSet.OK);
    return { success: false, error: e.message };
  }
}

/**
 * Core logic for GBP synchronization.
 * @returns {Object} Audit result.
 */
function syncGBPCore() {
  const startTime = Date.now();
  logEvent('GBP_CORE', 'Starting Google Business Profile audit');

  try {
    // 1. Fetch Accounts
    const accounts = listGBPAccounts();
    if (!accounts || accounts.length === 0) {
      logWarning('GBP_CORE', 'No GBP accounts found');
      writeGBPAccountsToSheet([]); // Notification via utility
      writeGBPLocationsToSheet([]); // Notification via utility
      return { success: true, records: 0, sheets: 2, duration: Date.now() - startTime };
    }

    writeGBPAccountsToSheet(accounts);

    // 2. Fetch Locations for each account
    let allLocations = [];
    accounts.forEach(account => {
      const locations = listGBPLocations(account.name);
      if (locations && locations.length > 0) {
        // Add account info to each location for clarity
        locations.forEach(loc => {
          loc.accountName = account.accountName;
          loc.accountType = account.type;
        });
        allLocations = allLocations.concat(locations);
      }
    });

    writeGBPLocationsToSheet(allLocations);

    const duration = Date.now() - startTime;
    const totalRecords = accounts.length + allLocations.length;

    // Record last sync
    PropertiesService.getUserProperties().setProperty('ADDOCU_LAST_SYNC_googleBusinessProfile', Date.now().toString());

    logEvent('GBP_CORE', `GBP audit completed: ${totalRecords} elements in ${duration}ms`);

    return {
      success: true,
      records: totalRecords,
      sheets: 2,
      duration: duration
    };

  } catch (e) {
    let errorMsg = e.message;
    if (errorMsg.includes('429') || errorMsg.includes('Rate limit')) {
      errorMsg = 'Rate limit exceeded (429). Note: GBP API often defaults to 0 quota and requires explicit project approval from Google.';
    }
    logError('GBP_CORE', 'Error in syncGBPCore: ' + errorMsg);

    // Report error in the primary sheet
    writeDataToSheet('GBP_ACCOUNTS', GBP_ACCOUNTS_HEADERS, null, 'Business Profile', errorMsg);

    return {
      success: false,
      records: 0,
      status: 'ERROR',
      duration: Date.now() - startTime,
      error: errorMsg
    };
  }
}

/**
 * Lists all GBP accounts the user has access to.
 * @returns {Array} List of accounts.
 */
function listGBPAccounts() {
  const url = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';

  // Get auth config
  const auth = getAuthConfig('googleBusinessProfile');
  const options = {
    method: 'get',
    headers: auth.headers,
    muteHttpExceptions: true
  };

  // Use fetchWithRetry from utilities.js
  const response = fetchWithRetry(url, options, 'GBP-Accounts');

  if (!response || !response.accounts) return [];

  return response.accounts.map(acc => ({
    name: acc.name, // resource name: accounts/{accountId}
    accountName: acc.accountName, // display name
    type: acc.type,
    verificationStatus: acc.verificationStatus,
    role: acc.role
  }));
}

/**
 * Lists all locations for a specific GBP account.
 * @param {string} accountName - Resource name of the account (accounts/{accountId}).
 * @returns {Array} List of locations.
 */
function listGBPLocations(accountName) {
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,categories,storeCode,regularHours,labels,latlng,openInfo,metadata,serviceArea,relationshipData`;

  // Get auth config
  const auth = getAuthConfig('googleBusinessProfile');
  const options = {
    method: 'get',
    headers: auth.headers,
    muteHttpExceptions: true
  };

  // Use fetchWithRetry from utilities.js
  const response = fetchWithRetry(url, options, 'GBP-Locations');

  if (!response || !response.locations) return [];

  return response.locations.map(loc => {
    const category = loc.categories && loc.categories.primaryCategory ? loc.categories.primaryCategory.displayName : 'N/A';

    // Format regular hours
    let regularHours = 'N/A';
    if (loc.regularHours && loc.regularHours.periods) {
      regularHours = loc.regularHours.periods.map(p =>
        `${p.openDay || 'N/A'}: ${p.openTime?.hours || '00'}:${p.openTime?.minutes || '00'}-${p.closeTime?.hours || '00'}:${p.closeTime?.minutes || '00'}`
      ).join('; ');
    }

    // Determine open status
    let openStatus = 'N/A';
    if (loc.openInfo) {
      openStatus = loc.openInfo.status || 'N/A';
    }

    // Service area
    let serviceArea = 'N/A';
    if (loc.serviceArea && loc.serviceArea.places) {
      serviceArea = loc.serviceArea.places.length > 0 ? `${loc.serviceArea.places.length} areas` : 'N/A';
    }

    return {
      name: loc.name,
      title: loc.title,
      category: category,
      storeCode: loc.storeCode || 'N/A',
      status: loc.metadata && loc.metadata.mapsUri ? 'Active' : 'Missing Info',
      mapsUri: loc.metadata ? loc.metadata.mapsUri : 'N/A',
      regularHours: regularHours,
      openStatus: openStatus,
      serviceArea: serviceArea,
      latlng: loc.latlng
    };
  });
}

/**
 * Writes GBP accounts to a Google Sheet.
 * @param {Array} accounts - Accounts list.
 */
function writeGBPAccountsToSheet(accounts) {
  const headers = [
    'Account ID', 'Account Name', 'Type', 'Verification State', 'Sync Date'
  ];

  const syncDate = formatDate(new Date());
  const data = accounts.map(a => [
    a.name,
    a.accountName,
    a.type,
    a.verificationState,
    syncDate
  ]);

  writeDataToSheet('GBP_ACCOUNTS', headers, data, 'Google Business Profile');
}

/**
 * Writes GBP locations to a Google Sheet.
 * @param {Array} locations - Locations list.
 */
function writeGBPLocationsToSheet(locations) {
  const headers = [
    'Account Name', 'Account Type', 'Location Name', 'Location ID',
    'Address', 'Phone', 'Website', 'Primary Category', 'Latitude',
    'Longitude', 'Open Status', 'Regular Hours', 'Service Area', 'Verification State', 'Last Audit'
  ];

  const lastAudit = formatDate(new Date());
  const data = locations.map(loc => [
    loc.accountName,
    loc.accountType,
    loc.title,
    loc.name,
    loc.storefrontAddress?.addressLines?.join(', ') || '',
    loc.phoneNumbers?.primaryPhone || '',
    loc.websiteUri || '',
    loc.category || '',
    loc.latlng?.latitude || '',
    loc.latlng?.longitude || '',
    loc.openStatus || '',
    loc.regularHours || '',
    loc.serviceArea || '',
    loc.metadata?.verificationState || '',
    lastAudit
  ]);

  writeDataToSheet('GBP_LOCATIONS', headers, data, 'Google Business Profile');
}
