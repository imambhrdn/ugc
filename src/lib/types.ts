// Type definitions for the application

export type GenerationType = 'text_to_prompt' | 'image' | 'video';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Profile {
  clerk_id: string;
  email: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;           // UUID internal
  user_id: string;      // References profiles.clerk_id
  prompt: string;
  type: GenerationType;
  status: JobStatus;
  job_id_external?: string; // ID from Kie.ai
  result_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}