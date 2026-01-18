# Changelog

All notable changes to Addocu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.0] - 2026-01-18

### Added

- **🔍 GTM Unused Variable Detection**: Automatically identifies variables not referenced in tags, triggers, or other variables.
  - New columns in `GTM_VARIABLES`: `Usage Status` and `Used By`.
  - Automatic tagging in `Observations` for unused components.
- **📜 GA4 Change History Audit**: New `GA4_CHANGE_HISTORY` tab tracking configuration changes (last 30 days).
  - Identifies "Who, What, When" for audit trails across all properties.
  - Formats nested JSON changes into human-readable action summaries.
- **🛡️ Audit Performance**: Optimized GTM resource fetching to prevent API timeouts during dependency analysis.

### Changed

- **📚 Documentation Overhaul**: Completely updated readme, security, and maintenance guides for v3.1.0.
- **🏗️ Open Core Model**: Refined distribution strategy — source code is always free (Self-Hosted), while Marketplace add-on is supported/paid.

## [3.0.0] - 2026-01-03

### Added

- **🎨 Sheet Tab Coloring**: Automatic color-coding of sheets by platform for visual organization (10 distinct platform colors)
- **📊 Historical Tracking System**: New HISTORY and ACTIVITY_HISTORY sheets for trend analysis and audit snapshots (60-day retention)
- **✨ Always-On Sheet Creation**: Sheets are created even when APIs fail or return no data, with clear error/empty state indicators
- **🎯 Enhanced Error Localization**: Actionable, user-friendly recovery guidance built into error messages
- **🎉 Success Modal**: Animated completion modal showing total assets, execution time, and quick dashboard access
- **🔧 Simplified Diagnostics**: Streamlined connectivity and troubleshooting tools with clearer output
- **✅ Account Verification Tools**: Enhanced same-account detection with step-by-step guidance
- **🚀 Service Toggles**: Enable/disable individual platforms in configuration sidebar for selective audits

### Changed

- **🔐 OAuth2 Migration Complete**: All services now use OAuth2 exclusively (API keys fully deprecated)
- **📱 Configuration Sidebar Modernized**: Redesigned UI with setup progress indicators and platform status display
- **🎨 Dashboard Enhanced**: Complete redesign supporting all 10 platforms with historical charts (timeline, heatmap, distribution)
- **🔧 Error Handling System**: New recovery modules (auth_recovery.js, permission_recovery.js, account_verification.js, diagnostics.js)
- **📈 Reporting Layer**: Dashboard now displays historical KPI trends and asset distribution across all 10 platforms

### Fixed

- **🐛 OAuth2 Token Validation**: Improved token refresh and expiration handling
- **🔒 Permission Recovery**: Automatic detection and recovery from PERMISSION_DENIED errors
- **📊 Dashboard Data**: Fixed inflated metrics showing placeholder values (now shows real data only)
- **🌙 Dark Mode**: Eliminated header artifacts and improved visual consistency
- **🎯 Sheet Creation**: Fixed GTM container counting to only count containers with actual tags

### Security

- **🔒 Enhanced Permission Validation**: Better OAuth2 token verification and scoping
- **🛡️ Isolated User Data**: Complete data isolation using UserProperties per user
- **🔍 Permission Diagnostics**: Safe diagnostic tools that don't expose sensitive data

### Breaking Changes

- **🔑 API Key Support Removed**: All services now require OAuth2 authentication only
- **📂 Configuration Migration**: Users upgrading from v2.x must re-authorize with OAuth2
- **🌍 OAuth Scope Requirements**: 7 new scopes required for new platform integrations

## [2.3.0] - 2026-01-02

### Added

- **🛍️ Google Merchant Center (GMC)**: Complete audit of Feeds and Product health.
- **🗄️ Google BigQuery**: GA4 Export monitoring and enterprise dataset inventory.
- **📰 Google AdSense**: Monetization audit for publishers (Accounts, Sites, Ad Units).
- **🚀 10-Platform Suite**: Unified orchestration for GA4, GTM, Looker Studio, GSC, YT, GBP, Ads, GMC, BQ, and AdSense.
- **📊 Advanced Analytics Dashboard**: Complete KPI coverage and asset distribution for all services.
- **🔧 Unified Diagnostics**: Single-click connectivity test for the entire marketing stack.

