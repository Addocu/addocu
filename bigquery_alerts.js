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
    config: 'BQ_ALERTS_CONFIG',
    configAudit: 'CONFIG_AUDIT',
    paramHealth: 'BQ_PARAM_HEALTH',
    dataInventory: 'BQ_DATA_INVENTORY'
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

// =================================================================
// DIMENSIONAL HEALTH CHECK (Phase 2)
// =================================================================

/**
 * Runs the Dimensional Health Check.
 * Validates parameter fill rates based on CONFIG_AUDIT sheet rules.
 * Called from menu: Extensions > Addocu > Tools > Dimensional Health Check
 */
function runDimensionalHealthCheck() {
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

        // Ensure CONFIG_AUDIT sheet exists with template
        const auditRules = getOrCreateConfigAuditSheet();

        if (auditRules.length === 0) {
            SpreadsheetApp.getUi().alert(
                'No Audit Rules',
                'Please add at least one event/parameter rule to the CONFIG_AUDIT sheet, then run again.',
                SpreadsheetApp.getUi().ButtonSet.OK
            );
            return;
        }

        logEvent('BQ_ALERTS', `Starting Dimensional Health Check with ${auditRules.length} rules...`);
        SpreadsheetApp.getActiveSpreadsheet().toast(`Validating ${auditRules.length} event/param rules...`, 'Dimensional Health Check', 10);

        // Submit the BigQuery job
        const jobId = submitDimensionalHealthQuery(projectId, auditRules);

        if (jobId) {
            PropertiesService.getScriptProperties().setProperty('BQ_DIMHEALTH_JOB_ID', jobId);
            PropertiesService.getScriptProperties().setProperty('BQ_DIMHEALTH_PROJECT_ID', projectId);

            ScriptApp.newTrigger('checkDimensionalHealthJobStatus')
                .timeBased()
                .after(10 * 1000)
                .create();

            SpreadsheetApp.getActiveSpreadsheet().toast('Query submitted. Results will appear shortly...', 'Dimensional Health Check', 5);
        }
    } catch (e) {
        logError('BQ_ALERTS', `Dimensional Health Check failed: ${e.message}`);
        SpreadsheetApp.getUi().alert('Error', `Dimensional Health Check failed: ${e.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
}

/**
 * Checks the status of a running Dimensional Health query job.
 */
function checkDimensionalHealthJobStatus() {
    try {
        const scriptProps = PropertiesService.getScriptProperties();
        const jobId = scriptProps.getProperty('BQ_DIMHEALTH_JOB_ID');
        const projectId = scriptProps.getProperty('BQ_DIMHEALTH_PROJECT_ID');

        if (!jobId || !projectId) {
            cleanupDimensionalHealthTriggers();
            return;
        }

        const job = BigQuery.Jobs.get(projectId, jobId);
        const state = job.status.state;

        logEvent('BQ_ALERTS', `Dimensional Health job ${jobId} status: ${state}`);

        if (state === 'DONE') {
            if (job.status.errorResult) {
                throw new Error(job.status.errorResult.message);
            }

            const results = BigQuery.Jobs.getQueryResults(projectId, jobId);
            processDimensionalHealthResults(results);

            scriptProps.deleteProperty('BQ_DIMHEALTH_JOB_ID');
            scriptProps.deleteProperty('BQ_DIMHEALTH_PROJECT_ID');
            cleanupDimensionalHealthTriggers();

            SpreadsheetApp.getActiveSpreadsheet().toast('Dimensional Health Check complete!', 'Health Check', 5);

        } else if (state === 'RUNNING' || state === 'PENDING') {
            ScriptApp.newTrigger('checkDimensionalHealthJobStatus')
                .timeBased()
                .after(10 * 1000)
                .create();
        }
    } catch (e) {
        logError('BQ_ALERTS', `Error checking Dimensional Health job: ${e.message}`);
        cleanupDimensionalHealthTriggers();
    }
}

/**
 * Gets or creates the CONFIG_AUDIT sheet with template headers.
 * @returns {Array} Array of audit rule objects
 */
function getOrCreateConfigAuditSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(BQ_ALERTS_SHEETS.configAudit);

    const headers = ['Event Name', 'Parameter Name', 'Platform', 'Min Fill Rate %', 'Alert Type', 'Active'];

    if (!sheet) {
        // Create new sheet with template
        sheet = ss.insertSheet(BQ_ALERTS_SHEETS.configAudit);
        sheet.setTabColor('#3B82F6'); // Blue for config

        // Write headers
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setValues([headers]);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#1E40AF');
        headerRange.setFontColor('white');

        // Add example rows
        const examples = [
            ['purchase', 'im_store_id', 'ALL', 95, 'DROP', true],
            ['page_view', 'im_page_type', 'ALL', 90, 'DROP', true],
            ['add_to_cart', 'item_id', 'ALL', 99, 'DROP', true]
        ];
        sheet.getRange(2, 1, examples.length, headers.length).setValues(examples);

        // Add helper note
        sheet.getRange(6, 1).setValue('ℹ️ Add your critical event/parameter pairs above. Platform: ALL, WEB, IOS, or ANDROID');
        sheet.getRange(6, 1).setFontStyle('italic').setFontColor('#6B7280');

        sheet.autoResizeColumns(1, headers.length);
        sheet.setFrozenRows(1);

        logEvent('BQ_ALERTS', 'Created CONFIG_AUDIT sheet with template');
        return []; // Return empty on first creation so user can configure
    }

    // Read existing rules
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

    const rules = data
        .filter(row => row[0] && row[1] && row[5] === true) // Has event, param, and is active
        .map(row => ({
            eventName: row[0].toString().trim(),
            paramName: row[1].toString().trim(),
            platform: row[2].toString().trim() || 'ALL',
            minFillRate: parseFloat(row[3]) || 90,
            alertType: row[4].toString().trim() || 'DROP'
        }));

    return rules;
}

/**
 * Submits the Dimensional Health query to BigQuery.
 * @param {string} projectId - GCP Project ID
 * @param {Array} rules - Audit rules from CONFIG_AUDIT sheet
 * @returns {string} Job ID
 */
function submitDimensionalHealthQuery(projectId, rules) {
    const datasetId = getGA4DatasetId(projectId);

    if (!datasetId) {
        throw new Error('No GA4 export dataset found.');
    }

    const query = buildDimensionalHealthQuery(projectId, datasetId, rules);

    logEvent('BQ_ALERTS', `Submitting Dimensional Health query for ${rules.length} rules`);

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
 * Builds the Dimensional Health SQL query for all rules.
 * @param {string} projectId - GCP Project ID
 * @param {string} datasetId - BigQuery Dataset ID
 * @param {Array} rules - Audit rules
 * @returns {string} SQL query
 */
function buildDimensionalHealthQuery(projectId, datasetId, rules) {
    // Build UNION ALL for each rule
    const ruleQueries = rules.map((rule, idx) => {
        const platformFilter = rule.platform === 'ALL'
            ? ''
            : `AND platform = '${rule.platform}'`;

        return `
    SELECT
      '${rule.eventName}' as event_name,
      '${rule.paramName}' as parameter_name,
      '${rule.platform}' as expected_platform,
      platform as actual_platform,
      ${rule.minFillRate} as min_fill_rate,
      COUNT(*) as total_events,
      COUNTIF((SELECT value.string_value FROM UNNEST(event_params) WHERE key = '${rule.paramName}') IS NOT NULL
           OR (SELECT value.int_value FROM UNNEST(event_params) WHERE key = '${rule.paramName}') IS NOT NULL
           OR (SELECT value.double_value FROM UNNEST(event_params) WHERE key = '${rule.paramName}') IS NOT NULL) as with_param,
      ROUND(100 * COUNTIF((SELECT value.string_value FROM UNNEST(event_params) WHERE key = '${rule.paramName}') IS NOT NULL
           OR (SELECT value.int_value FROM UNNEST(event_params) WHERE key = '${rule.paramName}') IS NOT NULL
           OR (SELECT value.double_value FROM UNNEST(event_params) WHERE key = '${rule.paramName}') IS NOT NULL) / COUNT(*), 2) as fill_rate_pct
    FROM \`${projectId}.${datasetId}.events_*\`
    WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY))
      AND event_name = '${rule.eventName}'
      ${platformFilter}
    GROUP BY platform`;
    });

    const unionQuery = ruleQueries.join('\n    UNION ALL\n');

    return `
WITH param_stats AS (
  ${unionQuery}
)
SELECT
  event_name,
  parameter_name,
  expected_platform,
  actual_platform,
  min_fill_rate,
  total_events,
  with_param,
  fill_rate_pct,
  CASE
    WHEN fill_rate_pct < min_fill_rate - 10 THEN 'CRITICAL'
    WHEN fill_rate_pct < min_fill_rate THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM param_stats
WHERE total_events > 0
ORDER BY 
  CASE WHEN fill_rate_pct < min_fill_rate - 10 THEN 1 WHEN fill_rate_pct < min_fill_rate THEN 2 ELSE 3 END,
  fill_rate_pct ASC
`;
}

