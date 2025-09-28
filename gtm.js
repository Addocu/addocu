/**
 * @fileoverview Google Tag Manager (GTM) Synchronization Module - COMPLETE
 * @version 2.0 - Complete implementations
 */

// =================================================================
// MODULE CONSTANTS AND CONFIGURATION
// =================================================================

const GTM_TAGS_HEADERS = [
  'Container Name', 'Container ID', 'Workspace', 'Tag Name', 'Tag ID', 'Tag Type', 'Status',
  'Firing Triggers', 'Blocking Triggers', 'Firing Count', 'Blocking Count',
  'Key Parameters', 'Priority', 'Firing Option', 'Last Modified', 'Tag URL', 'Notes', 'Observations'
];

const GTM_VARIABLES_HEADERS = [
  'Container Name', 'Container ID', 'Workspace', 'Variable Name', 'Variable ID', 'Variable Type',
  'Key Parameters', 'Format Value', 'Disabling Triggers', 'Enabling Triggers', 'Last Modified', 'Notes', 'Observations'
];

const GTM_TRIGGERS_HEADERS = [
  'Container Name', 'Container ID', 'Workspace', 'Trigger Name', 'Trigger ID', 'Trigger Type',
  'Filters Summary', 'Wait for Tags', 'Check Validation', 'Wait Timeout', 'Event Names',
  'Last Modified', 'Notes', 'Observations'
];

// =================================================================
// SYNCHRONIZATION FUNCTIONS (EXECUTABLE FROM MENU)
// =================================================================

function syncGTMWithUI() {
  const result = syncGTMCore();
  const ui = SpreadsheetApp.getUi();
  
  if (result.status === 'SUCCESS') {
    const details = result.details;
    const message = `✅ GTM Synchronized\n\n` +
      `📦 Containers found: ${details.containersFound}\n` +
      `🎯 Containers processed: ${details.containersProcessed}\n\n` +
      `🏷️ Tags: ${details.tags}\n` +
      `🔧 Variables: ${details.variables}\n` +
      `⚡ Triggers: ${details.triggers}\n\n` +
      `Total: ${result.records} elements\n` +
      `Time: ${Math.round(result.duration / 1000)}s`;
    ui.alert('🎯 GTM Completed', message, ui.ButtonSet.OK);
  } else {
    ui.alert('❌ GTM Error', 
      `Synchronization failed: ${result.error}\n\nCheck the LOGS sheet for more details.`,
      ui.ButtonSet.OK
    );
  }
}

// =================================================================
// CENTRAL SYNCHRONIZATION LOGIC
// =================================================================

