import { View } from 'react-native';
import { useRouter } from 'expo-router';
import SignupScreen from '../../src/screens/SignupScreen';

export default function Signup() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <SignupScreen 
        navigation={{
          goBack: () => router.back(),
          replace: (screen: string) => router.replace('/(tabs)')
        }} 
      />
    </View>
  );
} 