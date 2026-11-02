/**
 * Renames the Android crop screen's button (expo-image-picker's cropper) from
 * "Crop" to "Done". Drivers read "Crop" as "cut it", not "I'm finished", and
 * stopped there; the photo is only saved from the app's own Add photo step
 * that follows. Hindi and Gujarati follow the phone's language, like the rest
 * of that native screen.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const LABELS = {
  values: 'Done',
  'values-hi': 'हो गया',
  'values-gu': 'થઈ ગયું',
};

const NAME = 'crop_image_menu_crop';

function setString(file, value) {
  const line = `  <string name="${NAME}">${value}</string>`;
  let xml = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '<resources>\n</resources>\n';
  const existing = new RegExp(`\\s*<string name="${NAME}">[^<]*</string>`);
  xml = xml.replace(existing, '');
  xml = xml.replace('</resources>', `${line}\n</resources>`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, xml);
}

module.exports = function withCropButtonLabel(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      for (const [dir, label] of Object.entries(LABELS)) {
        setString(path.join(res, dir, 'strings.xml'), label);
      }
      return cfg;
    },
  ]);
};
