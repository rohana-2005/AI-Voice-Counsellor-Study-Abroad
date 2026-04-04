# Python Backend for Vapi -> Supabase Ingest

This service receives Vapi structured output and writes normalized rows to Supabase.

## Endpoints

- `GET /health`
- `POST /api/v1/vapi/ingest`
- `POST /api/v1/vapi/webhook` (direct Vapi callback)

## Direct Vapi Webhook Setup

1. Configure backend `.env`:

- `VAPI_WEBHOOK_SECRET` (optional but recommended)

2. In Vapi dashboard webhook URL:

- `http://<your-host>:8000/api/v1/vapi/webhook`

3. If you set `VAPI_WEBHOOK_SECRET`, send it from Vapi as header:

- `x-vapi-secret: <same-value>`

The webhook endpoint auto-detects structured output from common Vapi payload shapes (including `lead_info` wrappers and `analysis.structuredData`) and writes to Supabase using the same mapping as `/api/v1/vapi/ingest`.

## Expected Payload

```json
{
  "structured_output": {
    "personal": {
      "name": "John",
      "phone": "91919191",
      "email": "john@gmail.com",
      "location": "USA"
    },
    "academic": {
      "education_level": "Graduate",
      "field": "Computer Science",
      "institution": "Purdue",
      "gpa_percentage": "9.9"
    },
    "preferences": {
      "target_countries": "UK, Ireland",
      "course_interest": "Data Science",
      "intake": "2027",
      "timing": "Evenings"
    },
    "test_status": { "exam": "IELTS", "score_or_stage": "9" },
    "financial": { "budget_range": "40000 USD", "scholarship_interest": "No" },
    "intent_level": "Mid Intent",
    "additional_notes": "Looking for further planning"
  },
  "transcript": "optional combined transcript text",
  "recording_url": "optional",
  "sentiment": "optional",
  "vapi_assistant_id": "optional"
}
```

## Table Mapping

- `students`
  - Upsert by `phone_number`
  - Fields: `full_name`, `phone_number`, `email`, `location`
- `academic_profiles`
  - Update existing row by `student_id`, or insert if missing
  - Fields: `edu_level`, `current_field`, `institution`, `gpa_percentage`, `target_countries`, `course_interest`, `intake_timing`, `test_status`, `budget_range`, `scholarship_interest`
- `call_sessions`
  - Insert one row per ingest
  - Fields: `transcript`, `recording_url`, `sentiment`, `lead_score`, `classification`, `score_breakdown`, `recommended_actions`, `raw_ai_response`

`intent_level` -> `lead_score` mapping:

- High Intent => 90 (Hot)
- Mid Intent => 65 (Warm)
- Low Intent => 35 (Cold)
- Numeric values are clamped into 0-100.

## Run

1. Copy `.env.example` to `.env`
2. Fill:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGIN` (default `http://localhost:3000`)
3. Install + start:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
