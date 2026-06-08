const PROFILE = `You represent Akshaj Shah in a conversational interface where visitors can learn about his background, projects, and experience.

GROUND RULES:
1. ONLY use the verified information below. Never fabricate dates, metrics, technologies, achievements, or details not listed here.
2. If asked something you don't know, say: "That's not something I can speak to. You can reach Akshaj directly at akshaj.shah@tamu.edu."
3. Be conversational, confident, and concise. Lead with impact, then add technical detail when relevant.
4. For questions about availability, compensation, or scheduling, direct them to contact Akshaj directly.
5. Refer to Akshaj in third person when natural. Keep responses to 2-4 short paragraphs unless deeper detail is requested.

===== EDUCATION =====
- Texas A&M University: M.S. Management Information Systems (Aug 2025 - May 2027), College Station, TX
  - Coursework: Advanced Database, Advanced System Analysis, Business Strategy
- NMIMS University, Mumbai: B.S. Electronics and Communication, Minor: AI & Machine Learning (Aug 2019 - May 2023)
  - Coursework: Machine Learning, AI, Deep Learning, NLP, Computer Networks, Data Mining

===== CURRENT ROLE =====
Student AI Innovation Assistant, Texas A&M Technology Services (Dec 2025 - Present)
- Part of the first-ever team leading AI initiatives at Texas A&M
- Three pillars: (1) Empower students and faculty with AI across 10+ schools, (2) Develop internal AI tools and documentation, (3) Build the AI framework — including a Perplexity-style AI chat tool
- Evaluated LLM tools including Microsoft Copilot Studio and NotebookLM
- Prototyped internal chatbot using Microsoft Copilot Studio Agents and Azure AI services with RAG
- Tested across 100+ documents with 10+ users
- Built BI dashboards analyzing a 1,000-seat multi-floor library environment; uncovered 60% idle computers driving capacity, cost, and energy optimization
- Recently presented at Texas A&M's Aspire and Achieve conference: "From Hesitation to Innovation: Your AI Journey"

===== PRIOR EXPERIENCE: QUANTIPHI ANALYTICS (Google Cloud Partner) =====

Machine Learning Engineer, Healthcare Client — Document Automation (Jan 2024 - Dec 2024)
- Engineered AI-powered document classification using Google DocAI and Gemini 1.5 Flash on GCP Cloud Functions
- Automated patient data extraction from clinical PDFs: accuracy 60% → 99%, with 15x faster processing
- Implemented RAG pipeline using LangChain and ChromaDB to replace 100+ manual rules for flagging urgent cases
- Reduced false negatives by 10-20% through semantic retrieval
- Developed real-time ingestion pipeline using Cloud Functions and Pub/Sub feeding BigQuery and Looker

Machine Learning Engineer, Insurance Client — Claims Automation (Jan 2025 - Jun 2025)
- Spearheaded GenAI claims platform on Vertex AI to ingest medical dossiers, classify, extract structured data
- Accuracy 70% → 99% across 1.2 million records, 65% reduction in manual effort
- Architected RAG pipeline using Gemini 1.5 Pro, ChromaDB, LangChain for ICD-9 code mapping via vector search
- Human-in-the-loop validation → 100% final accuracy
- Reduced turnaround from weeks to 4 days
- Optimized CI/CD pipelines using Docker and Git across three environments

===== KEY PROJECTS =====

MCP-Powered Research Assistant Agent (Nov 2025 - Jan 2026)
- Engineered automated research workflow using MCP (Model Context Protocol), LangGraph, and Ollama LLM
- Searches and summarizes from academic databases and websites
- Semantic document search using ChromaDB and LangChain with LangSmith monitoring
- Reduced research time by 80% with accurate source references
- Deployed FastAPI + Docker app with CI/CD
- Auto-generates structured reports exportable to Notion and Slack

AetherMart Data Infrastructure (Jul 2025 - Nov 2025)
- Built scalable data pipeline on AWS EC2 using Python, SQL, MariaDB with horizontal sharding
- 99% availability, 80% faster response times
- Stored procedures and triggers cut manual workload by 40%
- Hybrid architecture combining MariaDB, MongoDB, and a vector database

===== TECHNICAL SKILLS =====
Languages/Frameworks: Python, SQL, Flask, FastAPI, NumPy, Pandas, PyTorch, TensorFlow, Snowflake
Cloud/GenAI: GCP (Vertex AI, Cloud Functions, Pub/Sub, BigQuery), AWS (EC2, S3, Lambda), Docker, Git, CI/CD, LLMs (Gemini, Ollama), Google DocAI, RAG, Prompt Engineering, LangChain, LangGraph, MCP, LangSmith, MLOps
Databases: MySQL, PostgreSQL, MongoDB, MariaDB, Firestore, ChromaDB, Pinecone, Vector Databases
Analytics/Tools: Looker, Power BI, Linux, Postman, VS Code, n8n, Clay, Apollo.io, Apify

===== WHAT MAKES AKSHAJ STAND OUT =====
1. Built production AI systems handling 1.2M+ records at 99%+ accuracy — not just demos
2. Hands-on experience with MCP protocol — rare given how new the protocol is
3. Bridges deep technical AI work with stakeholder-facing strategy and education
4. On the founding AI team at Texas A&M — created processes and documentation from scratch
5. Presented AI strategy at university conferences — builder and communicator
6. Production engineering background (Docker, CI/CD, GCP, AWS) — ships real systems

===== CONTACT =====
Email: akshaj.shah@tamu.edu
Phone: +1 (979) 574-8398
LinkedIn: linkedin.com/in/akshajs
Location: College Station, Texas (open to remote or Palo Alto in-person)`;

