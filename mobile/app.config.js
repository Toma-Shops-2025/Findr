const fs = require('node:fs');
const path = require('node:path');

const appJson = require('./app.json');

const googleServicesPath = path.join(__dirname, 'google-services.json');
const fromEnv = process.env.GOOGLE_SERVICES_JSON?.trim();

if (fromEnv) {
  fs.writeFileSync(googleServicesPath, fromEnv, 'utf8');
} else if (!fs.existsSync(googleServicesPath)) {
  console.warn(
    'Findr: mobile/google-services.json is missing. Copy from Firebase or set GOOGLE_SERVICES_JSON for CI/EAS builds.',
  );
}

module.exports = appJson;
