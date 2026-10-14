import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/** findr://oauthredirect (non-Android Google / dev). */
export default function GoogleOAuthRedirect() {
  return <Redirect href="/(auth)/login" />;
}
