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
              router.push('/signup' as any);
            } else if (screen === 'forgot-password') {
              router.push('/forgot-password' as any);
            }
          },
          replace: (screen: string) => {
            // When logging in, redirect to the tabs layout
            router.replace('/(tabs)' as any);
          }
        }} 
      />
    </View>
  );
} 