/**
 * Processes Dimensional Health query results.
 * @param {Object} results - BigQuery query results
 */
function processDimensionalHealthResults(results) {
    const rows = results.rows || [];
    const syncDate = formatDate(new Date());

    logEvent('BQ_ALERTS', `Processing ${rows.length} parameter health results`);

    const headers = [
        'Event', 'Parameter', 'Expected Platform', 'Actual Platform',
        'Min Fill Rate', 'Total Events', 'With Param', 'Fill Rate %', 'Status', 'Sync Date'
    ];

    const data = rows.map(row => {
        const f = row.f;
        return [
            f[0].v || '',
            f[1].v || '',
            f[2].v || '',
            f[3].v || '',
            parseFloat(f[4].v) || 0,
            parseInt(f[5].v) || 0,
            parseInt(f[6].v) || 0,
            parseFloat(f[7].v) || 0,
            f[8].v || 'OK',
            syncDate
        ];
    });

    writeParamHealthResultsToSheet(headers, data);

    const criticalCount = data.filter(r => r[8] === 'CRITICAL').length;
    const warningCount = data.filter(r => r[8] === 'WARNING').length;

    logEvent('BQ_ALERTS', `Dimensional Health complete: ${criticalCount} critical, ${warningCount} warnings`);

    if (criticalCount > 0) {
        SpreadsheetApp.getActiveSpreadsheet().toast(
            `⚠️ ${criticalCount} CRITICAL parameter issues! Check BQ_PARAM_HEALTH sheet.`,
            'Dimensional Health Check',
            10
        );
    }
}

