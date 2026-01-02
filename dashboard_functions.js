/**
 * Dashboard functions module loading validation
 * @returns {boolean} true if module is loaded
 */
function isDashboardFunctionsLoaded() {
  logEvent('DASHBOARD_VALIDATION', 'Module dashboard_functions.js loaded correctly');
  return true;
}

/**
 * Function to get dashboard data for interactive HTML.
 * This function is called from dashboard.html
 * @returns {Object} Structured data for dashboard
 */
function getHtmlDashboardData() {
  try {
    logEvent('DASHBOARD_HTML', 'Starting data collection for HTML dashboard');

    // Collect main KPIs - STRICT VERIFICATION
    const kpis = {
      totalAssets: 0,
      totalReports: 0,
      totalProperties: 0,
      totalTags: 0,
      totalVariables: 0,
      totalTriggers: 0,
      totalContainers: 0,
      totalDimensions: 0,
      totalMetrics: 0,
      totalStreams: 0,
      totalGSCSites: 0,
      totalGSCSitemaps: 0,
      totalYTChannels: 0,
      totalYTPlaylists: 0,
      totalGBPAccounts: 0,
      totalGBPLocations: 0
    };

    // Count elements from each service ONLY IF THERE IS REAL DATA
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Looker Studio - verify there is real data
    const lookerSheet = ss.getSheetByName('LOOKER_STUDIO');
    if (lookerSheet && lookerSheet.getLastRow() > 1) {
      const data = lookerSheet.getDataRange().getValues();
      // Verify second row is not empty
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalReports = lookerSheet.getLastRow() - 1;
      }
    }

    // GA4 Properties - verify there is real data
    const ga4PropsSheet = ss.getSheetByName('GA4_PROPERTIES');
    if (ga4PropsSheet && ga4PropsSheet.getLastRow() > 1) {
      const data = ga4PropsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalProperties = ga4PropsSheet.getLastRow() - 1;
      }
    }

    // GA4 Custom Dimensions - verify there is real data
    const ga4DimsSheet = ss.getSheetByName('GA4_CUSTOM_DIMENSIONS');
    if (ga4DimsSheet && ga4DimsSheet.getLastRow() > 1) {
      const data = ga4DimsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalDimensions = ga4DimsSheet.getLastRow() - 1;
      }
    }

    // GA4 Custom Metrics - verify there is real data
    const ga4MetricsSheet = ss.getSheetByName('GA4_CUSTOM_METRICS');
    if (ga4MetricsSheet && ga4MetricsSheet.getLastRow() > 1) {
      const data = ga4MetricsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalMetrics = ga4MetricsSheet.getLastRow() - 1;
      }
    }

    // GA4 Data Streams - verify there is real data
    const ga4StreamsSheet = ss.getSheetByName('GA4_DATA_STREAMS');
    if (ga4StreamsSheet && ga4StreamsSheet.getLastRow() > 1) {
      const data = ga4StreamsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalStreams = ga4StreamsSheet.getLastRow() - 1;
      }
    }

    // GTM Tags - verify there is real data
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');
    if (gtmTagsSheet && gtmTagsSheet.getLastRow() > 1) {
      const data = gtmTagsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalTags = gtmTagsSheet.getLastRow() - 1;
      }
    }

    // GTM Variables - verify there is real data
    const gtmVarsSheet = ss.getSheetByName('GTM_VARIABLES');
    if (gtmVarsSheet && gtmVarsSheet.getLastRow() > 1) {
      const data = gtmVarsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalVariables = gtmVarsSheet.getLastRow() - 1;
      }
    }

    // GTM Triggers - verify there is real data
    const gtmTriggersSheet = ss.getSheetByName('GTM_TRIGGERS');
    if (gtmTriggersSheet && gtmTriggersSheet.getLastRow() > 1) {
      const data = gtmTriggersSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalTriggers = gtmTriggersSheet.getLastRow() - 1;
      }
    }

    // Search Console - Sites
    const gscSitesSheet = ss.getSheetByName('GSC_SITES');
    if (gscSitesSheet && gscSitesSheet.getLastRow() > 1) {
      const data = gscSitesSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalGSCSites = gscSitesSheet.getLastRow() - 1;
      }
    }

    // Search Console - Sitemaps
    const gscSitemapsSheet = ss.getSheetByName('GSC_SITEMAPS');
    if (gscSitemapsSheet && gscSitemapsSheet.getLastRow() > 1) {
      const data = gscSitemapsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalGSCSitemaps = gscSitemapsSheet.getLastRow() - 1;
      }
    }

    // YouTube - Channels
    const ytChannelsSheet = ss.getSheetByName('YOUTUBE_CHANNELS');
    if (ytChannelsSheet && ytChannelsSheet.getLastRow() > 1) {
      const data = ytChannelsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalYTChannels = ytChannelsSheet.getLastRow() - 1;
      }
    }

    // YouTube - Playlists
    const ytPlaylistsSheet = ss.getSheetByName('YOUTUBE_PLAYLISTS');
    if (ytPlaylistsSheet && ytPlaylistsSheet.getLastRow() > 1) {
      const data = ytPlaylistsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalYTPlaylists = ytPlaylistsSheet.getLastRow() - 1;
      }
    }

    // Google Business Profile - Accounts
    const gbpAccountsSheet = ss.getSheetByName('GBP_ACCOUNTS');
    if (gbpAccountsSheet && gbpAccountsSheet.getLastRow() > 1) {
      const data = gbpAccountsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalGBPAccounts = gbpAccountsSheet.getLastRow() - 1;
      }
    }

    // Google Business Profile - Locations
    const gbpLocationsSheet = ss.getSheetByName('GBP_LOCATIONS');
    if (gbpLocationsSheet && gbpLocationsSheet.getLastRow() > 1) {
      const data = gbpLocationsSheet.getDataRange().getValues();
      if (data.length > 1 && data[1].some(cell => cell && cell.toString().trim() !== '')) {
        kpis.totalGBPLocations = gbpLocationsSheet.getLastRow() - 1;
      }
    }

    // Count unique containers ONLY IF THERE ARE REAL TAGS
    kpis.totalContainers = kpis.totalTags > 0 ? countUniqueContainers() : 0;

    // Total assets (real sum of elements with data)
    kpis.totalAssets = kpis.totalReports + kpis.totalProperties + kpis.totalTags +
      kpis.totalDimensions + kpis.totalMetrics + kpis.totalStreams +
      kpis.totalVariables + kpis.totalTriggers +
      kpis.totalGSCSites + kpis.totalGSCSitemaps +
      kpis.totalYTChannels + kpis.totalYTPlaylists +
      kpis.totalGBPAccounts + kpis.totalGBPLocations;

    // Quality analysis ONLY IF THERE IS DATA
    const quality = kpis.totalAssets > 0 ? analyzeQualityForDashboard() : {
      orphanTriggers: [],
      tagsWithoutTriggers: [],
      errorsDetected: 0
    };

    // Chart data (based ONLY on real data)
    const charts = {
      elementsByTool: {
        categories: ['Looker Studio', 'Google Analytics 4', 'Google Tag Manager', 'Search Console', 'YouTube', 'GBP'],
        series: [{
          name: 'Assets',
          data: [
            kpis.totalReports,
            kpis.totalProperties + kpis.totalDimensions + kpis.totalMetrics + kpis.totalStreams,
            kpis.totalTags + kpis.totalVariables + kpis.totalTriggers,
            kpis.totalGSCSites + kpis.totalGSCSitemaps,
            kpis.totalYTChannels + kpis.totalYTPlaylists,
            kpis.totalGBPAccounts + kpis.totalGBPLocations
          ]
        }]
      },
      gtmTagBreakdown: kpis.totalTags > 0 ? generateGTMTagsBreakdown() : {
        labels: ['No data available'],
        series: [1]
      },
      gtmTagStatus: kpis.totalTags > 0 ? generateGTMTagsStatus() : {
        labels: ['No data available'],
        series: [1]
      }
    };

    // Get historical data for timeline and heatmap
    const historicalData = getHistoricalActivityData(30);

    const result = {
      kpis: kpis,
      quality: quality,
      charts: charts,
      historicalData: historicalData, // Include historical data for advanced charts
      timestamp: new Date().toISOString(),
      user: Session.getActiveUser().getEmail(),
      hasRealData: kpis.totalAssets > 0
    };

    logEvent('DASHBOARD_HTML', `Dashboard data generated. Total REAL assets: ${kpis.totalAssets}`);

    return result;

  } catch (error) {
    logError('DASHBOARD_HTML', `Error generating dashboard data: ${error.message}`);

    return {
      error: true,
      message: error.message,
      kpis: {
        totalAssets: 0,
        totalReports: 0,
        totalProperties: 0,
        totalTags: 0,
        totalVariables: 0,
        totalTriggers: 0,
        totalContainers: 0
      },
      quality: {
        orphanTriggers: [],
        tagsWithoutTriggers: [],
        errorsDetected: 0
      },
      charts: {
        elementsByTool: {
          categories: ['Looker Studio', 'Google Analytics 4', 'Google Tag Manager'],
          series: [{ name: 'Assets', data: [0, 0, 0] }]
        },
        gtmTagBreakdown: { labels: ['No data available'], series: [1] },
        gtmTagStatus: { labels: ['No data available'], series: [1] }
      },
      historicalData: null, // No historical data in error case
      hasRealData: false
    };
  }
}

