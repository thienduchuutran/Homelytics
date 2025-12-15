# Development Setup ✅

## Current Configuration

You're set up to use the **production API** during local development.

### What This Means

- ✅ No PHP installation needed locally
- ✅ Uses your live API at `https://titus-duc.calisearch.org/api/get_properties.php`
- ✅ Works immediately - just run `npm run dev`

### File Created

- `.env.local` - Contains `NEXT_PUBLIC_USE_PRODUCTION_API=true`

## Start Developing

```bash
cd frontend
npm run dev
```

Then visit: `http://localhost:3000/houses`

## Important Notes

1. **Production API Must Be Live**: Make sure your PHP files are uploaded to the server
2. **Real Data**: You'll be working with real production data
3. **CORS**: The production API already has CORS headers configured

## If You Want to Switch to Local PHP Later

1. Remove or comment out the line in `.env.local`
2. Install PHP on Windows (see `LOCAL_DEVELOPMENT.md`)
3. Run `npm run dev:php` in a separate terminal

## Troubleshooting

### Still Getting 404?
- Check that `get_properties.php` is uploaded to your server
- Visit `https://titus-duc.calisearch.org/api/get_properties.php` directly in browser
- Should return JSON (even if empty array)

### CORS Errors?
- PHP already sets CORS headers
- Check browser console for specific error
- Verify the API URL is correct

### Want to Test Locally?
- See `LOCAL_DEVELOPMENT.md` for PHP installation instructions

