# 🚨 Troubleshooting: Account & Permission Issues

## ⚠️ THE #1 MOST COMMON PROBLEM

### 🔑 **Same Google Account Requirement**

**THE ISSUE:** You must be logged into Google Chrome AND Google Sheets with **THE EXACT SAME GOOGLE ACCOUNT**.

**WHY THIS HAPPENS:**
- Chrome: Logged in with `work@company.com`
- Google Sheets: Logged in with `personal@gmail.com`  
- Result: OAuth2 fails with `PERMISSION_DENIED` errors

### 🎯 **SOLUTION (Fix 95% of issues)**

1. **Sign out of ALL Google accounts** in Chrome
2. **Sign in with ONLY ONE account** (the one with access to your marketing data)
3. **Open Google Sheets** - verify it's the same account (check top-right corner)  
4. **Reinstall Addocu** if you had permission errors before
5. **Authorize all permissions** when prompted

### 🔍 **How to Verify Your Account Status**

**Step 1:** Check Chrome Profile
- Look at top-right corner of Chrome
- Note the email/profile shown

**Step 2:** Check Google Sheets Account
- Open sheets.google.com
- Look at top-right corner
- Verify it matches your Chrome profile

**Step 3:** If Different
- Click your profile picture → "Sign out"
- Sign in with the correct account
- Try Addocu again

---

## 🐛 Other Common Issues

### Issue: "We're sorry, a server error occurred while reading from storage"

**Root Cause:** Account mismatch or corrupted user properties  
**Fix:** Follow the "Same Google Account" solution above

### Issue: "Error loading configuration: PERMISSION_DENIED"  

**Root Cause:** Different accounts in Chrome vs Google Sheets  
**Fix:** Account synchronization (see above)

### Issue: "You do not have permission to call UrlFetchApp.fetch"

**Root Cause:** OAuth2 scope not properly authorized  
**Fix:** 
1. Extensions > Addocu > 🚨 Recuperación > 🔒 Forzar Todos los Permisos
2. Authorize ALL permissions when prompted

### Issue: "Required permissions not granted"

**Root Cause:** Partial authorization  
**Fix:**
1. Extensions > Apps Script  
2. Run function: `forzarTodosLosPermisos`
3. Authorize everything

---

## 🔧 Advanced Troubleshooting

### Multiple Google Accounts Active

**Problem:** Chrome shows multiple account bubbles
**Solution:**
1. Go to Chrome Settings > People
2. Remove all profiles except one
3. Or use Incognito mode with only one account

### Browser Issues

**Problem:** Cached authentication state
**Solution:**
1. Clear Chrome cache and cookies for Google domains
2. Try in Incognito/Private mode
3. Try different browser

### Network/Corporate Firewall

**Problem:** Company firewall blocking Google APIs
**Solution:**
1. Try on personal network
2. Contact IT to whitelist required Google API endpoints
3. Use mobile hotspot for testing

---

## ✅ Verification Checklist

Before reporting issues, verify:

- [ ] Same Google account in Chrome AND Google Sheets
- [ ] Only ONE Google account active in browser  
- [ ] Account has access to GA4/GTM/Looker Studio data
- [ ] No corporate firewall blocking Google APIs
- [ ] Addocu authorized with ALL permissions (not partial)

---

## 🆘 When All Else Fails

### Clean Slate Approach

1. **Sign out of ALL Google accounts** everywhere
2. **Close ALL Chrome windows**  
3. **Restart Chrome**
4. **Sign in with ONE account only**
5. **Go to Google Sheets** with that account
6. **Uninstall and reinstall Addocu**
7. **Authorize EVERYTHING** when prompted

### Last Resort: Manual Authorization

1. Extensions > Apps Script
2. Select function: `reautorizarPermisosForzado`
3. Click Run ▶️
4. Follow the manual reauthorization instructions

---

## 📧 Getting Help

**Before contacting support**, please:

1. ✅ Verify you followed the "Same Google Account" solution
2. ✅ Check the verification checklist above  
3. ✅ Try the clean slate approach

**For complex issues:**
- 🐛 GitHub Issues: [Report technical bugs](https://github.com/Addocu/addocu/issues)
- 📧 Email: hola@addocu.com (include account verification status)

**Include in your report:**
- Chrome version and OS
- Google account type (personal/workspace)
- Screenshots of account mismatches
- Error messages (exact text)

---

*Remember: 95% of Addocu issues are solved by using the same Google account in Chrome and Google Sheets* 🎯