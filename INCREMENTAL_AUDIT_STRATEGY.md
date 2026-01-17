# Incremental Audit Strategy: Progressive Data Synchronization

## Executive Summary

**Problem:** Each audit run fetches ALL data from scratch, causing timeouts for large accounts.

**Solution:** Implement **incremental/progressive auditing** where:
- **First audit** (Full): Extracts all current data, writes baseline sheets
- **Subsequent audits** (Delta): Only fetches NEW or CHANGED items since last sync
- **Result**: Subsequent audits complete in **seconds/minutes** instead of 30+ minutes

**Timeline Impact:**
- First audit: 10-30 minutes (full data)
- Second audit: 1-3 minutes (only deltas)
- Third+ audits: 30 seconds-2 minutes (just new items)

---

## Architecture Design

### Phase 1: Sync State Tracking (Foundation)

**Concept:** Store metadata about each sync run to know what's changed since last time.

#### Data Structure: Sync Metadata Sheet

Create a new sheet `_AUDIT_METADATA` to track:

```
Sheet Name: _AUDIT_METADATA

Columns:
- Service: "GA4", "GTM", "BigQuery", etc.
- Resource Type: "Properties", "Containers", "Datasets", etc.
- Last Sync Timestamp: ISO 8601 (e.g., "2026-01-17T18:30:00Z")
- Last Sync Count: Number of items processed
- Last Sync Status: "SUCCESS", "PARTIAL", "FAILED"
- Full Sync Date: When last full audit was done
- Sync Mode: "FULL", "DELTA"

Example rows:
| Service   | Resource Type    | Last Sync Timestamp     | Last Sync Count | Status  | Full Sync Date | Sync Mode |
|-----------|------------------|------------------------|-----------------|---------|----------------|-----------|
| GA4       | Properties       | 2026-01-17T18:30:00Z   | 15              | SUCCESS | 2026-01-17     | DELTA     |
| GTM       | Containers       | 2026-01-17T18:30:00Z   | 8               | SUCCESS | 2026-01-17     | DELTA     |
| BigQuery  | Datasets         | 2026-01-17T18:30:00Z   | 5               | SUCCESS | 2026-01-17     | DELTA     |
```

#### Implementation in PropertiesService (Preferred)

Store as JSON to reduce sheet writes:

```javascript
// Format: "ADDOCU_SYNC_STATE_[SERVICE]_[RESOURCE_TYPE]"
// Example: "ADDOCU_SYNC_STATE_GA4_PROPERTIES"

{
  "lastSyncTimestamp": "2026-01-17T18:30:00Z",
  "lastSyncCount": 15,
  "lastSyncStatus": "SUCCESS",
  "fullSyncDate": "2026-01-17",
  "syncMode": "DELTA"
}
```

**Advantages:**
- ✅ Fast lookups (no sheet reads)
- ✅ Persistent across executions
- ✅ User-scoped (not shared)
- ✅ Already used in existing code

---

### Phase 2: API Filtering Strategy

**Goal:** Use API-level filtering when available to only fetch new/changed data.

#### GA4 (Google Analytics Admin API)

**Challenge:** Admin API doesn't have timestamp filters in list endpoints
**Solution:** Implement client-side comparison

```javascript
// Pseudo-code
function syncGA4Incremental() {
  const lastSync = getLastSyncTimestamp('ga4', 'Properties');

  // 1. Fetch ALL properties (no server-side filter available)
  const allProperties = listGA4Properties();

  // 2. Client-side filtering: compare with last sync
  const newProperties = allProperties.filter(prop => {
    const propCreated = new Date(prop.createTime);
    return lastSync ? propCreated > new Date(lastSync) : true;
  });

  // 3. If first time, sync all. Otherwise, sync only new.
  const propertiesToSync = lastSync ? newProperties : allProperties;

  // 4. For existing properties, check if any changed
  // (requires hash/checksum comparison)
  const changedProperties = compareWithExistingSheet(allProperties);

  // 5. Sync union of new + changed
  const finalToSync = [...newProperties, ...changedProperties];

  // 6. Update sheet with only these items
  appendOrUpdateRows('GA4_PROPERTIES', finalToSync);

  // 7. Track this sync
  recordSyncState('ga4', 'Properties', finalToSync.length);
}
```

