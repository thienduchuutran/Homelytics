# Demo Script

This is an 8-12 minute demo script for presenting the Homelytics application to stakeholders, highlighting key features and technical capabilities.

---

## Pre-Demo Setup (2 minutes)

**Before starting, ensure**:
- Application is running and accessible
- Database is populated with property data
- All features are functional
- Browser is ready with the application open

**Opening Statement** (30 seconds):
> "Good [morning/afternoon]. Today I'll be demonstrating Homelytics, a real estate property search and analytics platform. The application allows users to search, filter, and analyze property listings with an intuitive interface, interactive maps, AI-powered search, and market insights. Let me walk you through the key features."

---

## 1. Home Page and Navigation (1 minute)

**Action**: Navigate to home page (`/`)

**What to Say**:
> "This is the home page. It provides an overview of the platform and quick access to key features. Notice the clean, modern design built with Next.js and TailwindCSS."

**Action**: Click "Browse Properties" or navigate to `/houses`

**What to Say**:
> "The navigation is consistent across all pages, with links to Houses, Map, Insights, and Favorites. The application uses client-side routing for smooth navigation without full page reloads."

**Evaluation Criteria**: **Design** - Modern, responsive UI; **Functionality** - Navigation works smoothly

---

## 2. Property Search and Filtering (2 minutes)

**Action**: Show the houses page with property listings

**What to Say**:
> "Here's the main property search page. You can see property cards displaying key information: photos, address, price, bedrooms, bathrooms, and square feet."

**Action**: Open the filter panel

**What to Say**:
> "The filter panel allows users to narrow down results by price range, bedrooms, bathrooms, and property type. All filters are applied server-side for performance, and the filter state is preserved in the URL, so users can bookmark or share filtered searches."

**Action**: Apply filters (e.g., min price: $300,000, max price: $500,000, 3+ bedrooms)

**What to Say**:
> "Notice how the results update immediately. The API endpoint uses optimized SQL queries with proper indexing to ensure fast response times, even with complex filters."

**Action**: Use the search bar to search for a city (e.g., "San Diego")

**What to Say**:
> "The search functionality uses debouncing—it waits 500 milliseconds after you stop typing before making the API call. This prevents excessive requests while maintaining a responsive feel."

**Action**: Change the sort option (e.g., "Price: Low to High")

**What to Say**:
> "Sorting is also handled server-side, with proper NULL handling to ensure valid results appear first. The API supports sorting by price, date, bedrooms, bathrooms, and square feet."

**Evaluation Criteria**: **Functionality** - Filters work correctly, search is responsive; **Performance** - Fast response times; **Code Quality** - Server-side filtering, debouncing

---

## 3. Property Detail View (1.5 minutes)

**Action**: Click on a property card to open the quick view drawer

**What to Say**:
> "Clicking a property opens a quick view drawer. This provides immediate access to property details without leaving the search page. The drawer uses proper focus management and keyboard navigation—you can close it with Escape or by clicking outside."

**Action**: Click "View full details" or navigate to the full property page

**What to Say**:
> "The full property detail page shows comprehensive information: image gallery, key stats, description, features, agent information, and a map if coordinates are available. All this data is fetched from a single optimized API endpoint that returns only the necessary fields."

**Action**: Show the image gallery navigation

**What to Say**:
> "The photo gallery parses JSON data from the database and displays all available photos. If photos are missing or invalid, the system gracefully falls back to a placeholder image."

**Evaluation Criteria**: **Functionality** - Detail view works, images load; **Design** - Clean layout, good UX

---

## 4. Interactive Map Explorer (2 minutes)

**Action**: Navigate to the Map page (`/map`)

**What to Say**:
> "The map explorer provides a visual way to browse properties. It uses Leaflet.js for the map interface and dynamically loads properties based on the visible map bounds."

**Action**: Pan and zoom the map

**What to Say**:
> "As you pan or zoom, the map automatically fetches properties within the visible area. This is debounced to prevent excessive API calls—it waits 500 milliseconds after you stop moving the map. The spatial query uses bounding box coordinates and is optimized with proper database indexes."

**Action**: Click on a map marker

