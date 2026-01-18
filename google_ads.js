/**
 * @fileoverview Module for Google Ads Integration
 * @version 1.1 - Added Developer Token support
 */

/**
 * Syncs Google Ads data with UI feedback.
 */
function syncGoogleAdsWithUI() {
  const ui = SpreadsheetApp.getUi();
  const result = syncGoogleAdsCore();

  if (result.success) {
    const details = result.details || {};
    const body = `Accounts: ${result.message} | Campaigns: ${details.campaigns || 0} | Conversions: ${details.conversions || 0} | Audiences: ${details.audiences || 0}\n\n` +
      `Total: ${result.records} elements | Time: 0s\n\n` +
      `Data written to ADS_CAMPAIGNS, ADS_CONVERSIONS, ADS_AUDIENCES.`;
    ui.alert('Google Ads Synchronized', body, ui.ButtonSet.OK);
  } else {
    const body = `Synchronization failed: ${result.message}\n\n` +
      `Action: Ensure your Developer Token is valid and configured in Addocu settings, and that the Google Ads API is enabled in your Google Cloud Project.\n\n` +
      `Details: Check LOGS sheet for more information.`;
    ui.alert('Google Ads Error', body, ui.ButtonSet.OK);
  }
}

/**
 * Core function to sync Google Ads data.
 * @returns {Object} Result object.
 */
function syncGoogleAdsCore() {
  try {
    logEvent('GOOGLE_ADS', 'Starting Google Ads audit...', 'INFO');

    // 1. Validate Service & Token
    const authConfig = getAuthConfig('googleAds'); // Checks for OAuth + Dev Token

    // 2. Fetch Accessible Customers
    const customers = listAccessibleCustomers(authConfig);
    if (!customers || customers.length === 0) {
      logEvent('GOOGLE_ADS', 'No accessible Google Ads customers found.');
      // Continue to write empty sheets for feedback
    }

    let allCampaigns = [];
    let allConversions = [];
    let allAudiences = [];

    // 3. Process each customer
    // Note: In a real MCC scenario, we should traverse the hierarchy.
    // For this MVP, we iterate accessible customers directly.
    for (const customerResourceName of customers) {
      const customerId = customerResourceName.split('/')[1];
      try {
        const campaigns = getGoogleAdsCampaigns(customerId, authConfig);
        allCampaigns = allCampaigns.concat(campaigns);

        const conversions = getGoogleAdsConversionActions(customerId, authConfig);
        allConversions = allConversions.concat(conversions);

        const audiences = getGoogleAdsAudiences(customerId, authConfig);
        allAudiences = allAudiences.concat(audiences);

      } catch (e) {
        logWarning('GOOGLE_ADS', `Skipping customer ${customerId}: ${e.message}`);
      }
    }

    // 4. Write to Sheets
    writeGoogleAdsToSheet(allCampaigns);
    writeGoogleAdsConversionsToSheet(allConversions);
    writeGoogleAdsAudiencesToSheet(allAudiences);

    logEvent('GOOGLE_ADS', `Completed Google Ads audit. Campaigns: ${allCampaigns.length}, Conversions: ${allConversions.length}, Audiences: ${allAudiences.length}`);

    return {
      success: true,
      status: 'SUCCESS',
      message: `Processed ${customers.length} accounts`,
      records: allCampaigns.length + allConversions.length + allAudiences.length,
      details: {
        campaigns: allCampaigns.length,
        conversions: allConversions.length,
        audiences: allAudiences.length
      }
    };

  } catch (error) {
    // Use granular error handler for better user messaging
    const authError = handleAuthError('Google Ads', error);
    if (authError.status === 'AUTH_FAILED') {
      logError('GOOGLE_ADS', `Authentication error: ${authError.userMessage}`);
      const ADS_ERROR_HEADERS = ['Customer ID', 'Campaign ID', 'Campaign Name', 'Status', 'Advertising Channel', 'Budget Type', 'Budget Amount (Micros)', 'Budget ID', 'Start Date', 'End Date', 'Target CPA (Micros)', 'Target ROAS', 'Strategy Type', 'Sync Date'];
      writeDataToSheet('GOOGLE_ADS_CAMPAIGNS', ADS_ERROR_HEADERS, null, 'Google Ads', authError.userMessage);
      return {
        success: false,
        status: 'AUTH_FAILED',
        message: authError.userMessage,
        records: 0,
        actionItems: authError.actionItems
      };
    }

    logError('GOOGLE_ADS', `Fatal error in Google Ads audit: ${error.message}`);
    const ADS_ERROR_HEADERS = ['Customer ID', 'Campaign ID', 'Campaign Name', 'Status', 'Advertising Channel', 'Budget Type', 'Budget Amount (Micros)', 'Budget ID', 'Start Date', 'End Date', 'Target CPA (Micros)', 'Target ROAS', 'Strategy Type', 'Sync Date'];
    writeDataToSheet('GOOGLE_ADS_CAMPAIGNS', ADS_ERROR_HEADERS, null, 'Google Ads', error.message);

    return {
      success: false,
      status: 'ERROR',
      message: error.message,
      records: 0
    };
  }
}