/**
 * Counts unique containers from GTM_TAGS sheet ONLY IF THERE IS REAL DATA
 * @returns {number} Number of unique containers
 */
function countUniqueContainers() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');

    if (!gtmTagsSheet || gtmTagsSheet.getLastRow() <= 1) {
      return 0;
    }

    const data = gtmTagsSheet.getDataRange().getValues();

    // Verify there is real data beyond headers
    if (data.length <= 1) {
      return 0;
    }

    // Verify second row has real data
    if (!data[1].some(cell => cell && cell.toString().trim() !== '')) {
      return 0;
    }

    const headers = data[0];
    const containerIndex = headers.indexOf('Container ID');

    if (containerIndex === -1) {
      return 0;
    }

    const containers = new Set();
    for (let i = 1; i < data.length; i++) {
      const containerId = data[i][containerIndex];
      if (containerId && containerId.toString().trim()) {
        containers.add(containerId.toString().trim());
      }
    }

    return containers.size;

  } catch (e) {
    logWarning('DASHBOARD_HTML', `Error counting unique containers: ${e.message}`);
    return 0;
  }
}

/**
 * Analyzes data quality for dashboard ONLY IF THERE IS REAL DATA
 * @returns {Object} Simplified quality analysis
 */
function analyzeQualityForDashboard() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const quality = {
      orphanTriggers: [],
      tagsWithoutTriggers: [],
      errorsDetected: 0
    };

    // Basic GTM Tags analysis ONLY IF THERE IS REAL DATA
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');
    if (gtmTagsSheet && gtmTagsSheet.getLastRow() > 1) {
      const data = gtmTagsSheet.getDataRange().getValues();

      // Verify there is real data
      if (data.length <= 1 || !data[1].some(cell => cell && cell.toString().trim() !== '')) {
        return quality;
      }

      const headers = data[0];
      const triggerIndex = headers.indexOf('Firing Triggers') || headers.indexOf('Triggers');

      if (triggerIndex !== -1) {
        for (let i = 1; i < data.length; i++) {
          // Only analyze rows with real data
          if (data[i].some(cell => cell && cell.toString().trim() !== '')) {
            const triggers = data[i][triggerIndex];
            if (!triggers || triggers.toString().trim() === '' || triggers.toString().trim() === '[]') {
              quality.tagsWithoutTriggers.push(data[i][0] || `Tag ${i}`);
            }
          }
        }
      }
    }

    quality.errorsDetected = quality.orphanTriggers.length + quality.tagsWithoutTriggers.length;

    return quality;

  } catch (e) {
    logWarning('DASHBOARD_HTML', `Error in quality analysis: ${e.message}`);
    return { orphanTriggers: [], tagsWithoutTriggers: [], errorsDetected: 0 };
  }
}

