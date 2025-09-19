
# Ticketmaster Multi-Login Extension with Whop OAuth

## Overview
Firefox extension that opens multiple Ticketmaster accounts with premium access control via Whop OAuth integration.

## Features
- **Premium Access Control**: Whop OAuth login required for extension use
- **Multi-Account Login**: Open multiple Ticketmaster accounts simultaneously
- **Proxy Support**: Each account uses a unique proxy
- **Session Management**: Secure backend authentication with anti-sharing protection


## Usage
1. Click extension icon to open sidepanel
2. Click "Login with Whop" and authenticate
3. Enter event URLs (one per line)
4. Enter proxy:username:password combinations
5. Click "Start Login"

## Demo Flow

### Initial State (Unauthenticated)
1. Click Firefox extension icon
2. Sidepanel opens showing "Premium Access Required"
3. Only "Login with Whop" button visible
4. Main extension features hidden

### Whop OAuth Login
1. Click "Login with Whop" button
2. New popup window opens with Whop OAuth page
3. Login with your Whop account
4. Authorize the application
5. Popup closes automatically

### Backend Validation Process
**What happens behind the scenes:**
1. Backend receives OAuth code
2. Exchanges code for access token using Whop SDK
3. Fetches user profile and memberships
4. Validates active paid subscription
5. Creates JWT session token (24h expiry)
6. Stores session in database
7. Returns success to extension

### Extension Unlock (Success Case)
**If user has active paid subscription:**
1. Sidepanel shows user info and logout button
2. Main extension features become visible
3. User can enter event URLs and credentials
4. "Start Login" button is enabled

### Access Denied (No Subscription)
**If user has no active paid subscription:**
1. Error message: "No active subscription found"
2. Extension remains locked
3. User must purchase subscription first

### Session Management Demo
**Test anti-sharing protection:**
1. Login from first browser/device
2. Try to login from second browser/device
3. First session gets invalidated automatically
4. Only one active session allowed per user

## Security Features
- Backend-only OAuth token handling
- Session-based authentication (24h expiry)
- One active session per user
- Subscription status validation
- Secure JWT tokens

## Verification Points

### ✅ OAuth Integration
- [ ] Whop login popup opens correctly
- [ ] OAuth flow completes successfully
- [ ] User redirected back to extension

### ✅ Paid Membership Validation
- [ ] Users with paid subscriptions get access
- [ ] Users without subscriptions are denied
- [ ] Backend logs show membership validation

### ✅ Session Management
- [ ] JWT tokens issued with 24h expiry
- [ ] Sessions stored in database
- [ ] Multiple sessions prevented (anti-sharing)

### ✅ Security
- [ ] No OAuth tokens visible in extension code
- [ ] All validation happens server-side
- [ ] Extension only receives session tokens

### ✅ Extension Functionality
- [ ] Premium features locked until authenticated
- [ ] Backend validates all input data
- [ ] Multi-account login works with proxies


## Expected Results

**Successful Demo Shows:**
1. ✅ Secure OAuth flow with Whop
2. ✅ Paid subscription enforcement
3. ✅ Session-based authentication
4. ✅ Anti-account sharing protection
5. ✅ Backend-controlled access logic
6. ✅ Working multi-login functionality

This demonstrates a complete monetized extension with enterprise-grade security and subscription management.