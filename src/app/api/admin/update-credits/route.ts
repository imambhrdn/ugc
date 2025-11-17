import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase-server';
import { checkAdminAccess } from '@/lib/admin-utils';

export async function POST(req: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, userId } = await checkAdminAccess();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const { userId: targetUserId, credits } = await req.json();

    // Validate inputs
    if (!targetUserId || credits === undefined) {
      return NextResponse.json({ error: 'User ID and credits are required' }, { status: 400 });
    }

    // Validate credits amount
    if (typeof credits !== 'number' || credits < 0) {
      return NextResponse.json({ error: 'Credits must be a non-negative number' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createServiceClient();

    // Update user credits
    const { error } = await supabase
      .from('profiles')
      .update({ credits })
      .eq('clerk_id', targetUserId);

    if (error) {
      console.error('Error updating credits:', error);
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Credits updated successfully' });
  } catch (error) {
    console.error('Error in admin update credits API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}