# Configuration Guide ⚙️

This guide walks you through configuring Addocu after installation. Addocu v3.0+ uses **automatic OAuth2 authentication** - no API keys needed!

## 🚀 Quick Start Configuration

### Step 1: Open Configuration Sidebar
1. Open **Google Sheets**
2. Go to **Extensions** → **Addocu** → **⚙️ Configure**
3. The configuration sidebar will appear on the right

### Step 2: OAuth2 Authorization (Automatic)
- Addocu automatically handles OAuth2 authentication
- **You do NOT need to provide an API key**
- All 10 platforms are pre-configured and ready to use
- Your Google account permissions control access to each platform

### Step 3: Test Connection
1. Click **"Test All Connections"** button
2. Verify services show **Connected** status:
   - Google Analytics Admin API
   - Google Tag Manager API
   - Looker Studio API
   - Search Console API
   - YouTube Data API
   - Google Business Profile API
   - Google Ads API
   - Merchant Center API
   - BigQuery API
   - AdSense API

## 🔐 OAuth2 Authentication (v3.0+)

All Addocu services use **automatic OAuth2 authentication**. You don't need to create or manage any API keys.

### How OAuth2 Works
- **Automatic**: Addocu handles authentication automatically via `ScriptApp.getOAuthToken()`
- **Secure**: Uses your Google account's existing permissions
- **No key management**: Nothing to copy or store
- **Platform-specific**: Your access is controlled by your permissions in each platform (GA4, GTM, etc.)

### OAuth Scopes Required
Addocu requests 15 OAuth scopes to access the 10 platforms:
- `analytics.readonly` - Google Analytics 4
- `tagmanager.readonly` - Google Tag Manager
- `datastudio` - Looker Studio
- `webmasters.readonly` - Search Console
- `youtube.readonly` - YouTube
- `business.manage` - Google Business Profile
- `adwords` - Google Ads
- `content` - Merchant Center
- `bigquery.readonly` - BigQuery
- `adsense.readonly` - AdSense

**Why these scopes?** Each scope gives Addocu read-only access to the corresponding platform. You can see and approve all requested scopes when you first authorize Addocu.

### Authorization Flow
1. **First use**: Addocu requests permissions from your Google account
2. **Consent screen**: You see all requested scopes
3. **Authorization**: Grant permissions to Addocu
4. **Access granted**: Addocu can now read data from authorized platforms
5. **Token refresh**: Automatic token renewal, no re-authorization needed (unless you revoke access)

## 🎯 Platform-Specific Configuration

### Google Analytics 4 Setup

#### Required Permissions
- **Viewer** or higher on GA4 properties
- **Google Analytics Admin API** enabled

#### Supported Features
- ✅ **Properties and Data Streams**
- ✅ **Custom Dimensions and Metrics**
- ✅ **Conversion Events**
- ✅ **Audiences**
- ✅ **Data Retention Settings**

#### Configuration Tips
- **Multiple accounts:** Addocu will detect all GA4 properties you have access to
- **Shared properties:** Works with properties shared with your account
- **View-only access:** Full audit capabilities with just viewer permissions

### Google Tag Manager Setup

#### Required Permissions
- **View** or higher permissions on GTM containers
- **Google Tag Manager API** enabled

#### Supported Features
- ✅ **All Containers and Workspaces**
- ✅ **Tags, Triggers, and Variables**
- ✅ **Built-in and Custom Variables**
- ✅ **Version History and Status**
- ✅ **Firing and Blocking Triggers**

#### Configuration Tips
- **Container access:** Addocu respects your current GTM permissions
- **Multiple accounts:** All accessible containers will be included
- **Workspace isolation:** Each workspace is audited separately

### Looker Studio Setup

#### Required Permissions
- **View** access to Looker Studio reports
- **Looker Studio API** enabled

#### Supported Features
- ✅ **All Accessible Reports**
- ✅ **Data Sources and Connections**
- ✅ **Sharing and Permission Settings**
- ✅ **Last Modified Dates**
- ✅ **Owner Information**

#### Configuration Tips
- **Shared reports:** Includes reports shared with you
- **Organization reports:** Shows all org-accessible reports
- **Data source status:** Indicates which sources are active/broken

## 🎛️ Service Toggles & Advanced Configuration (v3.0+)

### Enable/Disable Individual Platforms

In the configuration sidebar, you can **selectively enable or disable** platforms:

- **GA4** - Google Analytics 4 audit
- **GTM** - Google Tag Manager audit
- **Looker Studio** - Looker Studio reports
- **Search Console** - Search Console data
- **YouTube** - YouTube channel audit
- **Google Business Profile** - Location management
- **Google Ads** - Ads campaigns and conversions
- **Merchant Center** - Product feeds
- **BigQuery** - Datasets and tables
- **AdSense** - Monetization audit

**Use cases:**
- Run audits for only specific platforms
- Reduce execution time by disabling unused platforms
- Save on API quota usage by limiting platform syncs

### Google Ads Developer Token (v3.0+)

Google Ads requires a **Developer Token** for API access:

