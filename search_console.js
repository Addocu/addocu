/**
 * @fileoverview Google Search Console Synchronization Module.
 */

// =================================================================
// MODULE CONSTANTS AND CONFIGURATION
// =================================================================

const GSC_SITES_HEADERS = [
  'Site URL', 'Permission Level', 'Site Type', 'Notes'
];

const GSC_SITEMAPS_HEADERS = [
  'Site URL', 'Sitemap Path', 'Type', 'Last Downloaded', 'Last Submitted',
  'Total URLs', 'Errors', 'Warnings', 'Notes'
];

const GSC_SEARCH_APPEARANCE_HEADERS = [
  'Site URL', 'Appearance Type', 'Clicks', 'Impressions', 'CTR', 'Average Position'
];

// =================================================================
// SYNCHRONIZATION FUNCTIONS (EXECUTABLE FROM MENU)
// =================================================================

function syncSearchConsoleWithUI() {
  const result = syncSearchConsoleCore();
  const ui = SpreadsheetApp.getUi();
  if (result.status === 'SUCCESS') {
    const details = result.details;
    const body = `Sites: ${details.sites} | Sitemaps: ${details.sitemaps} | Search Appearance: ${details.appearances || 0}\n\n` +
      `Total: ${result.records} elements | Time: ${Math.round(result.duration / 1000)}s\n\n` +
      `Data written to GSC_SITES, GSC_SITEMAPS, GSC_SEARCH_APPEARANCE.`;
    ui.alert('Search Console Synchronized', body, ui.ButtonSet.OK);
  } else {
    const body = `Synchronization failed: ${result.error}\n\n` +
      `Action: Verify that you have verified sites in Google Search Console and that the script has been authorized.\n\n` +
      `Details: Check LOGS sheet for more information.`;
    ui.alert('Search Console Error', body, ui.ButtonSet.OK);
  }
}

// =================================================================
// CENTRAL SYNCHRONIZATION LOGIC
// =================================================================