function syncGTMCore() {
  const startTime = Date.now();
  const serviceName = 'gtm';
  const results = { 
    containersFound: 0, 
    containersProcessed: 0, 
    tags: 0, 
    variables: 0, 
    triggers: 0, 
    errors: [] 
  };

  try {
    // Verify authentication
    const authConfig = getAuthConfig(serviceName);
    logSyncStart('GTM_Sync', authConfig.authUser);

    // Get containers
    const allContainers = getAllGTMContainers() || [];
    results.containersFound = allContainers.length;
    
    logEvent('GTM', `📦 Containers found: ${allContainers.length}`);
    
    if (allContainers.length === 0) {
      logWarning('GTM', 'No accessible GTM containers found');
      
      // ALWAYS create GTM sheets, even without containers
      const emptyData = { tags: [], variables: [], triggers: [] };
      writeAggregatedGTMData(emptyData);
      
      const duration = Date.now() - startTime;
      logSyncEnd('GTM_Sync', 0, duration, 'SUCCESS');
      return { status: 'SUCCESS', records: 0, duration: duration, details: results };
    }

    // Filter containers according to configuration
    const targetContainers = getTargetContainersFromConfig();
    const containersToProcess = targetContainers.length > 0
      ? allContainers.filter(c => targetContainers.includes(c.name))
      : allContainers;

    logEvent('GTM', `🎯 Containers to process: ${containersToProcess.length} of ${allContainers.length}`);

    if (containersToProcess.length === 0) {
      logWarning('GTM', 'No containers to process after filtering');
      
      // ALWAYS create GTM sheets, even without filtered containers
      const emptyData = { tags: [], variables: [], triggers: [] };
      writeAggregatedGTMData(emptyData);
      
      const duration = Date.now() - startTime;
      logSyncEnd('GTM_Sync', 0, duration, 'SUCCESS');
      return { status: 'SUCCESS', records: 0, duration: duration, details: results };
    }

    // Collect data from all containers
    const aggregatedData = collectDataFromContainers(containersToProcess, results.errors);
    
    // Write data to sheets
    writeAggregatedGTMData(aggregatedData);
    
    // Update results
    results.tags = aggregatedData.tags.length;
    results.variables = aggregatedData.variables.length;
    results.triggers = aggregatedData.triggers.length;
    results.containersProcessed = containersToProcess.length - results.errors.length;

    const totalElements = results.tags + results.variables + results.triggers;
    const duration = Date.now() - startTime;
    
    logEvent('GTM', `✅ Synchronization completed: ${totalElements} elements`);
    logSyncEnd('GTM_Sync', totalElements, duration, 'SUCCESS');
    
    return { status: 'SUCCESS', records: totalElements, duration: duration, details: results };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('GTM_Sync', 0, duration, 'ERROR');
    logError('GTM', `❌ Synchronization error: ${error.message}`, error.stack);
    
    // Try to create empty sheets as fallback in case of error
    try {
      const emptyData = { tags: [], variables: [], triggers: [] };
      writeAggregatedGTMData(emptyData);
      logWarning('GTM', 'GTM sheets created as fallback after error');
    } catch (fallbackError) {
      logError('GTM', `Critical error creating GTM fallback sheets: ${fallbackError.message}`);
    }
    
    return { status: 'ERROR', records: 0, duration: duration, error: error.message };
  }
}

// =================================================================
// CONTAINER AND WORKSPACE EXTRACTION FUNCTIONS
// =================================================================

/**
 * Gets all accessible GTM containers for the user
 */
