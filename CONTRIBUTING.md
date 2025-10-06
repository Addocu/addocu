# Contributing to Addocu 🤝

Thank you for your interest in contributing to Addocu! This document provides guidelines and information for contributors.

## 🌟 Ways to Contribute

### 🐛 Bug Reports
- **Search existing issues** first to avoid duplicates
- **Use the issue template** when creating new bug reports
- **Include detailed steps to reproduce** the issue
- **Specify your environment** (Google Workspace setup, browser, etc.)
- **Attach screenshots** if applicable

### 💡 Feature Requests
- **Check existing discussions** to see if someone has proposed similar ideas
- **Clearly explain the use case** and how it benefits the community
- **Consider the scope** - should this be in Community Edition or Addocu Pro?
- **Be willing to contribute** to the implementation if possible

### 🔧 Code Contributions
- **Fork the repository** and create a feature branch
- **Follow coding standards** outlined below
- **Write clear commit messages**
- **Test your changes** thoroughly
- **Update documentation** as needed

### 📖 Documentation
- **Fix typos and unclear instructions**
- **Add examples and use cases**
- **Improve installation and setup guides**
- **Translate documentation** to other languages

## 🚀 Getting Started

### Prerequisites
- **Google Apps Script** knowledge
- **Google Cloud APIs** familiarity
- **Google Workspace** environment for testing
- **Git** for version control

### Development Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/addocu.git
   cd addocu
   ```

2. **Set up Google Apps Script**
   - Go to [script.google.com](https://script.google.com)
   - Create a new project
   - Copy all `.gs` and `.html` files from the `src/` directory

3. **Configure APIs**
   - Enable required Google Cloud APIs
   - Create an API key for testing
   - Test with your own Google Analytics, GTM, and Looker Studio accounts

## 📋 Coding Standards

### JavaScript/Google Apps Script
```javascript
// Use descriptive function names
function sincronizarPropiedadesGA4() {
  // Implementation
}

// Add comprehensive error handling
try {
  const resultado = llamadaAPI();
  Logging.info("Operación exitosa", { resultado });
} catch (error) {
  Logging.error("Error en operación", { error: error.toString() });
  throw error;
}

// Use consistent formatting
const configuracion = {
  apiKey: PropertiesService.getUserProperties().getProperty('API_KEY'),
  timeout: 30000,
  retries: 3
};
```

### HTML/CSS
```html
<!-- Use semantic HTML structure -->
<div class="configuracion-sidebar">
  <h2>Configuración de Addocu</h2>
  <form id="config-form">
    <!-- Form content -->
  </form>
</div>
```

### Documentation
- **Use clear, concise language**
- **Include code examples** for technical explanations
- **Add screenshots** for UI-related documentation
- **Keep README.md updated** with new features

## 🔄 Pull Request Process

### Before Submitting
1. **Ensure your code follows** the coding standards
2. **Test thoroughly** with multiple Google accounts if possible
3. **Update documentation** for any new features
4. **Check that all files** follow the project structure

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots of UI changes

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

### Review Process
1. **Automated checks** will run on your PR
2. **Maintainer review** - expect feedback and iteration
3. **Testing** with different configurations
4. **Merge** once approved

## 🎯 Project Philosophy

### Community First
- **Every decision** should benefit the community
- **Transparency** in development and decision-making
- **Inclusive** environment for all contributors
- **Educational value** - help others learn

### Technical Excellence
- **Security by design** - user data protection is paramount
- **Performance** - efficient API usage and fast execution
- **Reliability** - comprehensive error handling
- **Maintainability** - clear, documented code

### Open Source Values
- **Collaboration** over competition
- **Sharing knowledge** and best practices
- **Building together** rather than alone
- **Long-term sustainability**

## 📊 Project Structure

### Core Modules
```
src/
├── coordinador.js         # Main orchestration logic
├── utilidades.js          # Shared utilities and authentication
├── ga4.js                 # Google Analytics 4 integration
├── gtm.js                 # Google Tag Manager integration
├── looker_studio.js       # Looker Studio integration
├── logging.js             # Logging system
├── dashboard.js           # Dashboard generation
├── configuracion.html     # Configuration sidebar
└── dashboard.html         # Interactive dashboard
```

### Testing Guidelines
- **Test with multiple Google accounts**
- **Verify API quota usage** doesn't exceed limits
- **Check error handling** with invalid configurations
- **Validate data output** formats and completeness

## 🚨 Security Considerations

### API Key Handling
- **Never log or expose** API keys
- **Use PropertiesService.getUserProperties()** for storage
- **Validate permissions** before API calls

### Data Privacy
- **No external data transmission** - everything stays in user's Google account
- **Minimal data retention** - only what's necessary for functionality
- **Clear data usage** - transparent about what data is accessed

### Error Handling
- **No sensitive information** in error messages
- **Graceful degradation** when APIs are unavailable
- **User-friendly error messages**

## 📞 Getting Help

### Development Questions
- **GitHub Discussions** for general questions
- **Issues** for bug reports and feature requests
- **Email** hello@addocu.com for other inquiries

### Community Resources
- **Documentation** in the `/docs` folder
- **Examples** in the `/examples` folder
- **Troubleshooting guide** for common issues

## 📜 Code of Conduct

### Our Standards
- **Be respectful** and inclusive
- **Constructive feedback** in reviews and discussions
- **Focus on the work** not the person
- **Help others learn** and grow

### Unacceptable Behavior
- **Harassment** or discrimination
- **Spam** or off-topic discussions
- **Sharing sensitive information** without permission
- **Disruptive behavior** in discussions

## 🎉 Recognition

### Contributors
All contributors will be:
- **Listed in CONTRIBUTORS.md**
- **Mentioned in release notes**
- **Credited in documentation** where appropriate
- **Invited to community events** and discussions

### Types of Contributions
- 💻 **Code** contributions
- 📖 **Documentation** improvements
- 🐛 **Bug reports** and testing
- 💡 **Ideas** and feature suggestions
- 🌍 **Translation** and localization
- 📢 **Community** building and outreach

---

**Thank you for contributing to Addocu! Together, we're building the best open-source tool for Google marketing stack auditing.**
