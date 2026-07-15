# Self-Hosting Guide for Sinia Events (Radius)

Sinia Events is a full-stack Next.js application designed to be deployed anywhere that supports Node.js or Docker. It uses Supabase for its backend (PostgreSQL + Auth + Storage).

## Prerequisites
1. **Supabase Project:** You will need a Supabase project. You can sign up at [supabase.com](https://supabase.com) and create a free project, or self-host Supabase.
2. **Environment Variables:** You will need the API keys from your Supabase dashboard (Project Settings > API).

## 1. Supabase Setup
Run the SQL migrations located in `supabase/migrations` on your Supabase database using the SQL Editor in the dashboard.
Make sure to execute them in order, or use the Supabase CLI:
```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

## 2. Environment Configuration
Create a `.env.local` file (or set these in your hosting provider):
```env
# Required Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Twilio WhatsApp
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
SMS_WEBHOOK_SECRET=your-secret-here

# Optional: Cron
CRON_SECRET=your-cron-secret

# Optional: Resend (Email)
RESEND_API_KEY=
```

## 3. Deploying with Docker
The easiest way to self-host is using Docker. We provide a `Dockerfile` and `docker-compose.yml`.

First, ensure you have updated the `next.config.mjs` to enable standalone output:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};
export default nextConfig;
```

Then build and run the Docker container:
```bash
# Create your .env file
cp .env.example .env

# Run via Docker Compose
docker-compose up -d
```

Your app will be available on port `3000`.

## 4. Deploying to Vercel
Sinia Events is optimized for Vercel. 
1. Push your code to a GitHub repository.
2. Import the repository in Vercel.
3. Add the Environment Variables.
4. Deploy!

## Customization
To customize the admin allowlist, insert rows into the `staff_allowlist` table in your Supabase database containing the emails of your team members.