/**
 * Generates GTM tag types breakdown for chart ONLY IF THERE IS REAL DATA
 * @returns {Object} Data for tag types chart
 */
function generateGTMTagsBreakdown() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');

    if (!gtmTagsSheet || gtmTagsSheet.getLastRow() <= 1) {
      return { labels: ['No data'], series: [1] };
    }

    const data = gtmTagsSheet.getDataRange().getValues();

    // Verify there is real data beyond headers
    if (data.length <= 1 || !data[1].some(cell => cell && cell.toString().trim() !== '')) {
      return { labels: ['No data'], series: [1] };
    }

    const headers = data[0];
    const typeIndex = headers.indexOf('Type') || headers.indexOf('Tag Type') || headers.indexOf('Tipo');

    if (typeIndex === -1) {
      return { labels: ['No data'], series: [1] };
    }

    const typeCounts = {};
    for (let i = 1; i < data.length; i++) {
      // Only count rows with real data
      if (data[i].some(cell => cell && cell.toString().trim() !== '')) {
        const type = data[i][typeIndex] || 'Unknown';
        if (type && type.toString().trim()) {
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        }
      }
    }

    // If no valid types, return empty state
    if (Object.keys(typeCounts).length === 0) {
      return { labels: ['No data'], series: [1] };
    }

    // Take top 6 types
    const sorted = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    return {
      labels: sorted.map(([label]) => label),
      series: sorted.map(([, count]) => count)
    };

  } catch (e) {
    logWarning('DASHBOARD_HTML', `Error generating tags breakdown: ${e.message}`);
    return { labels: ['Error'], series: [1] };
  }
}

