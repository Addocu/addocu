# Configuration Guide ⚙️

This guide walks you through configuring Addocu after installation, focusing on API key setup and platform connections.

## 🚀 Quick Start Configuration

### Step 1: Open Configuration Sidebar
1. Open **Google Sheets**
2. Go to **Extensions** → **Addocu** → **⚙️ Configure**
3. The configuration sidebar will appear on the right

### Step 2: Enter API Key
1. Paste your **Google Cloud API Key** in the text field
2. Click **"Save Configuration"**
3. Wait for the **"Configuration saved successfully"** message

### Step 3: Test Connection
1. Click **"Test API Connection"** button
2. Verify all services show **✅ Connected** status:
   - Google Analytics Admin API
   - Google Tag Manager API
   - Looker Studio API

## 🔑 API Key Management

### Creating Your API Key

If you haven't created an API key yet, follow these steps:

#### Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Create or select a project**
3. **Enable billing** (required, but usage stays within free limits)

#### Enable Required APIs
```
✅ Google Analytics Admin API (analyticsadmin.googleapis.com)
✅ Google Tag Manager API (tagmanager.googleapis.com)  
✅ Looker Studio API (datastudio.googleapis.com)
```

#### Create API Key
1. Navigate to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. **Copy the key** immediately
4. **(Recommended)** Click **"Restrict Key"**

### API Key Security Best Practices

#### Restrict Your API Key
1. In Google Cloud Console, go to **Credentials**
2. Click on your API key
3. Under **"API restrictions"**, select **"Restrict key"**
4. Choose only the APIs you need:
   - Google Analytics Admin API
   - Google Tag Manager API
   - Looker Studio API

#### Application Restrictions (Optional)
- **HTTP referrers:** Add your Google Sheets domains if needed
- **IP addresses:** Restrict to your organization's IPs for extra security

### Troubleshooting API Key Issues

#### "Invalid API Key" Error
**Possible causes:**
- Key was copied incorrectly (check for extra spaces)
- APIs are not enabled in Google Cloud Console
- Key is restricted to wrong APIs

**Solutions:**
1. **Double-check the key** - copy again from Google Cloud Console
2. **Verify API enablement** - ensure all 3 APIs are enabled
3. **Check restrictions** - make sure key isn't over-restricted

#### "Access Denied" Error
**Possible causes:**
- Your Google account doesn't have access to the platforms
- Insufficient permissions in GA4, GTM, or Looker Studio

**Solutions:**
1. **Check platform access** - ensure you can access GA4, GTM, and Looker Studio manually
2. **Verify permissions** - you need at least "Reader" level access
3. **Contact admin** - ask for the necessary platform permissions

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

## 🔄 Managing Multiple Configurations

### Personal vs Organization Use

#### Personal Use
- **Use your personal Google account** API key
- **Access only your own** GA4, GTM, and Looker Studio resources
- **Configuration stored** in your personal Google Apps Script properties

#### Organization Use
- **Each user needs their own** API key (Google security requirement)
- **Shared resources** will be visible to all users with access
- **No central configuration** - each user configures independently

### Switching Between Accounts

#### Method 1: Multiple API Keys
1. **Create separate Google Cloud projects** for different accounts
2. **Generate API keys** for each project
3. **Switch in Addocu** by updating the API key in configuration

#### Method 2: Shared Project
1. **Use one Google Cloud project** with broad permissions
2. **Share project access** with team members
3. **Same API key** can be used by multiple team members

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
