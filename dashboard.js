/**
 * @fileoverview Advanced Dashboard and Quality Reporting Module.
 */

// =================================================================
// MAIN FUNCTION (CALLED FROM MENU)
// =================================================================

/**
 * Generates or updates the Advanced Dashboard.
 */
function updateAdvancedDashboard() {
  const ui = SpreadsheetApp.getUi();
  logEvent('DASHBOARD_V3', 'Starting Advanced Dashboard generation...');
  
  try {
    const dashboardData = collectDashboardData();
    renderAdvancedDashboard(dashboardData);
    
    flushLogs();
    ui.alert('✅ Advanced Dashboard Generated', 'The new control panel has been created and updated successfully.', ui.ButtonSet.OK);

  } catch (error) {
    logError('DASHBOARD_V3', `Could not generate advanced dashboard: ${error.message}`);
    flushLogs();
    ui.alert('❌ Error', `Could not generate advanced dashboard: ${error.message}`, ui.ButtonSet.OK);
  }
}

// =================================================================
// DASHBOARD RENDERING LOGIC
// =================================================================

/**
 * Draws and fills the Dashboard sheet with all data and formats.
 * @param {Object} data The object containing all pre-calculated statistics.
 */
function renderAdvancedDashboard(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dashboardSheet = ss.getSheetByName('ADVANCED_DASHBOARD');
    
    if (!dashboardSheet) {
      dashboardSheet = ss.insertSheet('ADVANCED_DASHBOARD', 0);
    }
    
    dashboardSheet.clear();
    
    // Header
    dashboardSheet.getRange(1, 1).setValue('🚀 ADDOCU - ADVANCED DASHBOARD');
    dashboardSheet.getRange(2, 1).setValue(`Generated: ${new Date().toLocaleString('en-US')}`);
    dashboardSheet.getRange(3, 1).setValue('');
    
    let currentRow = 4;
    
    // Summary Section
    dashboardSheet.getRange(currentRow, 1).setValue('📊 EXECUTIVE SUMMARY');
    dashboardSheet.getRange(currentRow, 1).setFontSize(14).setFontWeight('bold');
    currentRow += 2;
    
    // KPIs
    const kpis = [
      ['Total GA4 Properties', data.ga4.properties || 0],
      ['Total GTM Tags', data.gtm.tags || 0],
      ['Total Looker Reports', data.looker.reports || 0],
      ['Health Score', `${data.healthScore || 0}%`]
    ];
    
    dashboardSheet.getRange(currentRow, 1, kpis.length, 2).setValues(kpis);
    dashboardSheet.getRange(currentRow, 1, kpis.length, 1).setFontWeight('bold');
    
    currentRow += kpis.length + 2;
    
    // Service Status Section
    dashboardSheet.getRange(currentRow, 1).setValue('🔧 SERVICE STATUS');
    dashboardSheet.getRange(currentRow, 1).setFontSize(14).setFontWeight('bold');
    currentRow += 2;
    
    const serviceHeaders = ['Service', 'Status', 'Elements', 'Last Update', 'Quality Score'];
    dashboardSheet.getRange(currentRow, 1, 1, serviceHeaders.length).setValues([serviceHeaders]);
    dashboardSheet.getRange(currentRow, 1, 1, serviceHeaders.length).setFontWeight('bold').setBackground('#E8F0FE');
    currentRow++;
    
    const serviceData = [
      ['Google Analytics 4', data.ga4.status || '✅ Active', data.ga4.totalElements || 0, data.ga4.lastUpdate || 'Never', data.ga4.qualityScore || 'N/A'],
      ['Google Tag Manager', data.gtm.status || '✅ Active', data.gtm.totalElements || 0, data.gtm.lastUpdate || 'Never', data.gtm.qualityScore || 'N/A'],
      ['Looker Studio', data.looker.status || '✅ Active', data.looker.totalElements || 0, data.looker.lastUpdate || 'Never', data.looker.qualityScore || 'N/A']
    ];
    
    dashboardSheet.getRange(currentRow, 1, serviceData.length, serviceData[0].length).setValues(serviceData);
    
    // Auto-resize columns
    dashboardSheet.autoResizeColumns(1, serviceHeaders.length);
    
    // Header formatting
    dashboardSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    
    logEvent('DASHBOARD_V3', 'Advanced dashboard rendered successfully');
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error rendering advanced dashboard: ${error.message}`);
    throw error;
  }
}

// =================================================================
// DATA COLLECTION LOGIC FOR DASHBOARD
// =================================================================

/**
 * Orchestrates the collection of all statistics needed to build the dashboard.
 * @returns {Object} A nested object with all data.
 */
function collectDashboardData() {
  try {
    logEvent('DASHBOARD_V3', 'Collecting dashboard data...');
    
    const data = {
      ga4: getGA4Stats(),
      gtm: getGTMStats(),
      looker: getLookerStudioStats(),
      quality: analyzeDataQuality(),
      timestamp: new Date().toISOString()
    };
    
    // Calculate overall health score
    data.healthScore = calculateHealthScore(data.quality, data);
    
    logEvent('DASHBOARD_V3', 'Dashboard data collection completed');
    return data;
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error collecting dashboard data: ${error.message}`);
    throw error;
  }
}

