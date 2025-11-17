import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authObject = await auth();
    const { userId } = authObject;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's credit balance from Supabase
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('clerk_id', userId)
      .single();

    if (error) {
      console.error('Error fetching credits:', error);
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    return NextResponse.json({ credits: data?.credits || 0 });
  } catch (error) {
    console.error('Error in credits API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}