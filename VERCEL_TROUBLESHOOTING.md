# Vercel 404 Error - Troubleshooting Guide

## Quick Fix Checklist

If you're getting a 404 error on Vercel, check these in order:

### 1. Check Build Logs in Vercel

1. Go to Vercel Dashboard → Your Project
2. Click on the latest deployment
3. Check the **Build Logs** tab

**Look for:**
- ✅ Build completed successfully
- ❌ Any errors or warnings
- ✅ "Exported: dist" message at the end

**If build failed:**
- Check error messages
- Verify environment variables are set
- Check Node version compatibility

### 2. Verify Vercel Project Settings

Go to **Project Settings** → **General**:

**Build & Development Settings:**
- **Framework Preset**: `Other` or `None` (NOT Next.js or React)
- **Root Directory**: Leave empty (unless your app is in a subdirectory)
- **Build Command**: `npm run build:web` (should auto-detect from vercel.json)
- **Output Directory**: `dist` (should auto-detect from vercel.json)
- **Install Command**: `npm install` (should auto-detect from vercel.json)

**Important:** If these are wrong, Vercel will serve from the wrong directory!

### 3. Verify vercel.json is Correct

Your `vercel.json` should be in the **root** of your project:

```json
{
  "version": 2,
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 4. Check Environment Variables

Go to **Project Settings** → **Environment Variables**

Make sure you have:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` (or `EXPO_PUBLIC_API_BASE_URL`)

**Important:** Set them for **ALL** environments:
- ☑ Production
- ☑ Preview  
- ☑ Development

### 5. Test Build Locally

Run this locally to verify the build works:

```bash
# Clean previous build
rm -rf dist

# Build
npm run build:web

# Check output
ls -la dist/
```

You should see:
- `dist/index.html` ✓
- `dist/_expo/` directory ✓
- `dist/assets/` directory ✓

If this fails locally, fix those errors first!

### 6. Common Issues & Solutions

#### Issue: Build completes but still 404

**Solution:**
1. Double-check Output Directory in Vercel settings is `dist`
2. Check that `dist/index.html` exists after build
3. Try redeploying: Go to Deployments → Click "..." → Redeploy

#### Issue: Build fails with "command not found: expo"

**Solution:**
- Make sure `@expo/cli` is in your `package.json` dependencies
- Vercel should install it automatically, but you can add it explicitly:
  ```bash
  npm install --save-dev @expo/cli
  ```

#### Issue: "Cannot find module" errors during build

**Solution:**
- Make sure all dependencies are in `package.json`
- Don't rely on globally installed packages
- Check that `node_modules` is not in `.gitignore` incorrectly

#### Issue: Assets not loading (fonts, images)

**Solution:**
- The rewrite rule should handle this
- Check that asset paths in your code are relative, not absolute
- Verify the `assets/` folder exists in `dist/` after build

### 7. Force a New Deployment

Sometimes Vercel caches old builds:

1. Go to **Deployments**
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**
4. Wait for build to complete
5. Test again

### 8. Check Deployment URL

Make sure you're checking the correct URL:
- Production: `your-project.vercel.app`
- Preview: `your-project-[hash].vercel.app`

The preview URLs change with each deployment.

## Still Not Working?

1. **Share Build Logs**: Copy the full build log from Vercel
2. **Check Runtime Logs**: Go to Deployments → Click deployment → Runtime Logs
3. **Check Browser Console**: Open DevTools → Console tab → Look for JavaScript errors
4. **Verify File Structure**: Check that `dist/` folder has `index.html` in Vercel build logs

## Quick Test Commands

Test your build locally before deploying:

```bash
# Install dependencies
npm install

# Build
npm run build:web

# Check what was created
ls -la dist/
cat dist/index.html

# Serve locally (optional - test the built files)
npx serve dist
```

If the local build works but Vercel doesn't, it's a Vercel configuration issue.