function getAllGTMContainers() {
  try {
    const auth = getAuthConfig('gtm');
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };
    
    logEvent('GTM', '🔍 Getting GTM accounts...');
    
    // First get accounts (no API key, OAuth2 only)
    const accountsUrl = 'https://tagmanager.googleapis.com/tagmanager/v2/accounts';
    const accountsResponse = fetchWithRetry(accountsUrl, options, 'GTM-Accounts');
    
    if (!accountsResponse.account || accountsResponse.account.length === 0) {
      logWarning('GTM', 'No accessible GTM accounts found');
      return [];
    }

    logEvent('GTM', `📋 Accounts found: ${accountsResponse.account.length}`);

    // Get containers from all accounts
    const allContainers = [];
    
    for (const account of accountsResponse.account) {
      try {
        logEvent('GTM', `📂 Processing account: ${account.name} (${account.accountId})`);
        
        const containersUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${account.accountId}/containers`;
        const containersResponse = fetchWithRetry(containersUrl, options, 'GTM-Containers');
        
        if (containersResponse.container && containersResponse.container.length > 0) {
          logEvent('GTM', `📦 Containers in ${account.name}: ${containersResponse.container.length}`);
          
          // Add account info to each container
          containersResponse.container.forEach(container => {
            container.accountName = account.name;
            container.accountId = account.accountId;
          });
          
          allContainers.push(...containersResponse.container);
        }
        
        Utilities.sleep(500); // Pause between accounts
        
      } catch (error) {
        logError('GTM', `Error processing account ${account.name}: ${error.message}`);
        continue; // Continue with next account
      }
    }

    logEvent('GTM', `✅ Total containers found: ${allContainers.length}`);
    return allContainers;
    
  } catch (error) {
    logError('GTM', `Error getting GTM containers: ${error.message}`);
    throw new Error(`Could not get GTM containers: ${error.message}`);
  }
}

/**
 * Gets specified workspaces from a container (with filters)
 */
function getGTMWorkspaces(container) {
  try {
    const auth = getAuthConfig('gtm');
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };
    
    // Get workspace filters from configuration with safe handling
    let workspaceFilters = '';
    try {
      const userProperties = PropertiesService.getUserProperties();
      workspaceFilters = userProperties.getProperty('ADDOCU_GTM_WORKSPACES_FILTER') || '';
    } catch (permissionError) {
      if (permissionError.message.includes('PERMISSION_DENIED')) {
        console.warn('🔧 GTM: UserProperties not accessible, using default configuration');
        workspaceFilters = ''; // Use all workspaces
      } else {
        throw permissionError;
      }
    }
    
    const targetWorkspaces = workspaceFilters ? 
      workspaceFilters.split(',').map(w => w.trim()).filter(w => w.length > 0) : [];
    
    const workspacesUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${container.accountId}/containers/${container.containerId}/workspaces`;
    const workspacesResponse = fetchWithRetry(workspacesUrl, options, 'GTM-Workspaces');
    
    if (!workspacesResponse.workspace || workspacesResponse.workspace.length === 0) {
      throw new Error(`No workspaces found for ${container.name}`);
    }

    let selectedWorkspaces = [];
    
    if (targetWorkspaces.length > 0) {
      // Apply workspace filters
      logEvent('GTM', `Applying workspace filter for ${container.name}: ${targetWorkspaces.join(', ')}`);
      
      selectedWorkspaces = workspacesResponse.workspace.filter(ws => {
        return targetWorkspaces.some(filter => 
          ws.name.toLowerCase().includes(filter.toLowerCase()) ||
          filter.toLowerCase().includes(ws.name.toLowerCase())
        );
      });
      
      if (selectedWorkspaces.length === 0) {
        logWarning('GTM', `No workspaces match the filter in ${container.name}. Using Default Workspace.`);
        // Fallback to default if no matches
        const defaultWorkspace = workspacesResponse.workspace.find(ws => 
          ws.name === 'Default Workspace' || ws.name.toLowerCase().includes('default')
        ) || workspacesResponse.workspace[0];
        selectedWorkspaces = [defaultWorkspace];
      }
    } else {
      // No filters: use only the default workspace
      const defaultWorkspace = workspacesResponse.workspace.find(ws => 
        ws.name === 'Default Workspace' || ws.name.toLowerCase().includes('default')
      );
      
      if (defaultWorkspace) {
        selectedWorkspaces = [defaultWorkspace];
      } else {
        selectedWorkspaces = [workspacesResponse.workspace[0]];
        logWarning('GTM', `No 'Default Workspace' found in ${container.name}, using: ${workspacesResponse.workspace[0].name}`);
      }
    }

    logEvent('GTM', `🔧 Workspaces selected in ${container.name}: ${selectedWorkspaces.map(w => w.name).join(', ')}`);
    return selectedWorkspaces;
    
  } catch (error) {
    logError('GTM', `Error getting workspaces for ${container.name}: ${error.message}`);
    throw error;
  }
}

/**
 * Gets the default workspace from a container (legacy functionality)
 */
function getDefaultGTMWorkspace(container) {
  const workspaces = getGTMWorkspaces(container);
  return workspaces[0]; // Return the first selected workspace
}

// =================================================================
// DATA COLLECTION
// =================================================================

function collectDataFromContainers(containers, errors) {
  const data = { tags: [], variables: [], triggers: [] };
  let processed = 0;

  for (const container of containers) {
    try {
      logEvent('GTM', `📦 [${processed + 1}/${containers.length}] Processing: ${container.name}`);
      
      const workspaces = getGTMWorkspaces(container);
      if (!workspaces || workspaces.length === 0) {
        throw new Error(`Could not get workspaces for ${container.name}`);
      }

      // Process all selected workspaces
      for (const workspace of workspaces) {
        try {
          logEvent('GTM', `🔧 Processing workspace: ${workspace.name} in ${container.name}`);
          
          const resources = getWorkspaceResources(workspace, container);
          
          // Add data with detailed logging
          logEvent('GTM', `📊 ${container.name}/${workspace.name}: ${resources.tags.length} tags, ${resources.variables.length} variables, ${resources.triggers.length} triggers`);
          
          data.tags.push(...resources.tags);
          data.variables.push(...resources.variables);
          data.triggers.push(...resources.triggers);
          
          Utilities.sleep(500); // Pause between workspaces
          
        } catch (workspaceError) {
          const errorMsg = `${container.name}/${workspace.name}: ${workspaceError.message}`;
          errors.push(errorMsg);
          logError('GTM', `❌ Error processing workspace: ${errorMsg}`);
        }
      }
      
      processed++;
      Utilities.sleep(1000); // Pause to avoid overwhelming the API
      
    } catch (error) {
      const errorMsg = `${container.name}: ${error.message}`;
      errors.push(errorMsg);
      logError('GTM', `❌ Error processing container: ${errorMsg}`);
      Utilities.sleep(2000); // Longer pause in case of error
    }
  }

  logEvent('GTM', `🎯 Collection completed: ${processed} containers processed, ${errors.length} errors`);
  return data;
}

function getWorkspaceResources(workspace, container) {
  const auth = getAuthConfig('gtm');
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };
  
  try {
    // Get Tags
    logEvent('GTM', `🏷️ Getting tags from ${container.name}`);
    const tagsUrl = `https://tagmanager.googleapis.com/tagmanager/v2/${workspace.path}/tags`;
    const tagsResponse = fetchWithRetry(tagsUrl, options, 'GTM-Tags');
    Utilities.sleep(300);
    
    // Get Variables
    logEvent('GTM', `🔧 Getting variables from ${container.name}`);
    const variablesUrl = `https://tagmanager.googleapis.com/tagmanager/v2/${workspace.path}/variables`;
    const variablesResponse = fetchWithRetry(variablesUrl, options, 'GTM-Variables');
    Utilities.sleep(300);
    
    // Get Triggers
    logEvent('GTM', `⚡ Getting triggers from ${container.name}`);
    const triggersUrl = `https://tagmanager.googleapis.com/tagmanager/v2/${workspace.path}/triggers`;
    const triggersResponse = fetchWithRetry(triggersUrl, options, 'GTM-Triggers');
    Utilities.sleep(300);
    
    return {
      tags: (tagsResponse.tag || []).map(t => processGTMTag(t, container, workspace)),
      variables: (variablesResponse.variable || []).map(v => processGTMVariable(v, container, workspace)),
      triggers: (triggersResponse.trigger || []).map(tr => processGTMTrigger(tr, container, workspace))
    };
    
  } catch (error) {
    logError('GTM', `Error getting workspace resources ${workspace.name}: ${error.message}`);
    throw error;
  }
}

