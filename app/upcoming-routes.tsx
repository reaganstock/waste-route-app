import { View } from 'react-native';
import { useRouter } from 'expo-router';
import UpcomingRoutesScreen from '../src/screens/UpcomingRoutesScreen';

export default function UpcomingRoutes() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <UpcomingRoutesScreen 
        navigation={{
          goBack: () => router.back()
        }}
      />
    </View>
  );
} 