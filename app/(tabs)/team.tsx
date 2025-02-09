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
      <TeamScreen 
        navigation={{
          navigate: (screen: string, params?: any) => {
            if (screen === 'MemberDetail') {
              router.push(`/member/${params.memberId}`);
            } else if (screen === 'AddMember') {
              router.push('/member/new');
            } else {
              router.push(screen.toLowerCase());
            }
          }
        }} 
      />
    </View>
  );
} 