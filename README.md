# BrandAI v2.0 — AI Marketing Platform

> A complete AI-powered marketing platform that extracts your brand DNA and uses it across every module.

---

## What's New in v2.0

### Phase 1 — Deep AI Analysis
- Brand Personality + Brand Voice
- Customer Persona (name, age, goals, frustrations, quote)
- Full SWOT Analysis
- Marketing Funnel Strategy (Awareness → Retention)
- Platform Recommendations with posting frequency
- Content Strategy (pillars, themes, content mix)
- Brand Positioning
- 3 Immediate Actions

### Phase 2 — Richer Content Generation
- Instagram Captions: **Short + Long + Emoji versions** per style
- Email Subject Lines (4 types)
- 6 Hook types (Curiosity, Problem, Social Proof, Shock, Story, Controversy)
- 4 Ad Copies (Facebook, Google, LinkedIn, YouTube)
- Full Hashtag Strategy (5 categories)

### Phase 3 — Smart Brand Extraction
- Product Category + Industry
- Luxury Score (1-10) + Premium Level
- Packaging Style analysis
- Suggested Brand Colors
- Top Competitors (auto-detected)
- Brand Keywords
- Campaign Idea

### Phase 4 — AI Marketing Score
- Overall Score with star rating
- Audience Match, Content Potential, Platform Fit
- Viral Potential, SEO Strength, Competitive Edge

### New Features
- **AI Chat** — context-aware assistant that knows your full brand profile
- **Marketing Report** — executive summary, market overview, competitor analysis, SWOT, 3-month strategy, KPIs, budget allocation
- **Project Settings** — brand voice, mission, vision, competitors, budget, website
- **Smart Dashboard** — personalized greeting, 6-stat overview, marketing scores
- **Export** — download reports and saved outputs as text files

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + custom CSS (warm editorial theme) |
| Backend | Node.js + Express |
| AI | Groq — llama-3.3-70b-versatile (Free) |
| File Handling | Multer |

---

## Setup

### 1. Get a free Groq API key
Go to **https://console.groq.com** → Sign up → API Keys → Create

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env → add your GROQ_API_KEY
npm install
npm start
# Runs on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## AI Workflow

```
Upload Product (image + brand details)
          ↓
POST /api/analyze
  → Smart Brand Extraction (colors, USP, keywords, luxury score, competitors)
  → Deep Analysis (SWOT, persona, funnel, positioning, content strategy)
  → AI Marketing Score (8 dimensions)
  → Stores full brand profile
          ↓
All modules use the stored brand profile:
          ↓
POST /api/generate-content     → Captions (3 versions each), hooks, ads, emails, hashtags
POST /api/generate-creative    → Reels, carousels, campaigns, UGC ideas, calendar
POST /api/generate-report      → Full marketing intelligence report
POST /api/chat                 → Brand-aware AI assistant
```

---

## For Render Deployment

**Backend (Web Service):**
- Root Directory: `backend`
- Build: `npm install`
- Start: `npm start`
- Env: `GROQ_API_KEY=your_key`

**Frontend (Web Service):**
- Root Directory: `frontend`
- Build: `npm install && npm run build`
- Start: `npm start`
- Env: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`

---

*Built for Vaij & Company Internship Assignment*
