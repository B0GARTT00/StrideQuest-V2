# Over-The-Air (OTA) Updates Guide

## Overview
Your app now supports OTA updates! Users can receive updates without reinstalling the APK.

## How It Works
1. When users open the app, it automatically checks for updates
2. If an update is available, it downloads in the background
3. User gets a prompt to restart and apply the update
4. App restarts with the new version - no reinstall needed!

## Publishing Updates

### Step 1: Make Your Code Changes
Edit any files in your project (screens, components, services, etc.)

### Step 2: Update Version (Optional but Recommended)
In `app.json`, increment the version:
```json
"version": "1.8.1"  // Change from 1.8.0
```

### Step 3: Publish the Update
Run this command to push the update to your users:

```bash
# For production channel (your APK builds)
eas update --branch production --message "Bug fixes and improvements"

# Or for preview builds
eas update --branch preview --message "Testing new features"
```

That's it! Users will get the update next time they open the app.

## When to Build a New APK vs. Push an Update

### Use OTA Updates For:
✅ JavaScript/React Native code changes
✅ Styling and UI updates
✅ Bug fixes
✅ New screens or features
✅ Firebase configuration changes
✅ Business logic updates

### Build New APK For:
❌ Native code changes (rare with Expo)
❌ New native dependencies/plugins
❌ Permission changes in app.json
❌ Changes to app.json that affect native configuration
❌ Major version upgrades

## Important Notes

1. **First Install**: Users must install your APK once
2. **Automatic Updates**: After that, all JS updates happen automatically
3. **No Google Play Required**: This works with direct APK distribution
4. **Instant Deployment**: Updates reach users in minutes, not days
5. **Development Mode**: Updates are disabled in dev mode (Expo Go)

## Testing Updates

1. Build and install your APK:
```bash
eas build --platform android --profile apk
```

2. Install it on your device

3. Make a code change (e.g., change text on HomeScreen)

4. Publish the update:
```bash
eas update --branch production --message "Test update"
```

5. Close and reopen the app - you'll see your changes!

## Checking Update Status

To see all your published updates:
```bash
eas update:list --branch production
```

To view update details:
```bash
eas update:view [update-id]
```

## Rollback (Emergency)

If an update causes issues, you can rollback:
```bash
eas update:republish --branch production --group [previous-update-group-id]
```

## Channels Configured

- `production` - For your main APK builds (apk profile)
- `preview` - For testing builds
- `development` - For development builds

## Best Practices

1. **Test First**: Use preview channel for testing before production
2. **Clear Messages**: Use descriptive update messages
3. **Monitor**: Check logs after publishing updates
4. **Version Numbers**: Keep app.json version in sync with changes
5. **User Experience**: Updates download silently, only interrupt on restart

---

**Your app is now set up for seamless updates! 🚀**

No more uninstalling and reinstalling. Just publish updates and your users get them automatically!
