/**
 * @fileoverview Google Analytics 4 Governance Module.
 * Focused on Security (User Access) and configuration auditing.
 */

// =================================================================
// MODULE CONSTANTS
// =================================================================

const GA4_GOVERNANCE_SHEETS = {
    userAccess: 'GA4_USER_ACCESS'
};

const GA4_ACCESS_HEADERS = [
    'Account Name', 'Account ID', 'Property Name', 'Property ID',
    'User Email', 'Direct Roles', 'Effective Roles', 'Access Type',
    'Issues', 'Sync Date'
];

// =================================================================
// USER ACCESS AUDIT
// =================================================================

/**
 * Runs the User Access Audit.
 * Fetches all users from Accounts and Properties and flags security issues.
 * Called from menu: Extensions > Addocu > Governance > User Access Audit
 */
function runUserAccessAudit() {
    const startTime = Date.now();

    try {
        logEvent('GOVERNANCE', 'Starting User Access Audit...');
        SpreadsheetApp.getActiveSpreadsheet().toast('Auditing user access...', 'Governance', 20);

        // 1. Get all accounts and properties
        const structure = getGA4StructureForAudit();

        // 2. Fetch User Links
        const accessRecords = fetchAllUserAccess(structure);

        // 3. Analyze and Write
        writeUserAccessReport(accessRecords);

        const duration = Date.now() - startTime;
        logEvent('GOVERNANCE', `Audit complete: ${accessRecords.length} access records found in ${Math.round(duration / 1000)}s`);

        // 4. Alert on critical issues
        const adminExternal = accessRecords.filter(r => r.issues && r.issues.includes('External Admin')).length;
        if (adminExternal > 0) {
            SpreadsheetApp.getUi().alert(
                'Security Warning',
                `Found ${adminExternal} external users (gmail.com, etc.) with Administrator access.\nCheck the GA4_USER_ACCESS sheet immediately.`,
                SpreadsheetApp.getUi().ButtonSet.OK
            );
        } else {
            SpreadsheetApp.getActiveSpreadsheet().toast('User Access Audit complete.', 'Governance', 5);
        }

    } catch (e) {
        logError('GOVERNANCE', `User Access Audit failed: ${e.message}`);
        SpreadsheetApp.getUi().alert('Error', `Audit failed: ${e.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
}

/**
 * Helper to get the account/property structure.
 * Reuses the existing logic but optimizes for hierarchy.
 */
function getGA4StructureForAudit() {
    // Reuse the existing robust fetcher from ga4.js
    // We assume ga4.js is loaded in the same project
    const properties = getGA4AccountsAndProperties();

    // Group by account for efficient processing
    const accounts = {};

    properties.forEach(p => {
        const accId = p.account.name;
        if (!accounts[accId]) {
            accounts[accId] = {
                name: p.account.displayName,
                id: accId,
                path: p.account.name,
                properties: []
            };
        }
        accounts[accId].properties.push({
            name: p.property.displayName,
            id: p.property.name.split('/').pop(),
            path: p.property.name
        });
    });

    return Object.values(accounts);
}

/**
 * Fetches user links for accounts and their properties.
 */
function fetchAllUserAccess(accounts) {
    const allRecords = [];
    const auth = getAuthConfig('ga4');
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };

    for (const account of accounts) {
        // 1. Account Level Access
        try {
            const accUsersUrl = `https://analyticsadmin.googleapis.com/v1alpha/${account.path}/userLinks?pageSize=200`;
            const accResponse = fetchWithRetry(accUsersUrl, options, 'GA4-Account-Users');

            if (accResponse.userLinks) {
                for (const link of accResponse.userLinks) {
                    allRecords.push(processUserRecord(link, account, null, 'Account'));
                }
            }
        } catch (e) {
            logWarning('GOVERNANCE', `Could not get users for account ${account.name}: ${e.message}`);
        }

        // 2. Property Level Access
        for (const property of account.properties) {
            try {
                const propUsersUrl = `https://analyticsadmin.googleapis.com/v1alpha/${property.path}/userLinks?pageSize=200`;
                const propResponse = fetchWithRetry(propUsersUrl, options, 'GA4-Property-Users');

                if (propResponse.userLinks) {
                    for (const link of propResponse.userLinks) {
                        allRecords.push(processUserRecord(link, account, property, 'Property'));
                    }
                }
            } catch (e) {
                logWarning('GOVERNANCE', `Could not get users for property ${property.name}: ${e.message}`);
            }
            Utilities.sleep(100); // Rate limiting
        }
    }

    return allRecords;
}

/**
 * Processes a raw API user link into a flat record.
 */
function processUserRecord(link, account, property, scope) {
    const email = link.emailAddress;
    const directRoles = link.directRoles || [];

    // Analyze issues
    const issues = [];

    // check for external admins
    const isExternal = !email.includes('@' + getMyDomain()); // Helper needed or assumption
    // Simplified check for common public domains if we can't determine org domain easily
    const isPublicEmail = email.endsWith('@gmail.com') || email.endsWith('@yahoo.com') || email.endsWith('@hotmail.com');

    if (isPublicEmail && directRoles.includes('predefinedRoles/admin')) {
        issues.push('External Admin');
    }

    return {
        'Account Name': account.name,
        'Account ID': account.id.split('/').pop(),
        'Property Name': property ? property.name : '(Account Level)',
        'Property ID': property ? property.id : '-',
        'User Email': email,
        'Direct Roles': directRoles.map(r => r.replace('predefinedRoles/', '')).join(', '),
        'Effective Roles': '-', // API v1alpha doesn't fully resolve effective roles in simple list, staying simple
        'Access Type': scope,
        'Issues': issues.join(', ') || 'OK',
        'Sync Date': formatDate(new Date())
    };
}

/**
 * Writes the report to the sheet.
 */
function writeUserAccessReport(records) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(GA4_GOVERNANCE_SHEETS.userAccess);

    if (!sheet) {
        sheet = ss.insertSheet(GA4_GOVERNANCE_SHEETS.userAccess);
        sheet.setTabColor('#EF4444'); // Red for Security
    }

    sheet.clear();

    // Headers
    const headerRange = sheet.getRange(1, 1, 1, GA4_ACCESS_HEADERS.length);
    headerRange.setValues([GA4_ACCESS_HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#991B1B'); // Dark Red
    headerRange.setFontColor('white');

    if (records.length > 0) {
        const data = records.map(r => [
            r['Account Name'], r['Account ID'], r['Property Name'], r['Property ID'],
            r['User Email'], r['Direct Roles'], r['Effective Roles'], r['Access Type'],
            r['Issues'], r['Sync Date']
        ]);

        sheet.getRange(2, 1, data.length, GA4_ACCESS_HEADERS.length).setValues(data);

        // Conditional formatting for issues
        const issueCol = GA4_ACCESS_HEADERS.indexOf('Issues') + 1;
        for (let i = 0; i < data.length; i++) {
            if (data[i][8] !== 'OK') {
                sheet.getRange(i + 2, issueCol).setBackground('#FECACA').setFontColor('#B91C1C').setFontWeight('bold');
            }
        }
    }

    sheet.autoResizeColumns(1, GA4_ACCESS_HEADERS.length);
}

/**
 * Attempt to guess current user's domain to flag externals.
 * Fallback to common check if not Google Workspace.
 */
function getMyDomain() {
    const email = Session.getActiveUser().getEmail();
    return email.split('@')[1];
}