1. **Get your Developer Token:**
   - Go to [ads.google.com](https://ads.google.com)
   - Click on **Tools & Settings** (gear icon)
   - Select **API Center** → **Access level**
   - Copy your **Developer Token** (40-character alphanumeric string)

2. **Configure in Addocu:**
   - Go to **Extensions > Addocu > Configure**
   - Paste your Developer Token in the **"Google Ads Developer Token"** field
   - Click **Save**

3. **Test Connection:**
   - Click **"Test All Connections"**
   - Google Ads should show **Connected** status

**Note:** The Developer Token is stored securely in your user properties and never transmitted externally.

### Advanced Filters (Optional)

Customize your audits with optional filters:

- **GA4 Properties Filter** - Audit specific properties (comma-separated IDs)
- **GTM Workspaces Filter** - Audit specific workspaces
- **BigQuery Project ID** - Specify which BigQuery project to audit

## 🔄 Multi-User Setup

### Personal vs Organization Use

#### Personal Use
- **Single Google account** with OAuth2 authentication
- **Access only your own** GA4, GTM, and other resources
- **Configuration stored** in your personal Google Apps Script properties

#### Organization Use
- **Each user authenticates** with their own account
- **Shared spreadsheets** can be used by multiple team members
- **Each user sees** only the data they have access to
- **No central configuration** - each user configures independently

### Sharing Audit Results

Since all data is stored in Google Sheets:
1. Create an audit in your personal sheet
2. **Share the sheet** with team members
3. They can **view all audit results** (but cannot re-run audits with their own access)
4. Each team member can **run their own audit** in their personal sheet to see data they have access to

## 📊 Testing Your Configuration

### Connection Diagnostics

#### Running the Test
1. In the configuration sidebar, click **"Test API Connection"**
2. Addocu will check each API individually
3. Results will show as:
   - ✅ **Connected** - API is working correctly
   - ❌ **Failed** - Issue with API or permissions
   - ⚠️ **Warning** - Limited access or quota concerns

#### Understanding Results

**Google Analytics Admin API:**
- ✅ Connected: Can access GA4 properties
- ❌ Failed: API not enabled or no GA4 access

**Google Tag Manager API:**
- ✅ Connected: Can access GTM containers
- ❌ Failed: API not enabled or no GTM access

**Looker Studio API:**
- ✅ Connected: Can access Looker Studio reports
- ❌ Failed: API not enabled or no Looker Studio access

### Sample Audit Run

#### Quick Test
1. After successful connection test, go to **Extensions** → **Addocu** → **🔄 Sync GA4**
2. This will run a **limited audit** of one platform
3. Check the **LOGS** sheet for detailed operation info

#### Full Test
1. Run **Extensions** → **Addocu** → **🔄 Sync All Platforms**
2. Wait for completion (may take 2-5 minutes)
3. Verify all sheets are created:
   - `DASHBOARD` - Should show summary statistics
   - `GA4_PROPERTIES` - Should list your GA4 properties
   - `GTM_TAGS` - Should show your GTM containers
   - `LOOKER_STUDIO` - Should list your reports

## 🛡️ Security and Privacy

### Data Storage
- **API key storage:** Securely stored in Google Apps Script User Properties
- **Audit data:** Stored only in your Google Sheets
- **No external transmission:** Data never leaves your Google account

### Privacy Considerations
- **Addocu developers** cannot access your data or API keys
- **Google Apps Script** provides the security layer
- **Your Google account** controls all access permissions

### Best Practices
1. **Don't share API keys** with others
2. **Regularly review** API key usage in Google Cloud Console
3. **Remove unused keys** when no longer needed
4. **Monitor billing** for unexpected API usage

## 🚨 Troubleshooting Configuration

### Common Configuration Issues

#### Sidebar Won't Open
**Solutions:**
1. **Refresh the Google Sheet** page
2. **Check popup blockers** - disable for Google Sheets
3. **Try a different browser** or incognito mode

#### Configuration Won't Save
**Solutions:**
1. **Check internet connection**
2. **Verify Google Apps Script** isn't blocked by your organization
3. **Try again** after a few minutes

#### API Test Always Fails
**Solutions:**
1. **Verify all APIs are enabled** in Google Cloud Console
2. **Check API key restrictions** aren't too limiting
3. **Confirm billing is enabled** on your Google Cloud project

### Advanced Troubleshooting

#### Debug Mode
1. Open **Extensions** → **Addocu** → **📋 View Logs**
2. Look for **configuration-related errors**
3. Check **API response codes** and error messages

#### Manual API Testing
You can test APIs manually using curl or browser:

```bash
# Test GA4 API
curl "https://analyticsadmin.googleapis.com/v1beta/accounts?key=YOUR_API_KEY"

# Test GTM API  
curl "https://tagmanager.googleapis.com/tagmanager/v2/accounts?key=YOUR_API_KEY"

# Test Looker Studio API
curl "https://datastudio.googleapis.com/v1/reports?key=YOUR_API_KEY"
```

## 🔄 Updating Configuration

### When to Update
- **New Google Cloud project** - new API key needed
- **Changed permissions** - may affect platform access
- **API restrictions modified** - could break existing configuration

### How to Update
1. **Generate new API key** if needed
2. **Open configuration sidebar** in Addocu
3. **Enter new API key** and save
4. **Run connection test** to verify

### Migration Between Projects
1. **Note current configuration** and audit schedules
2. **Set up new Google Cloud project** and APIs
3. **Update Addocu configuration** with new API key
4. **Test thoroughly** before decommissioning old project

---

**Next Step:** [Troubleshooting Guide](troubleshooting.md) for resolving common issues.
