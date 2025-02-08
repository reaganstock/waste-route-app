import { View } from 'react-native';
import { useRouter } from 'expo-router';
import LoginScreen from '../src/screens/LoginScreen';

export default function Index() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <LoginScreen 
        navigation={{
          navigate: (screen: string) => router.push(`/(auth)/${screen}`),
          replace: (screen: string) => router.replace(`/(tabs)`)
        }} 
      />
    </View>
  );
} 