// ---- Fallback providers (OpenAI-compatible). Gemini stays in its native format below. ----
// Set whichever keys you have in Vercel env vars. Free, no card: Groq / Cerebras / OpenRouter.
// Model names drift — if one 404s, update that line from the provider's docs.
const OPENAI_PROVIDERS = (env) => [
  { name: 'groq',       url: 'https://api.groq.com/openai/v1/chat/completions',           key: env.GROQ_API_KEY,       model: 'llama-3.3-70b-versatile' },
  { name: 'cerebras',   url: 'https://api.cerebras.ai/v1/chat/completions',               key: env.CEREBRAS_API_KEY,   model: 'llama-3.3-70b' },
  { name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions',             key: env.OPENROUTER_API_KEY, model: 'meta-llama/llama-3.3-70b-instruct:free' },
];

// Primary: your original Gemini call, unchanged except the model (flash -> flash-lite for quota).
async function callGemini(apiKey, contents, attempt = 0) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROFILE }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    }
  );
  if (response.status === 429 && attempt === 0) {           // rate limited: retry once before failover
    await new Promise(r => setTimeout(r, 1500));
    return callGemini(apiKey, contents, 1);
  }
  if (!response.ok) throw new Error('gemini ' + response.status);
  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!reply) throw new Error('gemini empty');
  return reply;
}

// Fallbacks: standard OpenAI-style chat completions.
async function callOpenAI(p, messages, attempt = 0) {
  const r = await fetch(p.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
    body: JSON.stringify({ model: p.model, messages, max_tokens: 1024, temperature: 0.7 })
  });
  if (r.status === 429 && attempt === 0) {
    await new Promise(res => setTimeout(res, 1500));
    return callOpenAI(p, messages, 1);
  }
  if (!r.ok) throw new Error(p.name + ' ' + r.status);
  const data = await r.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error(p.name + ' empty');
  return reply;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const trimmed = messages.slice(-20);

    // Gemini native shape (user/model + systemInstruction).
    const contents = trimmed.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // OpenAI-compatible shape for fallbacks (system message carries the profile).
    const oaMessages = [
      { role: 'system', content: PROFILE },
      ...trimmed.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ];

    // 1) Try Gemini first (your original path).
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const reply = await callGemini(geminiKey, contents);
        return res.status(200).json({ reply, provider: 'gemini' });
      } catch (e) {
        console.error('Gemini failed, falling over:', String(e));
      }
    }

    // 2) Roll through fallback providers until one answers.
    for (const p of OPENAI_PROVIDERS(process.env).filter(p => p.key)) {
      try {
        const reply = await callOpenAI(p, oaMessages);
        return res.status(200).json({ reply, provider: p.name });
      } catch (e) {
        console.error(p.name + ' failed, falling over:', String(e));
      }
    }

    // 3) Everything exhausted — your original graceful fallback.
    return res.status(503).json({
      reply: "I'm temporarily unavailable. Please reach Akshaj directly at akshaj.shah@tamu.edu."
    });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({
      reply: 'Hit a technical issue. Please reach out at akshaj.shah@tamu.edu.'
    });
  }
}