/**
 * Lists accessible customers for the user.
 * @param {Object} authConfig - Auth configuration.
 * @returns {Array<string>} List of customer resource names.
 */
function listAccessibleCustomers(authConfig) {
  const url = `${ADDOCU_CONFIG.apis.googleAds.baseUrl}`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: authConfig.headers,
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code !== 200) {
      throw new Error(`API Error (${code}): ${text}`);
    }

    const data = JSON.parse(text);
    return data.resourceNames || [];

  } catch (e) {
    logError('GOOGLE_ADS', `Error listing customers: ${e.message}`);
    throw e;
  }
}

/**
 * Fetches campaigns for a specific customer.
 * @param {string} customerId - The customer ID (123-456-7890 format stripped).
 * @param {Object} authConfig - Auth configuration.
 * @returns {Array<Object>} List of campaigns.
 */
function getGoogleAdsCampaigns(customerId, authConfig) {
  // We need to set the login-customer-id header to the target customer
  // OR the MCC ID if we were authenticating via MCC.
  // For 'listAccessibleCustomers', we don't need it.
  // For searching a specific client, we usually need it if we are acting as them.
  // However, simple direct access might work if the user is a direct admin.
  // We will try adding the login-customer-id header as the customerId itself.

  const headers = { ...authConfig.headers, 'login-customer-id': customerId };
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.start_date,
      campaign.end_date,
      customer.descriptive_name,
      customer.id
    FROM campaign
    ORDER BY campaign.id
  `;

  const url = `https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: headers,
      contentType: 'application/json',
      payload: JSON.stringify({ query: query }),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    if (code !== 200) {
      // Common error: user cannot access this specific sub-account directly
      // logging strictly warning to avoid stopping the whole process
      logWarning('GOOGLE_ADS', `Cannot access customer ${customerId} details: ${response.getContentText().substring(0, 100)}`);
      return [];
    }

    const data = JSON.parse(response.getContentText());
    if (!data.results) return [];

    return data.results.map(row => ({
      accountId: row.customer.id,
      accountName: row.customer.descriptiveName,
      campaignId: row.campaign.id,
      campaignName: row.campaign.name,
      status: row.campaign.status,
      type: row.campaign.advertisingChannelType,
      startDate: row.campaign.startDate,
      endDate: row.campaign.endDate
    }));

  } catch (e) {
    logError('GOOGLE_ADS', `Error fetching campaigns for ${customerId}: ${e.message}`);
    return [];
  }
}

/**
 * Writes Google Ads data to the sheet.
 * @param {Array<Object>} campaigns - List of campaigns.
 */