#### GTM (Google Tag Manager API)

**Opportunity:** Some resources have `createTime` and `lastModifiedTime`

```javascript
function syncGTMIncremental() {
  const lastSync = getLastSyncTimestamp('gtm', 'Tags');

  // Fetch containers
  const containers = listGTMContainers();

  // For each container, check if modified since last sync
  for (const container of containers) {
    const containerModified = new Date(container.lastModifiedTime);

    if (!lastSync || containerModified > new Date(lastSync)) {
      // Container or its children may have changed
      // Fetch and sync tags for this container only
      const tags = listTagsInContainer(container.containerId);
      appendOrUpdateRows('GTM_TAGS', tags);
    }
  }

  recordSyncState('gtm', 'Tags', totalProcessed);
}
```

#### BigQuery (BigQuery API)

**Opportunity:** Tables have `createdTime` and `modifiedTime`

```javascript
function syncBigQueryIncremental() {
  const lastSync = getLastSyncTimestamp('bigquery', 'Tables');

  const datasets = listBigQueryDatasets();

  for (const dataset of datasets) {
    // Only fetch tables modified since last sync
    const allTables = listTablesInDataset(dataset);

    const newOrModified = allTables.filter(table => {
      const tableModified = new Date(table.modifiedTime);
      return !lastSync || tableModified > new Date(lastSync);
    });

    // Also apply date range filter (existing optimization)
    const filtered = filterTablesByDateRange(newOrModified, 30);

    if (filtered.length > 0) {
      appendOrUpdateRows('BQ_TABLES', filtered);
    }
  }

  recordSyncState('bigquery', 'Tables', totalProcessed);
}
```

---

### Phase 3: Sheet Update Strategy

**Problem:** Completely rewriting sheets on each run is wasteful
**Solution:** Append-only or merge-update pattern

#### Strategy 1: Append New Rows (Fastest)

For resources that are append-only (rarely deleted):

```javascript
function appendNewRecords(sheetName, newRecords) {
  // Only add rows at the end (Append mode)

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (newRecords.length === 0) {
    logEvent('AUDIT', `No new records for ${sheetName}, skipping update`);
    return;
  }

  const lastRow = sheet.getLastRow();
  const newRange = sheet.getRange(lastRow + 1, 1, newRecords.length, newRecords[0].length);
  newRange.setValues(newRecords);

  logEvent('AUDIT', `Appended ${newRecords.length} new records to ${sheetName}`);
}
```

**When to use:**
- GA4 Properties (rarely deleted)
- GTM Containers (rarely deleted)
- BigQuery Datasets (rarely deleted)

#### Strategy 2: Merge-Update (Accurate)

For resources that can be modified or deleted:

```javascript
function mergeUpdateRecords(sheetName, newRecords, primaryKeyIndex) {
  // Update existing rows, append new rows

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  // Build map of existing records by primary key
  const existing = {};
  for (let i = 1; i < allData.length; i++) {
    const key = allData[i][primaryKeyIndex];
    existing[key] = i + 1; // Row number (1-indexed)
  }

  // Process new records
  const toAppend = [];
  for (const newRecord of newRecords) {
    const key = newRecord[primaryKeyIndex];

    if (existing[key]) {
      // Update existing row
      const rowNum = existing[key];
      sheet.getRange(rowNum, 1, 1, newRecord.length).setValues([newRecord]);
    } else {
      // Collect new records for batch append
      toAppend.push(newRecord);
    }
  }

  // Batch append new records
  if (toAppend.length > 0) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, toAppend.length, toAppend[0].length)
      .setValues(toAppend);
  }

  logEvent('AUDIT', `Updated ${newRecords.length - toAppend.length} rows, appended ${toAppend.length} new rows to ${sheetName}`);
}
```

**When to use:**
- GTM Tags (can be modified)
- BigQuery Tables (can be modified)
- Google Ads Campaigns (can be deleted/recreated)

#### Strategy 3: Selective Refresh (Safest)

For resources that need deep updates:

