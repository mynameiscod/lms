# LMS Student Onboarding - Environment Configuration

## Backend Email Service Configuration (.env)

```
# ===== Email Service Configuration =====

# Email Service Provider
# Options: gmail, sendgrid, mailgun, smtp
EMAIL_SERVICE=gmail

# Email Account Credentials
# For Gmail: Use your email address
EMAIL_USER=your-lms-email@gmail.com

# Email Password
# For Gmail: Generate App-Specific Password (not regular password)
# Steps for Gmail:
#   1. Enable 2-Factor Authentication
#   2. Go to Security settings
#   3. Select "App passwords"
#   4. Select "Mail" and "Windows Computer"
#   5. Copy the generated 16-character password
EMAIL_PASSWORD=your-app-specific-password-here

# Email From Address
# How emails will appear in student inboxes
EMAIL_FROM=LMS Support <your-lms-email@gmail.com>

# Frontend URL (used for email links)
# This will be included in the setup link sent to students
FRONTEND_URL=http://localhost:3000

# For Production
# FRONTEND_URL=https://yourdomain.com

```

## Gmail Application Password Setup Guide

### Step 1: Enable 2-Factor Authentication
1. Go to myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the setup process

### Step 2: Generate App Password
1. Go to myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or your OS)
3. Google will generate a 16-character password
4. Copy this password to EMAIL_PASSWORD in .env

### Step 3: Verify Configuration
```bash
# Test email configuration
npm run test:emails
```

## Alternative Email Providers

### SendGrid Configuration

```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your-sendgrid-api-key-here
EMAIL_FROM=LMS Support <noreply@yourdomain.com>
```

### Mailgun Configuration

```env
EMAIL_SERVICE=mailgun
EMAIL_USER=postmaster@mg.yourdomain.com
EMAIL_PASSWORD=your-mailgun-api-key
EMAIL_FROM=LMS Support <noreply@mg.yourdomain.com>
```

## Complete Backend .env Example

```env
# ===== Database =====
MONGODB_URI=mongodb://localhost:27017/lms-saas
MONGODB_TEST_URI=mongodb://localhost:27017/lms-saas-test

# ===== Authentication =====
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# ===== Email Service =====
EMAIL_SERVICE=gmail
EMAIL_USER=your-lms-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=LMS Support <your-lms-email@gmail.com>

# ===== Frontend Configuration =====
FRONTEND_URL=http://localhost:3000

# ===== Node Environment =====
NODE_ENV=development

# ===== Server Configuration =====
PORT=5000
HOST=localhost

# ===== CORS Configuration =====
CORS_ORIGIN=http://localhost:3000
```

## Complete Frontend .env Example

```env
# ===== API Configuration =====
REACT_APP_API_URL=http://localhost:5000/api/v1

# ===== Socket Configuration =====
REACT_APP_SOCKET_URL=http://localhost:5000

# ===== Environment =====
REACT_APP_ENV=development
```

## Verification Checklist

After setting up environment variables:

- [ ] Backend server starts without email errors
- [ ] Each invited student receives an email
- [ ] Email contains correct setup link
- [ ] Email contains student's first name
- [ ] Setup link has token and email parameters
- [ ] Token is valid for 24 hours
- [ ] Invalid tokens show error message
- [ ] Expired tokens cannot be used

## Production Deployment

### Email Service Recommendations

**Production Choice: SendGrid**
- Most reliable for transactional emails
- Better deliverability
- Built-in email analytics
- Scalable pricing

**Configuration:**
```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxxxxxxxxxx
EMAIL_FROM=LMS Support <support@yourdomain.com>
```

### FRONTEND_URL for Production

```env
# Production Domain
FRONTEND_URL=https://your-lms-domain.com

# Email links will be:
# https://your-lms-domain.com/setup-password?token=xxx&email=yyy
```

### SSL/TLS for Email

For enhanced security, ensure:
- SMTP connection uses TLS
- Verify SSL certificates
- Use environment-specific configurations

```env
# Advanced Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
```

## Troubleshooting Email Issues

### Test Email Send

Create a test script:
```javascript
// test-email.js
const { EmailService } = require('./src/services/emailService');
const emailService = new EmailService();

emailService.sendWelcomeEmail(
  'test@example.com',
  'John',
  'http://localhost:3000/setup-password?token=test123&email=test@example.com'
).then(() => {
  console.log('✓ Email sent successfully');
  process.exit(0);
}).catch(err => {
  console.error('✗ Email failed:', err.message);
  process.exit(1);
});
```

Run: `node test-email.js`

### Common Issues

**"Invalid login"**
- Wrong credentials
- Gmail requires app-specific password
- 2FA not enabled for Gmail

**"Email quota exceeded"**
- Gmail has daily sending limits
- Consider SendGrid for higher volume
- Implement rate limiting

**"Connection timeout"**
- Firewall blocking SMTP port
- ISP restrictions
- Network connectivity issues

## Rate Limiting for Invitations

To prevent abuse, consider adding rate limiting:

```typescript
// Limit: 100 invitations per hour per admin
const inviteRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100
});

router.post('/invite/student', inviteRateLimit, inviteStudent);
```

## Email Template Customization

To customize email templates, modify `EmailService` in:
`server/src/services/emailService.ts`

Available customizations:
- HTML template design
- Company branding
- Logo URLs
- Color schemes
- Support contact information
- Additional security information