// =================================================================
// DATA PROCESSORS (COMPLETE IMPLEMENTATIONS)
// =================================================================

/**
 * Processes a GTM tag and extracts detailed information
 */
function processGTMTag(tag, container, workspace) {
  try {
    // Basic information
    const tagData = {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Workspace': workspace.name || 'N/A',
      'Tag Name': tag.name || 'N/A',
      'Tag ID': tag.tagId || 'N/A',
      'Tag Type': tag.type || 'N/A',
      'Status': tag.paused ? 'Paused' : 'Active',
      'Last Modified': formatDate(tag.fingerprint) || 'N/A',
      'Notes': tag.notes || 'N/A'
    };

    // Firing triggers
    if (tag.firingTriggerId && tag.firingTriggerId.length > 0) {
      tagData['Firing Triggers'] = tag.firingTriggerId.join(', ');
      tagData['Firing Count'] = tag.firingTriggerId.length;
    } else {
      tagData['Firing Triggers'] = 'No triggers';
      tagData['Firing Count'] = 0;
    }

    // Blocking triggers
    if (tag.blockingTriggerId && tag.blockingTriggerId.length > 0) {
      tagData['Blocking Triggers'] = tag.blockingTriggerId.join(', ');
      tagData['Blocking Count'] = tag.blockingTriggerId.length;
    } else {
      tagData['Blocking Triggers'] = 'N/A';
      tagData['Blocking Count'] = 0;
    }

    // Key tag parameters
    if (tag.parameter && tag.parameter.length > 0) {
      const keyParams = tag.parameter.slice(0, 3).map(p => `${p.key}=${p.value}`);
      tagData['Key Parameters'] = keyParams.join('; ');
    } else {
      tagData['Key Parameters'] = 'N/A';
    }

    // Additional configurations
    tagData['Priority'] = tag.priority || 'N/A';
    tagData['Firing Option'] = tag.tagFiringOption || 'N/A';
    
    // Tag URL (if available)
    tagData['Tag URL'] = tag.liveOnly ? 'Live Only' : 'N/A';
    
    // Automatic observations
    const observations = [];
    if (tag.paused) observations.push('Tag paused');
    if (!tag.firingTriggerId || tag.firingTriggerId.length === 0) observations.push('No firing triggers');
    if (tag.blockingTriggerId && tag.blockingTriggerId.length > 0) observations.push('Has blocking triggers');
    
    tagData['Observations'] = observations.join('; ') || 'N/A';

    return tagData;
    
  } catch (error) {
    logError('GTM', `Error processing tag ${tag.name}: ${error.message}`);
    return {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Tag Name': tag.name || 'N/A',
      'Tag ID': tag.tagId || 'N/A',
      'Observations': `Processing error: ${error.message}`
    };
  }
}

