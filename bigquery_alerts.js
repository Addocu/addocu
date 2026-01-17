/**
 * @fileoverview BigQuery Alerts Module for Addocu PRO
 * @version 1.0
 * 
 * Multi-dimension anomaly detection for GA4 BigQuery exports.
 * Compares D-2 data against:
 * - D-1: Previous day
 * - D-7: Same weekday last week
 * - D-364: Same weekday last year (52 weeks)
 * - Week Avg: Past 7-day average
 * 
 * Uses Job Polling pattern to avoid Apps Script 6-minute timeout.
 */

// =================================================================
// BIGQUERY ALERTS CONFIGURATION
// =================================================================

const BQ_ALERTS_CONFIG = {
    // Thresholds for anomaly detection (percentage change)
    thresholds: {
        warning: 30,    // 30% change triggers warning
        critical: 50    // 50% change triggers critical alert
    },
    // Minimum event count to consider (filters out noise)
    minEventCount: 100,
    // Days back to look for data
    lookbackDays: 400  // Enough for D-364 comparison
};

// Sheet names for alerts
const BQ_ALERTS_SHEETS = {
    anomalies: 'BQ_ANOMALIES',
    config: 'BQ_ALERTS_CONFIG'
};

// =================================================================
// MAIN ENTRY POINTS
// =================================================================

/**
 * Runs the Heartbeat Alert analysis.
 * Called from menu: Extensions > Addocu > Run Heartbeat Alert
 */
