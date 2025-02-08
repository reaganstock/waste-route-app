import { View } from 'react-native';
import { useRouter } from 'expo-router';
import SettingsScreen from '../src/screens/SettingsScreen';

export default function SettingsPage() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <SettingsScreen 
        navigation={{
          goBack: () => router.back(),
          navigate: (screen: string) => {
            if (screen === 'index') {
              router.replace('/(tabs)');
            } else if (screen.startsWith('/')) {
              router.push(screen);
            } else {
              router.push(`/${screen.toLowerCase()}`);
            }
          },
          replace: (screen: string) => {
            if (screen === 'index') {
              router.replace('/(tabs)');
            } else if (screen.startsWith('/')) {
              router.replace(screen);
            } else {
              router.replace(`/${screen.toLowerCase()}`);
            }
          }
        }} 
      />
    </View>
  );
} 