import { Redirect } from 'expo-router';

/** App entry — start at the login screen. */
export default function Index() {
  return <Redirect href="/login" />;
}
