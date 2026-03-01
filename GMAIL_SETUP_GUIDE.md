# Gmail Setup for Email Service

## Why the Error Occurs
Gmail no longer allows "less secure apps" to login with your regular password. You must use an **App Password** instead.

## How to Generate Gmail App Password (2-Factor Authentication Required)

### Prerequisites
- Gmail account with 2-Step Verification enabled
- If not enabled, enable it first: https://accounts.google.com/security

### Steps to Generate App Password

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com/
   - Click "Security" in the left menu

2. **Enable 2-Step Verification (if not already enabled)**
   - Search for "2-Step Verification"
   - Follow the prompts to enable it

3. **Generate App Password**
   - Go back to Security
   - Scroll down, you'll see **"App passwords"** (only appears if 2FA is enabled)
   - Select "Mail" and "Windows Computer" (or your device type)
   - Click "Generate"
   - Google will show a 16-character password like: `abcd efgh ijkl mnop`

4. **Copy the Password**
   - Gmail shows the app password (without spaces)
   - Example: `abcdefghijklmnop`

## Update .env File

Update your `.env` file with:

```env
# Gmail Configuration for Email Service
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password-no-spaces
```

**Important:** 
- Use the 16-character app password (generated above), NOT your regular Gmail password
- Remove any spaces from the password
- Keep the `EMAIL_SERVICE=gmail` setting

## Example .env
```env
MONGODB_URI=mongodb://localhost:27017/lms_saas
FRONTEND_URL=http://localhost:3000
EMAIL_SERVICE=gmail
EMAIL_USER=myemail@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

## How It Works

The EmailService now automatically detects `EMAIL_SERVICE=gmail` and:
- Uses Gmail SMTP server
- Authenticates with your app password
- Sends real emails to your inbox

## Testing

After updating .env:
1. Restart the backend server (`npm run dev`)
2. Run the test: `npx ts-node test-email.ts`
3. Email should arrive in your Gmail inbox within seconds

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Invalid login credentials" | Make sure you're using the app password, not your Gmail password |
| "App password not showing" | Enable 2-Step Verification first |
| "Access denied (535)" | Delete .env and re-enter app password carefully |
| Email not received | Check spam/promotions folder, whitelist sender address |

## Production Notes

- Keep app passwords private (like API keys)
- For production, use a dedicated "noreply" Gmail account
- Consider using transactional email services (SendGrid, AWS SES) for high volume
- Never commit .env with real credentials to Git
