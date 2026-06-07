# Hotel Manager

A cross-platform hotel management system built with TanStack Start, React, and Supabase.

## Features

- **Multi-Role Support**: Waiter, Counter, and Kitchen interfaces
- **Real-time Updates**: Powered by Supabase real-time subscriptions
- **Tablet-Friendly Design**: Optimized for tablet devices
- **Cross-Platform**: Runs on Web, Android, iOS, Windows, macOS, and Linux

## Quick Start

### Web Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Cross-Platform Builds

This app supports building for multiple platforms. For detailed instructions on building for Android, iOS, Windows, macOS, and Linux, see [CROSS_PLATFORM_BUILD.md](./CROSS_PLATFORM_BUILD.md).

#### Quick Commands

**Mobile (Capacitor):**
```bash
npm run cap:sync        # Sync web build to mobile
npm run cap:android     # Open Android Studio
npm run cap:ios         # Open Xcode (macOS only)
```

**Desktop (Electron):**
```bash
npm run electron:dev    # Development mode
npm run electron:build  # Build for current platform
npm run electron:build:win   # Build for Windows
npm run electron:build:mac   # Build for macOS
npm run electron:build:linux # Build for Linux
```

## Tech Stack

- **Framework**: TanStack Start (React SSR)
- **UI**: Radix UI + Tailwind CSS
- **Backend**: Supabase
- **Build Tool**: Vite
- **Mobile**: Capacitor
- **Desktop**: Electron

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

electron/             # Electron desktop app files
capacitor.config.ts  # Capacitor mobile configuration
```

## Development

### Running the Web App

```bash
npm run dev
```

### Running Electron Desktop App

```bash
npm run electron:dev
```

### Running on Mobile

1. Build the web app: `npm run build`
2. Sync to Capacitor: `npm run cap:sync`
3. Open platform: `npm run cap:android` or `npm run cap:ios`

## Deployment

### Web Deployment

The app is configured for Cloudflare Workers deployment:

```bash
npm run build
npx wrangler deploy
```

### Mobile App Stores

See [CROSS_PLATFORM_BUILD.md](./CROSS_PLATFORM_BUILD.md) for detailed instructions on publishing to Google Play and Apple App Store.

### Desktop Distribution

Desktop builds are generated in the `release/` directory after running electron build commands.

## License

Private project
