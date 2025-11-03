# Vercel Deployment Guide for Afri Estate

This guide will help you deploy your Expo Router app to Vercel successfully.

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
3. **Node.js**: Version 18 or higher

## Setup Steps

### 1. Ensure Your Project is Ready

The following files have been configured:
- ✅ `vercel.json` - Vercel configuration
- ✅ `package.json` - Build script added (`build:web`)
- ✅ `app.config.js` - Web configuration

### 2. Connect Your Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Vercel will auto-detect the settings from `vercel.json`

### 3. Configure Environment Variables

In Vercel project settings, add your environment variables:

**Required Variables:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` (or `EXPO_PUBLIC_API_BASE_URL`)
- Any other `EXPO_PUBLIC_*` variables you use

**Steps:**
1. Go to **Project Settings** → **Environment Variables**
2. Add each variable for **Production**, **Preview**, and **Development**
3. Click **Save**

### 4. Deploy

1. **Automatic Deployment**: Push to your main branch - Vercel will deploy automatically
2. **Manual Deployment**: 
   ```bash
   vercel --prod
   ```

## Troubleshooting

### Issue: 404 Errors

**Solution:** The `vercel.json` file includes rewrite rules to handle client-side routing. Make sure:
- ✅ `vercel.json` is in the root directory
- ✅ Output directory is set to `dist`
- ✅ Build command is `npm run build:web`

### Issue: Build Fails

**Common Causes:**
1. **Missing Dependencies**: Ensure all dependencies are in `package.json`
2. **Environment Variables**: Make sure all required env vars are set in Vercel
3. **Node Version**: Vercel uses Node 18+ by default (should be fine)

**Check Build Logs:**
- Go to Vercel Dashboard → Your Project → Deployments → Click on failed deployment
- Review the build logs for specific errors

### Issue: Assets Not Loading

**Solution:** The `vercel.json` includes cache headers for static assets. If assets still don't load:
1. Check that `dist/_expo/static` and `dist/assets` directories exist after build
2. Verify file paths in your code use relative paths, not absolute paths

### Issue: Routing Not Working

**Solution:** The rewrite rule in `vercel.json` should handle this:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

If still not working, check:
- Expo Router is properly configured
- No server-side rendering conflicts
- All routes are client-side routes

## Manual Build Test

Test the build locally before deploying:

```bash
# Install dependencies
npm install

# Build for web
npm run build:web

# Check the output
ls -la dist/
```

You should see:
- `index.html`
- `_expo/` directory
- `assets/` directory

## Deployment Settings

In Vercel Dashboard → Project Settings → General:

- **Framework Preset**: Leave as "Other" or "None"
- **Root Directory**: Leave empty (or set if your app is in a subdirectory)
- **Build Command**: `npm run build:web` (already in vercel.json)
- **Output Directory**: `dist` (already in vercel.json)
- **Install Command**: `npm install` (already in vercel.json)

## Post-Deployment

After successful deployment:

1. **Test Your App**: Visit your Vercel URL
2. **Check Routes**: Test different routes to ensure routing works
3. **Test Features**: Verify authentication, API calls, etc.
4. **Check Console**: Open browser DevTools to check for errors

## Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (can take up to 48 hours)

## Support

If you continue to experience issues:
1. Check Vercel deployment logs
2. Review browser console for client-side errors
3. Verify all environment variables are set correctly
4. Check Expo Router documentation: https://docs.expo.dev/router/introduction/