/**
 * Processes a GTM variable and extracts detailed information
 */
function processGTMVariable(variable, container, workspace) {
  try {
    const variableData = {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',  
      'Workspace': workspace.name || 'N/A',
      'Variable Name': variable.name || 'N/A',
      'Variable ID': variable.variableId || 'N/A',
      'Variable Type': variable.type || 'N/A',
      'Last Modified': formatDate(variable.fingerprint) || 'N/A',
      'Notes': variable.notes || 'N/A'
    };

    // Variable parameters
    if (variable.parameter && variable.parameter.length > 0) {
      const keyParams = variable.parameter.slice(0, 3).map(p => `${p.key}=${p.value}`);
      variableData['Key Parameters'] = keyParams.join('; ');
    } else {
      variableData['Key Parameters'] = 'N/A';
    }

    // Value format
    variableData['Format Value'] = variable.formatValue || 'N/A';

    // Enabling and disabling triggers
    if (variable.enablingTriggerId && variable.enablingTriggerId.length > 0) {
      variableData['Enabling Triggers'] = variable.enablingTriggerId.join(', ');
    } else {
      variableData['Enabling Triggers'] = 'N/A';
    }

    if (variable.disablingTriggerId && variable.disablingTriggerId.length > 0) {
      variableData['Disabling Triggers'] = variable.disablingTriggerId.join(', ');
    } else {
      variableData['Disabling Triggers'] = 'N/A';
    }

    // Automatic observations
    const observations = [];
    if (variable.enablingTriggerId && variable.enablingTriggerId.length > 0) {
      observations.push('Conditional variable');
    }
    if (variable.type === 'jsm') observations.push('Custom JavaScript');
    if (variable.type === 'c') observations.push('Constant');
    
    variableData['Observations'] = observations.join('; ') || 'N/A';

    return variableData;
    
  } catch (error) {
    logError('GTM', `Error processing variable ${variable.name}: ${error.message}`);
    return {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Variable Name': variable.name || 'N/A',
      'Variable ID': variable.variableId || 'N/A',
      'Observations': `Processing error: ${error.message}`
    };
  }
}

/**
 * Processes a GTM trigger and extracts detailed information
 */
