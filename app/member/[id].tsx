import { useLocalSearchParams } from 'expo-router';
import TeamMemberDetailsScreen from '../../src/screens/TeamMemberDetailsScreen';

export default function MemberDetails() {
  const { id } = useLocalSearchParams();
  return <TeamMemberDetailsScreen memberId={id as string} />;
} 
 
 
 