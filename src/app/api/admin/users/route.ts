import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase-server';
import { checkAdminAccess } from '@/lib/admin-utils';

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, userId } = await checkAdminAccess();

    console.log('Admin API - userId:', userId);
    console.log('Admin API - isAdmin:', isAdmin);

    if (!userId) {
      console.log('Admin API - No userId found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      console.log('Admin API - User is not admin, returning 403');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('Admin API - Access granted, fetching users');

    // Create Supabase client
    const supabase = createServiceClient();

    // Get all users with their credit counts
    const { data: users, error } = await supabase
      .from('profiles')
      .select('clerk_id, credits, email')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get user details for each profile
    const usersWithDetails = users.map((user) => {
      return {
        id: user.clerk_id,
        credits: user.credits,
        email: user.email,
      };
    });

    return NextResponse.json(usersWithDetails);
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}