function processGTMTrigger(trigger, container, workspace) {
  try {
    const triggerData = {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Workspace': workspace.name || 'N/A', 
      'Trigger Name': trigger.name || 'N/A',
      'Trigger ID': trigger.triggerId || 'N/A',
      'Trigger Type': trigger.type || 'N/A',
      'Last Modified': formatDate(trigger.fingerprint) || 'N/A',
      'Notes': trigger.notes || 'N/A'
    };

    // Trigger filters
    if (trigger.filter && trigger.filter.length > 0) {
      const filterSummary = trigger.filter.map(f => {
        const condition = f.parameter?.find(p => p.key === 'arg0')?.value || 'N/A';
        const operator = f.type || 'N/A';
        const value = f.parameter?.find(p => p.key === 'arg1')?.value || 'N/A';
        return `${condition} ${operator} ${value}`;
      }).join(' & ');
      triggerData['Filters Summary'] = filterSummary;
    } else {
      triggerData['Filters Summary'] = 'No filters';
    }

    // Advanced configurations
    triggerData['Wait for Tags'] = trigger.waitForTags ? 'Yes' : 'No';
    triggerData['Check Validation'] = trigger.checkValidation ? 'Yes' : 'No';
    triggerData['Wait Timeout'] = trigger.waitForTagsTimeout || 'N/A';

    // Event names (for custom event triggers)
    if (trigger.eventName) {
      triggerData['Event Names'] = Array.isArray(trigger.eventName) 
        ? trigger.eventName.join(', ') 
        : trigger.eventName;
    } else {
      triggerData['Event Names'] = 'N/A';
    }

    // Automatic observations
    const observations = [];
    if (trigger.type === 'customEvent') observations.push('Custom event');
    if (trigger.type === 'pageview') observations.push('Page view');
    if (trigger.waitForTags) observations.push('Waits for other tags');
    if (!trigger.filter || trigger.filter.length === 0) observations.push('No filters - fires always');
    
    triggerData['Observations'] = observations.join('; ') || 'N/A';

    return triggerData;
    
  } catch (error) {
    logError('GTM', `Error processing trigger ${trigger.name}: ${error.message}`);
    return {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Trigger Name': trigger.name || 'N/A', 
      'Trigger ID': trigger.triggerId || 'N/A',
      'Observations': `Processing error: ${error.message}`
    };
  }
}

// =================================================================
// WRITING FUNCTIONS
// =================================================================

function writeAggregatedGTMData(aggregatedData) {
  try {
    logEvent('GTM', '📝 Writing data to sheets...');
    
    writeToSheetFromObjects('GTM_TAGS', GTM_TAGS_HEADERS, aggregatedData.tags, true);
    writeToSheetFromObjects('GTM_VARIABLES', GTM_VARIABLES_HEADERS, aggregatedData.variables, true);
    writeToSheetFromObjects('GTM_TRIGGERS', GTM_TRIGGERS_HEADERS, aggregatedData.triggers, true);
    
    logEvent('GTM', '✅ Data written correctly to all sheets');
    
  } catch (error) {
    logError('GTM', `Error writing data: ${error.message}`);
    throw error;
  }
}

function writeToSheetFromObjects(sheetName, headers, dataObjects, clearFirst) {
  try {
    // ALWAYS create the sheet with headers, even if there's no data
    logEvent('GTM', `📝 Creating/updating sheet ${sheetName}...`);
    
    if (!dataObjects || dataObjects.length === 0) {
      // No data, but create sheet with headers
      logWarning('GTM', `No data for sheet ${sheetName}, creating empty sheet with headers`);
      writeToSheet(sheetName, headers, [], clearFirst);
      logEvent('GTM', `✅ Sheet ${sheetName}: Created with headers (0 records)`);
      return;
    }
    
    // Convert objects to arrays using headers as order
    const dataAsArrays = dataObjects.map(obj => 
      headers.map(header => obj[header] || 'N/A')
    );
    
    writeToSheet(sheetName, headers, dataAsArrays, clearFirst);
    logEvent('GTM', `✅ Sheet ${sheetName}: ${dataObjects.length} records`);
    
  } catch (error) {
    logError('GTM', `Error writing to ${sheetName}: ${error.message}`);
    // Try to create at least an empty sheet as fallback
    try {
      writeToSheet(sheetName, headers, [], true);
      logWarning('GTM', `Sheet ${sheetName} created as fallback after error`);
    } catch (fallbackError) {
      logError('GTM', `Critical error creating sheet ${sheetName}: ${fallbackError.message}`);
    }
    throw error;
  }
}