# Addocu

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://script.google.com/)
[![Google Workspace Add-on](https://img.shields.io/badge/Google%20Workspace-Add--on-34A853)](https://workspace.google.com/marketplace)
[![Open Source](https://img.shields.io/badge/Open%20Source-Community-brightgreen)](https://opensource.org/)
[![Building in Public](https://img.shields.io/badge/Building%20in%20Public-🚀-blue)](https://www.addocu.com)

**Audit and Document Your Google Marketing Stack in Seconds.**

Addocu is a powerful, **free and open-source** Google Sheets™ Add-on designed for digital marketers, analysts, and agencies. It automates the painful process of documenting and auditing your entire Google ecosystem, pulling detailed metadata from Google Analytics 4, Google Tag Manager, and Looker Studio directly into your spreadsheet.

This project was born from countless hours spent on manual documentation and a belief that there had to be a better way. I'm sharing it with the community to give back and to build, together, the best auditing tool possible.

![Addocu Logo](docs/addocu_logo.png)

---

## ✨ Key Features

This tool provides a comprehensive, one-click audit of your setup, completely free:

### 📊 **Google Analytics 4 Complete Audit**
- **Properties & Data Streams:** Full inventory of all GA4 properties with detailed configuration
- **Custom Dimensions & Metrics:** Complete listing with scope, parameter names, and status
- **Conversion Events:** All conversion events with their configuration details
- **Audiences:** User segments with creation dates and criteria
- **Data Retention Settings:** Current retention policies and privacy settings

### 🏷️ **Google Tag Manager Deep Dive**
- **Container Inventory:** All containers with publication status and version history
- **Tags, Triggers & Variables:** Complete mapping of your GTM setup
- **Firing Status:** Which tags are active and their trigger conditions
- **Version Comparison:** Compare different container versions
- **Workspace Analysis:** Multi-workspace support for complex setups

### 📈 **Looker Studio Census**
- **Report Inventory:** All reports with owners, sharing settings, and last modified dates
- **Data Sources:** Complete mapping of data connections and refresh status
- **Report Performance:** Usage statistics and data freshness indicators
- **Sharing & Permissions:** Who has access to what reports

### 🎯 **Interactive Dashboard**
- **Visual Summary:** Bird's eye view of your entire marketing stack
- **Health Check:** Quick diagnostic of API connections and permissions
- **Asset Overview:** Count and status of all your marketing assets
- **Quick Actions:** Direct links to manage your properties

### 🔧 **Advanced Features**
- **Detailed Logging:** Every action logged for debugging and audit trails
- **Connectivity Diagnostics:** Test API keys and permissions in real-time
- **Multi-Account Support:** Switch between different Google accounts seamlessly
- **Export Ready:** All data formatted for easy sharing and reporting

---

## 📋 Prerequisites

### 🚨 **CRITICAL: Same Google Account Requirement**

⚠️ **You MUST be logged into Google Chrome AND Google Sheets with the SAME Google account.** Different accounts cause permission errors.

**Before anything else:**
1. Check your Chrome profile (top-right corner)
2. Check your Google Sheets account (top-right corner)  
3. If different → Sign out everywhere and use ONE account

### 🔑 **Other Requirements**
- **"Reader"** (or higher) access to the Google platforms you wish to audit
- All authentication is **automatic via OAuth2** - no API keys needed!

### 📚 **Quick Setup**
- Install from Google Workspace Marketplace
- Open Google Sheets
- Extensions > Addocu > Configure
- Authorize when prompted

**That's it!** No complex setup required.

---

## 🚀 Installation & Setup

### Method 1: Google Workspace Marketplace (Recommended)
1. **Install Addocu** from the [Google Workspace Marketplace](https://workspace.google.com/marketplace)
2. **Open a Google Sheet** (new or existing)
3. Go to **Extensions > Addocu > ⚙️ Configure**
4. **Enter your Google Cloud API Key** in the sidebar
5. Click **"Save"** and you're ready!

### Method 2: Manual Installation (Advanced Users)
1. **Clone this repository** or download the source code
2. **Open Google Apps Script** (script.google.com)
3. **Create a new project** and copy all `.js` and `.html` files
4. **Set up the manifest** using the provided `appsscript.json`
5. **Deploy as Add-on** following Google's guidelines

---

## 🔐 Authorization & Troubleshooting

### 🚨 **Permission Issues? 95% are Account Mismatches**

#### **❌ Most Common Error:**
```
"Error loading configuration: PERMISSION_DENIED"
"We're sorry, a server error occurred while reading from storage"
```

#### **✅ SOLUTION (Fixes 95% of issues):**

**The Problem:** You're logged into Chrome with one account but Google Sheets with another.

**The Fix:**
1. **Sign out of ALL Google accounts** in Chrome  
2. **Sign in with ONLY ONE account** (the one with your marketing data)
3. **Open Google Sheets** - verify same account (top-right corner)
4. **Try Addocu again**

#### **🔧 If That Doesn't Work:**
1. **Extensions > Addocu > 🆘 Troubleshooting > 🔄 Reauthorize Permissions**
2. **Authorize ALL permissions** when prompted

#### **📖 Need More Help?**
See our detailed [Troubleshooting Guide](docs/troubleshooting.md) for advanced solutions.

---

### 🔧 **Alternative Manual Solutions**

#### **Method 1: Quick Re-authorization**
1. Open your Google Sheet
2. Go to **Extensions > Addocu > 📊 Audit GA4**
3. **When permission dialog appears:**
   - ✅ Click "Authorize"
   - ✅ Select your Google account
   - ✅ Click "Allow" for ALL permissions
   - ❌ **Do NOT** click "Deny" or close the dialog
4. Done! All features will be available

#### **Method 2: Apps Script Manual Authorization**
1. Go to **Extensions > Apps Script**
2. In the script editor, select function: **`forceAllPermissions`**
3. Click the **"Run" (▶️)** button
4. Authorize when prompted (**allow ALL permissions**)
5. Return to Google Sheets - Addocu will work normally

#### **Method 3: Clean Reinstall (Last Resort)**
1. **Uninstall** Addocu from Google Workspace Marketplace
2. **Wait 5 minutes** for Google's cache to clear
3. **Reinstall** Addocu from the Marketplace
4. **Authorize ALL permissions** during setup

---

### 📋 **What Permissions Does Addocu Need?**

| **Permission** | **Why Needed** | **Safe?** |
|----------------|----------------|-----------|
| **Google Sheets** | Create audit report sheets | ✅ Read-only on your data |
| **Google Analytics** | Read GA4 configuration | ✅ No data modification |
| **Looker Studio** | List reports and data sources | ✅ View-only access |
| **Google Tag Manager** | Read tags, triggers, variables | ✅ No changes to containers |
| **External Service** | Call Google APIs with OAuth2 | ✅ Standard Google auth |
| **Application Data** | Save your API key securely | ✅ Stored in your account only |
| **script.external_request** | Required for API calls | ✅ Standard Google Workspace permission |

### 🛡️ **Security Guarantee**
- **✅ Read-Only Access:** Addocu never modifies your GA4, GTM, or Looker Studio configurations
- **✅ Data Isolation:** Your data never leaves your Google account
- **✅ No External Servers:** Everything runs within Google's secure infrastructure
- **✅ Open Source:** You can review all code on GitHub

---

### 🎯 **Most Issues = Account Problems**

**Remember:** 95% of Addocu issues are caused by using different Google accounts in Chrome vs Google Sheets.

**✅ Always verify first:**
- Chrome profile matches Google Sheets account
- Only one Google account active
- Account has access to your marketing data

**📖 Full Troubleshooting Guide:** [docs/troubleshooting.md](docs/troubleshooting.md)

**🆘 Get Help:**
- 🛠 **Bug Reports:** [GitHub Issues](https://github.com/Addocu/addocu/issues)  
- 📧 **Support:** hello@addocu.com

---

## 🎯 Quick Start Guide

### 1. **First Configuration**
```
Extensions > Addocu > ⚙️ Configure
```
- Enter your Google Cloud API Key
- Test the connection
- Save your settings

### 2. **Run Your First Audit**
```
Extensions > Addocu > 🚀 Audit Complete Stack
```
This will create dedicated sheets for each platform:
- `DASHBOARD` - Executive summary
- `GA4_PROPERTIES` - Google Analytics data
- `GTM_TAGS` - Tag Manager inventory
- `LOOKER_STUDIO` - Looker Studio reports
- `LOGS` - Detailed operation logs

### 3. **Explore Your Data**
Navigate through the generated sheets to discover:
- Unused tags and variables
- Data retention policies
- Sharing and permission settings
- Performance insights

---

## 🗂️ Technical Architecture

### **Core Components**
```
📁 Addocu Project Structure
├── 📄 appsscript.json        (Add-on manifest and permissions)
├── 📄 coordinator.js         (UI orchestration and menu logic)
├── 📄 dashboard.js           (Dashboard generation logic)
├── 📄 dashboard_functions.js (Dashboard support functions)
├── 📄 utilities.js           (Authentication and API utilities)
├── 📄 ga4.js                 (GA4 data extraction engine)
├── 📄 gtm.js                 (GTM synchronization logic)
├── 📄 looker_studio.js       (Looker Studio API integration)
├── 📄 logging.js             (Comprehensive logging system)
├── 📄 sidebar_support.js     (Sidebar support functions)
├── 📄 account_verification.js (Account verification tools)
├── 📄 auth_recovery.js       (Authentication recovery)
├── 📄 permission_recovery.js (Permission recovery systems)
├── 📄 diagnostics.js         (System diagnostics)
├── 📄 configuration.html     (Configuration sidebar UI)
└── 📄 interactive_dashboard.html (Interactive dashboard interface)
```

### **Security & Privacy**
- **Complete Data Isolation:** Each user's data is stored separately using `PropertiesService.getUserProperties()`
- **API Key Security:** Your API key never leaves your Google account
- **No External Servers:** Everything runs within Google's infrastructure
- **OAuth 2.0 Compliance:** Secure authentication following Google's best practices

### **Scalable Design**
- **Modular Architecture:** Each platform has its dedicated synchronization module
- **Error Handling:** Comprehensive error handling and recovery mechanisms
- **Rate Limiting:** Built-in API rate limiting to prevent quota exhaustion
- **Performance Optimized:** Efficient API calls and data processing

---

## 📄 License & Usage

Addocu is distributed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License**.

### What this means:

✅ **You ARE free to:**
- Use the tool for personal or client projects
- Share and distribute the tool
- Modify and adapt the code for your needs
- Use it in your agency or consultancy work

⚠️ **With these conditions:**
- **Attribution:** Always credit the original project
- **Non-Commercial:** You cannot sell this tool or charge for it
- **Share-Alike:** Any modifications must be shared under the same license

🚫 **You CANNOT:**
- Sell this tool or any derivative
- Remove attribution to the original project
- Create commercial versions without explicit permission

---

## 🗺️ Roadmap & Future

### **Current Status: v2.1.0**
- ✅ Complete GA4, GTM, and Looker Studio integration
- ✅ Interactive dashboard and reporting
- ✅ Open source codebase with CC BY-NC-SA 4.0 license
- ✅ Google Workspace Marketplace distribution
- ✅ OAuth2 authentication for all services

### **Coming Soon: Community Features**
- 📋 Google Ads integration
- 📋 Google Search Console support
- 📋 BigQuery data source analysis
- 📋 Enhanced error detection and recommendations
- 📋 Multi-language support

### **The Future: Addocu Pro**
We're planning a separate, commercial **Addocu Pro** version that will expand on the free tool with:

- 🔮 **Automated Scheduling:** Regular, automated audits
- 🔮 **AI-Powered Analysis:** Contextual error detection and optimization suggestions
- 🔮 **Advanced Integrations:** Deeper BigQuery, Search Console, and Ads integration
- 🔮 **Smart Monitoring:** Proactive alerts for configuration changes
- 🔮 **Team Collaboration:** Enhanced sharing and collaboration features

**Important:** Addocu will always remain free and fully functional.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### **🐛 Report Issues**
- Found a bug? [Open an issue](https://github.com/Addocu/addocu/issues)
- Include detailed steps to reproduce
- Specify your Google Workspace environment

### **💡 Suggest Features**
- Have an idea? [Start a discussion](https://github.com/Addocu/addocu/discussions)
- Explain the use case and benefit to the community
- Consider contributing the implementation

### **🔧 Contribute Code**
1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### **📖 Improve Documentation**
- Fix typos or unclear instructions
- Add examples and use cases
- Translate documentation to other languages

---

## 🆘 Support & Community

### **Community Support**
- 💬 **GitHub Discussions:** [Join the conversation](https://github.com/Addocu/addocu/discussions)
- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/Addocu/addocu/issues)
- 📧 **General Questions:** hello@addocu.com

### **Documentation**
- 📖 **Installation Guide:** [docs/installation.md](docs/installation.md)
- ⚙️ **Configuration Help:** [docs/configuration.md](docs/configuration.md)
- 🔧 **Troubleshooting:** [docs/troubleshooting.md](docs/troubleshooting.md)

### **Stay Updated**
- 🌐 **Website:** [addocu.com](https://addocu.com)
- 📱 **LinkedIn:** Follow the building in public journey
- 📊 **Use Cases:** See real-world examples and success stories

---

## 🙏 Acknowledgments

- **Google Workspace Team** for the excellent Add-on platform
- **Digital Marketing Community** for inspiration and feedback
- **Open Source Contributors** who help make this tool better every day
- **Beta Testers** who provided invaluable early feedback

---

## 📈 Project Stats

![GitHub stars](https://img.shields.io/github/stars/Addocu/addocu?style=social)
![GitHub forks](https://img.shields.io/github/forks/Addocu/addocu?style=social)
![GitHub issues](https://img.shields.io/github/issues/Addocu/addocu)
![GitHub last commit](https://img.shields.io/github/last-commit/Addocu/addocu)

---

**Made with ❤️ for the digital marketing community**

*Addocu is not affiliated with Google LLC. Google Analytics, Google Tag Manager, Looker Studio, and Google Workspace are trademarks of Google LLC.*