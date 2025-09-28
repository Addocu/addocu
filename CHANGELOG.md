# Changelog

All notable changes to Addocu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Addocu Pro (Future Commercial Version)
- **Separate versioning** from Community Edition
- **Independent roadmap** with advanced features
- **Community Edition** will always remain fully functional and free
