import { View } from 'react-native';
import { useRouter } from 'expo-router';
import SettingsScreen from '../../src/screens/SettingsScreen';

export default function TabSettings() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <SettingsScreen 
        navigation={{
          goBack: () => router.back(),
          navigate: (screen: string) => router.push(`/${screen.toLowerCase()}`),
          replace: (screen: string) => router.replace(`/${screen.toLowerCase()}`)
        }}
      />
    </View>
  );
} 