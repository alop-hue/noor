const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Copies bundled athan MP3s from assets/athans into android/app/src/main/res/raw
 * during prebuild, so notification channels can reference them as raw resources.
 * `expo prebuild` wipes android/, so this must re-run on every prebuild.
 */
module.exports = function withAthanSounds(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const srcDir = path.join(projectRoot, 'assets', 'athans');
      const rawDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'raw'
      );
      if (!fs.existsSync(srcDir)) return modConfig;
      fs.mkdirSync(rawDir, { recursive: true });
      for (const file of fs.readdirSync(srcDir)) {
        if (file.endsWith('.mp3')) {
          fs.copyFileSync(path.join(srcDir, file), path.join(rawDir, file));
        }
      }
      return modConfig;
    },
  ]);
};
