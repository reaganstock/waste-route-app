import { View } from 'react-native';
import { useRouter } from 'expo-router';
import RouteCreateScreen from '../src/screens/RouteCreateScreen';

export default function RouteCreate() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <RouteCreateScreen 
        navigation={{
          goBack: () => router.back(),
          replace: (screen: string) => {
            if (screen.startsWith('route/')) {
              router.replace(screen);
            } else {
              router.replace('/(tabs)');
            }
          }
        }} 
      />
    </View>
  );
} 