function syncSearchConsoleCore() {
  const startTime = Date.now();
  const serviceName = 'searchConsole';
  const results = { sites: 0, sitemaps: 0 };

  try {
    const auth = getAuthConfig(serviceName);
    logSyncStart('GSC_Sync', auth.authUser);

    // 1. GET SITES
    logEvent('GSC', 'Phase 1: Extracting verified sites...');
    const sites = listSearchConsoleSites();
    results.sites = sites.length;

    const processedSites = sites.map(site => ({
      'Site URL': site.siteUrl,
      'Permission Level': site.permissionLevel,
      'Site Type': site.siteUrl.startsWith('sc-domain:') ? 'Domain Property' : 'URL Prefix',
      'Notes': `Permission: ${site.permissionLevel}`
    }));

    writeDataToSheet('GSC_SITES', GSC_SITES_HEADERS, processedSites, 'Search Console');

    // 2. GET SITEMAPS
    logEvent('GSC', 'Phase 2: Extracting sitemaps for verified sites...');
    const allSitemaps = [];
    for (const site of sites) {
      try {
        const sitemaps = getSearchConsoleSitemaps(site.siteUrl);
        allSitemaps.push(...sitemaps.map(sm => ({
          'Site URL': site.siteUrl,
          'Sitemap Path': sm.path,
          'Type': sm.type,
          'Last Downloaded': formatDate(sm.lastDownloaded),
          'Last Submitted': formatDate(sm.lastSubmitted),
          'Total URLs': sm.contents ? sm.contents.reduce((sum, c) => sum + parseInt(c.count || 0), 0) : 0,
          'Errors': sm.errors || 0,
          'Warnings': sm.warnings || 0,
          'Notes': `Type: ${sm.type} | Status: ${sm.errors > 0 ? 'Errors' : 'OK'}`
        })));
        Utilities.sleep(200); // Pause between sites
      } catch (e) {
        logWarning('GSC', `Could not get sitemaps for ${site.siteUrl}: ${e.message}`);
      }
    }
    results.sitemaps = allSitemaps.length;
    writeDataToSheet('GSC_SITEMAPS', GSC_SITEMAPS_HEADERS, allSitemaps, 'Search Console');

    // 3. GET SEARCH APPEARANCE DATA
    logEvent('GSC', 'Phase 3: Extracting search appearance data...');
    const allAppearances = [];
    for (const site of sites) {
      try {
        const appearances = getSearchAppearanceData(site.siteUrl);
        allAppearances.push(...appearances);
        Utilities.sleep(200); // Pause between sites
      } catch (e) {
        logWarning('GSC', `Could not get search appearance for ${site.siteUrl}: ${e.message}`);
      }
    }
    results.appearances = allAppearances.length;
    writeDataToSheet('GSC_SEARCH_APPEARANCE', GSC_SEARCH_APPEARANCE_HEADERS, allAppearances, 'Search Console');

    const totalElements = results.sites + results.sitemaps + (results.appearances || 0);
    const duration = Date.now() - startTime;
    logSyncEnd('GSC_Sync', totalElements, duration, 'SUCCESS');

    return {
      records: totalElements,
      status: 'SUCCESS',
      duration: duration,
      details: results
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('GSC_Sync', 0, duration, 'ERROR');
    logError('GSC', `Synchronization failed: ${error.message}`);

    // Report error in the primary sheet
    writeDataToSheet('GSC_SITES', GSC_SITES_HEADERS, null, 'Search Console', error.message);

    return {
      records: 0, status: 'ERROR', duration: duration, error: error.message
    };
  }
}

// =================================================================
// DATA EXTRACTION FUNCTIONS (HELPERS)
// =================================================================

function listSearchConsoleSites() {
  const auth = getAuthConfig('searchConsole');
  const url = 'https://searchconsole.googleapis.com/v1/sites';
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  const response = fetchWithRetry(url, options, 'GSC-Sites');
  // API v1 response structure: returns 'sites' array instead of 'siteEntry'
  return response.sites || [];
}

function getSearchConsoleSitemaps(siteUrl) {
  const auth = getAuthConfig('searchConsole');
  // Site URL must be encoded for the path parameter
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const url = `https://searchconsole.googleapis.com/v1/sites/${encodedSiteUrl}/sitemaps`;
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

  const response = fetchWithRetry(url, options, `GSC-Sitemaps-${siteUrl}`);
  // API v1 response structure: returns 'sitemaps' array instead of 'sitemap'
  return response.sitemaps || [];
}

/**
 * Gets search appearance performance data for a site.
 * @param {string} siteUrl - The site URL.
 * @returns {Array} Array of appearance data.
 */
function getSearchAppearanceData(siteUrl) {
  const auth = getAuthConfig('searchConsole');
  const encodedSiteUrl = encodeURIComponent(siteUrl);

  // Get data for last 28 days, grouped by searchAppearance
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);

  const url = `https://searchconsole.googleapis.com/v1/sites/${encodedSiteUrl}/searchAnalytics/query`;
  const payload = {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dimensions: ['searchAppearance'],
    rowLimit: 100
  };

  const options = {
    method: 'POST',
    headers: auth.headers,
    payload: JSON.stringify(payload),
    contentType: 'application/json',
    muteHttpExceptions: true
  };

  const response = fetchWithRetry(url, options, `GSC-Appearance-${siteUrl}`);

  if (!response || !response.rows) return [];

  return response.rows.map(row => ({
    'Site URL': siteUrl,
    'Appearance Type': row.keys[0] || 'Unknown',
    'Clicks': row.clicks || 0,
    'Impressions': row.impressions || 0,
    'CTR': row.ctr ? (row.ctr * 100).toFixed(2) + '%' : '0.00%',
    'Average Position': row.position ? row.position.toFixed(1) : 'N/A'
  }));
}