**What to Say**:
> "Clicking a marker opens the quick view drawer, allowing you to see property details without leaving the map. The sidebar shows a scrollable list of all properties in the current view."

**Action**: Click on a property in the sidebar

**What to Say**:
> "Clicking a property in the sidebar centers the map on that property and highlights it with a different marker color. This provides a seamless experience between list and map views."

**Evaluation Criteria**: **Functionality** - Map works smoothly, markers update; **Performance** - Efficient spatial queries; **Code Quality** - Debouncing, abort controllers

---

## 5. AI-Powered Chat Search (2 minutes)

**Action**: Click the floating chat button (bottom right)

**What to Say**:
> "The AI chat assistant allows users to search for properties using natural language. It's powered by Google Gemini AI and acts as a proxy to keep the API key secure on the server."

**Action**: Type a natural language query (e.g., "Find me a 3 bedroom house under 500k in San Diego")

**What to Say**:
> "The AI understands natural language and extracts structured filters. Notice how it interprets 'under 500k' as a maximum price and '3 bedroom' as a minimum bedroom requirement. The system maintains conversation context and can refine searches based on follow-up questions."

**Action**: Show the extracted filters and property results

**What to Say**:
> "The AI returns both a conversational response and structured filters that are applied to the property search. This combines the ease of natural language with the precision of structured filtering. The endpoint includes rate limiting—20 requests per minute per IP—to prevent abuse."

**Action**: Click on a property from the chat results

**What to Say**:
> "Users can click properties from the chat results to view details, creating a seamless flow from conversation to property exploration."

**Evaluation Criteria**: **Functionality** - AI search works, filters extracted correctly; **Security** - API key not exposed; **Code Quality** - Rate limiting, error handling

---

## 6. Market Insights Dashboard (2 minutes)

**Action**: Navigate to Insights page (`/insights`)

**What to Say**:
> "The market insights dashboard provides aggregate statistics and visualizations. It calculates medians, averages, and distributions using optimized SQL queries that process large datasets efficiently."

**Action**: Show the KPI cards (median price, median $/sqft, average beds, listing count)

**What to Say**:
> "These key performance indicators are calculated server-side using aggregate functions. The median calculation uses a two-step process: first count the total, then select the middle value. This ensures accurate medians even for large datasets."

**Action**: Show the charts (median price by ZIP, price distribution histogram)

**What to Say**:
> "The charts are rendered using native HTML and CSS—no external charting libraries required. This keeps the bundle size small and ensures fast load times. The data is grouped and aggregated on the server, so we're only sending summary statistics, not thousands of individual property records."

**Action**: Click "See market insights for these filters" from the houses page (if filters are applied)

**What to Say**:
> "The insights page integrates with the main search page. When you apply filters on the houses page, you can click this button to see market insights for those specific filters. The filter state is preserved in the URL, so the insights page knows exactly what subset of data to analyze."

**Action**: Change filters on the insights page

**What to Say**:
> "You can also adjust filters directly on the insights page. The URL updates, and the page refetches all three data endpoints in parallel for optimal performance."

**Evaluation Criteria**: **Functionality** - Insights calculate correctly, charts render; **Performance** - Fast aggregate queries; **Code Quality** - Server-side aggregation, parallel fetching

---

## 7. Favorites System (1 minute)

**Action**: Click the favorite button (heart icon) on a property card

**What to Say**:
> "Users can save properties to favorites. This uses browser localStorage, so favorites persist across sessions without requiring user accounts. The system stores a snapshot of key property data, so favorites remain useful even if the original listing is updated or removed."

**Action**: Navigate to Favorites page (`/favorites`)

**What to Say**:
> "The favorites page shows all saved properties with search and sort functionality. Users can add notes and tags to organize their favorites. The data is stored locally, but can be exported as JSON for backup or imported on another device."

**Action**: Show export/import functionality (if time permits)

**What to Say**:
> "The export/import feature allows users to backup their favorites or transfer them between devices. The system validates the imported data and merges intelligently to avoid duplicates."

**Evaluation Criteria**: **Functionality** - Favorites save and load correctly; **Code Quality** - localStorage management, cross-tab sync