/**
 * Writes parameter health results to sheet.
 * @param {Array} headers - Column headers
 * @param {Array} data - Row data
 */
function writeParamHealthResultsToSheet(headers, data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(BQ_ALERTS_SHEETS.paramHealth);

    if (!sheet) {
        sheet = ss.insertSheet(BQ_ALERTS_SHEETS.paramHealth);
        sheet.setTabColor('#F59E0B'); // Orange for health check
    }

    sheet.clear();

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1A5DBB');
    headerRange.setFontColor('white');

    if (data.length > 0) {
        const dataRange = sheet.getRange(2, 1, data.length, headers.length);
        dataRange.setValues(data);

        const statusColIndex = headers.indexOf('Status') + 1;

        for (let i = 0; i < data.length; i++) {
            const status = data[i][8];
            const rowRange = sheet.getRange(i + 2, 1, 1, headers.length);

            if (status === 'CRITICAL') {
                rowRange.setBackground('#FEE2E2');
                sheet.getRange(i + 2, statusColIndex).setFontColor('#DC2626').setFontWeight('bold');
            } else if (status === 'WARNING') {
                rowRange.setBackground('#FEF3C7');
                sheet.getRange(i + 2, statusColIndex).setFontColor('#D97706').setFontWeight('bold');
            } else {
                sheet.getRange(i + 2, statusColIndex).setFontColor('#16A34A').setFontWeight('bold');
            }
        }
    } else {
        sheet.getRange(2, 1).setValue('✅ All parameters meet their fill rate thresholds!');
        sheet.getRange(2, 1).setFontWeight('bold').setFontColor('#16A34A');
    }

    sheet.autoResizeColumns(1, headers.length);
    sheet.setFrozenRows(1);
}

/**
 * Cleans up Dimensional Health triggers.
 */
function cleanupDimensionalHealthTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
        if (trigger.getHandlerFunction() === 'checkDimensionalHealthJobStatus') {
            ScriptApp.deleteTrigger(trigger);
        }
    }
}

// =================================================================
// DATA INVENTORY (Phase 3)
// =================================================================

/**
 * Runs the Data Inventory discovery.
 * Auto-discovers all GA4 parameters with data types and usage stats.
 * Called from menu: Extensions > Addocu > Tools > Data Inventory
 */
