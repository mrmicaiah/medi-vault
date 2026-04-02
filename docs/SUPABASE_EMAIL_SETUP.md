# Supabase Email Configuration for MediVault

## Setup Instructions

Go to your Supabase Dashboard → **Authentication** → **Email Templates**

---

## 1. Reset Password Email

**Subject:**
```
Reset your MediVault password
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo img { height: 50px; }
    .card { background: #f9fafb; border-radius: 12px; padding: 30px; }
    h1 { color: #1A2B4A; font-size: 24px; margin: 0 0 20px 0; }
    p { margin: 0 0 15px 0; color: #555; }
    .button { display: inline-block; background: #6B1D2E; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #8B2D3E; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
    .note { background: #FEF3C7; border-radius: 8px; padding: 15px; margin-top: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <!-- Replace with your logo URL -->
      <img src="https://evereadyhomecare.com/logo.png" alt="Eveready HomeCare" />
    </div>
    
    <div class="card">
      <h1>Reset Your Password</h1>
      
      <p>Hi there,</p>
      
      <p>We received a request to reset the password for your MediVault account. Click the button below to create a new password:</p>
      
      <p style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Set New Password</a>
      </p>
      
      <div class="note">
        <strong>⏰ This link expires in 24 hours.</strong><br>
        If you didn't request this reset, you can safely ignore this email.
      </div>
    </div>
    
    <div class="footer">
      <p>Eveready HomeCare • "Always Ready to Meet Your Needs"</p>
      <p>This is an automated message from MediVault.</p>
    </div>
  </div>
</body>
</html>
```

---

## 2. Confirm Signup Email (for new applicants)

**Subject:**
```
Welcome to Eveready HomeCare - Confirm your email
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo img { height: 50px; }
    .card { background: #f9fafb; border-radius: 12px; padding: 30px; }
    h1 { color: #1A2B4A; font-size: 24px; margin: 0 0 20px 0; }
    p { margin: 0 0 15px 0; color: #555; }
    .button { display: inline-block; background: #6B1D2E; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://evereadyhomecare.com/logo.png" alt="Eveready HomeCare" />
    </div>
    
    <div class="card">
      <h1>Welcome to Eveready HomeCare!</h1>
      
      <p>Thank you for starting your application with us. Please confirm your email address to continue:</p>
      
      <p style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
      </p>
      
      <p>Once confirmed, you can complete your application and upload your documents through our secure portal.</p>
    </div>
    
    <div class="footer">
      <p>Eveready HomeCare • "Always Ready to Meet Your Needs"</p>
    </div>
  </div>
</body>
</html>
```

---

## 3. Magic Link Email (if you use passwordless login)

**Subject:**
```
Your MediVault login link
```

---

## Important Supabase Settings

### URL Configuration
Go to **Authentication** → **URL Configuration**:

- **Site URL:** `https://your-production-domain.com`
- **Redirect URLs:** Add these:
  - `https://your-production-domain.com/auth/reset-callback`
  - `http://localhost:5173/auth/reset-callback` (for local dev)

### SMTP Settings (Recommended)
For production, configure your own SMTP in **Settings** → **Auth** → **SMTP Settings**:
- This removes the "Sent via Supabase" branding
- Improves deliverability
- Options: SendGrid, Postmark, Amazon SES, Mailgun

---

## Testing

1. Go to `/auth/reset-password` in your app
2. Enter an email address
3. Check email for the reset link
4. Click link → should land on `/auth/reset-callback` → redirect to `/auth/set-password`
5. Set new password → redirect to `/auth/login`
