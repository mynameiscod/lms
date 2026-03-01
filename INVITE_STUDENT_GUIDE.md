# Student Invitation Email Test Guide

## ✅ What We've Verified:
- Email service is working ✅
- Gmail credentials are correct ✅
- Emails CAN be sent ✅

## ❌ The Problem:
When creating users through the UI, emails are **NOT being sent**

## 🔍 Why?

There are **TWO different user creation endpoints:**

### 1. Regular User Creation (NO EMAIL)
```
POST /api/v1/users
```
**Used for:** Admin manually creating users  
**Email sent?** ❌ NO

### 2. Student Invitation (WITH EMAIL)
```
POST /api/v1/users/invite/student
```
**Used for:** Inviting new students  
**Email sent?** ✅ YES

---

## 🧪 How to Test the Invite Endpoint

### Using Postman or PowerShell:

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_ADMIN_JWT_TOKEN"
}

$body = @{
    email = "newstudent@gmail.com"
    firstName = "John"
    lastName = "Doe"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "http://localhost:5000/api/v1/users/invite/student" `
    -Method POST `
    -Headers $headers `
    -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

### Expected Response (SUCCESS):
```json
{
  "success": true,
  "message": "Student invited successfully. Welcome email sent.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "newstudent@gmail.com"
  }
}
```

### Server Logs Will Show:
```
👤 [INVITE STUDENT] Received invitation request
   Email: newstudent@gmail.com
   Name: John Doe
   Step 1: Creating user...
   ✅ User created: 507f1f77bcf86cd799439011
   Step 2: Generating reset token...
   ✅ Reset token generated (expires: 24 hours)
   Step 3: Attempting to send welcome email...

📧 [EMAIL SERVICE] Welcome Email Request
   Recipient: newstudent@gmail.com
   Student Name: John Doe
   Status: Sending...
   ✅ STATUS: EMAIL SENT SUCCESSFULLY
   Message ID: <xxx@gmail.com>
   Response: 250 2.0.0 OK
   🎉 Student invitation process complete
```

---

## 🐛 Troubleshooting

**If you see:** `Invalid or expired token` or `Invalid JWT`  
→ Your admin JWT token is wrong or expired. Get a new one by logging in as admin.

**If you see:** `Missing required fields`  
→ You didn't provide email, firstName, or lastName

**If you see:** `User already exists`  
→ That email is already in the database

**If email is NOT sent:**  
→ Look for `❌ STATUS: EMAIL SENT FAILED` in server logs with error details

---

## ✅ The Complete Flow

1. **Admin logs in** → Gets JWT token
2. **Admin invites student** → Calls `/users/invite/student` with email
3. **Backend creates user** → Generates reset token
4. **Backend sends email** → Student receives setup link
5. **Student clicks link** → Goes to password setup page
6. **Student sets password** → Can now login

---

## 📋 What You Need:

1. **Admin JWT Token** - Get by logging in as admin
2. **Student Email** - Where to send the invitation
3. **Student Name** - First and last name
4. **Backend Running** - `npm run dev` in server folder

---

## 🔗 Admin JWT Token Example:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzgyMzJkNGM0YzQ3MDAwMTZhMDAwMDEiLCJyb2xlIjoiQURNSU4iLCJ0ZW5hbnRJZCI6IjY3ODIzMmQ0YzRjNDcwMDAxNmEwMDAwMCIsImlhdCI6MTczNjk4MzkwMSwiZXhwIjo3NzM2OTgzOTAxfQ.HzJxSO6yzUKOHMHhKNKVKKglPYvLXf_aMmDhxL_TZM0
```

---

## 📧 What Student Receives:

Subject: **🎉 Welcome to LMS - Complete Your Profile!**

Body contains:
- Welcome message with student's name
- "Complete Your Registration" button
- Direct link to setup password page with token
- Link expires in 24 hours

---

## 💡 For the UI:

Your **Admin User Creation Form** should POST to:
```
/api/v1/users/invite/student
```

NOT to `/api/v1/users` (which doesn't send email)

Make sure the form:
1. Gets admin JWT token from auth context
2. POSTs to the correct endpoint
3. Includes email, firstName, lastName
4. Shows success/error messages to admin

---
