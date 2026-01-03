/**
 * @fileoverview Google AdSense Audit Module
 * @version 1.0
 */

// =================================================================
// MODULE CONSTANTS AND CONFIGURATION
// =================================================================

const ADSENSE_ACCOUNTS_HEADERS = [
    'Account ID', 'Account Name', 'State', 'Time Zone', 'Currency Code', 'Creation Date', 'Sync Date'
];

const ADSENSE_ADUNITS_HEADERS = [
    'Account ID', 'Ad Client ID', 'Ad Unit ID', 'Ad Unit Name', 'State', 'Content Ad Type', 'Display Name', 'Sync Date'
];

const ADSENSE_SITES_HEADERS = [
    'Account ID', 'Site ID', 'Domain', 'State', 'Auto Ads Enabled', 'Sync Date'
];

const ADSENSE_CUSTOM_CHANNELS_HEADERS = [
    'Account ID', 'Ad Client ID', 'Channel ID', 'Channel Name', 'Active', 'Sync Date'
];

// =================================================================
// SYNCHRONIZATION FUNCTIONS (EXECUTABLE FROM MENU)
// =================================================================

/**
 * Main function to synchronize AdSense data.
 * @returns {Object} Sync status and record count.
 */
function syncAdSenseCore() {
    const startTime = Date.now();
    const serviceName = 'adsense';
    const results = { accounts: 0, adUnits: 0, sites: 0, customChannels: 0 };

    try {
        const auth = getAuthConfig(serviceName);
        logSyncStart('AdSense_Sync', auth.authUser);

        // 1. GET ACCOUNTS
        logEvent('AdSense', 'Phase 1: Extracting AdSense accounts...');
        const accounts = listAdSenseAccounts();
        results.accounts = accounts.length;

        if (accounts.length === 0) {
            logWarning('AdSense', 'No AdSense accounts found.');
            writeAdSenseAccountsToSheet([]); // Will trigger "No account found" via centralized utility
            return {
                records: 0,
                status: 'SUCCESS',
                duration: Date.now() - startTime,
                details: results
            };
        }

        writeAdSenseAccountsToSheet(accounts);

        // 2. PROCESS EACH ACCOUNT FOR AD UNITS, SITES, AND CUSTOM CHANNELS
        const allAdUnits = [];
        const allSites = [];
        const allCustomChannels = [];

        for (const account of accounts) {
            const accountId = account.accountId;

            // Get Ad Clients (required for ad units and custom channels)
            try {
                const adClients = listAdClients(accountId);

                for (const adClient of adClients) {
                    const adClientId = adClient.name.split('/').pop();

                    // Get Ad Units
                    try {
                        const adUnits = listAdUnits(accountId, adClientId);
                        allAdUnits.push(...adUnits.map(au => ({
                            'Account ID': accountId,
                            ...au
                        })));
                    } catch (e) {
                        logWarning('AdSense', `Could not get ad units for ${adClientId}: ${e.message}`);
                    }

                    // Get Custom Channels
                    try {
                        const customChannels = listCustomChannels(accountId, adClientId);
                        allCustomChannels.push(...customChannels.map(cc => ({
                            'Account ID': accountId,
                            ...cc
                        })));
                    } catch (e) {
                        logWarning('AdSense', `Could not get custom channels for ${adClientId}: ${e.message}`);
                    }
                }
            } catch (e) {
                logWarning('AdSense', `Could not get ad clients for ${accountId}: ${e.message}`);
            }

            // Get Sites
            try {
                const sites = listSites(accountId);
                allSites.push(...sites.map(s => ({
                    'Account ID': accountId,
                    ...s
                })));
            } catch (e) {
                logWarning('AdSense', `Could not get sites for ${accountId}: ${e.message}`);
            }

            Utilities.sleep(200); // Pause between accounts
        }

        results.adUnits = allAdUnits.length;
        results.sites = allSites.length;
        results.customChannels = allCustomChannels.length;

        writeAdSenseAdUnitsToSheet(allAdUnits);
        writeAdSenseSitesToSheet(allSites);
        writeAdSenseCustomChannelsToSheet(allCustomChannels);

        const totalElements = results.accounts + results.adUnits + results.sites + results.customChannels;
        const duration = Date.now() - startTime;
        logSyncEnd('AdSense_Sync', totalElements, duration, 'SUCCESS');

        return {
            records: totalElements,
            status: 'SUCCESS',
            duration: duration,
            details: results
        };

    } catch (error) {
        const duration = Date.now() - startTime;
        logSyncEnd('AdSense_Sync', 0, duration, 'ERROR');
        logError('AdSense', `Synchronization failed: ${error.message}`);
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
function syncAdSenseWithUI() {
    showLoadingNotification('Syncing Google AdSense assets...');
    const result = syncAdSenseCore();
    const ui = SpreadsheetApp.getUi();

    if (result.status === 'SUCCESS') {
        const details = result.details;
        const message = `✅ AdSense Synchronized Successfully\n\n` +
            `📰 Accounts: ${details.accounts}\n` +
            `📊 Ad Units: ${details.adUnits}\n` +
            `🌐 Sites: ${details.sites}\n` +
            `📂 Custom Channels: ${details.customChannels}\n\n` +
            `Total: ${result.records} elements\n` +
            `Time: ${Math.round(result.duration / 1000)}s`;
        ui.alert('📰 AdSense Completed', message, ui.ButtonSet.OK);
    } else {
        ui.alert(
            '❌ AdSense Error',
            `Synchronization failed: ${result.error}\n\nCheck the LOGS sheet for more details.`,
            ui.ButtonSet.OK
        );
    }
}

// =================================================================
// DATA EXTRACTION HELPERS
// =================================================================

/**
 * Lists AdSense accounts for the authenticated user.
 * @returns {Array<Object>} Array of account objects.
 */
function listAdSenseAccounts() {
    const auth = getAuthConfig('adsense');
    const url = 'https://adsense.googleapis.com/v2/accounts';
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

    const response = fetchWithRetry(url, options, 'AdSense-Accounts');
    if (!response || !response.accounts) return [];

    return response.accounts.map(account => ({
        accountId: account.name.split('/').pop(),
        displayName: account.displayName || 'N/A',
        state: account.state || 'N/A',
        timeZone: account.timeZone || 'N/A',
        currencyCode: account.currencyCode || 'N/A',
        createTime: account.createTime || 'N/A'
    }));
}

/**
 * Lists ad clients for a specific account.
 * @param {string} accountId - AdSense Account ID
 * @returns {Array<Object>} Array of ad client objects.
 */
function listAdClients(accountId) {
    const auth = getAuthConfig('adsense');
    const url = `https://adsense.googleapis.com/v2/accounts/${accountId}/adclients`;
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

    const response = fetchWithRetry(url, options, `AdSense-AdClients-${accountId}`);
    if (!response || !response.adClients) return [];

    return response.adClients;
}

/**
 * Lists ad units for a specific account and ad client.
 * @param {string} accountId - AdSense Account ID
 * @param {string} adClientId - Ad Client ID
 * @returns {Array<Object>} Array of ad unit objects.
 */
function listAdUnits(accountId, adClientId) {
    const auth = getAuthConfig('adsense');
    const url = `https://adsense.googleapis.com/v2/accounts/${accountId}/adclients/${adClientId}/adunits`;
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

    const response = fetchWithRetry(url, options, `AdSense-AdUnits-${adClientId}`);
    if (!response || !response.adUnits) return [];

    return response.adUnits.map(adUnit => ({
        'Ad Client ID': adClientId,
        'Ad Unit ID': adUnit.name.split('/').pop(),
        'Ad Unit Name': adUnit.name,
        'State': adUnit.state || 'N/A',
        'Content Ad Type': adUnit.contentAdsSettings?.type || 'N/A',
        'Display Name': adUnit.displayName || 'N/A'
    }));
}

/**
 * Lists sites for a specific account.
 * @param {string} accountId - AdSense Account ID
 * @returns {Array<Object>} Array of site objects.
 */
function listSites(accountId) {
    const auth = getAuthConfig('adsense');
    const url = `https://adsense.googleapis.com/v2/accounts/${accountId}/sites`;
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

    const response = fetchWithRetry(url, options, `AdSense-Sites-${accountId}`);
    if (!response || !response.sites) return [];

    return response.sites.map(site => ({
        'Site ID': site.name.split('/').pop(),
        'Domain': site.domain || 'N/A',
        'State': site.state || 'N/A',
        'Auto Ads Enabled': site.autoAdsEnabled ? 'Yes' : 'No'
    }));
}

/**
 * Lists custom channels for a specific account and ad client.
 * @param {string} accountId - AdSense Account ID
 * @param {string} adClientId - Ad Client ID
 * @returns {Array<Object>} Array of custom channel objects.
 */
function listCustomChannels(accountId, adClientId) {
    const auth = getAuthConfig('adsense');
    const url = `https://adsense.googleapis.com/v2/accounts/${accountId}/adclients/${adClientId}/customchannels`;
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

    const response = fetchWithRetry(url, options, `AdSense-CustomChannels-${adClientId}`);
    if (!response || !response.customChannels) return [];

    return response.customChannels.map(channel => ({
        'Ad Client ID': adClientId,
        'Channel ID': channel.name.split('/').pop(),
        'Channel Name': channel.displayName || 'N/A',
        'Active': channel.active ? 'Yes' : 'No'
    }));
}

// =================================================================
// SHEET WRITING HELPERS
// =================================================================

function writeAdSenseAccountsToSheet(accounts) {
    const syncDate = formatDate(new Date());
    const data = accounts.map(a => [
        a.accountId,
        a.displayName,
        a.state,
        a.timeZone,
        a.currencyCode,
        a.createTime,
        syncDate
    ]);
    writeDataToSheet('ADSENSE_ACCOUNTS', ADSENSE_ACCOUNTS_HEADERS, data, 'AdSense');
}

function writeAdSenseAdUnitsToSheet(adUnits) {
    const syncDate = formatDate(new Date());
    const data = adUnits.map(au => [
        au['Account ID'],
        au['Ad Client ID'],
        au['Ad Unit ID'],
        au['Ad Unit Name'],
        au['State'],
        au['Content Ad Type'],
        au['Display Name'],
        syncDate
    ]);
    writeDataToSheet('ADSENSE_ADUNITS', ADSENSE_ADUNITS_HEADERS, data, 'AdSense');
}

function writeAdSenseSitesToSheet(sites) {
    const syncDate = formatDate(new Date());
    const data = sites.map(s => [
        s['Account ID'],
        s['Site ID'],
        s['Domain'],
        s['State'],
        s['Auto Ads Enabled'],
        syncDate
    ]);
    writeDataToSheet('ADSENSE_SITES', ADSENSE_SITES_HEADERS, data, 'AdSense');
}

function writeAdSenseCustomChannelsToSheet(customChannels) {
    const syncDate = formatDate(new Date());
    const data = customChannels.map(cc => [
        cc['Account ID'],
        cc['Ad Client ID'],
        cc['Channel ID'],
        cc['Channel Name'],
        cc['Active'],
        syncDate
    ]);
    writeDataToSheet('ADSENSE_CUSTOM_CHANNELS', ADSENSE_CUSTOM_CHANNELS_HEADERS, data, 'AdSense');
}
