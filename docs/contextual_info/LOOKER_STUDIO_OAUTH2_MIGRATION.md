# 🚨 BREAKING CHANGE: Looker Studio API Migration

## ⚠️ CRITICAL UPDATE REQUIRED

**Effective immediately**, Google has **discontinued support for API Keys** in the Looker Studio API. All users must migrate to **OAuth2 authentication**.

---

## 🔍 What Changed?

### Before (API Key Method - DEPRECATED)
```
❌ GOOGLE DEPRECATED: https://datastudio.googleapis.com/v1/assets?key=AIza...
❌ ERROR: "API keys are not supported by this API. Expected OAuth2 access token"
```

### After (OAuth2 Method - REQUIRED)
```
✅ NEW METHOD: https://datastudio.googleapis.com/v1/assets:search?assetTypes=REPORT
✅ AUTH: Bearer OAuth2 token (automatic via Google Apps Script)
```

---

## 🚀 Migration Guide

### For Existing Users

**Good News**: If you're using Addocu v2.1+, **no action required**! 

The migration is **automatic**:
1. ✅ OAuth2 is **automatically configured** when you authorize Addocu
2. ✅ Your existing **GA4 and GTM authorizations** work for Looker Studio too
3. ✅ **API Key configuration is ignored** (but preserved for compatibility)

### For New Users

1. **Install Addocu** from Google Workspace Marketplace
2. **Run any audit** (GA4, GTM, or Stack Completo)
3. **Authorize when prompted** - this enables all services including Looker Studio
4. **No API Key setup needed** for Looker Studio

---

## 🔧 Technical Details

### Required OAuth2 Scopes
```
https://www.googleapis.com/auth/datastudio
https://www.googleapis.com/auth/userinfo.profile
```

### API Endpoint Changes
```
OLD: /assets?key=API_KEY
NEW: /assets:search?assetTypes=REPORT
```

### Error Messages Resolved
- ✅ "API keys are not supported by this API"
- ✅ "Servicio no soportado: lookerStudio"
- ✅ Dashboard generation column errors

---

## 🎯 Compatibility

| Version | Status | Action Required |
|---------|--------|-----------------|
| v2.1+ | ✅ **Automatic Migration** | None - OAuth2 enabled |
| v2.0 | ⚠️ **Manual Update** | Update to v2.1+ |
| v1.x | ❌ **Unsupported** | Upgrade required |

---

## 🐛 Troubleshooting

### "Permission denied" Errors

**Cause**: Looker Studio API requires **Google Workspace or Cloud Identity** organization membership.

**Solution**: 
- Verify your Google account belongs to a Workspace organization
- Contact your admin to enable Looker Studio API access
- Individual Gmail accounts may not have access

### "No assets found" Results

**Possible Causes**:
1. No Looker Studio reports in your organization
2. Reports are private and not shared with your account
3. Organization hasn't enabled API access

**Debug Steps**:
1. Verify manual access: Go to [lookerstudio.google.com](https://lookerstudio.google.com)
2. Check shared reports and organization reports
3. Contact organization admin for API permissions

### OAuth2 Authorization Issues

**Solution**: 
1. Run **🔒 Probar OAuth2** from Addocu menu
2. If failed, run **📊 Auditar GA4** to trigger authorization
3. Authorization for GA4/GTM **automatically enables** Looker Studio

---

## 📱 User Interface Changes

### Updated Configuration Messages

**Before**:
```
⚠️ API Key opcional - Configura tu API Key de Looker Studio
```

**After**:
```
✅ Disponible (OAuth2) - API Keys obsoletas
```

### Updated Audit Messages

**Before**:
```
❌ API Key de Looker Studio Requerida
```

**After**:
```
📈 Iniciando auditoría completa de Looker Studio con OAuth2...

NOTA: Looker Studio ahora requiere OAuth2 (las API Keys ya no son soportadas por Google).
```

---

## 🎉 Benefits of OAuth2 Migration

### For Users
- **Simpler Setup**: No need to create API Keys
- **Better Security**: OAuth2 tokens are more secure than API Keys
- **Unified Auth**: Same authorization for GA4, GTM, and Looker Studio
- **Automatic Renewal**: No expired API Keys to manage

### For Organizations
- **Centralized Control**: Admins control API access via Google Workspace
- **Better Compliance**: OAuth2 provides better audit trails
- **Domain-wide Delegation**: Easier to manage organization-wide access

---

## 📞 Support

### GitHub Issues
Create an issue with:
- **Addocu version** (check Extensions → Addocu)
- **Error messages** from LOGS sheet
- **Organization type** (Workspace vs individual Gmail)
- **Browser console errors** (if any)

### Community Support
- **Search existing issues**: [GitHub Issues](https://github.com/Addocu/addocu/issues)
- **Discord/Slack**: Join our community channels
- **Email**: hola@addocu.com

---

## 🔄 Rollback Plan (Emergency)

If critical issues arise with OAuth2:

1. **Immediate**: Disable Looker Studio sync in configuration
2. **Use**: Individual GA4 and GTM audits (unaffected)
3. **Report**: Create GitHub issue with detailed error logs
4. **Manual workaround**: Export Looker Studio data manually until fix

---

## 🎯 Next Steps

1. **Update to v2.1+** if you haven't already
2. **Test Looker Studio sync** with OAuth2
3. **Remove old API Key configurations** (optional - they're ignored)
4. **Join our community** for updates and support

---

**Last Updated**: September 2025  
**Affected Versions**: All versions prior to v2.1  
**Migration Status**: ✅ Complete and automatic in v2.1+
