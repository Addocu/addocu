/**
 * @fileoverview Looker Studio Module v3.0 - OAuth2 Implementation
 *
 * LOOKER STUDIO API IMPLEMENTATION NOTES:
 * ======================================
 *
 * API Status: Limited OAuth2 API (Stable)
 * Current Approach: Uses official Looker Studio API v1 with OAuth2
 * Endpoint: https://datastudio.googleapis.com/v1/assets:search
 *
 * Why This Approach Works:
 * - Looker Studio has very limited programmatic APIs
 * - The assets:search endpoint is the only way to list reports via API
 * - No Content API or comprehensive management API exists
 * - Reports must be discovered by searching assets with assetTypes=REPORT filter
 *
 * Current Implementation Strengths:
 * - Uses official Google API (not workarounds)
 * - OAuth2 authentication (standard for Addocu)
 * - Pagination support (handles many reports)
 * - Error handling with detailed logging
 * - Rate limiting with Utilities.sleep(500) between pages
 *
 * Limitations of Looker Studio API:
 * - No write operations (read-only)
 * - No ability to modify reports, data sources, or connections
 * - Limited metadata returned (no data source details, chart info, etc.)
 * - Reports older than creation time not discoverable
 * - Cannot list data sources independently
 *
 * Scope Required: https://www.googleapis.com/auth/datastudio
 *
 * Future Considerations:
 * - If Google releases Data Studio Management API, can migrate to official APIs
 * - Current implementation is stable and will continue to work
 * - No planned deprecation announced
 */

const LOOKER_STUDIO_HEADERS = [
  'Name', 'Asset ID', 'Tool', 'Asset Type', 'Creation Date',
  'Modification Date', 'Deletion Date', 'Owner Email', 'Owner Name',
  'Viewer Count', 'Is Public', 'Description', 'Tags', 'Locale', 'Theme',
  'Report URL', 'Embed URL', 'Status', 'Last Access', 'Data Sources',
  'ETag', 'Revision ID', 'Observations'
];

function syncLookerStudioWithUI() {
  const result = syncLookerStudioCore();
  const ui = SpreadsheetApp.getUi();
  if (result.status === 'SUCCESS') {
    const body = `Reports: ${result.records}\n\n` +
      `Total: ${result.records} elements | Time: ${Math.round(result.duration / 1000)}s\n\n` +
      `Data written to LOOKER_STUDIO.`;
    ui.alert('Looker Studio Synchronized', body, ui.ButtonSet.OK);
  } else {
    const body = `Synchronization failed: ${result.error}\n\n` +
      `Action: Verify that you have authorized the script with OAuth2 and have access to Looker Studio reports.\n\n` +
      `Details: Check LOGS sheet for more information.`;
    ui.alert('Looker Studio Error', body, ui.ButtonSet.OK);
  }
}

