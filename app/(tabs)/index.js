import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to routes tab
  return <Redirect href="/(tabs)/routes" />;
} 