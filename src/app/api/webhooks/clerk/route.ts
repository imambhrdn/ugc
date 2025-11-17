import { Webhook, type WebhookRequiredHeaders } from 'svix';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set');
  }

  // Get the headers
  const headers: WebhookRequiredHeaders = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  };

  // Get the body
  const payload = await req.json();

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: {
    data: {
      id: string;
      email_address: string;
      first_name: string;
      last_name: string;
    };
    type: string;
  };

  // Verify the payload with the headers
  try {
    evt = wh.verify(JSON.stringify(payload), headers) as typeof evt;
  } catch (err) {
    console.error('Webhook verification error:', err);
    return NextResponse.json({ error: 'Webhook verification error' }, { status: 400 });
  }

  // Handle different event types
  const { id, email_address, first_name, last_name } = evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const supabase = createServiceClient();

    // Create a new user profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          clerk_id: id,
          email: email_address,
          first_name: first_name,
          last_name: last_name,
          credits: 10, // Give new users 10 free credits
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error creating user profile:', error);
      return NextResponse.json({ error: 'Error creating user profile' }, { status: 500 });
    }

    console.log('User profile created successfully for clerk_id:', id);

    return NextResponse.json({ message: 'User profile created successfully' });
  } else if (eventType === 'user.updated') {
    const supabase = createServiceClient();

    // Update the user profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        email: email_address,
        first_name: first_name,
        last_name: last_name,
      })
      .eq('clerk_id', id);

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json({ error: 'Error updating user profile' }, { status: 500 });
    }

    console.log('User profile updated successfully for clerk_id:', id);

    return NextResponse.json({ message: 'User profile updated successfully' });
  } else if (eventType === 'user.deleted') {
    const supabase = createServiceClient();

    // Delete the user profile from Supabase
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('clerk_id', id);

    if (error) {
      console.error('Error deleting user profile:', error);
      return NextResponse.json({ error: 'Error deleting user profile' }, { status: 500 });
    }

    console.log('User profile deleted successfully for clerk_id:', id);

    return NextResponse.json({ message: 'User profile deleted successfully' });
  }

  return NextResponse.json({ message: 'Webhook processed successfully' });
}