// src/utils/getAppVersion.js
import Constants from 'expo-constants';
import * as Application from 'expo-application';

export default function getAppVersion() {
  // Preferred: native application version (Android versionName / iOS CFBundleShortVersionString)
  if (Application?.nativeApplicationVersion) {
    return Application.nativeApplicationVersion;
  }
  // Fallbacks (dev or web):
  if (Constants?.expoConfig?.version) {
    return Constants.expoConfig.version;
  }
  if (Constants?.manifest?.version) {
    return Constants.manifest.version;
  }
  return 'Unknown';
}