/**
 * Generates GTM tags status (active vs paused) ONLY IF THERE IS REAL DATA
 * @returns {Object} Data for status chart
 */
function generateGTMTagsStatus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');

    if (!gtmTagsSheet || gtmTagsSheet.getLastRow() <= 1) {
      return { labels: ['No data'], series: [1] };
    }

    const data = gtmTagsSheet.getDataRange().getValues();

    // Verify there is real data beyond headers
    if (data.length <= 1 || !data[1].some(cell => cell && cell.toString().trim() !== '')) {
      return { labels: ['No data'], series: [1] };
    }

    const headers = data[0];
    const statusIndex = headers.indexOf('Status') || headers.indexOf('State') || headers.indexOf('Estado');

    let active = 0;
    let paused = 0;

    if (statusIndex !== -1) {
      for (let i = 1; i < data.length; i++) {
        // Only count rows with real data
        if (data[i].some(cell => cell && cell.toString().trim() !== '')) {
          const status = data[i][statusIndex] || '';
          if (status.toString().toLowerCase().includes('pause') ||
            status.toString().toLowerCase().includes('disable') ||
            status.toString().toLowerCase().includes('pausado')) {
            paused++;
          } else {
            active++;
          }
        }
      }
    } else {
      // If no status column, count only rows with real data as active
      for (let i = 1; i < data.length; i++) {
        if (data[i].some(cell => cell && cell.toString().trim() !== '')) {
          active++;
        }
      }
    }

    // If no valid data, return empty state
    if (active === 0 && paused === 0) {
      return { labels: ['No data'], series: [1] };
    }

    return {
      labels: ['Active', 'Paused'],
      series: [active, paused]
    };

  } catch (e) {
    logWarning('DASHBOARD_HTML', `Error generating tags status: ${e.message}`);
    return { labels: ['Error'], series: [1] };
  }
}

/**
 * Function for complete manual synchronization (called from dashboard)
 * @returns {Object} Synchronization result
 */
