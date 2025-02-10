import { View } from 'react-native';
import { useRouter } from 'expo-router';
import TeamScreen from '../../src/screens/TeamScreen';

export default function Team() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <TeamScreen />
    </View>
  );
} 