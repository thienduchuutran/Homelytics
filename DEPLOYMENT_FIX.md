# Fixing "Not Found" Error - Deployment Guide

## The Problem

You're seeing `Failed to fetch properties: Not Found` because:

1. **Local Development**: Next.js dev server (`next dev`) doesn't serve PHP files
2. **Static Export**: The `out` folder doesn't include PHP files (they need to be uploaded separately)
3. **Server Path**: The PHP file might not be in the correct location on your server

## Solution: Upload PHP Files to Server

### Step 1: Verify PHP Files Location

Your PHP files should be in:
```
frontend/api/
  ├── fetch_property.php
  ├── fetch_property.php
  └── generate_token_duc.php
```

### Step 2: Upload to Server

On your cPanel server (`titus-duc.calisearch.org`), upload the PHP files to:

```
/public_html/api/  (or your subdomain root)
  ├── fetch_property.php
  ├── fetch_property.php
  └── generate_token_duc.php
```

**Important**: The `/api/` folder must be at the same level as your `out` folder contents.

### Step 3: Verify File Structure on Server

Your server structure should look like:

```
titus-duc.calisearch.org/
├── api/
│   ├── fetch_property.php  ← Must be here!
│   ├── fetch_property.php
│   └── generate_token_duc.php
├── index.html              ← From out/ folder
├── houses.html             ← From out/ folder
├── _next/                  ← From out/_next/ folder
└── ... (other static files)
```

### Step 4: Test the API Directly

Before testing the frontend, verify the PHP endpoint works:

1. **Via Browser**: Visit `https://titus-duc.calisearch.org/api/fetch_property.php`
   - Should return JSON array (even if empty)
   - Should NOT return 404

2. **Via cURL** (if you have SSH access):
   ```bash
   curl "https://titus-duc.calisearch.org/api/fetch_property.php?bedrooms=3"
   ```

3. **Check File Permissions**:
   - PHP files should be `644` or `755`
   - Folders should be `755`

## Testing Locally (Optional)

If you want to test locally before deploying:

### Option 1: Use PHP Built-in Server

1. In your `frontend` folder, run:
   ```bash
   php -S localhost:8000
   ```

2. In another terminal, run Next.js:
   ```bash
   cd frontend
   npm run dev
   ```

3. Update the API URL in `houses/page.tsx` temporarily:
   ```typescript
   const apiUrl = `http://localhost:8000/api/fetch_property.php${...}`;
   ```

### Option 2: Test on Server Only

Just upload everything and test directly on `titus-duc.calisearch.org`.

## Quick Checklist

- [ ] PHP files uploaded to `/api/` folder on server
- [ ] File permissions set correctly (644 or 755)
- [ ] Can access `https://titus-duc.calisearch.org/api/fetch_property.php` directly
- [ ] Database connection works (check PHP error logs if needed)
- [ ] Static files from `out/` folder uploaded to root
- [ ] Test the full flow: visit `/houses` page and check browser console

## Debugging Steps

1. **Check Browser Console**:
   - Open DevTools → Network tab
   - Look for the request to `/api/fetch_property.php`
   - Check the status code and response

2. **Check Server Error Logs**:
   - In cPanel, check PHP error logs
   - Look for database connection errors
   - Check file path issues

3. **Verify Database Connection**:
   - Test `get_properties.php` directly in browser
   - Should return JSON (even if empty array)
   - If you see PHP errors, fix database credentials

4. **Check CORS** (if testing from different domain):
   - PHP already has CORS headers set
   - Should work, but verify if needed

## Common Issues

### Issue: Still getting 404
- **Fix**: Verify PHP file is actually at `/api/fetch_property.php` on server
- **Check**: Use cPanel File Manager to confirm file location

### Issue: PHP errors instead of JSON
- **Fix**: Check PHP error logs in cPanel
- **Common causes**: Database connection, missing PHP extensions

### Issue: Empty array returned
- **Fix**: This is normal if database is empty
- **Check**: Run `fetch_property.php` to populate data

### Issue: CORS errors
- **Fix**: PHP already sets CORS headers
- **Check**: Verify headers are being sent (check Network tab → Response Headers)

## After Fixing

Once the PHP file is in the correct location:

1. Rebuild your Next.js app:
   ```bash
   cd frontend
   npm run build
   ```

2. Upload the new `out` folder contents to server

3. Test the `/houses` page - it should now load properties!

