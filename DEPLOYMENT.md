# Homelytics - cPanel Deployment Guide

This guide will walk you through deploying the Homelytics frontend to your cPanel subdomain.

## Overview

The frontend is a Next.js application configured for **static export**, making it perfect for cPanel hosting. The deployment is automated via Git integration using `.cpanel.yml`.

## Prerequisites

- cPanel account with Git Version Control enabled
- Node.js installed on your cPanel server (usually available by default)
- SSH access to your cPanel account (optional, for troubleshooting)
- Git repository (GitHub, GitLab, Bitbucket, etc.)

## Setup Instructions

### Step 1: Configure cPanel Git Deployment

1. **Login to cPanel**
   - Navigate to your cPanel dashboard
   - Go to **Git™ Version Control** under "Files" section

2. **Create Repository**
   - Click "Create"
   - Fill in the details:
     - **Clone URL**: Your Git repository URL (e.g., `https://github.com/yourusername/Homelytics.git`)
     - **Repository Path**: `/home/boxgra6/repositories/Homelytics` (or your preferred path)
     - **Repository Name**: `Homelytics`
   - Click "Create"

3. **Update `.cpanel.yml` Paths**
   - The `.cpanel.yml` file is already configured at the root of this project
   - Update these two paths if needed:
     ```yaml
     - export DEPLOYPATH=/home/boxgra6/titus-duc.calisearch.org
     - export REPOPATH=/home/boxgra6/repositories/Homelytics
     ```
   - **DEPLOYPATH**: Your subdomain's public directory (e.g., `/home/username/subdomain.yourdomain.com`)
   - **REPOPATH**: Where cPanel cloned your Git repo

4. **Enable Deployment**
   - In Git Version Control, find your repository
   - Click "Manage"
   - Click "Pull or Deploy" tab
   - Configure your deployment:
     - **Head**: `main` (or your default branch)
     - **Send update notification**: Optional
   - Click "Update from Remote" to trigger first deployment

### Step 2: Verify Node.js Version

1. **Check Node.js in cPanel**
   - Go to **Setup Node.js App** in cPanel
   - Verify Node.js version is 18+ (required for Next.js 15)
   - If not available, contact your hosting provider

2. **Alternative: Check via SSH**
   ```bash
   node --version
   npm --version
   ```

### Step 3: Deploy

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Trigger Deployment in cPanel**
   - Go to Git Version Control
   - Click "Manage" on your repository
   - Click "Pull or Deploy"
   - Click "Update from Remote"

3. **Monitor Deployment**
   - The deployment log will show:
     - Installing dependencies
     - Building Next.js static site
     - Cleaning deployment directory
     - Copying files to public directory
     - Creating .htaccess file

### Step 4: Access Your Site

Once deployment completes, visit your subdomain:
```
https://titus-duc.calisearch.org
```

You should see:
- Homepage at `/`
- Houses listing at `/houses`

## Deployment Process

The `.cpanel.yml` file automates the following:

1. **Install Dependencies**: Runs `npm install` in the frontend directory
2. **Build Static Site**: Runs `npm run build` to generate static HTML/CSS/JS
3. **Clean Deployment**: Removes old files (keeps `.well-known` and `cgi-bin`)
4. **Copy Files**: Copies built files from `frontend/out/` to public directory
5. **Configure Apache**: Creates `.htaccess` for client-side routing and optimization

## Project Structure

```
Homelytics/
├── .cpanel.yml           # Deployment automation
├── .gitignore            # Git ignore rules
├── frontend/             # Next.js frontend
│   ├── app/              # Pages and routes
│   │   ├── page.tsx      # Homepage (/)
│   │   └── houses/       # Houses listing (/houses)
│   ├── components/       # React components
│   ├── data/             # Mock data
│   ├── types/            # TypeScript types
│   ├── public/           # Static assets
│   ├── next.config.ts    # Next.js config (static export)
│   └── package.json      # Dependencies
└── backend/              # Go backend (not deployed to cPanel)
```

## Manual Deployment (Alternative)

If automatic Git deployment doesn't work, you can manually deploy:

1. **Build Locally**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Upload via FTP/cPanel File Manager**
   - Upload everything from `frontend/out/` to your subdomain's public directory
   - Create `.htaccess` file (see `.cpanel.yml` for content)

## Troubleshooting

### Build Fails

**Problem**: npm install or npm run build fails

**Solutions**:
- Verify Node.js version is 18+ in cPanel
- Check deployment logs in Git Version Control
- Try SSH access and run commands manually
- Check `package.json` for correct dependencies

### Images Don't Load

**Problem**: Property images from Unsplash don't display

**Solutions**:
- Images use external URLs (Unsplash)
- Check browser console for CORS errors
- Consider downloading images to `/public` folder

### 404 Errors on Routes

**Problem**: Direct navigation to `/houses` shows 404

**Solutions**:
- Verify `.htaccess` was created properly
- Check Apache mod_rewrite is enabled
- Review `.htaccess` rules in `.cpanel.yml`

### Deployment Doesn't Trigger

**Problem**: Pushing to Git doesn't trigger deployment

**Solutions**:
- Manually trigger via "Update from Remote" in cPanel
- Check webhook configuration in Git provider
- Verify branch name matches configuration

## Connecting to Backend

Currently, the frontend uses mock data. To connect to your Go backend:

1. **Update API Calls** in `frontend/app/houses/page.tsx`:
   ```typescript
   // Replace mockHouses import with API call
   const [houses, setHouses] = useState<House[]>([]);

   useEffect(() => {
     fetch('https://your-backend-api.com/api/houses')
       .then(res => res.json())
       .then(data => setHouses(data));
   }, []);
   ```

2. **Configure CORS** on your Go backend to allow requests from your subdomain

3. **Deploy Backend** separately (cPanel typically doesn't support Go applications directly)

## Updating the Site

To update your site after making changes:

1. **Make changes locally**
2. **Test locally**: `npm run dev`
3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Update description"
   git push origin main
   ```
4. **Trigger deployment** in cPanel Git Version Control

## Performance Optimization

The `.htaccess` file includes:
- GZIP compression for faster loading
- Browser caching for static assets
- Proper MIME types for files

## Security

- `.well-known` directory preserved (for SSL certificates)
- `cgi-bin` directory preserved (if needed)
- No sensitive data in frontend code
- Environment variables not exposed in static build

## Support

If you encounter issues:
1. Check cPanel error logs
2. Review Git deployment logs in cPanel
3. Contact your hosting provider for Node.js/Git support
4. Check Next.js static export documentation

## Next Steps

- [ ] Replace mock data with real backend API
- [ ] Add more property images
- [ ] Implement property detail pages
- [ ] Add user authentication
- [ ] Configure custom domain SSL
- [ ] Set up Google Analytics (optional)

---

**Deployment Date**: 2025-10-23
**Next.js Version**: 15.5.5
**Node.js Required**: 18+
**Status**: ✅ Ready for Production
