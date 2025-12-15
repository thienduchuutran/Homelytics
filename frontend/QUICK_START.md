# Quick Start - Local Development (No PHP Installation Needed)

## Easiest Solution: Use Production API

Since you don't have PHP installed locally, use your production API during development:

### Step 1: Create `.env.local` file

Create a file named `.env.local` in the `frontend/` folder with this content:

```
NEXT_PUBLIC_USE_PRODUCTION_API=true
```

### Step 2: Start Next.js

```bash
cd frontend
npm run dev
```

### Step 3: Open Browser

Visit `http://localhost:3000/houses`

That's it! The frontend will automatically use your production API at `https://titus-duc.calisearch.org/api/get_properties.php`.

## Important Notes

- **Make sure your PHP files are uploaded to the server first**
- The API must be accessible at `https://titus-duc.calisearch.org/api/get_properties.php`
- You'll be using real data from your production database

## Alternative: Install PHP (Optional)

If you want to test with local PHP later, see `LOCAL_DEVELOPMENT.md` for PHP installation instructions.

