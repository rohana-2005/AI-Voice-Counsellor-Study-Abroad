# Claude9

AI-powered study-abroad counseling platform with voice onboarding, lead scoring, university recommendations, scheduling, and admin analytics.

## What This Project Includes

- Next.js frontend for student onboarding, dashboard, reports, and admin views
- FastAPI backend for auth, lead processing, recommendations, voice webhooks, messaging, RAG, and metrics
- Supabase integration for persistent data and dashboard-ready records
- Vapi/Twilio/Anam integration points for voice and WhatsApp workflows

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, Uvicorn, Python 3.13+
- Data: Supabase
- AI/Voice: Vapi, Anam, Groq (configurable), Twilio

## Repository Structure

```text
frontend/   Next.js app
backend/    FastAPI app and API routes
features.md Product/feature notes
```

## Quick Start

### 1) Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (you can start from `backend/.env.example`), then run:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

### Backend (minimum)

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_ORIGIN=http://localhost:3000
```

### Backend (commonly used optional integrations)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
SUPABASE_JWT_SECRET=
GROQ_API_KEY=
GROQ_MODEL=
ANAM_API_KEY=
ANAM_AVATAR_ID=
ANAM_PERSONA_ID=
ANAM_VOICE_ID=
ANAM_LLM_ID=
ANAM_SYSTEM_PROMPT=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_FROM=
TWILIO_WEBHOOK_BASE_URL=
```

### Frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_PY_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_VAPI_ASSISTANT_ID=
```

## Core API Routes (FastAPI)

- `GET /health`
- `GET /api/v1/auth/google/login`
- `GET /api/v1/auth/google/callback`
- `POST /api/v1/leads`
- `GET /api/v1/leads`
- `PATCH /api/v1/leads/{lead_id}`
- `POST /api/v1/leads/{lead_id}/score`
- `GET /api/v1/leads/{lead_id}/recommendations`
- `POST /api/v1/appointments`
- `POST /api/v1/calls/webhook`
- `POST /api/v1/messages/whatsapp/send-summary`
- `POST /api/v1/rag/query`
- `GET /api/v1/dashboard/metrics`

Interactive docs: `http://localhost:8000/docs`

## Notes

- Backend already includes CORS configuration for local frontend origins.
- Supabase keys are required for most data-backed workflows.
- Voice onboarding in frontend expects valid Vapi public key and assistant ID.