### Changed

- **🎨 UI Refinement**: Modernized `configuration.html` for a more intuitive setup flow.
- **📈 Reporting Layer**: Enhanced `dashboard_functions.js` to support multi-platform data.

### Fixed

- **🐛 Orchestration**: Fixed cross-platform error logging and UI refresh bugs.
- **🛡️ Audit Resilience**: Wrapped all platform syncs in try-catch blocks to prevent a single service failure from stopping the entire "Audit Complete Stack" operation.
- **🏪 GBP Quota Detection**: Added specific detection and guidance for Google Business Profile 429 (Rate Limit) errors caused by default 0 quota.
- **🔍 Connection Indicators**: Corrected real-time status reporting for all APIs.

### Added

- **🔧 Permission Recovery System**: Enhanced error handling for PERMISSION_DENIED issues
- **⚡ Auto-Recovery Functions**: Automatic permission detection and recovery mechanisms
- **🛡️ Enhanced Configuration Management**: Robust fallbacks for permission errors
- **🔍 Advanced Diagnostics**: Complete permission diagnostics for troubleshooting
- **🚀 Safe Configuration Loading**: Enhanced getUserConfig with error-safe fallbacks
- **🎉 Success Modal**: Beautiful animated modal after audit completion with stats
- **📊 Execution Metrics**: Real-time tracking of audit execution time and results
- **🎯 Dashboard Integration**: Direct "View Dashboard" button from success modal
- **📱 Mobile Responsive**: Improved mobile experience for configuration sidebar
- **🆘 Authorization Recovery System**: Comprehensive solution for permission problems
- **🔄 Auto-Recovery Menu**: Automatic recovery menu when permissions are denied
- **🔍 Advanced Diagnostics**: Complete system diagnostics for troubleshooting
- **🚨 Emergency Reset**: One-click configuration reset for critical situations
- **🛠️ onFileScopeGranted Handler**: Automatic setup when permissions are granted

### Changed

- **🔄 Reorganized Sidebar Flow**: Moved "Run Audit" after "Setup Progress" for better UX
- **🧹 Simplified Authentication**: Removed unnecessary "Save Configuration" button  
- **🔧 OAuth2-Only Setup**: Updated messaging to reflect OAuth2 automatic configuration
- **⚡ Enhanced Audit Experience**: Better loading states and user feedback
- **🎨 Visual Improvements**: Modern modal design with smooth animations
- **🔒 Robust Error Handling**: Graceful degradation when UI permissions are missing
- **🎯 Menu System**: Smart menu creation with fallback options for permission issues
- **🎨 Dashboard Header**: Removed shadows and backdrop blur for cleaner appearance
- **🏷️ Card Icons**: Replaced meaningless letter icons with semantic emojis and transparent backgrounds
- **🔍 Logo Visibility**: Increased header logo size (32px → 48px) for better brand presence
- **🌓 Logo System**: Implemented official Addocu brand logos with theme-aware switching (light/dark)

### Fixed

