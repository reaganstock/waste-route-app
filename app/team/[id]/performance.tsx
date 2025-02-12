import PerformanceScreen from '../../../src/screens/PerformanceScreen';
import { useLocalSearchParams } from 'expo-router';

export default function Page() {
  const { id } = useLocalSearchParams();
  return <PerformanceScreen memberId={id as string} />;
} 