# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

The HTML Diff Checker team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via GitHub Security Advisories:

1. Go to the [Security tab](https://github.com/yegecali/diff-checker-browser/security/advisories)
2. Click "Report a vulnerability"
3. Fill out the form with as much detail as possible

Alternatively, you can email the maintainer directly if you prefer.

### What to Include

When reporting a vulnerability, please include:

- Type of vulnerability (e.g., XSS, CSP bypass, privilege escalation)
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes (if you have them)
- Your name/handle for credit (optional)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies by severity, typically 14-30 days

### What to Expect

1. **Acknowledgment**: We'll acknowledge receipt of your report within 48 hours
2. **Validation**: We'll confirm the vulnerability and determine its severity
3. **Fix Development**: We'll develop and test a fix
4. **Disclosure**: We'll release the fix and publish a security advisory
5. **Credit**: We'll credit you in the advisory (unless you prefer to remain anonymous)

## Security Best Practices

When using this extension:

1. **Keep Updated**: Always use the latest version
2. **Review Permissions**: Understand what permissions the extension requires
3. **Source Review**: The code is open source - feel free to audit it
4. **Report Issues**: If you notice suspicious behavior, report it

## Scope

### In Scope

- Cross-Site Scripting (XSS)
- Content Security Policy (CSP) bypasses
- Privilege escalation
- Data leakage
- Code injection
- Malicious selector injection

### Out of Scope

- Issues in third-party dependencies (report to the dependency maintainers)
- Social engineering attacks
- Physical attacks
- Denial of Service (DoS) attacks

## Security Features

This extension implements several security measures:

- **Manifest V3**: Uses the latest, most secure Chrome extension manifest
- **Minimal Permissions**: Only requests necessary permissions
- **No Remote Code**: All code is bundled, no remote script execution
- **Input Validation**: CSS selectors and regex patterns are validated
- **HTML Escaping**: All user input is properly escaped before rendering
- **Content Security Policy**: Strict CSP prevents inline scripts

## Acknowledgments

We thank all security researchers who have responsibly disclosed vulnerabilities to us.

## Questions?

If you have questions about this policy, please open a general issue (not for reporting vulnerabilities).