```javascript
function selectiveRefresh(sheetName, service, resourceType, newData) {
  // Only update rows that actually changed

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  // Create hash of existing data for comparison
  const existingHashes = {};
  for (let i = 1; i < allData.length; i++) {
    const key = allData[i][0]; // Primary key (usually first column)
    existingHashes[key] = hashRow(allData[i]);
  }

  // Compare new data with existing
  const changedRows = {};
  let changeCount = 0;

  for (const record of newData) {
    const key = record[0];
    const newHash = hashRecord(record);

    if (!existingHashes[key]) {
      // New record
      changedRows[key] = record;
      changeCount++;
    } else if (existingHashes[key] !== newHash) {
      // Changed record
      changedRows[key] = record;
      changeCount++;
    }
    // Otherwise: unchanged, skip
  }

  if (changeCount === 0) {
    logEvent('AUDIT', `No changes detected for ${sheetName}`);
    return;
  }

  // Update only changed/new rows
  mergeUpdateRecords(sheetName, Object.values(changedRows), 0);
}

function hashRecord(record) {
  // Simple hash of record values
  return JSON.stringify(record);
}
```

**When to use:**
- When you want to minimize sheet writes
- For large datasets with few actual changes

---

### Phase 4: Sync Logic Integration

#### Modified SyncCore Pattern

```javascript
function syncGA4CoreIncremental() {
  const startTime = Date.now();

  try {
    // 1. Check if this is first audit (no sync state)
    const syncState = getSyncState('ga4', 'Properties');
    const isFirstRun = !syncState || !syncState.lastSyncTimestamp;

    logEvent('GA4', `Starting ${isFirstRun ? 'FULL' : 'DELTA'} sync...`);

    // 2. Fetch data
    let properties = listGA4Properties();

    // 3. Filter if delta sync
    if (!isFirstRun) {
      const lastSync = new Date(syncState.lastSyncTimestamp);
      properties = properties.filter(p => {
        const created = new Date(p.createTime);
        return created > lastSync;
      });
      logEvent('GA4', `Filtered to ${properties.length} new properties`);
    }

    // 4. Process and write to sheets
    const results = { properties: 0, dimensions: 0, metrics: 0 };

    for (const prop of properties) {
      try {
        // Extract details for each property
        const dimensions = listCustomDimensions(prop.name);
        const metrics = listCustomMetrics(prop.name);

        // Use append strategy (properties are append-only)
        appendNewRecords('GA4_PROPERTIES', [formatPropertyRow(prop)]);
        appendNewRecords('GA4_CUSTOM_DIMENSIONS', dimensions);
        appendNewRecords('GA4_CUSTOM_METRICS', metrics);

        results.properties++;
        results.dimensions += dimensions.length;
        results.metrics += metrics.length;

        Utilities.sleep(100);
      } catch (e) {
        logWarning('GA4', `Error processing property ${prop.name}: ${e.message}`);
      }
    }

    // 5. Record sync state
    recordSyncState('ga4', 'Properties', results.properties, 'SUCCESS', 'DELTA');

    const duration = Date.now() - startTime;
    return {
      status: 'SUCCESS',
      records: results.properties + results.dimensions + results.metrics,
      duration: duration,
      syncMode: isFirstRun ? 'FULL' : 'DELTA',
      details: results
    };

  } catch (error) {
    recordSyncState('ga4', 'Properties', 0, 'ERROR', 'DELTA');
    logError('GA4', `Incremental sync failed: ${error.message}`);

    return {
      status: 'ERROR',
      error: error.message,
      syncMode: 'DELTA'
    };
  }
}
```

---

## Implementation Roadmap

### Week 1: Foundation (Phase 1)

1. **Create metadata tracking system**
   - Add `_AUDIT_METADATA` sheet (or use PropertiesService)
   - Add `recordSyncState()` and `getSyncState()` helper functions
   - Store in `logging.js` alongside logging utilities

2. **Files to create/modify:**
   - `sync_state.js` (NEW - handles all sync state operations)
   - `logging.js` - Add sync state recording
   - `utilities.js` - Add helper functions

### Week 2: Service Implementation (Phase 2-3)

1. **Implement for one service first (GA4)**
   - Modify `syncGA4Core()` to use incremental pattern
   - Add `appendNewRecords()` and `mergeUpdateRecords()` functions
   - Test with dummy data

2. **Test thoroughly:**
   - First audit: Should process all properties
   - Second audit: Should process only new properties
   - Third audit: Should process only changes