function synchronizeAllManual() {
  try {
    logEvent('DASHBOARD_SYNC', 'Starting complete manual synchronization from dashboard');

    const result = executeCompleteAudit(['ga4', 'gtm', 'looker', 'searchConsole']);

    // Record historical snapshot for timeline/heatmap data
    if (result.success) {
      recordActivitySnapshot(result);
    }

    logEvent('DASHBOARD_SYNC', `Manual synchronization completed: ${result.success ? 'SUCCESS' : 'ERROR'}`);

    return result;

  } catch (e) {
    logError('DASHBOARD_SYNC', `Error in manual synchronization: ${e.message}`);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Records activity snapshot for historical tracking
 * @param {Object} auditResult - Result from audit execution
 */
function recordActivitySnapshot(auditResult) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let activitySheet = ss.getSheetByName('ACTIVITY_HISTORY');

    if (!activitySheet) {
      activitySheet = ss.insertSheet('ACTIVITY_HISTORY');

      // Create headers
      const headers = [
        'Timestamp', 'Date', 'Day_of_Week', 'GA4_Assets', 'GTM_Assets',
        'Looker_Assets', 'Total_Assets', 'Containers', 'Tags_Modified',
        'New_Assets_Added', 'Audit_Duration_Seconds'
      ];
      activitySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      activitySheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E8F0FE');
    }

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Calculate assets by service
    const ga4Assets = (auditResult.results?.ga4?.records || 0);
    const gtmAssets = (auditResult.results?.gtm?.records || 0);
    const lookerAssets = (auditResult.results?.looker?.records || 0);
    const gscAssets = (auditResult.results?.searchConsole?.records || 0);
    const ytAssets = (auditResult.results?.youtube?.records || 0);
    const gbpAssets = (auditResult.results?.googleBusinessProfile?.records || 0);
    const totalAssets = ga4Assets + gtmAssets + lookerAssets + gscAssets + ytAssets + gbpAssets;

    // Get container count from actual data
    const containers = countUniqueContainers();

    // Estimate modifications (simplified - in real implementation, compare with previous state)
    const estimatedModifications = Math.floor(totalAssets * 0.1); // 10% estimation
    const estimatedNewAssets = Math.floor(totalAssets * 0.05); // 5% estimation

    const snapshot = [
      now,
      now.toLocaleDateString('en-US'),
      dayNames[now.getDay()],
      ga4Assets,
      gtmAssets,
      lookerAssets,
      totalAssets,
      containers,
      estimatedModifications,
      estimatedNewAssets,
      Math.round((auditResult.duration || 0) / 1000)
    ];

    activitySheet.getRange(activitySheet.getLastRow() + 1, 1, 1, snapshot.length).setValues([snapshot]);

    // Keep only last 60 days of data (optional cleanup)
    const maxRows = 61; // 60 days + header
    if (activitySheet.getLastRow() > maxRows) {
      const rowsToDelete = activitySheet.getLastRow() - maxRows;
      activitySheet.deleteRows(2, rowsToDelete); // Delete oldest rows, keep header
    }

    logEvent('DASHBOARD_SYNC', 'Activity snapshot recorded for historical tracking');

  } catch (error) {
    logWarning('DASHBOARD_SYNC', `Error recording activity snapshot: ${error.message}`);
  }
}

/**
 * Gets historical activity data for dashboard charts
 * @param {number} days - Number of days to retrieve (default: 30)
 * @returns {Object} Historical activity data
 */
function getHistoricalActivityData(days = 30) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activitySheet = ss.getSheetByName('ACTIVITY_HISTORY');

    if (!activitySheet || activitySheet.getLastRow() < 2) {
      return null; // No historical data available
    }

    const data = activitySheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // Get indices for required columns
    const dateIndex = headers.indexOf('Date');
    const modificationsIndex = headers.indexOf('Tags_Modified');
    const newAssetsIndex = headers.indexOf('New_Assets_Added');
    const totalAssetsIndex = headers.indexOf('Total_Assets');
    const containersIndex = headers.indexOf('Containers');
    const dayOfWeekIndex = headers.indexOf('Day_of_Week');

    // Get last N days of data
    const recentData = rows.slice(-days);

    const result = {
      timeline: {
        dates: [],
        modifications: [],
        newAssets: []
      },
      heatmap: {
        byDayOfWeek: {},
        containerActivity: []
      },
      summary: {
        totalAssets: recentData.length > 0 ? recentData[recentData.length - 1][totalAssetsIndex] || 0 : 0,
        totalContainers: recentData.length > 0 ? recentData[recentData.length - 1][containersIndex] || 0 : 0
      }
    };

    // Process timeline data
    recentData.forEach(row => {
      if (dateIndex !== -1) result.timeline.dates.push(row[dateIndex] || '');
      if (modificationsIndex !== -1) result.timeline.modifications.push(row[modificationsIndex] || 0);
      if (newAssetsIndex !== -1) result.timeline.newAssets.push(row[newAssetsIndex] || 0);
    });

    // Process heatmap data by day of week
    const dayStats = {};
    recentData.forEach(row => {
      const dayOfWeek = row[dayOfWeekIndex] || 'Unknown';
      const modifications = row[modificationsIndex] || 0;

      if (!dayStats[dayOfWeek]) {
        dayStats[dayOfWeek] = { total: 0, count: 0 };
      }
      dayStats[dayOfWeek].total += modifications;
      dayStats[dayOfWeek].count += 1;
    });

    // Calculate averages by day of week
    Object.keys(dayStats).forEach(day => {
      result.heatmap.byDayOfWeek[day] = Math.round(dayStats[day].total / dayStats[day].count);
    });

    logEvent('DASHBOARD_HTML', `Retrieved ${recentData.length} days of historical activity data`);
    return result;

  } catch (error) {
    logWarning('DASHBOARD_HTML', `Error retrieving historical data: ${error.message}`);
    return null;
  }
}