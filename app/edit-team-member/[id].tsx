import { useLocalSearchParams } from 'expo-router';
import EditTeamMemberScreen from '../../src/screens/EditTeamMemberScreen';

export default function EditTeamMember() {
  const { id } = useLocalSearchParams();
  return <EditTeamMemberScreen memberId={id as string} />;
} 
 
 
 
 
 