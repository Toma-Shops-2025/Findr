/**
 * Splash-crash v2: block native autolinking for unused Reanimated / Worklets.
 *
 * expo-router lists react-native-reanimated as an *optional* peer, but npm still
 * installs it (and worklets) via react-native-drawer-layout / @expo/ui /
 * expo-modules-core. Autolink would still load those native libs on cold start
 * even with zero JS imports — a known New-Arch launch crash surface.
 *
 * Do not re-enable until a screen actually needs Reanimated animations.
 */
module.exports = {
  dependencies: {
    'react-native-reanimated': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    'react-native-worklets': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    'expo-alternate-app-icons': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
