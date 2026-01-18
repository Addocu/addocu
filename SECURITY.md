# Security Policy

## 🛡️ Supported Versions

We actively maintain and provide security updates for the following versions of Addocu:

| Version | Supported          |
| ------- | ------------------ |
| 3.1.x   | ✅ Yes             |
| 3.0.x   | ✅ Yes             |
| 2.x.x   | ⚠️ Critical fixes only |
| < 2.0   | ❌ No              |

## 🔐 Security Guarantees

Addocu is designed with security-by-design principles:

- **🔒 Data Isolation:** Complete separation of user data using Google's `PropertiesService.getUserProperties()`
- **🚫 No External Servers:** All processing happens within Google's secure infrastructure
- **👁️ Read-Only Access:** Addocu never modifies your GA4, GTM, or Looker Studio configurations
- **🔑 OAuth 2.0 Compliance:** Secure authentication following Google's best practices
- **📖 Open Source:** Full code transparency for security auditing

## 🐛 Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### **🚨 For Security Vulnerabilities:**

1. **DO NOT** create a public GitHub issue
2. **Email us directly:** <hello@addocu.com>
3. **Include the following information:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Your contact information (optional)

### **📧 Response Timeline:**

- **Initial Response:** Within 24 hours
- **Status Update:** Within 72 hours
- **Resolution Timeline:** 7-30 days depending on severity

### **🏆 Security Researcher Recognition:**

- We maintain a Hall of Fame for security researchers who responsibly disclose vulnerabilities
- With your permission, we'll credit you in our security advisories
- For significant findings, we may offer a token of appreciation

## 🔍 Security Best Practices for Users

### **🛡️ Account Security:**

- Always use the same Google account for Chrome and Google Sheets
- Regularly review your Google Workspace marketplace installs
- Monitor your Google account activity for suspicious behavior

### **🔑 API Key Management:**

- Store your Google Cloud API keys securely
- Regularly rotate your API keys
- Use least-privilege access principles for your Google Cloud projects

### **📊 Data Privacy:**

- Addocu processes your data locally within Google's infrastructure
- No data is transmitted to external servers
- All audit data remains in your Google Sheets

## 🤝 Coordinated Disclosure

We follow responsible disclosure practices:

1. **Report received** → We acknowledge receipt within 24 hours
2. **Initial assessment** → We evaluate the severity and scope
3. **Investigation** → We work to reproduce and understand the issue
4. **Resolution** → We develop and test a fix
5. **Release** → We deploy the fix and notify affected users
6. **Disclosure** → We publicly disclose the issue after users have had time to update

## 📋 Security Checklist for Contributors

If you're contributing to Addocu, please ensure:

- [ ] No hardcoded credentials or API keys
- [ ] Input validation for all user-provided data
- [ ] Proper error handling that doesn't leak sensitive information
- [ ] Code follows secure coding practices
- [ ] Dependencies are regularly updated and scanned for vulnerabilities

## 🔐 Security Contact

- **Email:** <hello@addocu.com>
- **PGP Key:** [Available on request]
- **Response Time:** 24 hours maximum

---

**Last Updated:** January 2026  
**Next Review:** April 2026

*This security policy is inspired by industry best practices and is regularly updated to reflect the current threat landscape.*
