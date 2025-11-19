'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { CreditBalance } from '@/components/shared/credit-balance';
import Link from 'next/link';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              AI UGC Generator
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/dashboard" className="font-medium">
                Dashboard
              </Link>
              <Link href="/history" className="font-medium">
                History
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <CreditBalance />
            <UserButton />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}