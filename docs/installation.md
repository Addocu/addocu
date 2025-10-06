# 📋 Addocu Installation Guide

## 🚨 BEFORE YOU START: Critical Account Requirement

**THE #1 RULE:** You MUST be logged into Google Chrome AND Google Sheets with **THE EXACT SAME GOOGLE ACCOUNT**.

This is the cause of 95% of all Addocu permission errors. If you skip this step, you'll encounter confusing error messages.

---

## 🔍 Step 1: Verify Your Account Setup

### Check Your Accounts
1. **Open Chrome** → Look at top-right corner → Note the Google account email
2. **Open Google Sheets** → Look at top-right corner → Note the Google account email  
3. **BOTH MUST BE IDENTICAL**

### If They're Different:
1. **Sign out of ALL Google accounts** in Chrome
2. **Close all Chrome windows**
3. **Restart Chrome** 
4. **Sign in with ONLY ONE account** (the one with access to your marketing data)
5. **Open Google Sheets** → Verify same account in top-right corner

---

## 📥 Step 2: Install Addocu

### Option A: Google Workspace Marketplace (Recommended)
1. Go to [Google Workspace Marketplace](https://workspace.google.com/marketplace)
2. Search for **"Addocu"**
3. Click **"Install"**
4. **Authorize ALL permissions** when prompted ⚠️ Don't skip any!

### Option B: From GitHub (Advanced Users)
1. Download source code from GitHub
2. Open [Google Apps Script](https://script.google.com)
3. Create new project and paste code
4. Deploy as Add-on following Google's guidelines

---

## ⚙️ Step 3: First Configuration

### Open Configuration
1. **Open any Google Sheet** (new or existing)
2. Go to **Extensions > Addocu > ⚙️ Configure**
3. A sidebar will appear on the right

### Test Connection
1. Click **"Test All Connections"** button
2. **If you see errors:** Your accounts are likely different (go back to Step 1)
3. **If you see success:** You're ready to audit!

---

## 🚀 Step 4: Run Your First Audit

### Simple Audit
1. In the Addocu sidebar
2. Click **"🚀 Audit Marketing Stack"**  
3. **Authorize any additional permissions** if prompted
4. Wait for completion (can take 1-3 minutes)

### What You'll Get
- `DASHBOARD` sheet - Executive summary
- `GA4_PROPERTIES` - Google Analytics audit
- `GTM_TAGS` - Tag Manager inventory  
- `LOOKER_STUDIO` - Reports and data sources
- `LOGS` - Detailed operation logs

---

## 🚨 Troubleshooting Common Issues

### Issue: "Error loading configuration: PERMISSION_DENIED"
**Solution:** Account mismatch - Use same Google account (Step 1)

### Issue: "We're sorry, a server error occurred while reading from storage"  
**Solution:** Account mismatch - Use same Google account (Step 1)

### Issue: Sidebar shows authorization errors
**Solution:** 
1. Extensions > Addocu > 🆘 Solución de Problemas
2. Click "🔍 Verificar Cuentas (IMPORTANTE)"
3. Follow the instructions

### Issue: "You do not have permission to call UrlFetchApp.fetch"
**Solution:**
1. Extensions > Addocu > 🆘 Solución de Problemas  
2. Click "🔒 Forzar Todos los Permisos"
3. Authorize ALL permissions when prompted

---

## ✅ Verification Checklist

Before reporting any issues, verify:

- [ ] **Same Google account** in Chrome AND Google Sheets  
- [ ] **Only ONE Google account** active in your browser
- [ ] **Account has access** to GA4/GTM/Looker Studio you want to audit
- [ ] **All permissions authorized** (not just some)
- [ ] **No corporate firewall** blocking Google APIs

---

## 🆘 Getting Help

### Self-Service Solutions
1. **Account Issues:** [Troubleshooting Guide](troubleshooting.md)
2. **Permission Problems:** Use Extensions > Addocu > 🆘 Solución de Problemas
3. **API Issues:** Verify same Google account requirement

### Contact Support
- 🐛 **Technical Issues:** [GitHub Issues](https://github.com/Addocu/addocu/issues)
- 📧 **General Questions:** hello@addocu.com

**When contacting support, include:**
- Screenshot of Chrome profile (top-right corner)
- Screenshot of Google Sheets account (top-right corner)
- Exact error message text
- Steps you've already tried

---

## 🎯 Success Tips

**✅ Do This:**
- Use only ONE Google account across all Google services
- Authorize ALL permissions when prompted  
- Start with a simple audit before advanced features
- Keep your browser updated

**❌ Avoid This:**
- Having multiple Google accounts signed in simultaneously
- Skipping permission prompts or authorizing only "some" permissions
- Using different accounts for Chrome and Google Sheets
- Installing on networks with restrictive firewalls

---

**Remember: 95% of Addocu issues are solved by using the same Google account everywhere! 🎯**