/**
 * Gets historical data entries to calculate trends.
 */
function getHistoricalData(currentKpis) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historySheet = ss.getSheetByName('HISTORY');
    
    if (!historySheet || historySheet.getLastRow() < 2) {
      logWarning('DASHBOARD_V3', 'No historical data available');
      return [];
    }
    
    const data = historySheet.getDataRange().getValues();
    const headers = data.shift();
    
    // Return last 30 days of data
    return data.slice(-30);
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error getting historical data: ${error.message}`);
    return [];
  }
}

/**
 * Saves a "snapshot" of current KPIs to HISTORY sheet.
 */
function recordHistoricalSnapshot(kpis) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let historySheet = ss.getSheetByName('HISTORY');
    
    if (!historySheet) {
      historySheet = ss.insertSheet('HISTORY');
      const headers = ['Timestamp', 'GA4_Properties', 'GTM_Tags', 'Looker_Reports', 'Health_Score'];
      historySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    const snapshot = [
      new Date(),
      kpis.ga4?.totalElements || 0,
      kpis.gtm?.totalElements || 0,
      kpis.looker?.totalElements || 0,
      kpis.healthScore || 0
    ];
    
    historySheet.getRange(historySheet.getLastRow() + 1, 1, 1, snapshot.length).setValues([snapshot]);
    
    logEvent('DASHBOARD_V3', 'Historical snapshot recorded');
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error recording historical snapshot: ${error.message}`);
  }
}

/**
 * Orchestrates data quality analysis across all platforms.
 */
function analyzeDataQuality() {
  try {
    logEvent('DASHBOARD_V3', 'Starting data quality analysis...');
    
    const quality = {
      ga4: analyzeGA4Quality(),
      gtm: analyzeGTMQuality(),
      looker: analyzeLookerQuality(),
      overall: 0
    };
    
    // Calculate overall quality score
    const scores = [quality.ga4.score, quality.gtm.score, quality.looker.score];
    quality.overall = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    logEvent('DASHBOARD_V3', `Data quality analysis completed. Overall score: ${quality.overall.toFixed(1)}`);
    return quality;
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error in data quality analysis: ${error.message}`);
    return { ga4: {score: 0}, gtm: {score: 0}, looker: {score: 0}, overall: 0 };
  }
}

// =================================================================
// QUALITY ANALYSIS HELPERS
// =================================================================

function analyzeGTMQuality() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tagsSheet = ss.getSheetByName('GTM_TAGS');
    
    if (!tagsSheet || tagsSheet.getLastRow() < 2) {
      return { score: 0, issues: ['No GTM data available'] };
    }
    
    const issues = [];
    let score = 100;
    
    // Analyze tag quality (simplified example)
    const data = tagsSheet.getDataRange().getValues();
    const headers = data.shift();
    
    const pausedTags = data.filter(row => row[6] === 'Paused').length; // Status column
    const tagsWithoutTriggers = data.filter(row => !row[7] || row[7] === 'No triggers').length; // Firing Triggers column
    
    if (pausedTags > 0) {
      issues.push(`${pausedTags} paused tags found`);
      score -= (pausedTags / data.length) * 20;
    }
    
    if (tagsWithoutTriggers > 0) {
      issues.push(`${tagsWithoutTriggers} tags without firing triggers`);
      score -= (tagsWithoutTriggers / data.length) * 30;
    }
    
    return { score: Math.max(0, score), issues: issues };
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error analyzing GTM quality: ${error.message}`);
    return { score: 0, issues: ['Error analyzing GTM quality'] };
  }
}

function analyzeLookerQuality() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const lookerSheet = ss.getSheetByName('LOOKER_STUDIO');
    
    if (!lookerSheet || lookerSheet.getLastRow() < 2) {
      return { score: 0, issues: ['No Looker Studio data available'] };
    }
    
    const issues = [];
    let score = 100;
    
    const data = lookerSheet.getDataRange().getValues();
    const headers = data.shift();
    
    const reportsWithoutDescription = data.filter(row => !row[11] || row[11] === '').length; // Description column
    const deletedReports = data.filter(row => row[6] && row[6] !== '').length; // Deletion Date column
    
    if (reportsWithoutDescription > 0) {
      issues.push(`${reportsWithoutDescription} reports without description`);
      score -= (reportsWithoutDescription / data.length) * 10;
    }
    
    if (deletedReports > 0) {
      issues.push(`${deletedReports} deleted reports found`);
      score -= (deletedReports / data.length) * 15;
    }
    
    return { score: Math.max(0, score), issues: issues };
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error analyzing Looker quality: ${error.message}`);
    return { score: 0, issues: ['Error analyzing Looker quality'] };
  }
}

function analyzeGA4Quality() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const propertiesSheet = ss.getSheetByName('GA4_PROPERTIES');
    
    if (!propertiesSheet || propertiesSheet.getLastRow() < 2) {
      return { score: 0, issues: ['No GA4 data available'] };
    }
    
    const issues = [];
    let score = 100;
    
    const data = propertiesSheet.getDataRange().getValues();
    const headers = data.shift();
    
    // Basic quality checks
    const propertiesWithoutTimezone = data.filter(row => !row[6] || row[6] === 'N/A').length; // Time Zone column
    const propertiesWithoutCurrency = data.filter(row => !row[5] || row[5] === 'N/A').length; // Currency Code column
    
    if (propertiesWithoutTimezone > 0) {
      issues.push(`${propertiesWithoutTimezone} properties without timezone`);
      score -= (propertiesWithoutTimezone / data.length) * 10;
    }
    
    if (propertiesWithoutCurrency > 0) {
      issues.push(`${propertiesWithoutCurrency} properties without currency`);
      score -= (propertiesWithoutCurrency / data.length) * 10;
    }
    
    return { score: Math.max(0, score), issues: issues };
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error analyzing GA4 quality: ${error.message}`);
    return { score: 0, issues: ['Error analyzing GA4 quality'] };
  }
}

