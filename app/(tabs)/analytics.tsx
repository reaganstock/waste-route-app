import { View } from 'react-native';
import { useRouter } from 'expo-router';
import AnalyticsScreen from '../../src/screens/AnalyticsScreen';

export default function Analytics() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <AnalyticsScreen 
        navigation={{
          navigate: (screen: string, params?: any) => {
            router.push(screen.toLowerCase());
          }
        }} 
      />
    </View>
  );
} 