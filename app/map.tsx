import { View } from 'react-native';
import { useRouter } from 'expo-router';
import MapScreen from '../src/screens/MapScreen';

export default function Map() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <MapScreen 
        navigation={{
          goBack: () => router.back(),
          navigate: (screen: string, params?: any) => {
            if (screen === 'Route') {
              router.push(`/route/${params.routeId}`);
            } else {
              router.push(screen.toLowerCase());
            }
          }
        }} 
      />
    </View>
  );
} 