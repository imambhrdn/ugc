import { createServiceClient } from '@/lib/supabase-server';
import { currentUser } from '@clerk/nextjs/server';

export async function getCreditBalance(userId: string) {
  const supabase = createServiceClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('clerk_id', userId)
    .single();

  if (error) {
    console.error('Error fetching credit balance:', error);
    return 0;
  }

  return data?.credits || 0;
}