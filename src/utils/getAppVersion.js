// src/utils/getAppVersion.js
import Constants from 'expo-constants';

export default function getAppVersion() {
  // Expo managed workflow: Constants.manifest.version
  // Bare workflow: Constants.expoConfig.version
  if (Constants.manifest && Constants.manifest.version) {
    return Constants.manifest.version;
  }
  if (Constants.expoConfig && Constants.expoConfig.version) {
    return Constants.expoConfig.version;
  }
  return 'Unknown';
}