- **🐛 CRITICAL**: Fixed "Some services need authorization" error in sidebar configuration
- **🔒 Permission Errors**: Enhanced handling of PERMISSION_DENIED errors with automatic recovery
- **⚙️ Configuration Loading**: Fixed sidebar permission errors during initial setup
- **🔧 Function Integration**: Connected enhanced permission functions to coordinator.js
- **📱 Sidebar Stability**: Improved sidebar resilience to permission and authorization issues
- **🔄 appsscript.json**: Updated function references from Spanish to English (abrirSidebarConfiguracion → openConfigurationSidebar)
- **🎨 UX**: Improved Looker Studio connection status display in sidebar
- **Confusion**: Replaced misleading "N/A" status with clear "OAuth2 conectado" message
- **UI Clarity**: Updated authentication section to reflect OAuth2-only setup
- **User Experience**: Hidden legacy API key field since all services now use OAuth2
- **🐛 CRITICAL**: Fixed "You do not have permission to call Ui.showSidebar" error
- **🔒 Permission Recovery**: Automatic detection and recovery from authorization failures
- **🔄 Reinstallation Issues**: Proper handling of rejected permissions during setup
- **🌙 Dark Mode**: Eliminated header shadows causing visual artifacts in dark theme
- **🏷️ Card Accessibility**: Improved card readability by removing redundant emoji descriptions and colored backgrounds
- **🎯 Visual Consistency**: Using official Addocu brand assets across all themes
- **🔍 Visual Clarity**: Enhanced emoji visibility with larger icons and transparent design
- **📊 Data Accuracy**: Removed all hardcoded placeholder values (347 assets, 189 tags, etc.)
- **📈 Header Counting**: Verified all sheet counting properly excludes headers with explicit -1 logic
- **🚫 Demo Mode**: Replace fake inflated numbers with realistic empty state when no data available
- **📉 Chart Data**: Ensure charts show 'No data available' instead of placeholder values
- **🐛 CRITICAL**: Fixed dashboard showing inflated metrics when sheets contain only headers
- **📋 Empty Sheet Detection**: Implemented strict validation to verify actual data content beyond headers
- **📊 Real Data Verification**: Added hasRealData checks to distinguish between empty sheets and sheets with actual audit results
- **🔢 Asset Counting**: Fixed totalAssets calculation to only count sheets with genuine content
- **📈 Timeline Charts**: Eliminated fake activity data in timeline and heatmap when no real data exists
- **🎯 Container Counting**: Fixed GTM container counting to only count containers with actual tags

### Security

- **🔒 Enhanced Permission Validation**: Better OAuth2 token verification
- **🛡️ Isolated User Data**: Complete data isolation using UserProperties
- **🔍 Permission Diagnostics**: Safe diagnostic tools that don't expose sensitive data

### Documentation

- **📚 Authorization Troubleshooting Guide**: Complete troubleshooting documentation
- **🚪 Recovery Instructions**: Step-by-step recovery procedures for common issues
- **🔍 Diagnostic Procedures**: Advanced diagnostic tools and interpretation guides

### Planned

- Google Ads integration
- Google Search Console support
- BigQuery data source analysis
- Enhanced error detection and recommendations
- Multi-language support

## [2.2.0] - 2026-01-02

### Added

- **💰 Google Ads Integration**: Complete audit of campaigns, conversion actions, and audiences using GAQL.
- **🏪 Google Business Profile (GBP)**: Inventory of business accounts and verified locations.
- **🛠️ Clasp Support**: Added `.clasp.json` and `.claspignore` for streamlined local development.
- **📊 Extended Dashboard**: New KPI cards for Ads Conversions/Audiences and GBP Locations.
- **📈 Expanded Charts**: "Elements by Tool" now includes Google Ads and GBP data.
- **🚦 Service Toggles**: Ability to enable/disable Ads and GBP in the configuration sidebar.
- **🔑 Developer Token Support**: New secure input for Google Ads Developer Token.

## [2.1.0] - 2025-09-06

### 🚨 BREAKING CHANGES

- **Looker Studio API Migration**: Google discontinued API Key support, migrated to OAuth2 authentication
- **API Keys no longer supported** for Looker Studio (automatic migration to OAuth2)
- **Users must re-authorize** if using older versions

### Fixed

- **🐛 CRITICAL**: Fixed "API keys are not supported by this API" error in Looker Studio
- **🐛 CRITICAL**: Fixed "Servicio no soportado: lookerStudio" authentication error
- **🐛 CRITICAL**: Fixed dashboard generation "columns do not match" error
- **Looker Studio endpoint**: Updated to correct `/assets:search` endpoint with required parameters
- **Service name consistency**: Resolved lookerStudio vs looker naming conflicts

### Changed

- **Looker Studio authentication**: Migrated from API Key to OAuth2 (Google requirement)
- **Unified authentication**: GA4, GTM, and Looker Studio now all use OAuth2
- **Improved error messages**: More descriptive OAuth2 and API migration guidance
- **Dashboard generation**: Refactored header writing to prevent dimension mismatches
- **Configuration UI**: Updated to reflect OAuth2 migration (API Key field preserved for compatibility)

### Added

- **Migration documentation**: Comprehensive guide for OAuth2 transition
- **Enhanced diagnostics**: Better OAuth2 validation and troubleshooting
- **Backwards compatibility**: API Key configurations preserved but ignored
- **Improved testing strategy**: Comprehensive testing documentation for critical fixes

