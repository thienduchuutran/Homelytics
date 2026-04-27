# 🏠 Homelytics  
### *Data-Driven Real Estate Intelligence Platform*  

**Homelytics** is a full-stack real-estate web application that empowers users to discover, analyze, and personalize home searches through data-driven insights and smart AI recommendations.  
Built with **Next.js**, **Go**, and **MySQL**, Homelytics bridges elegant UI design with high-performance backend analytics—helping buyers make informed decisions through **interactive maps**, **AI-powered recommendations**, and **real-time market visualizations**.

🔗 **Live Demo:** (https://homelytics-iota.vercel.app/houses)  
🧠 **Tech Stack:** Next.js · PHP · MySQL · Redis · TailwindCSS · Chart.js · JWT Auth · Leaflet 

---

## 🌎 Overview  
Homelytics simulates a production-grade property-search engine that aggregates listing data from a real-world CRMLS-mirrored dataset.  
The platform combines responsive design, efficient search filters, and machine-learning insights to replicate how next-generation prop-tech startups help users find their ideal homes.

---

## 🎯 Vision & Purpose  
Traditional listing sites show results; **Homelytics explains them.**  
The project’s purpose is to demonstrate how **intelligence**, **usability**, and **performance** can coexist in a modern real-estate experience:  
- **Insightful:** turn housing data into visual analytics.  
- **Personalized:** adapt recommendations to user behavior.  
- **Scalable:** leverage Go’s concurrency and SQL optimization.  
- **Intuitive:** provide seamless, map-first property exploration.

---

## 🧩 Minimum Viable Product (MVP)

**Core Functionality:**
- Search and filter homes by **city**, **ZIP code**, **price range**, **number of bedrooms**, and **keywords**.  
- Display **property cards** with photos, prices, and details fetched from the MySQL dataset.  
- Implement **interactive pagination** to navigate large property results efficiently.  
- Provide **responsive layout** for desktop and mobile devices.  
- Enable **dynamic data retrieval** via Go REST API.  

**Stretch Goals (Extended Features):**
- AI-powered property recommendations based on user behavior.  
- Mortgage and affordability calculator integrated into property cards.  
- Map-based browsing using Google Maps or Leaflet.js.  
- Market insights dashboard with price trends and analytics.  
- JWT-based authentication for saved searches and favorites.

---

## 💡 Key Features  

### 🔍 Smart Search & Filtering  
- Multi-filter search by city, ZIP code, price, bedrooms, and keywords.  
- Auto-suggest and server-side pagination for speed.  
- Instant results powered by Go REST API endpoints.  

### 🧠 AI-Powered Recommendations  
- Learns from recent searches and viewing patterns.  
- Uses content-based K-Nearest Neighbor similarity to suggest properties.  
- “Recommended for You” carousel refreshes dynamically after each query.  

### 🗺️ Interactive Map Explorer  
- Browse visually via **Google Maps API** or **Leaflet.js**.  
- Live marker updates while panning/zooming.  
- Click markers to open detailed property cards.  

### 💰 Mortgage & Affordability Calculator  
- Calculates monthly payments in real time.  
- Factors in rate, down payment, and term length.  
- Displays affordability overlay on each property card.  

### 📊 Market Insights Dashboard  
- Visualize housing trends with **Chart.js**:  
  - Median price per ZIP code  
  - Price distribution histogram  
  - Avg. cost per bedroom  
- Powered by optimized SQL aggregate queries.  

### ❤️ User Accounts (Optional)  
- JWT-based auth with user sessions.  
- Save favorites and search history.  
- Role support for buyers / admins.  

---

## 🧱 Tech Stack  

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Frontend** | Next.js (React + TypeScript) | SSR, routing, UI/UX |
| **Backend** | Go (Golang) | REST API & business logic |
| **Database** | MySQL (phpMyAdmin) | Listings & open-house data |
| **Caching** | Redis | Popular queries & recommendations |
| **Styling** | TailwindCSS + Framer Motion | Modern responsive design |
| **Visualization** | Chart.js / Recharts | Trend analytics |
| **Authentication** | JWT / NextAuth.js | Secure sessions |
| **Maps API** | Google Maps / Leaflet.js | Interactive map search |
| **Deployment** | Vercel (Frontend) · Render/Fly.io (Backend) | Cloud delivery |
| **Monitoring** | Sentry + Logrus | Error tracking & logs |
| **CI/CD** | GitHub Actions | Automated build + deploy |

---

## ⚙️ Database Schema  

**Host:** localhost  
**Database:** boxgra6_cali  
**User:** boxgra6_sd  
**Password:** Real_estate650$  

| Table | Description |
|--------|--------------|
| `rets_property` | Active listings for sale |
| `rets_openhouse` | Upcoming open house events |

Includes indexing & pagination for efficient queries.

---

## 🧭 Architecture  

```plaintext
 ┌───────────────────────────────────────────────────────────────┐
 │ Frontend – Next.js                                            │
 │ • React Components & Pages                                    │
 │ • TailwindCSS / Framer Motion UI                              │
 │ • Fetches API data via SWR / React Query                      │
 └──────────────┬────────────────────────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────────────────────────────────────┐
 │ Backend – Go REST API                                         │
 │ • Endpoints: /search /filters /recommend /auth                │
 │ • Business logic + validation                                 │
 │ • Middleware: CORS, JWT, rate limiting                        │
 └──────────────┬────────────────────────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────────────────────────────────────┐
 │ Database – MySQL                                              │
 │ • Tables: rets_property, rets_openhouse                       │
 │ • Indexed queries + joins + aggregates                        │
 └──────────────┬────────────────────────────────────────────────┘
                │
                ▼
 ┌───────────────────────────────────────────────────────────────┐
 │ Optional Layers                                               │
 │ • Redis Cache – popular queries                               │
 │ • Sentry – monitoring & alerts                                │
 │ • Chart.js – data visualization                               │
 └───────────────────────────────────────────────────────────────┘

```

## 🧰 Development Setup  

### 🪜 Prerequisites  
- **Node.js** 18+  
- **Go** 1.22+  
- **MySQL** (provided via phpMyAdmin)  
- **Redis** (optional, for caching)  

---

### ⚡ Installation  

#### 1️⃣ Clone the Repository  
```bash
git clone https://github.com/yourusername/homelytics.git
cd homelytics
```
#### 2️⃣ Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### 3️⃣ Backend Setup
```bash
cd ../backend
go run main.go
```

## 🧪 Testing
### 🧩 Frontend Tests
```bash
npm run test
```

Uses Jest + React Testing Library

### ⚙️ Backend Tests
```bash
go test ./...
```

Uses Go’s built-in testing suite

### 📦 Deployment
Component	Platform	Notes
Frontend	Vercel	Auto-deployed from main branch
Backend	Render / Fly.io	Dockerized Go API
Database	cPanel (MySQL)	Managed static dataset
CI/CD	GitHub Actions	Test → Build → Deploy pipeline
## 🌱 Future Growth

Real-time MLS API integration

Property alerts via email or SMS

User analytics dashboard with custom insights

AI chatbot assistant for conversational property search

3D virtual tours using Three.js or Pannellum

## 🧠 Learning Outcomes

Through Homelytics, I gained experience in:

Designing a scalable Next.js + Go architecture.

Building and optimizing RESTful APIs with SQL backends.

Integrating AI recommendation logic and data visualization.

Implementing CI/CD pipelines and secure environment configs.

Delivering a product-grade UI/UX for real-estate applications.

## 🧑‍💻 Author

Duc Tran
Software Engineer · Full-Stack Developer · Data Enthusiast
📍 Boston, MA
🔗 [LinkedIn](https://www.linkedin.com/in/duc-tran-277564229/)
 · 🌐 [Portfolio](https://ducportfolio.vercel.app/)
 · ✉️ thienductranhuu2784@gmail.com

⭐ Acknowledgements

Special thanks to the CRMLS dataset providers and internship program mentors for offering real-world prop-tech context and guidance.

“Build with precision. Design with empathy.”
