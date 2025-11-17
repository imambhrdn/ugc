# AI Content Generation Platform

A modern Next.js application for generating AI content (text, images, and videos) with credit-based usage system, built with TypeScript, Clerk authentication, and Supabase database.

## Features

- **AI Generation**: Generate text, images, and videos using external AI APIs
- **Credit System**: Users have a credit balance that gets deducted with each generation
- **User Authentication**: Secure authentication with Clerk
- **History Tracking**: View and manage your generation history
- **Real-time Status**: Asynchronous processing with polling for job status
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js (App Router)
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **APIs**: Kie.ai for AI processing
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and add your credentials:
   ```bash
   cp .env.example .env.local
   ```
   
   Then update the following variables in the `.env.local` file:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
   - `CLERK_SECRET_KEY` - Your Clerk secret key
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `SUPABASE_SERVICE_KEY` - Your Supabase service role key
   - `KIE_API_KEY` - Your Kie.ai API key
   - `CLERK_WEBHOOK_SECRET` - Your Clerk webhook secret
   - `LOGGING_ENABLED` - Enable/disable logging (default: true)
   - `LOGGING_LEVEL` - Log level (debug, info, warn, error) (default: info)
   - `EXTERNAL_LOGGING_ENABLED` - Enable external logging (default: false)
   - `LOGGING_WEBHOOK_URL` - Webhook URL for external logging
   - `SENTRY_DSN` - Sentry DSN for error tracking (optional)
   - `LOGROCKET_APP_ID` - LogRocket App ID for session recording (optional)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema Setup

Run these SQL commands in your Supabase SQL editor to set up the required tables:

```sql
-- Create custom ENUM types
CREATE TYPE public.generation_type AS ENUM ('text_to_prompt', 'image', 'video');
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create profiles table
CREATE TABLE public.profiles (
    clerk_id TEXT NOT NULL PRIMARY KEY,
    email TEXT,
    credits INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create generations table
CREATE TABLE public.generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    type public.generation_type NOT NULL,
    status public.job_status NOT NULL DEFAULT 'pending',
    job_id_external TEXT,
    result_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_generations_user_id ON public.generations(user_id);

-- Ensure Row Level Security is disabled for these tables or properly configured
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE generations DISABLE ROW LEVEL SECURITY;
```

## Deployment

### Vercel (Recommended)

The easiest way to deploy this application is to use Vercel:

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com) and sign in
3. Import your GitHub repository
4. Vercel will automatically detect it's a Next.js app and configure the build settings
5. Add your environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `KIE_API_KEY`
   - `CLERK_WEBHOOK_SECRET`
6. Deploy!

### Webhook Configuration

After deploying, you need to configure Clerk webhooks to point to your deployed URL:
- Go to your Clerk Dashboard
- Navigate to Webhooks
- Add a new webhook with the URL: `https://<your-domain>/api/webhooks/clerk`
- Select the event: `user.created`
- Copy the webhook signing secret to your `CLERK_WEBHOOK_SECRET` environment variable

## API Endpoints

- `POST /api/generate` - Start a new AI generation job
- `GET /api/status/[jobId]` - Check the status of a generation job
- `POST /api/webhooks/clerk` - Handle Clerk user creation events

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Protected routes
│   │   ├── dashboard/      # Main dashboard
│   │   └── history/        # Generation history
│   ├── (auth)/             # Public auth routes
│   │   ├── sign-in/
│   │   └── sign-up/
│   └── api/                # API routes
│       ├── generate/
│       ├── status/
│       └── webhooks/
├── components/             # React components
│   ├── features/           # Feature-specific components
│   ├── shared/             # Shared components
│   └── ui/                 # UI components (shadcn)
└── lib/                    # Utility functions and types
```

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.