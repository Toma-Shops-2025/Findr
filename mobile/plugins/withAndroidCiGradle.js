const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Stabilize EAS local / GitHub Actions release builds on 7GB runners:
 * more heap for Gradle and skip release lint (lint OOM on expo-modules-core).
 */
module.exports = function withAndroidCiGradle(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    const setProp = (key, value) => {
      const idx = props.findIndex((p) => p.type === 'property' && p.key === key);
      const entry = { type: 'property', key, value };
      if (idx >= 0) props[idx] = entry;
      else props.push(entry);
    };

    setProp(
      'org.gradle.jvmargs',
      '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8',
    );
    setProp('org.gradle.workers.max', '2');
    setProp('android.lint.checkReleaseBuilds', 'false');

    return config;
  });
};
