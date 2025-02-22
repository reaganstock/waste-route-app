import { View } from 'react-native';
import { useRouter } from 'expo-router';
import ActiveRoutesScreen from '../src/screens/ActiveRoutesScreen';

export default function ActiveRoutes() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <ActiveRoutesScreen 
        navigation={{
          goBack: () => router.back()
        }}
      />
    </View>
  );
} 