### Week 3: Scale to Other Services

1. **Apply same pattern to:**
   - GTM (use merge-update for tags)
   - BigQuery (use append for datasets, merge for tables)
   - Search Console, YouTube, etc.

2. **Optimize based on API capabilities:**
   - Each API has different timestamp support
   - Adjust filtering strategy per service

### Week 4: Polish & Optimization

1. **Performance tuning:**
   - Batch operations where possible
   - Optimize sheet writes
   - Cache timestamp lookups

2. **User experience:**
   - Show "Incremental sync" vs "Full sync" in UI
   - Display sync mode in dashboard
   - Add option to force full sync

---

## Code Structure

### New File: `sync_state.js`

```javascript
/**
 * @fileoverview Sync state tracking for incremental audits
 * Maintains sync metadata to support progressive data synchronization
 */

/**
 * Records sync state for a service
 */
function recordSyncState(service, resourceType, recordCount, status, syncMode) {
  try {
    const userProps = PropertiesService.getUserProperties();
    const key = `ADDOCU_SYNC_STATE_${service}_${resourceType}`;

    const state = {
      lastSyncTimestamp: new Date().toISOString(),
      lastSyncCount: recordCount,
      lastSyncStatus: status || 'SUCCESS',
      fullSyncDate: status === 'SUCCESS' && recordCount === 0 ?
        new Date().toISOString() :
        getSyncState(service, resourceType)?.fullSyncDate || null,
      syncMode: syncMode || 'DELTA'
    };

    userProps.setProperty(key, JSON.stringify(state));
    logEvent('SYNC_STATE', `Recorded: ${service}/${resourceType} - ${recordCount} items, ${status}`);

    return state;
  } catch (e) {
    logError('SYNC_STATE', `Failed to record state: ${e.message}`);
    return null;
  }
}

/**
 * Retrieves sync state for a service
 */
function getSyncState(service, resourceType) {
  try {
    const userProps = PropertiesService.getUserProperties();
    const key = `ADDOCU_SYNC_STATE_${service}_${resourceType}`;
    const stored = userProps.getProperty(key);

    if (!stored) return null;

    return JSON.parse(stored);
  } catch (e) {
    logWarning('SYNC_STATE', `Failed to retrieve state: ${e.message}`);
    return null;
  }
}

/**
 * Clears sync state (for full re-audit)
 */
function clearSyncState(service, resourceType) {
  try {
    const userProps = PropertiesService.getUserProperties();
    const key = `ADDOCU_SYNC_STATE_${service}_${resourceType}`;
    userProps.deleteProperty(key);

    logEvent('SYNC_STATE', `Cleared: ${service}/${resourceType}`);
  } catch (e) {
    logError('SYNC_STATE', `Failed to clear state: ${e.message}`);
  }
}

/**
 * Check if this is the first sync for a service
 */
function isFirstSync(service, resourceType) {
  const state = getSyncState(service, resourceType);
  return !state || !state.lastSyncTimestamp;
}
```

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **First Audit** | 30 min | 10-30 min (unchanged) |
| **Second Audit** | 30 min | 1-3 min (90% faster) |
| **Third+ Audits** | 30 min | 30s-2 min (95% faster) |
| **Timeout Risk** | High | Very Low |
| **Scaling** | Problems at 50+ properties | Scales to 1000+ properties |
| **User Experience** | Wait 30 min for update | Get daily updates in 2 min |

---

## Backward Compatibility

✅ Fully compatible:
- First audit still extracts everything (no change in behavior)
- Existing sheets structure unchanged
- No breaking changes to APIs

✅ Optional rollback:
- `clearSyncState()` forces full re-audit if needed
- Users can manually delete `_AUDIT_METADATA` sheet

---

## Future Enhancements

1. **Scheduled incremental audits**
   - Daily delta syncs via time-based triggers
   - Automatic refresh of data without user action

2. **Smart change detection**
   - Hash/checksum of records
   - Only update truly changed rows
   - Preserve unchanged formatting

3. **Multi-run resumption**
   - Break large audits into chunks
   - Resume from last successful sync
   - Handle network interruptions gracefully

4. **Analytics**
   - Track sync duration trends
   - Identify which services take longest
   - Optimize slow services first

