import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase-server';
import { Generation } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authObject = await auth();
    const { userId } = authObject;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's generations from Supabase
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching generations:', error);
      return NextResponse.json({ error: 'Failed to fetch generations' }, { status: 500 });
    }

    return NextResponse.json({ generations: data as Generation[] || [] });
  } catch (error) {
    console.error('Error in generations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}