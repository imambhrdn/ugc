'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Generation, JobStatus } from '@/lib/types';

export default function HistoryPage() {
  const { user } = useUser();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGenerations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch user's generations from API
      const response = await fetch('/api/user/generations');
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
      }
    } catch (error) {
      console.error('Error fetching generations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user]);

  const getStatusBadge = (status: JobStatus) => {
    let className = 'px-2 py-1 rounded-full text-xs font-medium ';
    
    switch (status) {
      case 'pending':
        className += 'bg-yellow-100 text-yellow-800';
        break;
      case 'processing':
        className += 'bg-blue-100 text-blue-800';
        break;
      case 'completed':
        className += 'bg-green-100 text-green-800';
        break;
      case 'failed':
        className += 'bg-red-100 text-red-800';
        break;
      default:
        className += 'bg-gray-100 text-gray-800';
    }

    return <span className={className}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text_to_prompt':
        return 'Text Enhancement';
      case 'image':
        return 'Image Generation';
      case 'video':
        return 'Video Generation';
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Generation History</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : generations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No generation history yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Your AI generations will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generations.map((gen) => (
              <div key={gen.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium truncate max-w-[70%]">{gen.prompt.substring(0, 50)}{gen.prompt.length > 50 ? '...' : ''}</h3>
                  {getStatusBadge(gen.status)}
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">{getTypeLabel(gen.type)}</p>
                
                <p className="text-xs text-muted-foreground mb-3">
                  {new Date(gen.created_at).toLocaleString()}
                </p>
                
                {gen.result_url && (
                  <div className="mt-3">
                    {gen.type === 'image' ? (
                      <a 
                        href={gen.result_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={gen.result_url} 
                          alt="Generated content" 
                          className="w-full h-40 object-cover rounded-md"
                        />
                      </a>
                    ) : gen.type === 'video' ? (
                      <video 
                        src={gen.result_url} 
                        controls 
                        className="w-full h-40 object-cover rounded-md"
                      />
                    ) : (
                      <div className="bg-muted p-3 rounded-md text-sm">
                        {gen.result_url.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                )}
                
                {gen.error_message && (
                  <div className="mt-2 text-xs text-red-500">
                    Error: {gen.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}