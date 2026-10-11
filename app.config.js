// Adds per-deployment values that must not live in app.json. Expo merges this over app.json.
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const easProjectId = process.env.EAS_PROJECT_ID;
  let result = config;

  if (googleMapsApiKey) {
    result = {
      ...result,
      android: {
        ...result.android,
        config: {
          ...result.android?.config,
          googleMaps: { apiKey: googleMapsApiKey },
        },
      },
    };
  }

  // Push notifications (partner alerts) need an EAS project id.
  if (easProjectId) {
    result = {
      ...result,
      extra: {
        ...result.extra,
        eas: { ...result.extra?.eas, projectId: easProjectId },
      },
    };
  }

  return result;
};