function runDataInventory() {
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

        logEvent('BQ_ALERTS', 'Starting Data Inventory discovery...');
        SpreadsheetApp.getActiveSpreadsheet().toast('Discovering all parameters...', 'Data Inventory', 10);

        const jobId = submitDataInventoryQuery(projectId);

        if (jobId) {
            PropertiesService.getScriptProperties().setProperty('BQ_INVENTORY_JOB_ID', jobId);
            PropertiesService.getScriptProperties().setProperty('BQ_INVENTORY_PROJECT_ID', projectId);

            ScriptApp.newTrigger('checkDataInventoryJobStatus')
                .timeBased()
                .after(10 * 1000)
                .create();

            SpreadsheetApp.getActiveSpreadsheet().toast('Query submitted. Results will appear shortly...', 'Data Inventory', 5);
        }
    } catch (e) {
        logError('BQ_ALERTS', `Data Inventory failed: ${e.message}`);
        SpreadsheetApp.getUi().alert('Error', `Data Inventory failed: ${e.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
}

/**
 * Checks the status of a running Data Inventory query job.
 */
function checkDataInventoryJobStatus() {
    try {
        const scriptProps = PropertiesService.getScriptProperties();
        const jobId = scriptProps.getProperty('BQ_INVENTORY_JOB_ID');
        const projectId = scriptProps.getProperty('BQ_INVENTORY_PROJECT_ID');

        if (!jobId || !projectId) {
            cleanupDataInventoryTriggers();
            return;
        }

        const job = BigQuery.Jobs.get(projectId, jobId);
        const state = job.status.state;

        logEvent('BQ_ALERTS', `Data Inventory job ${jobId} status: ${state}`);

        if (state === 'DONE') {
            if (job.status.errorResult) {
                throw new Error(job.status.errorResult.message);
            }

            const results = BigQuery.Jobs.getQueryResults(projectId, jobId);
            processDataInventoryResults(results);

            scriptProps.deleteProperty('BQ_INVENTORY_JOB_ID');
            scriptProps.deleteProperty('BQ_INVENTORY_PROJECT_ID');
            cleanupDataInventoryTriggers();

            SpreadsheetApp.getActiveSpreadsheet().toast('Data Inventory complete!', 'Data Inventory', 5);

        } else if (state === 'RUNNING' || state === 'PENDING') {
            ScriptApp.newTrigger('checkDataInventoryJobStatus')
                .timeBased()
                .after(10 * 1000)
                .create();
        }
    } catch (e) {
        logError('BQ_ALERTS', `Error checking Data Inventory job: ${e.message}`);
        cleanupDataInventoryTriggers();
    }
}

/**
 * Submits the Data Inventory discovery query to BigQuery.
 * @param {string} projectId - GCP Project ID
 * @returns {string} Job ID
 */
function submitDataInventoryQuery(projectId) {
    const datasetId = getGA4DatasetId(projectId);

    if (!datasetId) {
        throw new Error('No GA4 export dataset found.');
    }

    const query = buildDataInventoryQuery(projectId, datasetId);

    logEvent('BQ_ALERTS', `Submitting Data Inventory query to ${projectId}.${datasetId}`);

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
 * Builds the Data Inventory SQL query.
 * Discovers all parameters with data types and usage statistics.
 * @param {string} projectId - GCP Project ID
 * @param {string} datasetId - BigQuery Dataset ID
 * @returns {string} SQL query
 */
function buildDataInventoryQuery(projectId, datasetId) {
    return `
WITH param_discovery AS (
  SELECT
    event_name,
    ep.key as parameter_name,
    CASE
      WHEN COUNT(DISTINCT ep.value.string_value) > 0 AND MAX(ep.value.string_value) IS NOT NULL THEN 'STRING'
      WHEN COUNT(DISTINCT ep.value.int_value) > 0 AND MAX(ep.value.int_value) IS NOT NULL THEN 'INT'
      WHEN COUNT(DISTINCT ep.value.double_value) > 0 AND MAX(ep.value.double_value) IS NOT NULL THEN 'DOUBLE'
      ELSE 'UNKNOWN'
    END as data_type,
    platform,
    COUNT(*) as usage_count,
    COUNT(DISTINCT PARSE_DATE('%Y%m%d', event_date)) as days_active,
    MIN(PARSE_DATE('%Y%m%d', event_date)) as first_seen,
    MAX(PARSE_DATE('%Y%m%d', event_date)) as last_seen
  FROM \`${projectId}.${datasetId}.events_*\`
  CROSS JOIN UNNEST(event_params) ep
  WHERE _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  GROUP BY event_name, parameter_name, platform
)
SELECT
  event_name,
  parameter_name,
  data_type,
  platform,
  usage_count,
  days_active,
  first_seen,
  last_seen,
  -- Identify potential issues
  CASE
    WHEN days_active = 1 THEN 'NEW'
    WHEN days_active < 7 THEN 'RECENT'
    WHEN usage_count < 100 THEN 'LOW_USAGE'
    ELSE 'ACTIVE'
  END as status,
  -- Check if it's a standard GA4 parameter
  CASE
    WHEN parameter_name IN ('page_location', 'page_title', 'page_referrer', 'screen_class', 
      'screen_name', 'firebase_screen', 'firebase_event_origin', 'engagement_time_msec',
      'ga_session_id', 'ga_session_number', 'session_engaged', 'entrances', 'debug_mode',
      'ignore_referrer', 'term', 'medium', 'source', 'campaign', 'content', 'campaign_id',
      'gclid', 'dclid', 'srsltid', 'engaged_session_event', 'firebase_conversion') THEN 'STANDARD'
    WHEN parameter_name LIKE 'ep.%' OR parameter_name LIKE 'up.%' THEN 'CUSTOM'
    WHEN parameter_name LIKE 'im_%' THEN 'CUSTOM'
    ELSE 'CUSTOM'
  END as param_category
FROM param_discovery
ORDER BY 
  event_name,
  usage_count DESC
`;
}

/**
 * Processes Data Inventory query results.
 * @param {Object} results - BigQuery query results
 */
function processDataInventoryResults(results) {
    const rows = results.rows || [];
    const syncDate = formatDate(new Date());

    logEvent('BQ_ALERTS', `Processing ${rows.length} parameter inventory results`);

    const headers = [
        'Event', 'Parameter', 'Data Type', 'Platform', 'Usage Count',
        'Days Active', 'First Seen', 'Last Seen', 'Status', 'Category', 'Sync Date'
    ];

    const data = rows.map(row => {
        const f = row.f;
        return [
            f[0].v || '',
            f[1].v || '',
            f[2].v || '',
            f[3].v || '',
            parseInt(f[4].v) || 0,
            parseInt(f[5].v) || 0,
            f[6].v || '',
            f[7].v || '',
            f[8].v || '',
            f[9].v || '',
            syncDate
        ];
    });

    writeDataInventoryResultsToSheet(headers, data);

    // Summary stats
    const newParams = data.filter(r => r[8] === 'NEW').length;
    const lowUsage = data.filter(r => r[8] === 'LOW_USAGE').length;
    const customParams = data.filter(r => r[9] === 'CUSTOM').length;

    logEvent('BQ_ALERTS', `Data Inventory complete: ${data.length} params (${newParams} new, ${lowUsage} low-usage, ${customParams} custom)`);

    SpreadsheetApp.getActiveSpreadsheet().toast(
        `Found ${data.length} parameters (${customParams} custom, ${newParams} new)`,
        'Data Inventory',
        10
    );
}

/**
 * Writes Data Inventory results to sheet.
 * @param {Array} headers - Column headers
 * @param {Array} data - Row data
 */
function writeDataInventoryResultsToSheet(headers, data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(BQ_ALERTS_SHEETS.dataInventory);

    if (!sheet) {
        sheet = ss.insertSheet(BQ_ALERTS_SHEETS.dataInventory);
        sheet.setTabColor('#10B981'); // Green for inventory
    }

    sheet.clear();

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1A5DBB');
    headerRange.setFontColor('white');

    if (data.length > 0) {
        const dataRange = sheet.getRange(2, 1, data.length, headers.length);
        dataRange.setValues(data);

        const statusColIndex = headers.indexOf('Status') + 1;
        const categoryColIndex = headers.indexOf('Category') + 1;

        for (let i = 0; i < data.length; i++) {
            const status = data[i][8];
            const category = data[i][9];

            // Color code status
            if (status === 'NEW') {
                sheet.getRange(i + 2, statusColIndex).setBackground('#DBEAFE').setFontColor('#1D4ED8');
            } else if (status === 'LOW_USAGE') {
                sheet.getRange(i + 2, statusColIndex).setBackground('#FEF3C7').setFontColor('#D97706');
            }

            // Color code category
            if (category === 'CUSTOM') {
                sheet.getRange(i + 2, categoryColIndex).setFontWeight('bold').setFontColor('#7C3AED');
            }
        }
    } else {
        sheet.getRange(2, 1).setValue('No parameters found in the last 30 days.');
    }

    sheet.autoResizeColumns(1, headers.length);
    sheet.setFrozenRows(1);

    // Add filter for easy exploration
    sheet.getRange(1, 1, data.length + 1, headers.length).createFilter();
}

/**
 * Cleans up Data Inventory triggers.
 */
function cleanupDataInventoryTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
        if (trigger.getHandlerFunction() === 'checkDataInventoryJobStatus') {
            ScriptApp.deleteTrigger(trigger);
        }
    }
}

