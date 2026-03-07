# HMR Performance Optimization Guide

## Issue
WebSocket connection to `/_next/webpack-hmr` was stalling for ~10 seconds during Hot Module Replacement.

## Applied Optimizations

### 1. Next.js Configuration (next.config.ts)
```typescript
const nextConfig: NextConfig = {
  // Disable strict mode to prevent double-rendering in development
  reactStrictMode: false,
  
  experimental: {
    // Optimize package imports for faster bundling
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  
  webpack: (config) => {
    // Optimize file watching for faster HMR
    config.watchOptions = {
      poll: 1000, // Check for changes every second
      aggregateTimeout: 300, // Wait 300ms after change before rebuilding
      ignored: /node_modules/, // Don't watch node_modules
    };
    return config;
  },
};
```

### 2. Removed Debug Console.logs
- **useAuth.tsx**: Removed 5 console.log statements that fired on every auth check
- **Sidebar.tsx**: Removed 2 console.log statements (component renders on every page)
- **layout.tsx (dashboard)**: Removed 3 console.log statements from profile click handler

These logs were slowing down initialization and creating unnecessary overhead during HMR.

### 3. Files Still With Console.logs (Non-Critical)
The following files still have console.logs but they only fire on user actions:
- `EditReferenceModal.tsx` (line 104) - fires when user updates a reference
- `AddReferenceModal.tsx` (line 237) - fires when user adds a reference
- `auth/callback/page.tsx` (lines 12, 39) - fires during auth callback only

## Expected Results
- Faster HMR WebSocket connection (< 2 seconds)
- Reduced memory overhead during development
- Smoother file-save-to-browser-update cycle

## To Test
1. Restart your development server: `npm run dev`
2. Make a small change to any file and save
3. Check browser network tab for `/_next/webpack-hmr` timing
4. Connection should establish within 1-2 seconds

## Additional Optimizations (If Still Slow)

### Option 1: Lazy Load Realtime Subscriptions
If HMR is still slow, consider lazy-loading Supabase realtime subscriptions:
```typescript
// Only connect when component is visible/focused
useEffect(() => {
  if (document.visibilityState === 'visible') {
    // Setup realtime subscriptions
  }
}, [document.visibilityState]);
```

### Option 2: Enable Turbopack (Experimental)
Add to package.json scripts:
```json
"dev": "next dev --turbo"
```

### Option 3: Reduce Auth Checks
Skip profile completion check during fast refresh:
```typescript
if (process.env.NODE_ENV === 'development' && window.performance.navigation.type === 1) {
  // Skip heavy checks during HMR
}
```

## Files Modified
- ✅ `next.config.ts` - Added webpack optimizations
- ✅ `src/hooks/useAuth.tsx` - Removed debug logs
- ✅ `src/components/navigation/Sidebar.tsx` - Removed render logs
- ✅ `src/app/(dashboard)/layout.tsx` - Removed click handler logs
