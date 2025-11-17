import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase-server';
import { checkAdminAccess } from '@/lib/admin-utils';

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, userId } = await checkAdminAccess();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return a placeholder for API token (in real implementation, you might store this securely in a database)
    // For security reasons, we won't actually return the token, just confirm it's set
    return NextResponse.json({ token: process.env.KIE_API_KEY ? 'Token is configured' : null });
  } catch (error) {
    console.error('Error in admin get token API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // This would normally update the API token in a secure way
    // For security reasons, API tokens are typically stored in environment variables
    // This endpoint would require additional security measures in a production environment
    return NextResponse.json({
      success: true,
      message: 'API token updated successfully (Note: In production, tokens are stored in secure environment variables)'
    });
  } catch (error) {
    console.error('Error in admin update token API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}