function syncLookerStudioCore() {
  const startTime = Date.now();
  const serviceName = 'lookerStudio';

  try {
    logSyncStart(serviceName, Session.getActiveUser().getEmail());

    // USE OAUTH2 ONLY (like GA4 and GTM)
    const reports = listLookerStudioReports();
    writeReportsToSheet(reports);

    const duration = Date.now() - startTime;
    logSyncEnd(serviceName, reports.length, duration, 'SUCCESS');

    return {
      records: reports.length,
      status: 'SUCCESS',
      duration: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd(serviceName, 0, duration, 'ERROR');
    logError('LOOKER', `Synchronization failed: ${error.message}`);

    // Report error in the primary sheet
    writeDataToSheet('LOOKER_STUDIO', LOOKER_STUDIO_HEADERS, null, 'Looker Studio', error.message);

    return {
      records: 0,
      status: 'ERROR',
      duration: duration,
      error: error.message
    };
  }
}

function listLookerStudioReports() {
  logEvent('LOOKER', 'Starting extraction with automatic OAuth2');

  // AUTOMATIC OAUTH2 (same as GA4 and GTM)
  const oauthToken = ScriptApp.getOAuthToken();
  if (!oauthToken) {
    throw new Error('OAuth2 token required. User must authorize the script.');
  }

  let pageToken = null;
  const allReports = [];
  let totalPages = 0;

  do {
    totalPages++;
    logEvent('LOOKER', `Processing page ${totalPages}...`);

    // OFFICIAL URL without API Key
    const url = 'https://datastudio.googleapis.com/v1/assets:search' +
      `?assetTypes=REPORT&pageSize=100` +
      (pageToken ? `&pageToken=${pageToken}` : '');

    // OAUTH2 headers (same as GA4/GTM)
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${oauthToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Addocu/3.0 (Google Sheets Add-on)'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode !== 200) {
      logError('LOOKER', `HTTP Error ${statusCode}: ${responseText.substring(0, 200)}`);
      throw new Error(`Error ${statusCode}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logError('LOOKER', `Error parsing JSON: ${responseText.substring(0, 200)}`);
      throw new Error(`Response is not valid JSON`);
    }

    if (data.assets && data.assets.length > 0) {
      logEvent('LOOKER', `Page ${totalPages}: Found ${data.assets.length} reports.`);
      const processedReports = data.assets.map(asset => processReportAsset(asset));
      allReports.push(...processedReports);
    }

    pageToken = data.nextPageToken;
    if (pageToken) Utilities.sleep(500);

  } while (pageToken && totalPages < 50);

  logEvent('LOOKER', `Extraction completed: ${allReports.length} reports.`);
  return allReports;
}

function processReportAsset(asset) {
  try {
    const ownerInfo = (typeof asset.owner === 'object') ? asset.owner : { email: asset.owner, displayName: asset.owner?.split('@')[0] };

    return {
      'Name': asset.title || 'Untitled',
      'Asset ID': asset.name || '',
      'Tool': 'Looker Studio',
      'Asset Type': asset.assetType || 'REPORT',
      'Creation Date': formatDate(asset.createTime),
      'Modification Date': formatDate(asset.updateTime),
      'Deletion Date': formatDate(asset.trashTime) || '',
      'Owner Email': ownerInfo.email || '',
      'Owner Name': ownerInfo.displayName || '',
      'Viewer Count': asset.viewerCount || 0,
      'Is Public': asset.isPublic || false,
      'Description': asset.description || '',
      'Tags': JSON.stringify(asset.tags || []),
      'Locale': asset.locale || '',
      'Theme': asset.theme || '',
      'Report URL': asset.name ? `https://lookerstudio.google.com/reporting/${asset.name.split('/').pop()}` : '',
      'Embed URL': asset.embedUrl || '',
      'Status': asset.status || 'ACTIVE',
      'Last Access': formatDate(asset.lastViewedTime) || '',
      'Data Sources': JSON.stringify(asset.dataSources || []),
      'ETag': asset.etag || '',
      'Revision ID': asset.revisionId || '',
      'Observations': buildReportObservations(asset)
    };
  } catch (error) {
    logError('LOOKER', `Error processing asset ${asset.title || asset.name}: ${error.message}`);
    return { 'Name': asset.title || 'Processing error', 'Observations': error.message };
  }
}

function buildReportObservations(asset) {
  const observations = [];
  if (asset.trashTime) observations.push(`⚠️ Deleted: ${formatDate(asset.trashTime)}`);
  if (asset.isPublic) observations.push(`🌐 Public`);
  if (asset.updateTime && asset.updateTime !== asset.createTime) observations.push(`🔄 Modified: ${formatDate(asset.updateTime)}`);
  return observations.join(' | ');
}

function writeReportsToSheet(reports) {
  writeDataToSheet('LOOKER_STUDIO', LOOKER_STUDIO_HEADERS, reports, 'Looker Studio');
}
