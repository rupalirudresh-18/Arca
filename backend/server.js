const express = require("express");
const cors    = require("cors");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE"] }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Multer ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp|mp4|mov/.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

// ── PostgreSQL setup ──
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Initialize DB table
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      brand_name TEXT NOT NULL,
      product_description TEXT,
      target_audience TEXT,
      image_path TEXT,
      analysis JSONB,
      content JSONB,
      creative_ideas JSONB,
      report JSONB,
      chat_history JSONB DEFAULT '[]',
      settings JSONB DEFAULT '{}',
      saved_outputs JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("✓ Database ready");
}
initDB().catch(console.error);

// DB helpers
async function dbGet(id) {
  const r = await pool.query("SELECT * FROM projects WHERE id=$1", [id]);
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  return {
    id: row.id,
    brandName: row.brand_name,
    productDescription: row.product_description,
    targetAudience: row.target_audience,
    imagePath: row.image_path,
    analysis: row.analysis,
    content: row.content,
    creativeIdeas: row.creative_ideas,
    report: row.report,
    chatHistory: row.chat_history || [],
    settings: row.settings || {},
    savedOutputs: row.saved_outputs || [],
    createdAt: row.created_at,
  };
}

async function dbSet(project) {
  await pool.query(`
    INSERT INTO projects (id, brand_name, product_description, target_audience, image_path, analysis, content, creative_ideas, report, chat_history, settings, saved_outputs, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (id) DO UPDATE SET
      content = EXCLUDED.content,
      creative_ideas = EXCLUDED.creative_ideas,
      report = EXCLUDED.report,
      chat_history = EXCLUDED.chat_history,
      settings = EXCLUDED.settings,
      saved_outputs = EXCLUDED.saved_outputs
  `, [
    project.id, project.brandName, project.productDescription,
    project.targetAudience, project.imagePath,
    JSON.stringify(project.analysis), JSON.stringify(project.content),
    JSON.stringify(project.creativeIdeas), JSON.stringify(project.report),
    JSON.stringify(project.chatHistory), JSON.stringify(project.settings),
    JSON.stringify(project.savedOutputs), project.createdAt,
  ]);
}

async function dbGetAll() {
  const r = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
  return r.rows.map(row => ({
    id: row.id,
    brandName: row.brand_name,
    productDescription: row.product_description,
    imagePath: row.image_path,
    createdAt: row.created_at,
    hasContent: !!row.content,
    hasCreative: !!row.creative_ideas,
    hasReport: !!row.report,
    marketingScore: row.analysis?.marketingScore?.overall || null,
    industry: row.analysis?.brandProfile?.industry || "",
    savedOutputs: row.saved_outputs || [],
  }));
}


// gorq api calling
async function callGroq(systemPrompt, userPrompt, maxTokens = 4096, retries = 3) {
  const Groq = require("groq-sdk");
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: maxTokens,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
      });
      return res.choices[0].message.content;
    } catch (err) {
      const isRate = err?.status === 429 || (err?.message||"").includes("rate_limit") || (err?.message||"").includes("Rate limit");
      console.error("Groq attempt " + attempt + " failed:", err?.message || err);
      if (isRate && attempt < retries) {
        const wait = attempt * 8000;
        console.log("Rate limited — waiting " + (wait/1000) + "s...");
        await new Promise(r => setTimeout(r, wait));
      } else { throw err; }
    }
  }
}

function safeJSON(text) {
  try {
    const clean = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
    return JSON.parse(clean);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
    return null;
  }
}

