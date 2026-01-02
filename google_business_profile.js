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
        ui.alert('✅ GBP sync completed successfully!\n' +
            'Added ' + result.records + ' elements to ' + result.sheets + ' sheets.');
        return result;
    } catch (e) {
        logError('GBP_UI', 'Error in GBP sync: ' + e.message);
        ui.alert('❌ Error in GBP sync: ' + e.message);
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
            return { success: true, records: 0, sheets: 0 };
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
        throw new Error(errorMsg);
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
        return {
            name: loc.name,
            title: loc.title,
            category: category,
            storeCode: loc.storeCode || 'N/A',
            status: loc.metadata && loc.metadata.mapsUri ? 'Active' : 'Missing Info',
            mapsUri: loc.metadata ? loc.metadata.mapsUri : 'N/A'
        };
    });
}

/**
 * Writes GBP accounts to a Google Sheet.
 * @param {Array} accounts - Accounts list.
 */
function writeGBPAccountsToSheet(accounts) {
    const headers = ['Account ID', 'Display Name', 'Type', 'Verification Status', 'Role', 'Sync Date'];
    const data = accounts.map(acc => [
        acc.name,
        acc.accountName,
        acc.type,
        acc.verificationStatus,
        acc.role,
        new Date()
    ]);

    writeToSheet('GBP_ACCOUNTS', headers, data, true);
}

/**
 * Writes GBP locations to a Google Sheet.
 * @param {Array} locations - Locations list.
 */
function writeGBPLocationsToSheet(locations) {
    const headers = ['Location Name', 'Title', 'Category', 'Store Code', 'Status', 'Account', 'Account Type', 'Maps URL', 'Sync Date'];
    const data = locations.map(loc => [
        loc.name,
        loc.title,
        loc.category,
        loc.storeCode,
        loc.status,
        loc.accountName,
        loc.accountType,
        loc.mapsUri,
        new Date()
    ]);

    writeToSheet('GBP_LOCATIONS', headers, data, true);
}
