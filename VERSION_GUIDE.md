# Version Management Guide

## Automatic Version Bumping

The app now supports automatic version incrementing! No more manually editing `app.json`.

## How to Use

### Quick Update (Recommended)
Run this single command to bump version AND publish update:
```bash
npm run update
```
This will:
1. Increment patch version (e.g., 1.8.0 → 1.8.1)
2. Publish OTA update to production branch

### Manual Version Bumping

**Patch Version** (bug fixes: 1.8.0 → 1.8.1)
```bash
npm run version:patch
```

**Minor Version** (new features: 1.8.0 → 1.9.0)
```bash
npm run version:minor
```

**Major Version** (breaking changes: 1.8.0 → 2.0.0)
```bash
npm run version:major
```

## Workflow Examples

### For Bug Fixes & Small Updates
```bash
npm run update
# or manually:
npm run version:patch
eas update --branch production --message "Fixed bugs"
```

### For New Features
```bash
npm run version:minor
eas update --branch production --message "Added new feature"
```

### For Major Updates
```bash
npm run version:major
eas build --platform android --profile apk  # Need new APK for major versions
```

## Version Format

Versions follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0): Breaking changes, requires new APK
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

## Before Publishing

1. Make your code changes
2. Test thoroughly
3. Run `npm run update` (auto-bumps patch version and publishes)
4. Done! ✅

## Current Version

Check current version:
```bash
# In app.json under expo.version
# Or check the app settings screen
```

## Tips

- Use `npm run update` for most updates (fastest)
- Use minor/major bumps when appropriate
- The script automatically updates `app.json`
- Version history is tracked in git