function runHeartbeatAlert() {
    try {
        const userConfig = getUserConfig();
        const projectId = userConfig.bqProjectId;

        if (!projectId) {
            SpreadsheetApp.getUi().alert(
                'Configuration Required',
                'Please set your BigQuery Project ID in Configure Addocu > Advanced Filters.',
                SpreadsheetApp.getUi().ButtonSet.OK
            );
            return;
        }

        logEvent('BQ_ALERTS', 'Starting Heartbeat Alert analysis...');
        SpreadsheetApp.getActiveSpreadsheet().toast('Starting anomaly detection...', 'Heartbeat Alert', 10);

        // Submit the BigQuery job
        const jobId = submitHeartbeatQuery(projectId);

        if (jobId) {
            // Store job ID for polling
            PropertiesService.getScriptProperties().setProperty('BQ_HEARTBEAT_JOB_ID', jobId);
            PropertiesService.getScriptProperties().setProperty('BQ_HEARTBEAT_PROJECT_ID', projectId);

            // Set up trigger to check job status in 10 seconds
            ScriptApp.newTrigger('checkHeartbeatJobStatus')
                .timeBased()
                .after(10 * 1000)
                .create();

            SpreadsheetApp.getActiveSpreadsheet().toast('Query submitted. Results will appear shortly...', 'Heartbeat Alert', 5);
        }
    } catch (e) {
        logError('BQ_ALERTS', `Heartbeat Alert failed: ${e.message}`);
        SpreadsheetApp.getUi().alert('Error', `Heartbeat Alert failed: ${e.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
}

/**
 * Checks the status of a running Heartbeat query job.
 * Called by time-based trigger.
 */
function checkHeartbeatJobStatus() {
    try {
        const scriptProps = PropertiesService.getScriptProperties();
        const jobId = scriptProps.getProperty('BQ_HEARTBEAT_JOB_ID');
        const projectId = scriptProps.getProperty('BQ_HEARTBEAT_PROJECT_ID');

        if (!jobId || !projectId) {
            logWarning('BQ_ALERTS', 'No pending Heartbeat job found');
            cleanupHeartbeatTriggers();
            return;
        }

        // Check job status
        const job = BigQuery.Jobs.get(projectId, jobId);
        const state = job.status.state;

        logEvent('BQ_ALERTS', `Heartbeat job ${jobId} status: ${state}`);

        if (state === 'DONE') {
            // Job completed - process results
            if (job.status.errorResult) {
                throw new Error(job.status.errorResult.message);
            }

            const results = BigQuery.Jobs.getQueryResults(projectId, jobId);
            processHeartbeatResults(results);

            // Cleanup
            scriptProps.deleteProperty('BQ_HEARTBEAT_JOB_ID');
            scriptProps.deleteProperty('BQ_HEARTBEAT_PROJECT_ID');
            cleanupHeartbeatTriggers();

            SpreadsheetApp.getActiveSpreadsheet().toast('Anomaly detection complete!', 'Heartbeat Alert', 5);

        } else if (state === 'RUNNING' || state === 'PENDING') {
            // Still running - check again in 10 seconds
            ScriptApp.newTrigger('checkHeartbeatJobStatus')
                .timeBased()
                .after(10 * 1000)
                .create();
        }
    } catch (e) {
        logError('BQ_ALERTS', `Error checking Heartbeat job: ${e.message}`);
        cleanupHeartbeatTriggers();
    }
}

// =================================================================
// BIGQUERY QUERY SUBMISSION
// =================================================================

/**
 * Submits the multi-dimension anomaly detection query to BigQuery.
 * @param {string} projectId - GCP Project ID
 * @returns {string} Job ID
 */
function submitHeartbeatQuery(projectId) {
    const datasetId = getGA4DatasetId(projectId);

    if (!datasetId) {
        throw new Error('No GA4 export dataset found. Ensure BigQuery export is enabled for your GA4 property.');
    }

    const query = buildHeartbeatQuery(projectId, datasetId);

    logEvent('BQ_ALERTS', `Submitting Heartbeat query to ${projectId}.${datasetId}`);

    const job = BigQuery.Jobs.insert({
        configuration: {
            query: {
                query: query,
                useLegacySql: false
            }
        }
    }, projectId);

    return job.jobReference.jobId;
}

/**
 * Builds the multi-dimension anomaly detection SQL query.
 * @param {string} projectId - GCP Project ID
 * @param {string} datasetId - BigQuery Dataset ID
 * @returns {string} SQL query
 */
function buildHeartbeatQuery(projectId, datasetId) {
    const minCount = BQ_ALERTS_CONFIG.minEventCount;
    const threshold = BQ_ALERTS_CONFIG.thresholds.warning;

    return `
WITH base_data AS (
  SELECT
    platform,
    event_name,
    PARSE_DATE('%Y%m%d', event_date) as event_date,
    COUNT(*) as event_count
  FROM \`${projectId}.${datasetId}.events_*\`
  WHERE _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 400 DAY))
    AND FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY))
  GROUP BY 1, 2, 3
),
d2_data AS (
  SELECT * FROM base_data
  WHERE event_date = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
),
comparisons AS (
  SELECT
    d2.platform,
    d2.event_name,
    d2.event_date,
    d2.event_count as actual,
    -- D-1: Previous Day
    d1.event_count as prev_day,
    ROUND(100 * SAFE_DIVIDE(d2.event_count - d1.event_count, d1.event_count), 2) as vs_prev_day_pct,
    -- D-7: Same Weekday Last Week
    d7.event_count as same_weekday,
    ROUND(100 * SAFE_DIVIDE(d2.event_count - d7.event_count, d7.event_count), 2) as vs_weekday_pct,
    -- D-364: Same Weekday Last Year (52 weeks back)
    d364.event_count as last_year,
    ROUND(100 * SAFE_DIVIDE(d2.event_count - d364.event_count, d364.event_count), 2) as vs_last_year_pct,
    -- Week Avg: Past 7-Day Average
    week_avg.avg_count as week_avg,
    ROUND(100 * SAFE_DIVIDE(d2.event_count - week_avg.avg_count, week_avg.avg_count), 2) as vs_week_avg_pct
  FROM d2_data d2
  LEFT JOIN base_data d1 ON d2.platform = d1.platform 
    AND d2.event_name = d1.event_name 
    AND d1.event_date = DATE_SUB(d2.event_date, INTERVAL 1 DAY)
  LEFT JOIN base_data d7 ON d2.platform = d7.platform 
    AND d2.event_name = d7.event_name 
    AND d7.event_date = DATE_SUB(d2.event_date, INTERVAL 7 DAY)
  LEFT JOIN base_data d364 ON d2.platform = d364.platform 
    AND d2.event_name = d364.event_name 
    AND d364.event_date = DATE_SUB(d2.event_date, INTERVAL 364 DAY)
  LEFT JOIN (
    SELECT platform, event_name, AVG(event_count) as avg_count
    FROM base_data
    WHERE event_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 9 DAY) 
      AND DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
    GROUP BY 1, 2
  ) week_avg ON d2.platform = week_avg.platform AND d2.event_name = week_avg.event_name
)
SELECT 
  platform,
  event_name,
  event_date,
  actual,
  prev_day,
  vs_prev_day_pct,
  same_weekday,
  vs_weekday_pct,
  last_year,
  vs_last_year_pct,
  ROUND(week_avg, 0) as week_avg,
  vs_week_avg_pct,
  -- Determine alert severity
  CASE
    WHEN ABS(vs_week_avg_pct) > 50 THEN 'CRITICAL'
    WHEN ABS(vs_week_avg_pct) > 30 THEN 'WARNING'
    ELSE 'NORMAL'
  END as alert_level
FROM comparisons
WHERE actual >= ${minCount}
  AND (ABS(vs_prev_day_pct) > ${threshold} OR ABS(vs_week_avg_pct) > ${threshold})
ORDER BY 
  CASE WHEN ABS(vs_week_avg_pct) > 50 THEN 1 WHEN ABS(vs_week_avg_pct) > 30 THEN 2 ELSE 3 END,
  ABS(vs_week_avg_pct) DESC
`;
}

// =================================================================
// RESULTS PROCESSING
// =================================================================

/**
 * Processes Heartbeat query results and writes to sheet.
 * @param {Object} results - BigQuery query results
 */
function processHeartbeatResults(results) {
    const rows = results.rows || [];
    const syncDate = formatDate(new Date());

    logEvent('BQ_ALERTS', `Processing ${rows.length} anomaly results`);

    // Define headers
    const headers = [
        'Platform', 'Event Name', 'Event Date', 'Actual',
        'Prev Day', 'vs D-1 %',
        'Same Weekday', 'vs D-7 %',
        'Last Year', 'vs D-364 %',
        'Week Avg', 'vs Avg %',
        'Alert Level', 'Sync Date'
    ];

    // Transform rows
    const data = rows.map(row => {
        const f = row.f;
        return [
            f[0].v || '',           // platform
            f[1].v || '',           // event_name
            f[2].v || '',           // event_date
            parseInt(f[3].v) || 0,  // actual
            parseInt(f[4].v) || 0,  // prev_day
            parseFloat(f[5].v) || 0, // vs_prev_day_pct
            parseInt(f[6].v) || 0,  // same_weekday
            parseFloat(f[7].v) || 0, // vs_weekday_pct
            parseInt(f[8].v) || 0,  // last_year
            parseFloat(f[9].v) || 0, // vs_last_year_pct
            parseInt(f[10].v) || 0, // week_avg
            parseFloat(f[11].v) || 0, // vs_week_avg_pct
            f[12].v || 'NORMAL',    // alert_level
            syncDate
        ];
    });

    // Write to sheet
    writeAnomalyResultsToSheet(headers, data);

    // Log summary
    const criticalCount = data.filter(r => r[12] === 'CRITICAL').length;
    const warningCount = data.filter(r => r[12] === 'WARNING').length;

    logEvent('BQ_ALERTS', `Heartbeat complete: ${criticalCount} critical, ${warningCount} warnings`);

    if (criticalCount > 0) {
        SpreadsheetApp.getActiveSpreadsheet().toast(
            `⚠️ ${criticalCount} CRITICAL anomalies detected! Check BQ_ANOMALIES sheet.`,
            'Heartbeat Alert',
            10
        );
    }
}

/**
 * Writes anomaly results to the BQ_ANOMALIES sheet.
 * @param {Array} headers - Column headers
 * @param {Array} data - Row data
 */
function writeAnomalyResultsToSheet(headers, data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(BQ_ALERTS_SHEETS.anomalies);

    if (!sheet) {
        sheet = ss.insertSheet(BQ_ALERTS_SHEETS.anomalies);
        sheet.setTabColor('#DC2626'); // Red tab for alerts
    }

    sheet.clear();

    // Write headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1A5DBB');
    headerRange.setFontColor('white');

    // Write data
    if (data.length > 0) {
        const dataRange = sheet.getRange(2, 1, data.length, headers.length);
        dataRange.setValues(data);

        // Conditional formatting for alert levels
        const alertColIndex = headers.indexOf('Alert Level') + 1;
        const alertRange = sheet.getRange(2, alertColIndex, data.length, 1);

        // Apply color coding
        for (let i = 0; i < data.length; i++) {
            const alertLevel = data[i][12];
            const rowRange = sheet.getRange(i + 2, 1, 1, headers.length);

            if (alertLevel === 'CRITICAL') {
                rowRange.setBackground('#FEE2E2'); // Light red
                sheet.getRange(i + 2, alertColIndex).setFontColor('#DC2626').setFontWeight('bold');
            } else if (alertLevel === 'WARNING') {
                rowRange.setBackground('#FEF3C7'); // Light yellow
                sheet.getRange(i + 2, alertColIndex).setFontColor('#D97706').setFontWeight('bold');
            }
        }
    } else {
        sheet.getRange(2, 1).setValue('✅ No anomalies detected. Tracking looks healthy!');
        sheet.getRange(2, 1).setFontWeight('bold').setFontColor('#16A34A');
    }

    sheet.autoResizeColumns(1, headers.length);
    sheet.setFrozenRows(1);
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Finds the GA4 export dataset in the project.
 * @param {string} projectId - GCP Project ID
 * @returns {string|null} Dataset ID or null if not found
 */
function getGA4DatasetId(projectId) {
    try {
        const datasets = BigQuery.Datasets.list(projectId);

        if (!datasets.datasets) return null;

        // Look for analytics_ dataset (GA4 export naming convention)
        for (const dataset of datasets.datasets) {
            const datasetId = dataset.datasetReference.datasetId;
            if (datasetId.startsWith('analytics_')) {
                return datasetId;
            }
        }

        return null;
    } catch (e) {
        logError('BQ_ALERTS', `Error finding GA4 dataset: ${e.message}`);
        return null;
    }
}

/**
 * Cleans up Heartbeat trigger.
 */
function cleanupHeartbeatTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
        if (trigger.getHandlerFunction() === 'checkHeartbeatJobStatus') {
            ScriptApp.deleteTrigger(trigger);
        }
    }
}

/**
 * Estimates the cost of running the Heartbeat query.
 * @param {string} projectId - GCP Project ID
 * @returns {Object} Cost estimate
 */
function estimateHeartbeatQueryCost(projectId) {
    const datasetId = getGA4DatasetId(projectId);
    if (!datasetId) return { error: 'No dataset found' };

    const query = buildHeartbeatQuery(projectId, datasetId);

    try {
        const job = BigQuery.Jobs.insert({
            configuration: {
                query: {
                    query: query,
                    useLegacySql: false,
                    dryRun: true  // Dry run = no cost, just estimate
                }
            }
        }, projectId);

        const bytesProcessed = parseInt(job.statistics.totalBytesProcessed) || 0;
        const gbProcessed = bytesProcessed / (1024 * 1024 * 1024);
        const estimatedCostUSD = gbProcessed * 0.005; // $5/TB = $0.005/GB

        return {
            bytesProcessed: bytesProcessed,
            gbProcessed: gbProcessed.toFixed(2),
            estimatedCostUSD: estimatedCostUSD.toFixed(4)
        };
    } catch (e) {
        return { error: e.message };
    }
}
