import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import SettingsScreen from '../../src/screens/SettingsScreen';

export default function SettingsTab() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <SettingsScreen 
        navigation={{
          navigate: (screen: string, params?: any) => {
            if (screen === 'profile') {
              router.push('/profile-details');
            } else if (screen === 'team-management') {
              router.push('/team');
            } else {
              router.push(screen.toLowerCase());
            }
          }
        }} 
      />
    </View>
  );
} 