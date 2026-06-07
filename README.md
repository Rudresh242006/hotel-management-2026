# Hotel Manager

A hotel management system built with TanStack Start, React, and Supabase.

## Features

- **Multi-Role Support**: Waiter, Counter, and Kitchen interfaces
- **Real-time Updates**: Powered by Supabase real-time subscriptions
- **Tablet-Friendly Design**: Optimized for tablet devices
- **Half Plate Support**: Track and display half orders separately

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- **Framework**: TanStack Start (React SSR)
- **UI**: Radix UI + Tailwind CSS
- **Backend**: Supabase
- **Build Tool**: Vite

## Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

## Project Structure

```
src/
├── components/       # React components
├── hooks/           # Custom React hooks
├── integrations/    # Third-party integrations (Supabase)
├── lib/             # Utility functions
├── routes/          # TanStack Router routes
├── router.tsx       # Router configuration
├── server.ts        # SSR server entry
└── start.ts         # TanStack Start configuration
```

## Development

```bash
npm run dev
```

## Deployment

### Cloudflare Workers Deployment (Recommended)

This project uses TanStack Start and is configured for Cloudflare Workers deployment.

**First-time setup:**
```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

**Deploy to Cloudflare:**
```bash
# Build and deploy in one command
npm run deploy

# Or separately:
npm run build
npx wrangler deploy
```

**Environment variables:**
Add your Supabase credentials to Cloudflare:
```bash
wrangler secret put VITE_SUPABASE_URL
wrangler secret put VITE_SUPABASE_PUBLISHABLE_KEY
```

Your app will be deployed at: `https://hotel-manager.YOUR_SUBDOMAIN.workers.dev`

## Database Setup

Run the SQL script in `SUPABASE_SETUP.sql` in your Supabase SQL Editor to set up the database schema.

## License

Private project