// POST /api/analyze 
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    const { brandName, productDescription, targetAudience } = req.body;
    if (!brandName || !productDescription)
      return res.status(400).json({ error: "Brand name and product description required" });

    const hasImage = !!req.file;

    const system = `You are a world-class brand strategist. Analyze each product UNIQUELY based on its specific industry, audience, and type.
CRITICAL RULES:
1. Marketing scores must vary realistically — a water bottle and an AI SaaS tool should have VERY different scores
2. Platform recommendations must match the product type — B2B SaaS → LinkedIn first; consumer goods → Instagram first; developer tools → Twitter/GitHub first
3. Never default to Instagram High for every product — think about WHERE the actual target audience spends time
4. Scores should reflect real weaknesses — new brands rarely score above 80 overall
Always respond with valid JSON only — no markdown, no extra text.`;

    const prompt = `Perform a UNIQUE, PRODUCT-SPECIFIC brand analysis for:

Brand: ${brandName}
Product: ${productDescription}
Target Audience: ${targetAudience || "General consumers"}
Image Uploaded: ${hasImage ? "Yes" : "No"}

IMPORTANT: Base ALL scores and platform rankings on the SPECIFIC product and audience above.
- A B2B software tool should rank LinkedIn > Twitter > YouTube (NOT Instagram)
- A fashion brand should rank Instagram > Pinterest > TikTok
- A developer tool should rank Twitter/GitHub > YouTube > LinkedIn
- Score realistically: new brands score 55-75, established brands 75-90
- Each product should have DIFFERENT scores — do not reuse 85/88/90/82/87/78/80/85

Return ONLY this exact JSON structure:
{
  "brandProfile": {
    "category": "precise category specific to this product",
    "industry": "specific industry name",
    "suggestedColors": ["color based on brand personality", "color2", "color3"],
    "packagingStyle": "packaging description relevant to this product type",
    "luxuryScore": 0,
    "premiumLevel": "Mass Market OR Mid-Range OR Premium OR Luxury — pick based on product",
    "usp": "the single strongest USP specific to THIS product",
    "keywords": ["keyword specific to product", "keyword2", "keyword3", "keyword4", "keyword5"],
    "competitors": ["real competitor in this space", "competitor2", "competitor3"],
    "campaignIdea": "campaign idea tailored to this specific product and audience"
  },
  "brandPersonality": "personality description unique to this brand",
  "brandVoice": "voice description based on industry and audience",
  "brandPositioning": "positioning statement specific to this market",
  "targetAudience": {
    "primaryAge": "realistic age range for this product",
    "gender": "gender skew based on product type",
    "location": "urban/suburban/rural/global based on product",
    "income": "income bracket that realistically buys this",
    "lifestyle": "specific lifestyle description"
  },
  "customerPersona": {
    "name": "fictional name",
    "age": 0,
    "occupation": "realistic job for this product's buyer",
    "goals": ["goal specific to this product", "goal2"],
    "frustrations": ["frustration this product solves", "frustration2"],
    "quote": "authentic quote this person would say"
  },
  "swot": {
    "strengths": ["strength specific to this product", "strength2", "strength3"],
    "weaknesses": ["real weakness", "weakness2"],
    "opportunities": ["market opportunity for this type of product", "opportunity2", "opportunity3"],
    "threats": ["real threat in this industry", "threat2"]
  },
  "marketingFunnel": {
    "awareness": "awareness strategy for this specific product type",
    "consideration": "consideration strategy",
    "conversion": "conversion strategy",
    "retention": "retention strategy"
  },
  "platformRecommendations": [
    { "platform": "BEST platform for this product — could be LinkedIn/YouTube/TikTok/Reddit etc", "priority": "High", "reason": "specific reason why THIS product belongs here", "contentType": "specific content type for this product", "postingFrequency": "realistic frequency" },
    { "platform": "2nd best platform", "priority": "High OR Medium", "reason": "specific reason", "contentType": "specific content", "postingFrequency": "frequency" },
    { "platform": "3rd platform", "priority": "Medium", "reason": "specific reason", "contentType": "specific content", "postingFrequency": "frequency" },
    { "platform": "4th platform", "priority": "Medium OR Low", "reason": "specific reason", "contentType": "specific content", "postingFrequency": "frequency" }
  ],
  "contentStrategy": {
    "pillars": ["pillar specific to this product", "pillar2", "pillar3"],
    "themes": ["theme relevant to this audience", "theme2", "theme3"],
    "contentMix": "realistic content mix for this product type",
    "bestPostingTimes": "realistic times for this specific audience"
  },
  "emotionalTriggers": ["trigger relevant to this product", "trigger2", "trigger3"],
  "marketingAngle": "strongest angle specific to this product",
  "competitiveAdvantage": "what makes THIS product win",
  "immediateActions": [
    { "action": "specific action for this product", "description": "specific description", "impact": "High" },
    { "action": "specific action", "description": "specific description", "impact": "High" },
    { "action": "specific action", "description": "specific description", "impact": "Medium" }
  ],
  "marketingScore": {
    "overall": 0,
    "brandReadiness": 0,
    "audienceMatch": 0,
    "contentPotential": 0,
    "platformFit": 0,
    "viralPotential": 0,
    "seoStrength": 0,
    "competitiveEdge": 0
  }
}

SCORING RULES — replace ALL 0s with calculated, product-specific numbers:

THINK STEP BY STEP before scoring:
1. What industry is this? Who buys it? How crowded is the market?
2. Is the product visually appealing? (affects viralPotential + platformFit)
3. Is the audience clearly defined? (affects audienceMatch)
4. How differentiated is it really? (affects competitiveEdge)

SCORE RANGES BY PRODUCT TYPE:
- Premium luxury brand (high price, unique, aspirational): overall 78-90, viralPotential 75-88, competitiveEdge 70-85
- Mid-range lifestyle product (fitness, wellness, fashion): overall 65-78, viralPotential 60-75, platformFit 65-80
- Commodity product (basic water, generic food, plain clothing): overall 42-58, viralPotential 25-45, competitiveEdge 30-50
- B2B SaaS / tech tool: overall 60-74, platformFit 40-58, audienceMatch 72-85
- Niche hobby product: overall 55-70, audienceMatch 75-88, viralPotential 50-65

RULES:
- NEVER output the same score twice in one response (each metric must be a different number)
- NEVER default to 73, 74, 75 — these are lazy averages
- overall = mathematically calculate the average of the other 7 scores yourself
- Score the ACTUAL product given, not a generic product in the category
- A poorly differentiated product MUST score below 55 on competitiveEdge
- A visually stunning product MUST score above 75 on viralPotential`;

    const raw = await callGroq(system, prompt, 6000);
    const analysis = safeJSON(raw);
    if (!analysis) return res.status(500).json({ error: "AI analysis failed — please try again" });

    const projectId = uuidv4();
    const project = {
      id: projectId,
      brandName,
      productDescription,
      targetAudience,
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
      analysis,
      content: null,
      creativeIdeas: null,
      report: null,
      chatHistory: [],
      settings: {
        businessName: brandName,
        industry: analysis.brandProfile?.industry || "",
        audience: targetAudience || "",
        budget: "",
        country: "",
        website: "",
        instagram: "",
        competitors: (analysis.brandProfile?.competitors || []).join(", "),
        brandVoice: analysis.brandVoice || "",
        mission: "",
        vision: "",
      },
      savedOutputs: [],
      createdAt: new Date().toISOString(),
    };
    await dbSet(project);

    res.json({ projectId, analysis, imagePath: project.imagePath });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

