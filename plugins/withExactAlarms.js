const { withAndroidManifest } = require('expo/config-plugins');

/** Adds SCHEDULE_EXACT_ALARM for precise prayer notification timing on Android 12+. */
module.exports = function withExactAlarms(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const perms = manifest['uses-permission'] ?? [];
    if (!perms.some((p) => p.$['android:name'] === 'android.permission.SCHEDULE_EXACT_ALARM')) {
      perms.push({ $: { 'android:name': 'android.permission.SCHEDULE_EXACT_ALARM' } });
    }
    manifest['uses-permission'] = perms;
    return config;
  });
};
