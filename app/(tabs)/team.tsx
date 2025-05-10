import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import TeamScreen from '../../src/screens/TeamScreen';

export default function TeamTab() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1 }}>
      <TeamScreen 
        navigation={{
          navigate: (screen: string, params?: any) => {
            if (screen === 'TeamMemberDetails') {
              router.push(`/team-member-details/${params.id}`);
            } else if (screen === 'AddTeamMember') {
              router.push('/add-team-member');
            } else {
              router.push(screen.toLowerCase());
            }
          }
        }} 
      />
    </View>
  );
} 