/**
 * @fileoverview Looker Studio Module v3.0 - Hybrid Authentication
 * Uses OAuth2 for permissions + User API Key for access (consistent with Addocu model)
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
    ui.alert(
      '📊 Looker Studio Synchronized',
      `✅ ${result.records} reports synchronized successfully.\n\nTime: ${Math.round(result.duration / 1000)}s`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '❌ Looker Studio Error',
      `Synchronization failed: ${result.error}\n\nCheck the LOGS sheet for more details.`,
      ui.ButtonSet.OK
    );
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