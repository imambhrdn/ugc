import { auth } from '@clerk/nextjs/server';

export interface AdminUser {
  id: string;
  email?: string; // Make email optional since it might not always be available
}

// Check if user is admin - you can customize this function based on your admin identification method
export function isAdminUser(user: AdminUser): boolean {
  // For now, check if user email matches known admin emails OR if user ID matches known admin IDs
  // In a production app, you would likely use Clerk's role system or custom attributes
  const adminEmails = [
    '16.12.kebonsari.pilkada24@gmail.com', // Admin email
    process.env.ADMIN_EMAIL || '', // Additional admin email from environment variable
    // Add more admin emails as needed
  ].filter(email => email !== ''); // Remove empty strings

  // Admin user IDs - you can add the specific Clerk user ID here
  const adminUserIds = [
    'user_35TGDzP669w9TTTkuGa0yFfI2QM', // Your specific user ID from Clerk
    process.env.ADMIN_USER_ID || '', // Add admin user ID from environment variable if available
    // Add specific user IDs like 'user_abc123' directly here if needed
  ].filter(id => id !== ''); // Remove empty strings

  // First check if user ID is in admin list (this will work even without email)
  if (adminUserIds.includes(user.id)) {
    return true;
  }

  // If we have an email, also check against the email list
  if (user.email) {
    return adminEmails.includes(user.email);
  } else {
    // If no email available, return false (unless user ID matched)
    return false;
  }
}

// Helper function to check admin status for API routes
export async function checkAdminAccess(): Promise<{isAdmin: boolean, userId: string | null}> {
  const authObject = await auth();
  const { userId, sessionClaims } = authObject;

  if (!userId) {
    return { isAdmin: false, userId: null };
  }

  // Try to get email from sessionClaims
  const email = sessionClaims?.email || '';

  const user = {
    id: userId,
    email: email
  } as AdminUser;

  const isAdmin = isAdminUser(user);

  return {
    isAdmin: isAdmin,
    userId: userId
  };
}