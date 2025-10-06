# Addocu 🚀

<div align="center">

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://script.google.com/)
[![Google Workspace Add-on](https://img.shields.io/badge/Google%20Workspace-Add--on-34A853)](https://workspace.google.com/marketplace)
[![Open Source](https://img.shields.io/badge/Open%20Source-Community-brightgreen)](https://opensource.org/)
[![Building in Public](https://img.shields.io/badge/Building%20in%20Public-🚀-blue)](https://www.addocu.com)

[![GitHub stars](https://img.shields.io/github/stars/jrodeiro5/addocu?style=social)](https://github.com/jrodeiro5/addocu/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/jrodeiro5/addocu?style=social)](https://github.com/jrodeiro5/addocu/network/members)
[![GitHub issues](https://img.shields.io/github/issues/jrodeiro5/addocu)](https://github.com/jrodeiro5/addocu/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/jrodeiro5/addocu)](https://github.com/jrodeiro5/addocu/commits)

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/jrodeiro5/addocu/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![First Timers Only](https://img.shields.io/badge/first--timers--only-friendly-blue.svg)](https://www.firsttimersonly.com/)

</div>

<div align="center">
  <h3>🎯 Audit and Document Your Google Marketing Stack in Seconds</h3>
  <p><em>A powerful, free and open-source Google Sheets™ Add-on for digital marketers, analysts, and agencies</em></p>
</div>

---

## ✨ What is Addocu?

Addocu automates the painful process of documenting and auditing your entire Google ecosystem, pulling detailed metadata from **Google Analytics 4**, **Google Tag Manager**, and **Looker Studio** directly into your spreadsheet.

**Born from countless hours** spent on manual documentation and a belief that there had to be a better way. We're sharing it with the community to give back and to build, together, the best auditing tool possible.

<div align="center">
  <img src="docs/addocu_logo.png" alt="Addocu Logo" width="200">
</div>

---

## 🎯 Why Choose Addocu?

<table>
<tr>
<td>

### 🆓 **100% Free Forever**
- No premium tiers or hidden costs
- Full functionality available to everyone
- Open source with community-driven development

</td>
<td>

### ⚡ **One-Click Auditing**
- Complete GA4, GTM & Looker Studio audit in seconds
- No manual data collection or documentation
- Interactive dashboard with executive summary

</td>
</tr>
<tr>
<td>

### 🔒 **Privacy & Security First**
- Your data never leaves your Google account
- No external servers or data transmission
- Complete transparency with open source code

</td>
<td>

### 🤝 **Community Driven**
- Built by digital marketers, for digital marketers
- Actively maintained and improved
- Contributing makes you part of the journey

</td>
</tr>
</table>

---

## ✨ Key Features

### 📊 **Google Analytics 4 Complete Audit**
- **Properties & Data Streams:** Full inventory with detailed configuration
- **Custom Dimensions & Metrics:** Complete listing with scope and parameter names
- **Conversion Events:** All events with configuration details and status
- **Audiences:** User segments with creation dates and criteria
- **Data Retention Settings:** Current policies and privacy configurations

### 🏷️ **Google Tag Manager Deep Dive**
- **Container Inventory:** All containers with publication status and version history
- **Tags, Triggers & Variables:** Complete mapping of your GTM setup with firing status
- **Version Comparison:** Compare different container versions side-by-side
- **Workspace Analysis:** Multi-workspace support for complex organizational setups
- **Dependency Mapping:** Understand relationships between tags, triggers, and variables

### 📈 **Looker Studio Census**
- **Report Inventory:** All reports with owners, sharing settings, and modification dates
- **Data Sources:** Complete mapping of connections and refresh status
- **Performance Metrics:** Usage statistics and data freshness indicators
- **Permissions Audit:** Who has access to what reports across your organization

### 🎯 **Interactive Dashboard**
- **Visual Summary:** Bird's eye view of your entire marketing stack health
- **Connectivity Diagnostics:** Real-time API connection and permission testing
- **Asset Overview:** Count and status of all your marketing assets
- **Quick Actions:** Direct links to manage properties and troubleshoot issues

### 🔧 **Advanced Features**
- **Comprehensive Logging:** Every action logged for debugging and audit trails
- **Multi-Account Support:** Switch between different Google accounts seamlessly
- **Export Ready:** All data formatted for easy sharing and client reporting
- **Error Recovery:** Built-in troubleshooting and permission recovery tools

---

## 🚀 Quick Start

<div align="center">

### **⬇️ Install from Google Workspace Marketplace**
[![Install from Marketplace](https://img.shields.io/badge/Install%20from-Google%20Workspace%20Marketplace-4285F4?style=for-the-badge&logo=google)](https://workspace.google.com/marketplace)

</div>

### **Step-by-Step Setup:**

1. **📥 Install Addocu** from the [Google Workspace Marketplace](https://workspace.google.com/marketplace)
2. **📝 Open Google Sheets** (new or existing spreadsheet)
3. **⚙️ Configure** → `Extensions > Addocu > Configure`
4. **🔑 Authorize** when prompted (OAuth2 - no API keys needed!)
5. **🚀 Run Audit** → `Extensions > Addocu > Audit Complete Stack`

**That's it!** Your audit data will appear in dedicated sheets:
- `DASHBOARD` - Executive summary
- `GA4_PROPERTIES` - Analytics data
- `GTM_TAGS` - Tag Manager inventory  
- `LOOKER_STUDIO` - Report catalog
- `LOGS` - Detailed operation logs

---

## 📋 Prerequisites

### 🚨 **CRITICAL: Same Google Account Requirement**

⚠️ **You MUST be logged into Google Chrome AND Google Sheets with the SAME Google account.** Different accounts cause permission errors.

<details>
<summary><strong>🔧 Click here if you're having issues</strong></summary>

**Before anything else:**
1. Check your Chrome profile (top-right corner)
2. Check your Google Sheets account (top-right corner)  
3. If different → Sign out everywhere and use ONE account

**95% of Addocu issues are caused by account mismatches!**

**Quick Fix:**
1. `Extensions > Addocu > Troubleshooting > Reauthorize Permissions`
2. Authorize ALL permissions when prompted

📖 **Full Troubleshooting Guide:** [docs/troubleshooting.md](docs/troubleshooting.md)

</details>

### 🔑 **Access Requirements**
- **"Viewer"** (or higher) access to the Google platforms you wish to audit
- **OAuth2 Authentication** - handled automatically, no manual API key setup required

---

## 🗂️ Technical Architecture

<details>
<summary><strong>📁 Project Structure</strong></summary>

```
📁 Addocu Open Source Project
├── 📄 appsscript.json           # Add-on manifest and permissions
├── 📄 coordinator.js            # UI orchestration and menu logic
├── 📄 utilities.js              # Authentication and API utilities
├── 📄 ga4.js                    # GA4 data extraction engine
├── 📄 gtm.js                    # GTM synchronization logic
├── 📄 looker_studio.js          # Looker Studio API integration
├── 📄 logging.js                # Comprehensive logging system
├── 📄 dashboard.js              # Dashboard generation logic
├── 📄 configuration.html        # Configuration sidebar UI
├── 📄 interactive_dashboard.html # Interactive dashboard interface
├── 📁 docs/                     # Documentation and guides
├── 📁 examples/                 # Usage examples and samples
└── 📁 .github/                  # GitHub templates and workflows
```

</details>

### **🛡️ Security & Privacy**
- **Complete Data Isolation:** Each user's data stored separately using `PropertiesService.getUserProperties()`
- **No External Servers:** Everything runs within Google's secure infrastructure
- **Read-Only Access:** Addocu never modifies your GA4, GTM, or Looker Studio configurations
- **OAuth 2.0 Compliance:** Secure authentication following Google's best practices
- **Full Transparency:** Open source code available for security auditing

---

## 📄 License & Usage

<div align="center">

**Addocu is distributed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](LICENSE)**

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

</div>

### **✅ You ARE free to:**
- ✨ Use the tool for personal or client projects
- 🔄 Share and distribute the tool
- 🔧 Modify and adapt the code for your needs
- 🏢 Use it in your agency or consultancy work

### **⚠️ With these conditions:**
- **📝 Attribution:** Always credit the original project
- **🚫 Non-Commercial:** You cannot sell this tool or charge for it
- **🔄 Share-Alike:** Any modifications must be shared under the same license

---

## 🗺️ Roadmap & Future

### **📍 Current Status: v2.1.0**
- ✅ Complete GA4, GTM, and Looker Studio integration
- ✅ Interactive dashboard and reporting
- ✅ Open source codebase with community license
- ✅ Google Workspace Marketplace distribution
- ✅ OAuth2 authentication for all services

### **🔮 Coming Soon**
- 📋 Google Ads integration
- 📋 Google Search Console support
- 📋 BigQuery data source analysis
- 📋 Enhanced error detection and recommendations
- 📋 Multi-language support

### **🚀 The Future: Addocu Pro**
We're planning a separate, commercial **Addocu Pro** version with advanced features:
- 🤖 AI-powered analysis and optimization suggestions
- ⏰ Automated scheduling and monitoring
- 🔗 Advanced integrations (BigQuery, Search Console, Ads)
- 🚨 Proactive alerts for configuration changes

**Important:** Addocu Community Edition will always remain free and fully functional.

---

## 🤝 Contributing

<div align="center">

**We welcome contributions from the community!**

[![Contribute](https://img.shields.io/badge/Contribute-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)
[![First Timers Only](https://img.shields.io/badge/First%20Timers-Welcome-blue?style=for-the-badge)](https://www.firsttimersonly.com/)

</div>

### **🌟 Ways to Contribute:**

| 🐛 **Report Issues** | 💡 **Suggest Features** | 🔧 **Contribute Code** | 📖 **Improve Docs** |
|---------------------|----------------------|---------------------|-------------------|
| Found a bug? [Open an issue](https://github.com/jrodeiro5/addocu/issues) | Have an idea? [Start a discussion](https://github.com/jrodeiro5/addocu/discussions) | Fork → Code → PR | Fix typos, add examples |

### **🚀 Getting Started:**
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

**📖 Read our [Contributing Guide](CONTRIBUTING.md) for detailed instructions**

---

## 🆘 Support & Community

<div align="center">

| 💬 **Discussions** | 🐛 **Bug Reports** | 📧 **Direct Support** | 🌐 **Website** |
|------------------|------------------|---------------------|----------------|
| [GitHub Discussions](https://github.com/jrodeiro5/addocu/discussions) | [GitHub Issues](https://github.com/jrodeiro5/addocu/issues) | hello@addocu.com | [addocu.com](https://addocu.com) |

</div>

### **📚 Documentation:**
- 📖 [Installation Guide](docs/installation.md)
- ⚙️ [Configuration Help](docs/configuration.md)
- 🔧 [Troubleshooting Guide](docs/troubleshooting.md)

### **📱 Stay Updated:**
- 🌐 **Website:** [addocu.com](https://addocu.com)
- 📱 **LinkedIn:** Follow our [building in public journey](https://www.linkedin.com/company/addocu)
- 📊 **Use Cases:** Real-world examples and success stories

---

## 🏆 Contributors

<div align="center">

**Thank you to all the amazing people who have contributed to Addocu!**

<a href="https://github.com/jrodeiro5/addocu/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=jrodeiro5/addocu" />
</a>

**Made with [contrib.rocks](https://contrib.rocks)**

</div>

---

## 🙏 Acknowledgments

- **Google Workspace Team** for the excellent Add-on platform
- **Digital Marketing Community** for inspiration and feedback  
- **Open Source Contributors** who help make this tool better every day
- **Beta Testers** who provided invaluable early feedback
- **You!** For considering Addocu for your marketing auditing needs

---

## 📈 Project Stats

<div align="center">

![GitHub Repo stars](https://img.shields.io/github/stars/jrodeiro5/addocu?style=for-the-badge&logo=github)
![GitHub forks](https://img.shields.io/github/forks/jrodeiro5/addocu?style=for-the-badge&logo=github)
![GitHub issues](https://img.shields.io/github/issues/jrodeiro5/addocu?style=for-the-badge&logo=github)
![GitHub pull requests](https://img.shields.io/github/issues-pr/jrodeiro5/addocu?style=for-the-badge&logo=github)

![Profile views](https://komarev.com/ghpvc/?username=addocu&color=brightgreen&style=for-the-badge&label=Profile+Views)

</div>

---

<div align="center">

**Made with ❤️ for the digital marketing community**

*Addocu is not affiliated with Google LLC. Google Analytics, Google Tag Manager, Looker Studio, and Google Workspace are trademarks of Google LLC.*

**⭐ If Addocu helps you, please give us a star on GitHub! ⭐**

[![Star History Chart](https://api.star-history.com/svg?repos=jrodeiro5/addocu&type=Date)](https://star-history.com/#jrodeiro5/addocu&Date)

</div>