// POST /api/generate-content 

app.post("/api/generate-content", async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await dbGet(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { brandName, productDescription, targetAudience, analysis, settings } = project;
    const bp = analysis.brandProfile || {};

    const system = `You are a world-class marketing copywriter. Write high-converting, platform-native content.
Every caption gets 3 versions. Every section is complete and production-ready.
Respond with valid JSON only.`;

    const prompt = `Generate COMPLETE marketing content for:

Brand: ${brandName}
Product: ${productDescription}
Audience: ${targetAudience || "General"}
Brand Voice: ${analysis.brandVoice || "Professional"}
USP: ${bp.usp || analysis.marketingAngle || ""}
Keywords: ${(bp.keywords || []).join(", ")}
Competitors: ${(bp.competitors || []).join(", ")}
Brand Positioning: ${analysis.brandPositioning || ""}
Mission: ${settings?.mission || ""}

Return ONLY this JSON:
{
  "instagramCaptions": [
    {
      "style": "Storytelling",
      "short": "short version under 100 chars with emojis",
      "long": "long version 150-200 chars with emojis and line breaks",
      "emojiVersion": "emoji-heavy fun version",
      "cta": "specific CTA for this caption",
      "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"]
    },
    {
      "style": "Bold Statement",
      "short": "short punchy version",
      "long": "long powerful version with story",
      "emojiVersion": "emoji rich version",
      "cta": "specific CTA",
      "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"]
    },
    {
      "style": "Question Hook",
      "short": "short question version",
      "long": "long engaging version",
      "emojiVersion": "emoji fun version",
      "cta": "specific CTA",
      "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"]
    }
  ],
  "adCopy": [
    { "platform": "Facebook/Instagram", "headline": "headline", "body": "ad body 2-3 sentences", "cta": "CTA button text" },
    { "platform": "Google Search",      "headline": "headline under 30 chars", "body": "description under 90 chars", "cta": "CTA" },
    { "platform": "LinkedIn",           "headline": "professional headline", "body": "professional ad body", "cta": "CTA" },
    { "platform": "YouTube Pre-roll",   "headline": "hook for first 5 seconds", "body": "full 30-second script", "cta": "CTA" }
  ],
  "hooks": [
    { "type": "Curiosity",    "hook": "one powerful line" },
    { "type": "Problem",      "hook": "one powerful line" },
    { "type": "Social Proof", "hook": "one powerful line" },
    { "type": "Shock",        "hook": "one powerful line" },
    { "type": "Story",        "hook": "one powerful line" },
    { "type": "Controversy",  "hook": "one powerful line" }
  ],
  "emailSubjectLines": [
    { "type": "Curiosity",    "subject": "email subject line" },
    { "type": "Urgency",      "subject": "email subject line" },
    { "type": "Benefit-led",  "subject": "email subject line" },
    { "type": "Personalized", "subject": "email subject line" }
  ],
  "ctaSuggestions": [
    { "action": "CTA text", "urgency": "High",   "context": "when to use" },
    { "action": "CTA text", "urgency": "Medium",  "context": "when to use" },
    { "action": "CTA text", "urgency": "High",   "context": "when to use" },
    { "action": "CTA text", "urgency": "Low",    "context": "when to use" }
  ],
  "hashtags": {
    "primary":   ["#tag","#tag","#tag"],
    "niche":     ["#tag","#tag","#tag","#tag"],
    "trending":  ["#tag","#tag","#tag"],
    "branded":   ["#tag","#tag"],
    "community": ["#tag","#tag","#tag"]
  }
}

SCORING RULES — replace ALL 0s with calculated, product-specific numbers:

THINK STEP BY STEP before scoring:
1. What industry is this? Who buys it? How crowded is the market?
2. Is the product visually appealing? (affects viralPotential + platformFit)
3. Is the audience clearly defined? (affects audienceMatch)
4. How differentiated is it really? (affects competitiveEdge)

SCORE RANGES BY PRODUCT TYPE:
- Premium luxury brand (high price, unique, aspirational): overall 78-90, viralPotential 75-88, competitiveEdge 70-85
- Mid-range lifestyle product (fitness, wellness, fashion): overall 65-78, viralPotential 60-75, platformFit 65-80
- Commodity product (basic water, generic food, plain clothing): overall 42-58, viralPotential 25-45, competitiveEdge 30-50
- B2B SaaS / tech tool: overall 60-74, platformFit 40-58, audienceMatch 72-85
- Niche hobby product: overall 55-70, audienceMatch 75-88, viralPotential 50-65

RULES:
- NEVER output the same score twice in one response (each metric must be a different number)
- NEVER default to 73, 74, 75 — these are lazy averages
- overall = mathematically calculate the average of the other 7 scores yourself
- Score the ACTUAL product given, not a generic product in the category
- A poorly differentiated product MUST score below 55 on competitiveEdge
- A visually stunning product MUST score above 75 on viralPotential`;

    const raw = await callGroq(system, prompt, 6000);
    const content = safeJSON(raw);
    if (!content) return res.status(500).json({ error: "Content generation failed" });

    project.content = content;
    await dbSet(project);
    res.json({ content });
  } catch (err) {
    console.error("Content error:", err);
    res.status(500).json({ error: err.message });
  }
});
// POST /api/generate-creative
app.post("/api/generate-creative", async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await dbGet(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { brandName, productDescription, targetAudience, analysis } = project;
    const bp = analysis.brandProfile || {};

    const system = `You are a viral content strategist and creative director. 
Create breakthrough ideas that go viral. Respond with valid JSON only.`;

    const prompt = `Generate creative content strategy for:

Brand: ${brandName}
Product: ${productDescription}
USP: ${bp.usp || ""}
Competitors: ${(bp.competitors || []).join(", ")}
Campaign Idea: ${bp.campaignIdea || ""}
Emotional Triggers: ${(analysis.emotionalTriggers || []).join(", ")}
Content Pillars: ${(analysis.contentStrategy?.pillars || []).join(", ")}

Return ONLY this JSON:
{
  "reelIdeas": [
    { "title": "title", "concept": "detailed concept", "hook": "first 3 seconds", "duration": "15-30s", "music": "music vibe", "visualStyle": "style", "viralPotential": "High", "script": "brief script outline" },
    { "title": "title", "concept": "detailed concept", "hook": "first 3 seconds", "duration": "30-60s", "music": "music vibe", "visualStyle": "style", "viralPotential": "High", "script": "brief script outline" },
    { "title": "title", "concept": "detailed concept", "hook": "first 3 seconds", "duration": "15-30s", "music": "music vibe", "visualStyle": "style", "viralPotential": "Medium", "script": "brief script outline" }
  ],
  "carouselIdeas": [
    { "title": "title", "concept": "concept", "slides": ["slide1","slide2","slide3","slide4","slide5","slide6"], "objective": "awareness", "designTip": "tip" },
    { "title": "title", "concept": "concept", "slides": ["slide1","slide2","slide3","slide4","slide5"], "objective": "conversion", "designTip": "tip" }
  ],
  "campaignSuggestions": [
    { "campaignName": "name", "tagline": "tagline", "concept": "full concept", "duration": "4 weeks", "channels": ["ch1","ch2"], "keyActivations": ["act1","act2","act3"], "expectedOutcome": "outcome", "budget": "Medium", "kpis": ["kpi1","kpi2"] },
    { "campaignName": "name", "tagline": "tagline", "concept": "full concept", "duration": "2 weeks", "channels": ["ch1","ch2"], "keyActivations": ["act1","act2","act3"], "expectedOutcome": "outcome", "budget": "Low", "kpis": ["kpi1","kpi2"] }
  ],
  "contentCalendarThemes": [
    { "week": "Week 1", "theme": "theme", "contentMix": "3 Reels, 2 Carousels, 5 Stories", "focus": "what to focus on" },
    { "week": "Week 2", "theme": "theme", "contentMix": "2 Reels, 3 Carousels, 4 Stories", "focus": "what to focus on" },
    { "week": "Week 3", "theme": "theme", "contentMix": "4 Reels, 1 Carousel, 6 Stories",  "focus": "what to focus on" },
    { "week": "Week 4", "theme": "theme", "contentMix": "2 Reels, 2 Carousels, 5 Stories", "focus": "what to focus on" }
  ],
  "ugcIdeas": [
    { "idea": "UGC campaign idea", "mechanic": "how it works", "incentive": "what users get" },
    { "idea": "UGC campaign idea", "mechanic": "how it works", "incentive": "what users get" }
  ]
}`;

    const raw = await callGroq(system, prompt, 5000);
    const creativeIdeas = safeJSON(raw);
    if (!creativeIdeas) return res.status(500).json({ error: "Creative generation failed" });

    project.creativeIdeas = creativeIdeas;
    await dbSet(project);
    res.json({ creativeIdeas });
  } catch (err) {
    console.error("Creative error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/generate-report
app.post("/api/generate-report", async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await dbGet(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { brandName, productDescription, targetAudience, analysis, settings } = project;
    const bp = analysis.brandProfile || {};
    const swot = analysis.swot || {};

    const system = `You are a marketing consultant. Return only valid JSON, no markdown, no extra text.`;

    const prompt = `Marketing report for ${brandName} (${bp.industry||"general"}).
Product: ${productDescription?.slice(0,120)||""}
USP: ${bp.usp||""}
Competitors: ${(bp.competitors||[]).slice(0,3).join(", ")||"none listed"}
Audience: ${targetAudience||"general"}

Return ONLY this exact JSON:
{"executiveSummary":"2 sentences about this brand opportunity","marketOverview":{"marketSize":"estimate","growthTrend":"direction","keyTrends":["t1","t2","t3"],"marketOpportunity":"opportunity"},"competitorAnalysis":{"overview":"landscape in 1 sentence","competitors":[{"name":"c1","strength":"s","weakness":"w","opportunity":"edge"},{"name":"c2","strength":"s","weakness":"w","opportunity":"edge"}],"differentiator":"what makes brand win"},"swotAnalysis":{"strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"opportunities":["o1","o2","o3"],"threats":["t1","t2"],"strategicImplications":"1 sentence"},"marketingStrategy":{"overarchingStrategy":"1-2 sentence strategy","shortTerm":["a1","a2","a3"],"mediumTerm":["a1","a2"],"longTerm":["a1","a2"],"budgetAllocation":[{"channel":"Social Media","percentage":35,"rationale":"reason"},{"channel":"Content Marketing","percentage":25,"rationale":"reason"},{"channel":"Paid Ads","percentage":25,"rationale":"reason"},{"channel":"Influencer","percentage":15,"rationale":"reason"}]},"contentCalendar":[{"month":"Month 1","theme":"theme","goals":"goal","keyContent":["c1","c2"],"kpi":"metric"},{"month":"Month 2","theme":"theme","goals":"goal","keyContent":["c1","c2"],"kpi":"metric"},{"month":"Month 3","theme":"theme","goals":"goal","keyContent":["c1","c2"],"kpi":"metric"}],"kpis":[{"metric":"Follower Growth","target":"X%/month","howToMeasure":"tool"},{"metric":"Engagement Rate","target":"X%","howToMeasure":"tool"},{"metric":"Conversion Rate","target":"X%","howToMeasure":"tool"}],"recommendations":[{"priority":1,"title":"title","description":"1 sentence","expectedImpact":"impact","timeline":"timeframe"},{"priority":2,"title":"title","description":"1 sentence","expectedImpact":"impact","timeline":"timeframe"},{"priority":3,"title":"title","description":"1 sentence","expectedImpact":"impact","timeline":"timeframe"}],"conclusion":"1-2 sentences"}`;

    const raw = await callGroq(system, prompt, 2500);
    const report = safeJSON(raw);
    if (!report) {
      console.error("Report parse failed. Raw:", raw?.slice(0,300));
      return res.status(500).json({ error: "Report generation failed — please try again" });
    }

    // Fallback: use swot from analysis if AI skipped it
    if ((!report.swotAnalysis?.strengths?.length) && swot.strengths) {
      report.swotAnalysis = {
        strengths: swot.strengths || [],
        weaknesses: swot.weaknesses || [],
        opportunities: swot.opportunities || [],
        threats: swot.threats || [],
        strategicImplications: "Leverage core strengths to capture market opportunities while addressing key threats.",
      };
    }

    project.report = { ...report, generatedAt: new Date().toISOString() };
    await dbSet(project);
    res.json({ report: project.report });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ error: err.message || "Report generation failed" });
  }
});
// POST /api/chat  
app.post("/api/chat", async (req, res) => {
  try {
    const { projectId, message } = req.body;
    const project = await dbGet(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { brandName, productDescription, targetAudience, analysis, settings } = project;
    const bp = analysis.brandProfile || {};

    // Build brand context string
    const brandContext = `
BRAND PROFILE (use this for all responses):
- Brand: ${brandName}
- Product: ${productDescription}
- Industry: ${bp.industry || ""}
- USP: ${bp.usp || ""}
- Brand Voice: ${analysis.brandVoice || ""}
- Target Audience: ${targetAudience || ""}
- Keywords: ${(bp.keywords || []).join(", ")}
- Competitors: ${(bp.competitors || []).join(", ")}
- Platform Recommendation: ${(analysis.platformRecommendations || []).map(p => p.platform).join(", ")}
- Marketing Angle: ${analysis.marketingAngle || ""}
- Brand Positioning: ${analysis.brandPositioning || ""}
- Premium Level: ${bp.premiumLevel || ""}
- Mission: ${settings?.mission || ""}
- Vision: ${settings?.vision || ""}
- Marketing Score: ${analysis.marketingScore?.overall || ""}%
    `.trim();

    const system = `You are BrandAI — an expert AI marketing assistant for ${brandName}.
You have full knowledge of this brand's profile, strategy, audience, and competitive landscape.
Always use the brand context below to give specific, tailored advice — never generic.
Be conversational, concise, and actionable. Use bullet points when listing items.
If asked to write content (captions, emails, ads), write it fully — ready to use.

${brandContext}`;

    // Build conversation history
    const history = (project.chatHistory || []).slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const Groq = require("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const chatRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        ...history,
        { role: "user", content: message },
      ],
    });

    const reply = chatRes.choices[0].message.content;

    // Store in history
    project.chatHistory = project.chatHistory || [];
    project.chatHistory.push({ role: "user",      content: message, time: new Date().toISOString() });
    project.chatHistory.push({ role: "assistant", content: reply,   time: new Date().toISOString() });
    await dbSet(project);

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET/POST /api/projects/:id/settings 

app.get("/api/projects/:id/settings", async (req, res) => {
  const p = await dbGet(req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found" });
  res.json({ settings: p.settings || {} });
});

app.post("/api/projects/:id/settings", async (req, res) => {
  const p = await dbGet(req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found" });
  p.settings = { ...p.settings, ...req.body };
  await dbSet(p);
  res.json({ settings: p.settings });
});

// Standard project routes

app.get("/api/projects", async (req, res) => {
  const projects = await dbGetAll();
  res.json({ projects });
});

app.get("/api/projects/:id", async (req, res) => {
  const p = await dbGet(req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found" });
  res.json({ project: p });
});

app.post("/api/projects/:id/save", async (req, res) => {
  const p = await dbGet(req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found" });
  const { type, content, label } = req.body;
  const item = { id: uuidv4(), type, content, label, savedAt: new Date().toISOString() };
  p.savedOutputs = p.savedOutputs || [];
  p.savedOutputs.push(item);
  await dbSet(p);
  res.json({ saved: item });
});

app.delete("/api/projects/:id/save/:itemId", async (req, res) => {
  const p = await dbGet(req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found" });
  p.savedOutputs = (p.savedOutputs || []).filter(s => s.id !== req.params.itemId);
  await dbSet(p);
  res.json({ success: true });
});

app.get("/api/health", (req, res) => res.json({ status: "ok", version: "2.0" }));

app.listen(PORT, () => {
  console.log(`🚀 BrandAI v2.0 backend on http://localhost:${PORT}`);
  console.log(`🤖 Groq AI · llama-3.3-70b-versatile`);
});
