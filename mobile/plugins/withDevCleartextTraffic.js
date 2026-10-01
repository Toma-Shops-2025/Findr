/**
 * Dev/sideload: allow HTTP cleartext so the app can call a LAN API
 * (e.g. EXPO_PUBLIC_API_URL=http://192.168.1.226:4000).
 *
 * Play Store / production releases should use HTTPS and remove this plugin
 * (or gate it behind a __DEV__/env check). Cleartext on the open internet
 * is not acceptable for a shipping dating app.
 */
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<!-- DEV / local sideload only: cleartext for LAN HTTP API.
     For Play Store, serve the API over HTTPS and delete this file + plugin. -->
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

function withNetworkSecurityConfigXml(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const resXml = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      fs.mkdirSync(resXml, { recursive: true });
      fs.writeFileSync(
        path.join(resXml, 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG,
        'utf8'
      );
      return cfg;
    },
  ]);
}

function withCleartextManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$ = app.$ || {};
    // Belt-and-suspenders with app.json android.usesCleartextTraffic
    app.$['android:usesCleartextTraffic'] = 'true';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
}

module.exports = function withDevCleartextTraffic(config) {
  config = withNetworkSecurityConfigXml(config);
  config = withCleartextManifest(config);
  return config;
};