---

## 8. Technical Architecture Highlights (1 minute)

**Action**: Open browser developer tools (Network tab) and show API calls

**What to Say**:
> "Let me show you the technical architecture. The frontend is a Next.js application with static export, meaning it generates static HTML files that can be deployed on any web server, including cPanel. The backend uses PHP endpoints that connect to a MySQL database."

**Action**: Show an API response in the Network tab

**What to Say**:
> "All API endpoints use PDO prepared statements to prevent SQL injection. The responses are JSON with proper CORS headers to allow cross-origin requests. The endpoints are optimized to return only necessary fields, keeping payload sizes small."

**Action**: Show the page source or mention static export

**What to Say**:
> "Because we use static export, there's no Next.js server required at runtime. This makes deployment simple and cost-effective—just upload the static files to any web host. The application uses client-side routing, so navigation feels like a single-page application while still being fully static."

**Evaluation Criteria**: **Code Quality** - Proper architecture, security measures; **Performance** - Optimized queries, small payloads

---

## Closing (30 seconds)

**What to Say**:
> "In summary, Homelytics demonstrates a modern, performant real estate search platform with advanced filtering, interactive maps, AI-powered search, and market analytics. The architecture is scalable, secure, and optimized for performance. The codebase follows best practices with proper error handling, input validation, and security measures. Thank you for your time. I'm happy to answer any questions."

---

## Key Points to Emphasize

### Functionality
- ✅ Advanced filtering with server-side processing
- ✅ Interactive map with spatial queries
- ✅ AI-powered natural language search
- ✅ Market insights with aggregate statistics
- ✅ Favorites system with localStorage

### Design
- ✅ Modern, responsive UI
- ✅ Smooth navigation and transitions
- ✅ Intuitive user experience
- ✅ Accessible (keyboard navigation, focus management)

### Performance
- ✅ Fast API responses (< 500ms for most queries)
- ✅ Debouncing to prevent excessive requests
- ✅ Optimized SQL queries with proper indexing
- ✅ Minimal payload sizes (only necessary fields)

### Code Quality
- ✅ SQL injection protection (PDO prepared statements)
- ✅ Input validation on all parameters
- ✅ Error handling with graceful fallbacks
- ✅ Rate limiting on AI endpoint
- ✅ Proper state management (React, URL params, localStorage)

---

## Handling Questions

**If asked about scalability**:
> "The current architecture can handle thousands of concurrent users. For further scaling, we could add Redis caching, database read replicas, and implement pagination. The codebase is structured to support these enhancements."

**If asked about security**:
> "We use PDO prepared statements to prevent SQL injection, rate limiting on the AI endpoint, and API keys are stored outside the web root. For production, we'd add more security headers and stricter CORS policies."

**If asked about data freshness**:
> "Property data is updated via a background sync process that fetches from an external API. The sync endpoint handles OAuth token management and incremental updates to minimize database load."

**If asked about mobile support**:
> "The application is fully responsive and works on mobile devices. The map interface adapts to smaller screens, and the filter panel becomes a modal on mobile for better UX."

---

## Demo Checklist

- [ ] Home page loads correctly
- [ ] Navigation works
- [ ] Property search and filtering work
- [ ] Sort functionality works
- [ ] Property detail view opens
- [ ] Map loads and updates on pan/zoom
- [ ] Chat widget opens and processes queries
- [ ] Insights page calculates and displays data
- [ ] Favorites save and load correctly
- [ ] All features are responsive
- [ ] No console errors
- [ ] API calls complete successfully

---

## Time Breakdown

- Pre-Demo Setup: 2 minutes
- Home Page and Navigation: 1 minute
- Property Search and Filtering: 2 minutes
- Property Detail View: 1.5 minutes
- Interactive Map Explorer: 2 minutes
- AI-Powered Chat Search: 2 minutes
- Market Insights Dashboard: 2 minutes
- Favorites System: 1 minute
- Technical Architecture: 1 minute
- Closing: 0.5 minutes

**Total: ~15 minutes** (can be shortened to 8-12 minutes by skipping some sections or going faster)