// =================================================================
// STATISTICS AND FORMAT CALCULATION HELPERS
// =================================================================

function getGA4Stats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['GA4_PROPERTIES', 'GA4_CUSTOM_DIMENSIONS', 'GA4_CUSTOM_METRICS', 'GA4_DATA_STREAMS'];
    
    let totalElements = 0;
    const details = {};
    
    sheets.forEach(sheetName => {
      const count = countRecords(sheetName);
      details[sheetName.replace('GA4_', '').toLowerCase()] = count;
      totalElements += count;
    });
    
    return {
      totalElements: totalElements,
      properties: details.properties || 0,
      dimensions: details.custom_dimensions || 0,
      metrics: details.custom_metrics || 0,
      streams: details.data_streams || 0,
      status: totalElements > 0 ? '✅ Active' : '⚠️ No Data',
      lastUpdate: getLastUpdate('GA4'),
      qualityScore: 'N/A' // Will be calculated by quality analysis
    };
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error getting GA4 stats: ${error.message}`);
    return { totalElements: 0, status: '❌ Error', lastUpdate: 'Error' };
  }
}

function getLookerStudioStats() {
  try {
    const totalElements = countRecords('LOOKER_STUDIO');
    
    return {
      totalElements: totalElements,
      reports: totalElements,
      status: totalElements > 0 ? '✅ Active' : '⚠️ No Data',
      lastUpdate: getLastUpdate('LOOKER'),
      qualityScore: 'N/A' // Will be calculated by quality analysis
    };
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error getting Looker Studio stats: ${error.message}`);
    return { totalElements: 0, status: '❌ Error', lastUpdate: 'Error' };
  }
}

function getGTMStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['GTM_TAGS', 'GTM_TRIGGERS', 'GTM_VARIABLES'];
    
    let totalElements = 0;
    const details = {};
    
    sheets.forEach(sheetName => {
      const count = countRecords(sheetName);
      details[sheetName.replace('GTM_', '').toLowerCase()] = count;
      totalElements += count;
    });
    
    return {
      totalElements: totalElements,
      tags: details.tags || 0,
      triggers: details.triggers || 0,
      variables: details.variables || 0,
      status: totalElements > 0 ? '✅ Active' : '⚠️ No Data',
      lastUpdate: getLastUpdate('GTM'),
      qualityScore: 'N/A' // Will be calculated by quality analysis
    };
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error getting GTM stats: ${error.message}`);
    return { totalElements: 0, status: '❌ Error', lastUpdate: 'Error' };
  }
}

function countRecords(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return 0;
    
    const lastRow = sheet.getLastRow();
    return Math.max(0, lastRow - 1); // -1 to exclude header
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error counting records in ${sheetName}: ${error.message}`);
    return 0;
  }
}

function calculateHealthScore(quality, kpis) {
  try {
    if (!quality || !quality.overall) return 0;
    
    let score = quality.overall;
    
    // Boost score based on data completeness
    const totalElements = (kpis.ga4?.totalElements || 0) + 
                         (kpis.gtm?.totalElements || 0) + 
                         (kpis.looker?.totalElements || 0);
    
    if (totalElements > 100) score += 5;
    if (totalElements > 500) score += 5;
    if (totalElements > 1000) score += 5;
    
    return Math.min(100, Math.max(0, Math.round(score)));
    
  } catch (error) {
    logError('DASHBOARD_V3', `Error calculating health score: ${error.message}`);
    return 0;
  }
}

function formatKpiWithTrend(currentValue, history) {
  try {
    if (!history || history.length < 2) {
      return `${currentValue}`;
    }
    
    const previousValue = history[history.length - 2];
    const change = currentValue - previousValue;
    const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    
    return `${currentValue} ${trend}`;
    
  } catch (error) {
    return `${currentValue}`;
  }
}

function getLastUpdate(service) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const timestamp = userProperties.getProperty(`ADDOCU_LAST_SYNC_${service}`);
    
    if (timestamp) {
      return new Date(parseInt(timestamp)).toLocaleString('en-US');
    }
    
    return 'Never';
  } catch (e) {
    return 'Error';
  }
}