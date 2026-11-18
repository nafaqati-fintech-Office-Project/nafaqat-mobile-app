// Expo config plugin for the iPhone bank-message capture.
//
//  1. Copies the two Shortcuts actions (plugins/ios/NafaqatiShortcutIntents.swift) into the app target. App Intents must
//     live in the app target to show up in Shortcuts, so they cannot sit inside the native module's pod.
//  2. Adds the App Group the actions and the app share (the encrypted queue lives in it).
//  3. Adds the Arabic and English names the user sees inside Shortcuts (a string catalog in the app bundle).
//
// It runs during `expo prebuild`; the ios/ folder stays generated and is never edited by hand.
const fs = require('fs');
const path = require('path');
const { withEntitlementsPlist, withInfoPlist, withXcodeProject, IOSConfig } = require('@expo/config-plugins');

const INTENTS_FILE = 'NafaqatiShortcutIntents.swift';
const CATALOG_FILE = 'Localizable.xcstrings';

// key: [English, Arabic]. The keys are what the Swift file refers to.
const STRINGS = {
  'intent.bank.title': ['Log bank message', 'تسجيل رسالة البنك'],
  'intent.bank.description': [
    'Saves a bank message on this iPhone so Nafaqati can turn it into a transaction.',
    'يحفظ رسالة البنك على هذا الآيفون ليحوّلها نفقتي إلى عملية.',
  ],
  'intent.bank.message': ['Message', 'الرسالة'],
  'intent.bank.sender': ['Sender', 'المرسل'],
  'intent.card.title': ['Log card payment', 'تسجيل دفعة بالبطاقة'],
  'intent.card.description': [
    'Saves an Apple Pay payment on this iPhone so Nafaqati can record it.',
    'يحفظ دفعة Apple Pay على هذا الآيفون ليسجلها نفقتي.',
  ],
  'intent.card.merchant': ['Merchant', 'التاجر'],
  'intent.card.amount': ['Amount', 'المبلغ'],
  'intent.card.card': ['Card', 'البطاقة'],
};

function catalog() {
  const strings = {};
  for (const [key, [en, ar]] of Object.entries(STRINGS)) {
    strings[key] = {
      extractionState: 'manual',
      localizations: {
        en: { stringUnit: { state: 'translated', value: en } },
        ar: { stringUnit: { state: 'translated', value: ar } },
      },
    };
  }
  return JSON.stringify({ sourceLanguage: 'en', strings, version: '1.0' }, null, 2);
}

module.exports = function withNafaqatiShortcuts(config, props = {}) {
  const bundleId = config.ios?.bundleIdentifier;
  if (!bundleId) throw new Error('withNafaqatiShortcuts: set expo.ios.bundleIdentifier in app.json.');
  const appGroup = props.appGroup ?? `group.${bundleId}`;

  config = withEntitlementsPlist(config, (mod) => {
    const groups = new Set(mod.modResults['com.apple.security.application-groups'] ?? []);
    groups.add(appGroup);
    mod.modResults['com.apple.security.application-groups'] = [...groups];
    return mod;
  });

  // The native queue reads the group name from here, so it is stated once.
  config = withInfoPlist(config, (mod) => {
    mod.modResults.NafaqatiAppGroup = appGroup;
    return mod;
  });

  config = withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const { platformProjectRoot, projectName } = mod.modRequest;
    const targetDir = path.join(platformProjectRoot, projectName);
    fs.mkdirSync(targetDir, { recursive: true });

    fs.copyFileSync(path.join(__dirname, 'ios', INTENTS_FILE), path.join(targetDir, INTENTS_FILE));
    fs.writeFileSync(path.join(targetDir, CATALOG_FILE), catalog());

    const sourcePath = `${projectName}/${INTENTS_FILE}`;
    const resourcePath = `${projectName}/${CATALOG_FILE}`;
    if (!project.hasFile(sourcePath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: sourcePath, groupName: projectName, project });
    }
    if (!project.hasFile(resourcePath)) {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: resourcePath,
        groupName: projectName,
        isBuildFile: true,
        project,
      });
    }
    return mod;
  });

  return config;
};
