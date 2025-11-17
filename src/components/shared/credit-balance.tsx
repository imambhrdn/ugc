'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export function CreditBalance() {
  const { user } = useUser();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
      if (user) {
        try {
          const response = await fetch('/api/user/credits');
          if (response.ok) {
            const data = await response.json();
            setCredits(data.credits || 0);
          }
        } catch (error) {
          console.error('Error fetching credits:', error);
          setCredits(0);
        }
      }
    };

    fetchCredits();
  }, [user]);

  if (credits === null) {
    return <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
      <span>Credits:</span>
      <span className="font-semibold">{credits}</span>
    </div>
  );
}