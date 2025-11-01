// Dynamic Expo config to inject Google Maps API key for Android in production builds
// Reads GOOGLE_MAPS_API_KEY from environment (set as an EAS secret) and configures react-native-maps

// Dynamic config disabled for now to avoid requiring react-native-maps plugin during dev.
// When you obtain a Google Maps API key, uncomment the plugin block below and set
// EAS secret GOOGLE_MAPS_API_KEY. We only include the plugin when a key is provided.

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const next = { ...config };

  if (googleMapsApiKey) {
    next.plugins = [
      ...(config.plugins || []),
      [
        // Note: Only include when key exists to prevent dev-time plugin import
        'react-native-maps',
        { googleMapsApiKey },
      ],
    ];
    next.android = {
      ...(config.android || {}),
      config: {
        ...(config.android?.config || {}),
        googleMaps: { apiKey: googleMapsApiKey },
      },
    };
  }

  return next;
};
