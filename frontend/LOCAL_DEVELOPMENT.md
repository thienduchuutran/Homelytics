# Local Development Setup

## The Problem

Next.js dev server (`npm run dev`) doesn't serve PHP files. You have two options:

## Quick Start

### Option 1: Use Production API (Easiest - No PHP Installation Needed) ⭐

**Best for**: Quick development without installing PHP locally

1. **Create `.env.local` file** in `frontend/` folder:
   ```bash
   NEXT_PUBLIC_USE_PRODUCTION_API=true
   ```

2. **Start Next.js Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Browser**: Visit `http://localhost:3000/houses`

The frontend will automatically use your production API at `https://titus-duc.calisearch.org/api/get_properties.php` during development.

**Note**: Make sure your PHP files are already uploaded to the server for this to work.

### Option 2: Run Local PHP Server (Requires PHP Installation)

**Prerequisites**: PHP must be installed on your system

#### Installing PHP on Windows:

1. **Download PHP**: 
   - Visit https://windows.php.net/download/
   - Download PHP 8.x Thread Safe ZIP
   - Extract to `C:\php`

2. **Add to PATH**:
   - Open System Properties → Environment Variables
   - Add `C:\php` to your PATH
   - Restart terminal

3. **Verify Installation**:
   ```bash
   php --version
   ```

#### Running Local PHP Server:

1. **Terminal 1 - Start PHP Server**:
   ```bash
   cd frontend
   npm run dev:php
   ```
   This starts PHP built-in server on `http://localhost:8000`

2. **Terminal 2 - Start Next.js Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   This starts Next.js on `http://localhost:3000`

3. **Open Browser**: Visit `http://localhost:3000/houses`

The frontend will automatically detect you're in development mode and use `http://localhost:8000/api/get_properties.php` for API calls.

**Note**: If you don't have `.env.local` with `NEXT_PUBLIC_USE_PRODUCTION_API=true`, it will try to use local PHP server.

If you have `concurrently` installed:

```bash
npm install --save-dev concurrently
```

Then run:
```bash
npm run dev:all
```

This starts both PHP and Next.js servers in one command.

## How It Works

The code automatically detects development mode:
- **Development** (localhost): Uses `http://localhost:8000/api/get_properties.php`
- **Production**: Uses `/api/get_properties.php` (absolute path on server)

Detection is based on:
- `NODE_ENV === 'development'` OR
- `window.location.hostname === 'localhost'`

## Troubleshooting

### PHP Server Not Starting
- **Error**: `php: command not found`
- **Fix**: Install PHP and ensure it's in your PATH
- **Check**: Run `php --version` to verify installation

### Port 8000 Already in Use
- **Error**: `Address already in use`
- **Fix**: Change port in `package.json`:
  ```json
  "dev:php": "php -S localhost:8001 -t ."
  ```
- **Update**: Also update the port in `app/houses/page.tsx` if you change it

### Database Connection Errors
- **Issue**: PHP can't connect to database
- **Fix**: Your local PHP server needs access to the MySQL database
- **Options**:
  1. Use the same database credentials (if accessible from localhost)
  2. Set up a local MySQL database for development
  3. Use SSH tunnel to connect to remote database

### CORS Errors
- **Issue**: Browser blocks requests to `localhost:8000` from `localhost:3000`
- **Fix**: PHP already sets CORS headers, but if you still see errors:
  - Check browser console for specific CORS error
  - Verify PHP server is actually running
  - Check that `get_properties.php` has CORS headers set

## File Structure for PHP Server

The PHP server runs from the `frontend` directory, so it serves:
```
frontend/
├── api/
│   └── get_properties.php  ← Accessible at http://localhost:8000/api/get_properties.php
├── app/
└── ...
```

## Testing the API Directly

Before testing the frontend, verify PHP server works:

1. **Start PHP server**: `npm run dev:php`
2. **Test in browser**: Visit `http://localhost:8000/api/get_properties.php`
3. **Should see**: JSON array (even if empty) or error message

## Development Workflow

1. **Start PHP server** (Terminal 1):
   ```bash
   npm run dev:php
   ```

2. **Start Next.js** (Terminal 2):
   ```bash
   npm run dev
   ```

3. **Make changes** to React/TypeScript files
   - Next.js hot-reloads automatically
   - PHP server doesn't need restart for code changes

4. **Make changes** to PHP files
   - PHP server auto-reloads on file changes
   - Refresh browser to see changes

## Production Build

When building for production:

```bash
npm run build
```

The build process will:
- Use production API URL (`/api/get_properties.php`)
- Create static files in `out/` folder
- Ready to upload to server

No need to run PHP server for production builds!

