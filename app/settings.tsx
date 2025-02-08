import { View } from 'react-native';
import { useRouter } from 'expo-router';
import SettingsScreen from '../src/screens/SettingsScreen';

export default function Settings() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <SettingsScreen 
        navigation={{
          goBack: () => router.back(),
          replace: (screen: string) => router.replace(screen),
          navigate: (screen: string) => {
            if (screen === 'EditProfile') {
              router.push('/profile/edit');
            } else if (screen === 'Help') {
              router.push('/help');
            } else if (screen === 'ContactSupport') {
              router.push('/support');
            } else if (screen === 'PrivacyPolicy') {
              router.push('/privacy');
            } else {
              router.push(screen.toLowerCase());
            }
          }
        }} 
      />
    </View>
  );
} 