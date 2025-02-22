import { View } from 'react-native';
import { useRouter } from 'expo-router';
import VerifyScreen from '../../src/screens/VerifyScreen';

export default function Verify() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <VerifyScreen 
        navigation={{
          goBack: () => router.back(),
          replace: (screen: string) => {
            // After successful verification, go to main app
            router.replace('/(tabs)');
          }
        }} 
      />
    </View>
  );
} 