// =================================================================
// SMART DISCOVERY - Automated Alert Strategy
// =================================================================

/**
 * Key conversion events that are business-critical.
 * Parameters on these events should be monitored closely.
 */
const CRITICAL_EVENTS = [
    'purchase', 'add_to_cart', 'begin_checkout', 'add_payment_info',
    'sign_up', 'login', 'generate_lead', 'tutorial_complete',
    'add_to_wishlist', 'view_item', 'view_item_list', 'select_item',
    'share', 'search', 'select_content', 'view_promotion'
];

/**
 * Parameters that are typically business-critical when present.
 */
const CRITICAL_PARAM_PATTERNS = [
    'item_id', 'item_name', 'item_category', 'item_brand', 'item_variant',
    'price', 'value', 'currency', 'quantity', 'coupon',
    'transaction_id', 'affiliation', 'tax', 'shipping',
    'user_id', 'method', 'search_term', 'content_type',
    // Custom prefixes that indicate business logic
    'im_', 'custom_', 'cd_', 'cm_'
];

/**
 * Runs Smart Discovery: auto-discovers and populates CONFIG_AUDIT.
 * This is the intelligent pipeline that:
 * 1. Scans all parameters from the last 30 days
 * 2. Identifies critical event/param combinations
 * 3. Auto-generates monitoring rules
 */
