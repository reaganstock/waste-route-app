import { View } from 'react-native';
import { useRouter } from 'expo-router';
import LoginScreen from '../../src/screens/LoginScreen';

export default function Login() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <LoginScreen 
        navigation={{
          navigate: (screen: string) => {
            if (screen === 'signup') {
              router.push('/(auth)/signup');
            } else if (screen === 'forgot-password') {
              router.push('/(auth)/forgot-password');
            }
          },
          replace: (screen: string) => router.replace('/(tabs)')
        }} 
      />
    </View>
  );
} 