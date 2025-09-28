# Addocu 🚀

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://script.google.com/)
[![Open Source](https://img.shields.io/badge/Open%20Source-Community-brightgreen)](https://opensource.org/)
[![Building in Public](https://img.shields.io/badge/Building%20in%20Public-🚀-blue)](https://www.addocu.com)
[![Beta Status](https://img.shields.io/badge/Status-Open%20Beta-orange)](https://github.com/Addocu/addocu)

**Audit and Document Your Google Marketing Stack in Seconds.**

Addocu is a powerful, **free and open-source** Google Sheets™ Add-on designed for digital marketers, analysts, and agencies. It automates the painful process of documenting and auditing your entire Google ecosystem, pulling detailed metadata from Google Analytics 4, Google Tag Manager, and Looker Studio directly into your spreadsheet.

This project was born from countless hours spent on manual documentation and a belief that there had to be a better way. I'm sharing it with the community to give back and to build, together, the best auditing tool possible.

---

## 🚧 Current Status: Open Beta

**We're building in public!** Addocu is currently in **open beta** phase. The tool is fully functional but we're actively gathering feedback from the community before the official marketplace launch.

**What this means:**
- ✅ All features are available and working
- ✅ Code is open source under CC BY-NC-SA 4.0
- ✅ Free forever for the community
- 🔄 Active development and improvements based on feedback
- 🔄 Preparing for Google Workspace Marketplace submission

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

### 🔑 **Authentication Requirements**
- **Google Cloud API Key:** You'll need your own Google Cloud API Key for authentication
- **"Reader"** (or higher) access to the Google platforms you wish to audit
- **Same Google Account:** Ensure you're logged into the same Google account across Chrome and Google Sheets

### 🚨 **CRITICAL: Same Google Account Requirement**

⚠️ **You MUST be logged into Google Chrome AND Google Sheets with the SAME Google account.** Different accounts cause permission errors.

**Before anything else:**
1. Check your Chrome profile (top-right corner)
2. Check your Google Sheets account (top-right corner)  
3. If different → Sign out everywhere and use ONE account

---

## 🚀 Installation & Setup

### Method 1: Manual Installation from GitHub (Current - Beta Phase)

1. **Clone or Download this repository**
   ```bash
   git clone https://github.com/Addocu/addocu.git
   ```

2. **Open Google Apps Script** (script.google.com)

3. **Create a new project** and copy all `.js` and `.html` files from this repository

4. **Set up the manifest** using the provided `appsscript.json`

5. **Get your Google Cloud API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable the required APIs (GA4 Admin API, GTM API, etc.)
   - Create an API key in Credentials

6. **Test the Add-on:**
   - Open a Google Sheet
   - Run the Add-on functions
   - Enter your API key when prompted

### Method 2: Google Workspace Marketplace (Coming Soon)

🔄 **We're preparing for marketplace submission.** This will be the easiest installation method once approved by Google.

---

## 🔒 Authorization & Troubleshooting

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

#### **🔧 Alternative Solutions:**

**Method 1: Force Re-authorization**
1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. In the script editor, run the authorization function
4. **Authorize ALL permissions** when prompted

**Method 2: Check API Key**
1. Verify your Google Cloud API Key is valid
2. Ensure required APIs are enabled in your Google Cloud project
3. Check API key restrictions aren't blocking requests

#### **📖 Need More Help?**
See our detailed [Troubleshooting Guide](docs/troubleshooting.md) for advanced solutions.

---

### 📋 **What Permissions Does Addocu Need?**

| **Permission** | **Why Needed** | **Safe?** |
|----------------|----------------|-----------|
| **Google Sheets** | Create audit report sheets | ✅ Read-only on your data |
| **Google Analytics** | Read GA4 configuration | ✅ No data modification |
| **Looker Studio** | List reports and data sources | ✅ View-only access |
| **Google Tag Manager** | Read tags, triggers, variables | ✅ No changes to containers |
| **External Service** | Call Google APIs with your API key | ✅ Standard Google auth |
| **Application Data** | Save your API key securely | ✅ Stored in your account only |

### 🛡️ **Security Guarantee**
- **✅ Read-Only Access:** Addocu never modifies your GA4, GTM, or Looker Studio configurations
- **✅ Data Isolation:** Your data never leaves your Google account
- **✅ No External Servers:** Everything runs within Google's secure infrastructure
- **✅ Open Source:** You can review all code on GitHub

---

## 🎯 Quick Start Guide

### 1. **First Configuration**
```
Extensions > Apps Script > Run Configuration Function
```
- Enter your Google Cloud API Key
- Test the connection
- Save your settings

### 2. **Run Your First Audit**
```
Run the main coordination function from Apps Script
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

## 🏗️ Technical Architecture

### **Core Components**
```
📁 Addocu Project Structure
├── 📄 appsscript.json        (Add-on manifest and permissions)
├── 📄 coordinator.js         (UI orchestration and menu logic)
├── 📄 utilities.js           (Authentication and API utilities)
├── 📄 ga4.js                 (GA4 data extraction engine)
├── 📄 gtm.js                 (GTM synchronization logic)
├── 📄 looker_studio.js       (Looker Studio API integration)
├── 📄 logging.js             (Comprehensive logging system)
├── 📄 dashboard.js           (Dashboard generation logic)
├── 📄 configuration.html     (Configuration sidebar UI)
├── 📄 interactive_dashboard.html (Interactive dashboard interface)
└── 📁 docs/                  (Documentation and troubleshooting guides)
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

### **Current Status: Open Beta (Phase 2)**
- ✅ Complete GA4, GTM, and Looker Studio integration
- ✅ Interactive dashboard and reporting
- ✅ Open source codebase with CC BY-NC-SA 4.0 license
- 🔄 Beta testing with community feedback
- 🔄 Preparing Google Workspace Marketplace submission

### **Next Phase: Public Launch (Phase 3)**
- 📋 Google Workspace Marketplace approval and launch
- 📋 Community-driven feature requests
- 📋 Enhanced documentation and tutorials
- 📋 Multi-language support

### **Coming Soon: Community Features**
- 🔄 Google Ads integration
- 🔄 Google Search Console support
- 🔄 BigQuery data source analysis
- 🔄 Enhanced error detection and recommendations
- 🔄 Automated scheduling (Pro version)

### **The Future: Addocu Pro**
We're planning a separate, commercial **Addocu Pro** version that will expand on the free tool with:

- 🔮 **Automated Scheduling:** Regular, automated audits
- 🔮 **AI-Powered Analysis:** Contextual error detection and optimization suggestions
- 🔮 **Advanced Integrations:** Deeper BigQuery, Search Console, and Ads integration
- 🔮 **Smart Monitoring:** Proactive alerts for configuration changes
- 🔮 **Team Collaboration:** Enhanced sharing and collaboration features

**Important:** Addocu Community Edition will always remain free and fully functional.

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

### **🧪 Beta Testing**
- Test new features and report feedback
- Share your use cases and success stories
- Help us identify edge cases and improvements

---

## 🆘 Support & Community

### **Community Support**
- 💬 **GitHub Discussions:** [Join the conversation](https://github.com/Addocu/addocu/discussions)
- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/Addocu/addocu/issues)
- 📧 **General Questions:** hola@addocu.com

### **Documentation**
- 📖 **Installation Guide:** [docs/installation.md](docs/installation.md)
- ⚙️ **Configuration Help:** [docs/configuration.md](docs/configuration.md)
- 🔧 **Troubleshooting:** [docs/troubleshooting.md](docs/troubleshooting.md)

### **Building in Public**
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