function runSmartDiscovery() {
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

        logEvent('BQ_ALERTS', 'Starting Smart Discovery...');
        SpreadsheetApp.getActiveSpreadsheet().toast('Analyzing your data for optimal alerting strategy...', 'Smart Discovery', 15);

        const jobId = submitSmartDiscoveryQuery(projectId);

        if (jobId) {
            PropertiesService.getScriptProperties().setProperty('BQ_SMART_JOB_ID', jobId);
            PropertiesService.getScriptProperties().setProperty('BQ_SMART_PROJECT_ID', projectId);

            ScriptApp.newTrigger('checkSmartDiscoveryJobStatus')
                .timeBased()
                .after(10 * 1000)
                .create();

            SpreadsheetApp.getActiveSpreadsheet().toast('Analyzing parameters... Results will appear shortly.', 'Smart Discovery', 5);
        }
    } catch (e) {
        logError('BQ_ALERTS', `Smart Discovery failed: ${e.message}`);
        SpreadsheetApp.getUi().alert('Error', `Smart Discovery failed: ${e.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
}

/**
 * Checks the status of a running Smart Discovery query job.
 */
function checkSmartDiscoveryJobStatus() {
    try {
        const scriptProps = PropertiesService.getScriptProperties();
        const jobId = scriptProps.getProperty('BQ_SMART_JOB_ID');
        const projectId = scriptProps.getProperty('BQ_SMART_PROJECT_ID');

        if (!jobId || !projectId) {
            cleanupSmartDiscoveryTriggers();
            return;
        }

        const job = BigQuery.Jobs.get(projectId, jobId);
        const state = job.status.state;

        logEvent('BQ_ALERTS', `Smart Discovery job ${jobId} status: ${state}`);

        if (state === 'DONE') {
            if (job.status.errorResult) {
                throw new Error(job.status.errorResult.message);
            }

            const results = BigQuery.Jobs.getQueryResults(projectId, jobId);
            processSmartDiscoveryResults(results);

            scriptProps.deleteProperty('BQ_SMART_JOB_ID');
            scriptProps.deleteProperty('BQ_SMART_PROJECT_ID');
            cleanupSmartDiscoveryTriggers();

            SpreadsheetApp.getActiveSpreadsheet().toast('Smart Discovery complete! Check CONFIG_AUDIT sheet.', 'Smart Discovery', 10);

        } else if (state === 'RUNNING' || state === 'PENDING') {
            ScriptApp.newTrigger('checkSmartDiscoveryJobStatus')
                .timeBased()
                .after(10 * 1000)
                .create();
        }
    } catch (e) {
        logError('BQ_ALERTS', `Error checking Smart Discovery job: ${e.message}`);
        cleanupSmartDiscoveryTriggers();
    }
}

/**
 * Submits the Smart Discovery query to BigQuery.
 */
function submitSmartDiscoveryQuery(projectId) {
    const datasetId = getGA4DatasetId(projectId);

    if (!datasetId) {
        throw new Error('No GA4 export dataset found.');
    }

    const query = buildSmartDiscoveryQuery(projectId, datasetId);

    logEvent('BQ_ALERTS', `Submitting Smart Discovery query to ${projectId}.${datasetId}`);

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
 * Builds the Smart Discovery SQL query.
 * Focuses on finding critical event/param combinations.
 */
function buildSmartDiscoveryQuery(projectId, datasetId) {
    // Build the critical events filter
    const eventsFilter = CRITICAL_EVENTS.map(e => `'${e}'`).join(', ');

    return `
WITH param_stats AS (
  SELECT
    event_name,
    ep.key as parameter_name,
    platform,
    COUNT(*) as usage_count,
    COUNT(DISTINCT PARSE_DATE('%Y%m%d', event_date)) as days_active,
    -- Calculate fill rate (how often this param is present on this event)
    ROUND(100 * COUNT(CASE 
      WHEN ep.value.string_value IS NOT NULL 
        OR ep.value.int_value IS NOT NULL 
        OR ep.value.double_value IS NOT NULL 
      THEN 1 END) / COUNT(*), 2) as current_fill_rate
  FROM \`${projectId}.${datasetId}.events_*\`
  CROSS JOIN UNNEST(event_params) ep
  WHERE _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  GROUP BY event_name, parameter_name, platform
),
scored_params AS (
  SELECT
    event_name,
    parameter_name,
    platform,
    usage_count,
    days_active,
    current_fill_rate,
    -- Score based on criticality
    CASE
      -- Priority 1: Custom params on conversion events (highest value)
      WHEN event_name IN (${eventsFilter})
        AND (parameter_name LIKE 'im_%' 
          OR parameter_name LIKE 'custom_%' 
          OR parameter_name NOT IN ('page_location', 'page_title', 'page_referrer', 
            'engagement_time_msec', 'ga_session_id', 'ga_session_number', 'debug_mode',
            'firebase_event_origin', 'session_engaged', 'entrances'))
        AND usage_count > 100
      THEN 100
      -- Priority 2: E-commerce params on conversion events
      WHEN event_name IN (${eventsFilter})
        AND parameter_name IN ('item_id', 'item_name', 'value', 'price', 
          'transaction_id', 'currency', 'quantity')
      THEN 90
      -- Priority 3: Any high-usage custom param
      WHEN (parameter_name LIKE 'im_%' OR parameter_name LIKE 'custom_%')
        AND usage_count > 1000
        AND days_active >= 7
      THEN 80
      -- Priority 4: Stable params on key events
      WHEN event_name IN (${eventsFilter})
        AND days_active >= 14
        AND current_fill_rate >= 80
      THEN 70
      ELSE 0
    END as priority_score
  FROM param_stats
)
SELECT
  event_name,
  parameter_name,
  platform,
  usage_count,
  days_active,
  current_fill_rate,
  priority_score,
  -- Suggest fill rate threshold based on current performance
  CASE
    WHEN current_fill_rate >= 99 THEN 98
    WHEN current_fill_rate >= 95 THEN 90
    WHEN current_fill_rate >= 90 THEN 85
    WHEN current_fill_rate >= 80 THEN 75
    ELSE 70
  END as suggested_threshold
FROM scored_params
WHERE priority_score >= 70  -- Only include high-priority params
ORDER BY priority_score DESC, usage_count DESC
LIMIT 50  -- Top 50 most critical params
`;
}

/**
 * Processes Smart Discovery results and populates CONFIG_AUDIT.
 */
function processSmartDiscoveryResults(results) {
    const rows = results.rows || [];

    logEvent('BQ_ALERTS', `Smart Discovery found ${rows.length} critical event/param combinations`);

    if (rows.length === 0) {
        SpreadsheetApp.getUi().alert(
            'No Critical Params Found',
            'No high-priority event/parameter combinations were found. This may mean:\n' +
            '- Your tracking is very simple\n' +
            '- No custom parameters are being used\n' +
            '- Data volume is too low\n\n' +
            'You can manually add rules to the CONFIG_AUDIT sheet.',
            SpreadsheetApp.getUi().ButtonSet.OK
        );
        return;
    }

    // Transform to audit rules
    const auditRules = rows.map(row => {
        const f = row.f;
        return {
            eventName: f[0].v || '',
            paramName: f[1].v || '',
            platform: f[2].v || 'ALL',
            usageCount: parseInt(f[3].v) || 0,
            daysActive: parseInt(f[4].v) || 0,
            currentFillRate: parseFloat(f[5].v) || 0,
            priorityScore: parseInt(f[6].v) || 0,
            suggestedThreshold: parseInt(f[7].v) || 90
        };
    });

    // Group by event+param (consolidate platforms to ALL if multiple)
    const consolidatedRules = consolidateAuditRules(auditRules);

    // Write to CONFIG_AUDIT sheet
    writeSmartAuditRules(consolidatedRules);

    logEvent('BQ_ALERTS', `Auto-populated CONFIG_AUDIT with ${consolidatedRules.length} rules`);
}

/**
 * Consolidates rules by event+param, preferring ALL platform.
 */
function consolidateAuditRules(rules) {
    const grouped = {};

    for (const rule of rules) {
        const key = `${rule.eventName}|${rule.paramName}`;

        if (!grouped[key]) {
            grouped[key] = { ...rule, platform: 'ALL' };
        } else {
            // Take the higher threshold (more conservative)
            if (rule.suggestedThreshold > grouped[key].suggestedThreshold) {
                grouped[key].suggestedThreshold = rule.suggestedThreshold;
            }
            // Accumulate usage
            grouped[key].usageCount += rule.usageCount;
        }
    }

    return Object.values(grouped);
}

/**
 * Writes auto-discovered rules to CONFIG_AUDIT sheet.
 */
function writeSmartAuditRules(rules) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(BQ_ALERTS_SHEETS.configAudit);

    const headers = ['Event Name', 'Parameter Name', 'Platform', 'Min Fill Rate %', 'Alert Type', 'Active', 'Priority Score', 'Usage Count'];

    if (!sheet) {
        sheet = ss.insertSheet(BQ_ALERTS_SHEETS.configAudit);
        sheet.setTabColor('#3B82F6');
    }

    sheet.clear();

    // Write headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1E40AF');
    headerRange.setFontColor('white');

    // Write rules
    const data = rules.map(rule => [
        rule.eventName,
        rule.paramName,
        rule.platform,
        rule.suggestedThreshold,
        'DROP',
        true,  // Active by default
        rule.priorityScore,
        rule.usageCount
    ]);

    if (data.length > 0) {
        const dataRange = sheet.getRange(2, 1, data.length, headers.length);
        dataRange.setValues(data);

        // Color code by priority
        for (let i = 0; i < data.length; i++) {
            const priority = data[i][6];
            const rowRange = sheet.getRange(i + 2, 1, 1, headers.length);

            if (priority >= 100) {
                rowRange.setBackground('#DCFCE7'); // Green - highest priority
            } else if (priority >= 90) {
                rowRange.setBackground('#DBEAFE'); // Blue - e-commerce
            } else if (priority >= 80) {
                rowRange.setBackground('#FEF3C7'); // Yellow - custom params
            }
        }
    }

    // Add helper note
    const noteRow = data.length + 3;
    sheet.getRange(noteRow, 1).setValue('🤖 Auto-generated by Smart Discovery. Review and adjust thresholds as needed.');
    sheet.getRange(noteRow, 1).setFontStyle('italic').setFontColor('#6B7280');
    sheet.getRange(noteRow + 1, 1).setValue('ℹ️ Priority Score: 100=Custom+Conversion, 90=E-commerce, 80=High-usage Custom, 70=Stable Params');
    sheet.getRange(noteRow + 1, 1).setFontStyle('italic').setFontColor('#6B7280');

    sheet.autoResizeColumns(1, headers.length);
    sheet.setFrozenRows(1);
}

/**
 * Cleans up Smart Discovery triggers.
 */
function cleanupSmartDiscoveryTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
        if (trigger.getHandlerFunction() === 'checkSmartDiscoveryJobStatus') {
            ScriptApp.deleteTrigger(trigger);
        }
    }
}
