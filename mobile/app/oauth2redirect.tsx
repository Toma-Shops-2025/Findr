import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/** Android Google OAuth return path (see app.json intent filter). */
export default function GoogleOAuth2Redirect() {
  return <Redirect href="/(auth)/login" />;
}
