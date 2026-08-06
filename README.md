# AI Knowledge Assistant

Zero-cost full-stack starter for a multimodal AI assistant.

## Stack
- Frontend: Next.js 14 (App Router) + Tailwind
- Backend: FastAPI
- AI Router: Gemini (primary), Mistral, xAI/Grok, Groq (speed), OpenRouter (fallback), Tavily/Google CSE/NewsAPI/Firecrawl/scrape.do (search)
- Vector/Docs: ChromaDB + LangChain placeholders
- Auth/DB/Storage: Supabase placeholders

## Run

### Python Version
Use Python `3.12` or `3.13` for the backend. Python `3.14` is not supported in this repo because the pinned `pydantic-core` wheel does not match it.

### 1) Backend
```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env   
uvicorn app.main:app --reload --port 8000


cd C:\Users\Admin\OneDrive\Desktop\emiliya\backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If you already created the venv with Python 3.14, rebuild it with a supported version before starting the server.

### 2) Frontend
```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Frontend: http://localhost:3000
Backend docs: http://localhost:8000/docs

## Architecture
- `frontend/`: UI, chat, upload, multimodal interactions
- `backend/app/services/router.py`: central intent-to-provider routing
- `backend/app/services/providers/`: model providers (Gemini/Groq/OpenRouter)
- `backend/app/services/search.py`: multi-provider search aggregation
- `backend/app/services/docs.py`: PDF/text ingest + retrieval placeholder

## Notes
- This is a production-oriented scaffold with working chat/search wiring and clear extension points for PDF/image/video/voice.
- Add your API keys in env files.

### Optional: Auth Notification Emails (Welcome / Welcome Back)
When a user signs up or logs in with password, frontend calls backend endpoints that can send:
- Welcome email on signup
- Welcome-back email on login

Set these in `backend/.env`:
```env
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=no-reply@yourdomain.com
EMAIL_SENDER_NAME=Emilia
```

Routes used:
- `POST /api/auth/post-signup`
- `POST /api/auth/post-login`

## Supabase Auth Setup (Required)
Configure this once in your Supabase project:

1. Create env file values in `frontend/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

2. In Supabase Dashboard -> Authentication -> URL Configuration:
- Site URL: `http://localhost:3000`
- Redirect URLs: add `http://localhost:3000`

3. Enable providers in Authentication -> Providers:
- Google: enable and add Google OAuth Client ID/Secret
- Apple: enable and add Apple Service ID / Team ID / Key ID / Private Key

4. Enable email auth modes in Authentication -> Providers -> Email:
- Enable Email provider
- Enable Magic Link / OTP login
- Enable Email + Password signup/login

5. Configure SMTP for real email delivery in Authentication -> SMTP Settings:
- Enable Custom SMTP
- Add host, port, username, password, and sender email
- Save and send a test email

6. Run frontend:
```bash
cd frontend
npm install
npm run dev
```

The login modal now performs real Supabase API calls for:
- Google OAuth login
- Apple OAuth login
- Email OTP send + verify
- Email/password sign up
- Email/password sign in
- Sign out

## Chat Response Setup
To make question-answer replies work end to end, you need:

1. Backend running on `http://localhost:8000`
2. Frontend pointing at the backend with `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
3. At least one LLM provider key in `backend/.env`
   - `GEMINI_API_KEY` for the primary assistant
   - `MISTRAL_API_KEY` for a strong backup chat model
   - `GROQ_API_KEY` for the coding/fast route
   - `OPENROUTER_API_KEY` for fallback responses
4. Search/news keys if you want live web browsing and better citations:
   - `TAVILY_API_KEY`
   - `NEWS_API_KEY`
   - `MEDIASTACK_API_KEY`
   - `GOOGLE_SEARCH_API_KEY`
   - `GOOGLE_SEARCH_ENGINE_ID`
   - `FIRECRAWL_API_KEY`
   - `SCRAPE_DO_API_KEY`
5. `RESEND_API_KEY` if you want signup/login emails to send from the backend

What the router does:
- Normal chat goes to Gemini first
- Coding questions route to Groq, then Mistral, xAI/Grok, OpenRouter, and Gemini as fallbacks
- Latest/news questions route through live web search aggregation (Tavily, Google CSE, NewsAPI, Firecrawl, scrape.do) and then the chat model
- If the primary route fails, OpenRouter is used as fallback
- The debug endpoints `GET /api/health/providers`, `GET /api/debug/providers`, and `POST /api/debug/chat` show which keys are loaded and which provider answered

If you see `Sorry, I hit an error. Please try again.`, usually one of these is missing:
- backend server is not running
- a provider API key is missing or invalid
- the provider rate limit is reached
- the frontend is not pointing to the backend API
