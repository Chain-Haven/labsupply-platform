# Supabase Email Templates for WhiteLabel Peptides

Copy each template into your Supabase Dashboard > Authentication > Email Templates.

---

## 1. Confirm Sign Up

**Subject:** `Verify your WhiteLabel Peptides account`

```html
<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0a1e;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 24px;text-align:center;">
    <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(255,255,255,0.15);border-radius:12px;line-height:48px;font-size:24px;">📦</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">WhiteLabel Peptides</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#e2e0ff;font-size:20px;margin:0 0 8px;">Verify your email</h2>
    <p style="color:#a5a3c7;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Thanks for signing up! Use the code below to verify your email address.
    </p>
    <div style="background:#1a1333;border:1px solid #2d2554;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
      <p style="color:#a5a3c7;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Verification Code</p>
      <p style="color:#fff;font-size:32px;font-weight:700;letter-spacing:6px;margin:0;font-family:monospace;">{{ .Token }}</p>
    </div>
    <p style="color:#a5a3c7;font-size:13px;margin:0 0 16px;">Or click the button below:</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Verify Email Address</a>
    </div>
    <p style="color:#6b6990;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #2d2554;padding-top:16px;">
      If you didn't create an account, you can safely ignore this email.<br/>
      This code expires in 24 hours.
    </p>
  </div>
</div>
```

---

## 2. Invite User

**Subject:** `You've been invited to WhiteLabel Peptides`

```html
<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0a1e;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 24px;text-align:center;">
    <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(255,255,255,0.15);border-radius:12px;line-height:48px;font-size:24px;">📦</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">WhiteLabel Peptides</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#e2e0ff;font-size:20px;margin:0 0 8px;">You're invited!</h2>
    <p style="color:#a5a3c7;font-size:14px;line-height:1.6;margin:0 0 24px;">
      You've been invited to join WhiteLabel Peptides. Click below to accept and set up your account.
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Accept Invitation</a>
    </div>
    <p style="color:#6b6990;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #2d2554;padding-top:16px;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  </div>
</div>
```

---

## 3. Magic Link (OTP Sign In)

**Subject:** `Your WhiteLabel Peptides sign-in code`

```html
<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0a1e;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 24px;text-align:center;">
    <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(255,255,255,0.15);border-radius:12px;line-height:48px;font-size:24px;">📦</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">WhiteLabel Peptides</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#e2e0ff;font-size:20px;margin:0 0 8px;">Your sign-in code</h2>
    <p style="color:#a5a3c7;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Enter this code on the sign-in page to access your account.
    </p>
    <div style="background:#1a1333;border:1px solid #2d2554;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
      <p style="color:#a5a3c7;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Sign-In Code</p>
      <p style="color:#fff;font-size:32px;font-weight:700;letter-spacing:6px;margin:0;font-family:monospace;">{{ .Token }}</p>
    </div>
    <p style="color:#a5a3c7;font-size:13px;margin:0 0 16px;">Or click to sign in directly:</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Sign In to Account</a>
    </div>
    <p style="color:#6b6990;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #2d2554;padding-top:16px;">
      This code expires in 10 minutes. If you didn't request this, someone may have entered your email by mistake.
    </p>
  </div>
</div>
```

---

## 4. Change Email Address

**Subject:** `Confirm your new email address`

```html
<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0a1e;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 24px;text-align:center;">
    <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(255,255,255,0.15);border-radius:12px;line-height:48px;font-size:24px;">📦</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">WhiteLabel Peptides</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#e2e0ff;font-size:20px;margin:0 0 8px;">Confirm your new email</h2>
    <p style="color:#a5a3c7;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to confirm changing your email address to <strong style="color:#e2e0ff;">{{ .Email }}</strong>.
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Confirm New Email</a>
    </div>
    <p style="color:#6b6990;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #2d2554;padding-top:16px;">
      If you didn't request this change, please secure your account immediately by resetting your password.
    </p>
  </div>
</div>
```

---

## 5. Reset Password

**Subject:** `Reset your WhiteLabel Peptides password`

```html
<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0a1e;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 24px;text-align:center;">
    <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(255,255,255,0.15);border-radius:12px;line-height:48px;font-size:24px;">📦</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">WhiteLabel Peptides</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#e2e0ff;font-size:20px;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#a5a3c7;font-size:14px;line-height:1.6;margin:0 0 24px;">
      We received a request to reset the password for your account. Click the button below to choose a new password.
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Reset Password</a>
    </div>
    <p style="color:#6b6990;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #2d2554;padding-top:16px;">
      This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email.
    </p>
  </div>
</div>
```

---

## 6. Reauthentication

**Subject:** `Confirm your identity — WhiteLabel Peptides`

```html
<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0a1e;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 24px;text-align:center;">
    <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(255,255,255,0.15);border-radius:12px;line-height:48px;font-size:24px;">📦</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">WhiteLabel Peptides</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#e2e0ff;font-size:20px;margin:0 0 8px;">Confirm your identity</h2>
    <p style="color:#a5a3c7;font-size:14px;line-height:1.6;margin:0 0 24px;">
      For security, please enter this code to confirm your identity before proceeding.
    </p>
    <div style="background:#1a1333;border:1px solid #2d2554;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
      <p style="color:#a5a3c7;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Verification Code</p>
      <p style="color:#fff;font-size:32px;font-weight:700;letter-spacing:6px;margin:0;font-family:monospace;">{{ .Token }}</p>
    </div>
    <p style="color:#6b6990;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #2d2554;padding-top:16px;">
      This code expires in 10 minutes. If you didn't initiate this action, please change your password immediately.
    </p>
  </div>
</div>
```

---

## Setup Notes

1. Go to **Supabase Dashboard > Authentication > Email Templates**
2. For each template type, paste the HTML into the **Body** field
3. Set the **Subject** as shown above
4. The templates use these Supabase variables:
   - `{{ .Token }}` — 6-digit OTP code
   - `{{ .ConfirmationURL }}` — Clickable verification link
   - `{{ .Email }}` — User's email address
   - `{{ .SiteURL }}` — Your site URL
   - `{{ .TokenHash }}` — Hashed token for URL-based verification
   - `{{ .RedirectTo }}` — Redirect URL after verification