function writeGoogleAdsToSheet(campaigns) {
  if (!campaigns || campaigns.length === 0) return;

  const headers = [
    'Customer ID', 'Campaign ID', 'Campaign Name', 'Status', 'Advertising Channel',
    'Budget Type', 'Budget Amount (Micros)', 'Budget ID', 'Start Date', 'End Date',
    'Target CPA (Micros)', 'Target ROAS', 'Strategy Type', 'Sync Date'
  ];

  writeDataToSheet('ADS_CAMPAIGNS', headers, campaigns, 'Google Ads');
}

/**
 * Fetches conversion actions for a specific customer.
 * @param {string} customerId - The customer ID.
 * @param {Object} authConfig - Auth configuration.
 * @returns {Array<Object>} List of conversion actions.
 */
function getGoogleAdsConversionActions(customerId, authConfig) {
  const headers = { ...authConfig.headers, 'login-customer-id': customerId };
  const query = `
    SELECT
      conversion_action.id,
      conversion_action.name,
      conversion_action.status,
      conversion_action.type,
      conversion_action.category,
      customer.descriptive_name,
      customer.id
    FROM conversion_action
    ORDER BY conversion_action.id
  `;

  const url = `https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: headers,
      contentType: 'application/json',
      payload: JSON.stringify({ query: query }),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) return [];

    const data = JSON.parse(response.getContentText());
    if (!data.results) return [];

    return data.results.map(row => ({
      accountId: row.customer.id,
      accountName: row.customer.descriptiveName,
      conversionId: row.conversionAction.id,
      conversionName: row.conversionAction.name,
      status: row.conversionAction.status,
      type: row.conversionAction.type,
      category: row.conversionAction.category
    }));

  } catch (e) {
    logWarning('GOOGLE_ADS', `Error fetching conversions for ${customerId}: ${e.message}`);
    return [];
  }
}

/**
 * Fetches user lists (audiences) for a specific customer.
 * @param {string} customerId - The customer ID.
 * @param {Object} authConfig - Auth configuration.
 * @returns {Array<Object>} List of user lists.
 */
function getGoogleAdsAudiences(customerId, authConfig) {
  const headers = { ...authConfig.headers, 'login-customer-id': customerId };
  const query = `
    SELECT
      user_list.id,
      user_list.name,
      user_list.type,
      user_list.membership_status,
      user_list.size_for_search,
      user_list.size_for_display,
      customer.descriptive_name,
      customer.id
    FROM user_list
    ORDER BY user_list.id
  `;

  const url = `https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: headers,
      contentType: 'application/json',
      payload: JSON.stringify({ query: query }),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) return [];

    const data = JSON.parse(response.getContentText());
    if (!data.results) return [];

    return data.results.map(row => ({
      accountId: row.customer.id,
      accountName: row.customer.descriptiveName,
      listId: row.userList.id,
      listName: row.userList.name,
      type: row.userList.type,
      status: row.userList.membershipStatus,
      sizeSearch: row.userList.sizeForSearch,
      sizeDisplay: row.userList.sizeForDisplay
    }));

  } catch (e) {
    logWarning('GOOGLE_ADS', `Error fetching audiences for ${customerId}: ${e.message}`);
    return [];
  }
}

/**
 * Writes Google Ads Conversion Actions to the sheet.
 * @param {Array<Object>} conversions - List of conversions.
 */
function writeGoogleAdsConversionsToSheet(conversions) {
  const headers = [
    'Customer ID', 'Conversion ID', 'Name', 'Type', 'Status', 'Category',
    'Origin', 'Count Type', 'Value Format', 'View-through Lookback',
    'Attribution Model', 'Sync Date'
  ];

  writeDataToSheet('ADS_CONVERSIONS', headers, conversions, 'Google Ads');
}

/**
 * Writes Google Ads Audiences (User Lists) to the sheet.
 * @param {Array<Object>} audiences - List of audiences.
 */
function writeGoogleAdsAudiencesToSheet(audiences) {
  const headers = [
    'Customer ID', 'Audience ID', 'Name', 'Resource Name', 'Description',
    'Type', 'Size', 'Status', 'Notes', 'Sync Date'
  ];

  writeDataToSheet('ADS_AUDIENCES', headers, audiences, 'Google Ads');
}