### Technical

- **OAuth2 scopes**: Updated Looker Studio to use `https://www.googleapis.com/auth/datastudio`
- **Endpoint URLs**: Corrected Looker Studio API endpoints to match current Google specifications
- **Error handling**: Enhanced OAuth2 token validation and error reporting
- **Service configuration**: Unified authentication configuration across all Google services

### Migration Guide

- **Automatic migration**: v2.1+ automatically handles OAuth2 transition
- **No user action required** for existing OAuth2 authorized users
- **Documentation**: See `docs/LOOKER_STUDIO_OAUTH2_MIGRATION.md` for detailed migration info

### Security

- **Enhanced authentication**: OAuth2 provides better security than API Keys
- **Google Workspace compliance**: Meets Google's enterprise security requirements
- **Token management**: Automatic OAuth2 token renewal and validation

## [1.0.0] - 2025-09-06

### Added

- **Initial public release** of Addocu Community Edition
- **Google Analytics 4 complete audit** with properties, custom dimensions, metrics, and conversion events
- **Google Tag Manager deep dive** with tags, triggers, variables, and version comparison
- **Looker Studio census** with reports, data sources, and sharing analysis
- **Interactive dashboard** with visual summary and health checks
- **Comprehensive logging system** for debugging and audit trails
- **Configuration sidebar** for API key management
- **Connectivity diagnostics** for API testing
- **Multi-account support** for different Google accounts
- **Data isolation** using PropertiesService.getUserProperties()
- **Complete documentation** with README, CONTRIBUTING, and guides
- **Open source release** under CC BY-NC-SA 4.0 license

### Security

- **Secure API key storage** in user properties
- **No external data transmission** - everything stays in user's Google account
- **OAuth 2.0 compliance** for authentication
- **Comprehensive error handling** without exposing sensitive information

### Technical

- **Modular architecture** with dedicated synchronization modules
- **Error recovery mechanisms** for API failures
- **Rate limiting** to prevent quota exhaustion
- **Performance optimization** for efficient API calls
- **Google Apps Script** implementation for seamless Google Workspace integration

## [0.9.0-beta] - 2025-08-15

### Added (Beta Release)

- **Beta version** for community testing
- **Core GA4 functionality** with basic property auditing
- **GTM basic integration** for tags and triggers
- **Looker Studio initial support** for report listing
- **Basic dashboard** with summary information
- **Configuration system** for API key setup

### Fixed

- **API quota management** improvements
- **Error handling** for missing permissions
- **Data formatting** inconsistencies

### Changed

- **Improved user interface** based on beta feedback
- **Enhanced error messages** for better user experience
- **Optimized API calls** for better performance

## [0.5.0-alpha] - 2025-07-01

### Added (Alpha Release)

- **Initial proof of concept** for Google Analytics 4 auditing
- **Basic Google Tag Manager** integration
- **Simple configuration** interface
- **Preliminary dashboard** functionality

### Technical Notes

- **Alpha version** for internal testing only
- **Limited functionality** compared to final release
- **Experimental API** integration

---

## Types of Changes

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for vulnerability fixes

## Release Notes Format

Each release includes:

- **Version number** following semantic versioning
- **Release date** in YYYY-MM-DD format
- **Summary of changes** organized by type
- **Breaking changes** clearly marked
- **Migration guides** when needed
- **Known issues** if any

## Future Versioning

### Community Edition (Always Free)

- **Major versions** (2.0.0, 3.0.0) for significant architectural changes
- **Minor versions** (1.1.0, 1.2.0) for new features and integrations
- **Patch versions** (1.0.1, 1.0.2) for bug fixes and improvements

### Self-Hosted / Community Edition (Always Free)

- **GitHub Repository**: Full source code available for cloning and manual deployment.
- **Major versions** (3.0.0) for significant architectural changes.
- **Feature updates** (3.1.0) for new diagnostic modules.

### Marketplace Add-on (Paid)

- **Google Workspace Marketplace**: One-click install with automatic updates and priority support.
- **Revenue Model**: Supports the ongoing development of the open-source core.
- **Feature Parity**: The open-source core will always remain fully functional and mirror major feature releases.
