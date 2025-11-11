# Google Sign-In Setup Guide

## Current Status
- ✅ expo-auth-session packages installed
- ✅ Google OAuth Web Client ID configured
- ✅ Code implementation complete
- ⚠️ **Need to add redirect URIs to Google Cloud Console**

## Steps to Fix "Access Blocked" Error

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/credentials

### 2. Select Your OAuth Client
- Find your OAuth 2.0 Client ID: `300404105909-kukr3gedqthqlnihgeaoaamcmc51mkel.apps.googleusercontent.com`
- Click on it to edit

### 3. Add Authorized Redirect URIs
Add these redirect URIs to your OAuth client:
Invalid Redirect: must end with a public top-level domain (such as .com or .org).
Invalid Redirect: must use a domain that is a valid top private domain .
For **Expo Go** (development):
```
https://auth.expo.io/@kael0/stride-quest
```

For **Standalone App** (production - after building):
```
com.stridequest.app:/oauth2redirect
stridequest:/oauth2redirect
```

**IMPORTANT:** 
- ❌ Do NOT add a trailing slash (/) at the end
- ❌ Do NOT include any path after the redirect URI
- ✅ Copy the URIs exactly as shown above

### 4. Click Save

### 5. Test the Google Sign-In
- Restart your Expo app
- Click "Continue with Google"
- It should now work without the "Access Blocked" error

## Alternative: Create Separate OAuth Clients

If you're still having issues, you may need to create separate OAuth clients:

### For Android:
1. Create a new "Android" OAuth client
2. Use package name: `com.stridequest.app`
3. Use SHA-1 fingerprint: `36:4C:D9:38:BC:73:D5:42:9B:0B:2C:18:79:CF:9B:0C:F3:43:CB:E7`
4. Copy the Client ID and update `GOOGLE_ANDROID_CLIENT_ID` in `src/config/googleSignIn.js`

### For iOS:
1. Create a new "iOS" OAuth client
2. Use bundle ID: `com.stridequest.app`
3. Copy the Client ID and update `GOOGLE_IOS_CLIENT_ID` in `src/config/googleSignIn.js`

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure you added the exact redirect URI to Google Cloud Console
- Wait a few minutes after saving for changes to propagate

### Error: "Access blocked: Authorization Error"
- This means the redirect URI is not authorized
- Double-check the redirect URIs in Google Cloud Console
- Make sure you're using the correct OAuth client ID

### Error: "Invalid_client"
- The client ID might be wrong
- Verify the client ID matches what's in Google Cloud Console
