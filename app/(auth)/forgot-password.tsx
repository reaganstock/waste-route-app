import { View } from 'react-native';
import { useRouter } from 'expo-router';
import ForgotPasswordScreen from '../../src/screens/ForgotPasswordScreen';

export default function ForgotPassword() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <ForgotPasswordScreen />
    </View>
  );
} 
 
 