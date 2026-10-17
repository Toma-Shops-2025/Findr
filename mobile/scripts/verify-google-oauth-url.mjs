import { getQueryParams } from 'expo-auth-session/build/QueryParams.js';

const androidReturn =
  'com.googleusercontent.apps.155868445533-768bbg1kd7mrtuqlgd7kmbmdji79sr7m:/oauth2redirect?code=test_auth_code';

const { params } = getQueryParams(androidReturn);
if (params.code !== 'test_auth_code') {
  console.error('FAIL: expected code in Android redirect URL');
  process.exit(1);
}

console.log('OK: Google OAuth redirect URL parses auth code');
