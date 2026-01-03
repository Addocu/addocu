/**
 * @fileoverview Google Merchant Center Synchronization Module.
 * @version 1.0
 */

// =================================================================
// MODULE CONSTANTS AND CONFIGURATION
// =================================================================

const GMC_ACCOUNTS_HEADERS = [
  'Account ID', 'Account Name', 'Website', 'Time Zone', 'Adult Content', 'Sync Date'
];

const GMC_DATA_SOURCES_HEADERS = [
  'Account ID', 'Data Source ID', 'Name', 'Type', 'Language', 'Target Countries', 'Sync Date'
];

const GMC_PRODUCTS_HEADERS = [
  'Account ID', 'Offer ID', 'Title', 'Availability', 'Condition', 'Brand', 'Price', 'Link', 'Category', 'Sync Date'
];

// =================================================================
// SYNCHRONIZATION FUNCTIONS (EXECUTABLE FROM MENU)
// =================================================================

/**
 * Main function to synchronize Google Merchant Center data.
 * @returns {Object} Sync status and record count.
 */
function syncGMCCore() {
  const startTime = Date.now();
  const serviceName = 'googleMerchantCenter';
  const results = { accounts: 0, dataSources: 0, products: 0 };

  try {
    const auth = getAuthConfig(serviceName);
    logSyncStart('GMC_Sync', auth.authUser);

    // 1. GET ACCOUNTS
    logEvent('GMC', 'Phase 1: Extracting Merchant Center accounts...');
    const accounts = listGMCAccounts();
    results.accounts = accounts.length;

    writeGMCAccountsToSheet(accounts);

    // 2. PROCESS EACH ACCOUNT FOR DATA SOURCES AND PRODUCTS
    const allDataSources = [];
    const allProducts = [];

    for (const account of accounts) {
      const accountId = account.accountId;
      const accountName = account.name; // Format: accounts/{account}

      // Try to register GCP for this account (ignore error if already registered)
      try {
        registerGCP(accountName, auth.authUser);
      } catch (e) {
        logEvent('GMC', `Note: GCP registration for ${accountId}: ${e.message}`);
      }

      // Get Data Sources
      try {
        const dataSources = listGMCDataSources(accountId);
        allDataSources.push(...dataSources.map(ds => ({
          'Account ID': accountId,
          ...ds
        })));
      } catch (e) {
        logWarning('GMC', `Could not get data sources for ${accountId}: ${e.message}`);
      }

      // Get Products (Sample/Top items)
      try {
        const products = listGMCProducts(accountId);
        allProducts.push(...products.map(p => ({
          'Account ID': accountId,
          ...p
        })));
      } catch (e) {
        logWarning('GMC', `Could not get products for ${accountId}: ${e.message}`);
      }

      Utilities.sleep(200); // Pause between accounts
    }

    results.dataSources = allDataSources.length;
    results.products = allProducts.length;

    writeGMCDataSourcesToSheet(allDataSources);
    writeGMCProductsToSheet(allProducts);

    const totalElements = results.accounts + results.dataSources + results.products;
    const duration = Date.now() - startTime;
    logSyncEnd('GMC_Sync', totalElements, duration, 'SUCCESS');

    return {
      records: totalElements,
      status: 'SUCCESS',
      duration: duration,
      details: results
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('GMC_Sync', 0, duration, 'ERROR');
    logError('GMC', `Synchronization failed: ${error.message}`);

    // Report error in the primary sheet
    writeDataToSheet('GMC_ACCOUNTS', GMC_ACCOUNTS_HEADERS, null, 'Merchant Center', error.message);

    return {
      records: 0,
      status: 'ERROR',
      duration: duration,
      error: error.message
    };
  }
}

/**
 * Entry point for UI calls.
 */
function syncGMCWithUI() {
  showLoadingNotification('Syncing Google Merchant Center assets...');
  const result = syncGMCCore();
  const ui = SpreadsheetApp.getUi();

  if (result.status === 'SUCCESS') {
    const details = result.details;
    const body = `Accounts: ${details.accounts} | Data Sources: ${details.dataSources} | Products: ${details.products}\n\n` +
      `Total: ${result.records} elements | Time: ${Math.round(result.duration / 1000)}s\n\n` +
      `Data written to GMC_ACCOUNTS, GMC_DATA_SOURCES, GMC_PRODUCTS.`;
    ui.alert('Merchant Center Synchronized', body, ui.ButtonSet.OK);
  } else {
    const body = `Synchronization failed: ${result.error}\n\n` +
      `Action: Verify that you have access to Google Merchant Center and that the script has been authorized.\n\n` +
      `Details: Check LOGS sheet for more information.`;
    ui.alert('Merchant Center Error', body, ui.ButtonSet.OK);
  }
}

// =================================================================
// DATA EXTRACTION HELPERS
// =================================================================

/**
 * Lists Merchant Center accounts for the authenticated user.
 * @returns {Array<Object>} Array of account objects.
 */
function listGMCAccounts() {
  const auth = getAuthConfig('googleMerchantCenter');
  const url = 'https://merchantapi.googleapis.com/accounts/v1/accounts';
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  const response = fetchWithRetry(url, options, 'GMC-Accounts');
  return response.accounts || [];
}

/**
 * Registers the Google Cloud Project for a specific account.
 * @param {string} accountName - Format: accounts/{account}
 * @param {string} developerEmail - The developer email.
 * @returns {Object} Response from API.
 */
function registerGCP(accountName, developerEmail) {
  const auth = getAuthConfig('googleMerchantCenter');
  const url = `https://merchantapi.googleapis.com/accounts/v1/${accountName}/developerRegistration:registerGcp`;
  const options = {
    method: 'POST',
    headers: auth.headers,
    payload: JSON.stringify({ developerEmail: developerEmail }),
    contentType: 'application/json',
    muteHttpExceptions: true
  };

  return fetchWithRetry(url, options, 'GMC-RegisterGCP');
}

/**
 * Lists data sources for a specific account.
 * @param {string} accountId - The Merchant Center account ID.
 * @returns {Array<Object>} Array of data source objects.
 */
function listGMCDataSources(accountId) {
  const auth = getAuthConfig('googleMerchantCenter');
  const url = `https://merchantapi.googleapis.com/datasources/v1/accounts/${accountId}/dataSources`;
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  const response = fetchWithRetry(url, options, `GMC-DataSources-${accountId}`);
  if (!response || !response.dataSources) return [];

  return response.dataSources.map(ds => ({
    'Data Source ID': ds.name.split('/').pop(),
    'Name': ds.displayName || 'Unnamed Source',
    'Type': ds.type || 'N/A',
    'Language': ds.contentLanguage || 'N/A',
    'Target Countries': ds.targetCountries ? ds.targetCountries.join(', ') : 'N/A'
  }));
}

/**
 * Lists processed products for a specific account.
 * @param {string} accountId - The Merchant Center account ID.
 * @returns {Array<Object>} Array of product objects.
 */
function listGMCProducts(accountId) {
  const auth = getAuthConfig('googleMerchantCenter');
  const url = `https://merchantapi.googleapis.com/products/v1/accounts/${accountId}/products?pageSize=50`;
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  const response = fetchWithRetry(url, options, `GMC-Products-${accountId}`);
  if (!response || !response.products) return [];

  return response.products.map(p => ({
    'Offer ID': p.offerId || 'N/A',
    'Title': p.title || 'Untitled',
    'Availability': p.availability || 'N/A',
    'Condition': p.condition || 'N/A',
    'Brand': p.brand || 'N/A',
    'Price': p.price ? `${p.price.amount} ${p.price.currency}` : 'N/A',
    'Link': p.link || 'N/A',
    'Category': p.googleProductCategory || 'N/A'
  }));
}

// =================================================================
// SHEET WRITING HELPERS
// =================================================================

function writeGMCAccountsToSheet(accounts) {
  const syncDate = formatDate(new Date());
  const data = accounts.map(a => [
    a.accountId,
    a.displayName,
    a.websiteUrl,
    a.accountType,
    a.timeZone,
    a.adultContent,
    syncDate
  ]);
  writeDataToSheet('GMC_ACCOUNTS', GMC_ACCOUNTS_HEADERS, data, 'Merchant Center');
}

function writeGMCDataSourcesToSheet(dataSources) {
  const syncDate = formatDate(new Date());
  const data = dataSources.map(ds => [
    ds['Account ID'],
    ds['Data Source ID'],
    ds['Name'],
    ds['Type'],
    ds['Language'],
    ds['Target Countries'],
    ds['Last Upload'],
    syncDate
  ]);
  writeDataToSheet('GMC_DATA_SOURCES', GMC_DATA_SOURCES_HEADERS, data, 'Merchant Center');
}

function writeGMCProductsToSheet(products) {
  const syncDate = formatDate(new Date());
  const data = products.map(p => [
    p['Account ID'],
    p['Offer ID'],
    p['Title'],
    p['Availability'],
    p['Condition'],
    p['Brand'],
    p['Price'],
    p['Link'],
    p['Category'],
    syncDate
  ]);
  writeDataToSheet('GMC_PRODUCTS', GMC_PRODUCTS_HEADERS, data, 'Merchant Center');
}
