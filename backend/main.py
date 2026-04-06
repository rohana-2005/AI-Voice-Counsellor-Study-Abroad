import os
import json
import time
import hmac
import base64
import hashlib
import re
import uuid
from html import escape
from pathlib import Path
from datetime import datetime
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query, Request, Response, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse, PlainTextResponse
from pydantic import BaseModel, Field


def _load_local_env() -> None:
    env_paths = [
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent / ".env.local"
    ]
    
    for env_path in env_paths:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ[key] = value


_load_local_env()


app = FastAPI(
    title="Claude9 Counsellor API",
    version="0.1.0",
    description="Route skeleton for voice counselling, lead scoring, recommendations, and booking.",
)


frontend_origin_env = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
frontend_origins = [origin.strip() for origin in frontend_origin_env.split(",") if origin.strip()]
if not frontend_origins:
    frontend_origins = ["http://localhost:3000"]

dev_defaults = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
for origin in dev_defaults:
    if origin not in frontend_origins:
        frontend_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import Any
import httpx
from pydantic import BaseModel

DEFAULT_AVATAR_ID = "f208e2ef-8905-471a-a749-e35f197613b2"
ANAM_SESSION_URL = os.getenv("ANAM_SESSION_URL", "https://api.anam.ai/v1/auth/session-token")


LeadLabel = Literal["hot", "warm", "cold"]
SentimentLabel = Literal["excited", "confused", "hesitant"]


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _create_hs256_jwt(payload: dict[str, str | int | dict], secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_segment = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_segment = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_segment}.{payload_segment}.{_b64url(signature)}"


def _fetch_google_userinfo(access_token: str) -> dict[str, str]:
    req = urlrequest.Request(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        method="GET",
    )
    try:
        with urlrequest.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=400, detail=f"Failed to fetch Google user profile: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Google userinfo endpoint unreachable: {err.reason}") from err


def _sync_student_on_login(userinfo: dict[str, str]) -> dict:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    email = str(userinfo.get("email") or "").strip().lower()
    google_sub = str(userinfo.get("sub") or "").strip()
    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Google user info did not include required email/sub.")

    query = urlencode(
        {
            "select": "id,full_name,email,phone_number,location",
            "email": f"eq.{email}",
            "limit": "1",
        }
    )
    get_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/students?{query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(get_req, timeout=20) as response:
            existing = json.loads(response.read().decode("utf-8"))
            if isinstance(existing, list) and existing:
                return existing[0]
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase students lookup failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    full_name = str(userinfo.get("name") or "").strip() or email.split("@", 1)[0]
    auth_user_id = _get_or_create_auth_user_id(email=email, full_name=full_name)
    if not auth_user_id:
        raise HTTPException(status_code=502, detail="Failed to provision Supabase auth user for student.")

    insert_payload = [
        {
            "id": auth_user_id,
            "full_name": full_name,
            "email": email,
            "phone_number": f"pending-{str(uuid.uuid4())[:8]}",
            "location": None,
        }
    ]
    insert_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/students",
        data=json.dumps(insert_payload).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(insert_req, timeout=20) as response:
            created = json.loads(response.read().decode("utf-8"))
            if isinstance(created, list) and created:
                return created[0]
            return {}
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase student create failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


def _require_admin(access_token: str) -> dict:
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing access token.")

    profile = _fetch_google_userinfo(access_token)
    email = str(profile.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Access token did not include email.")

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    query = urlencode(
        {
            "select": "id,full_name,email",
            "email": f"eq.{email}",
            "limit": "1",
        }
    )
    req = urlrequest.Request(
        f"{supabase_url}/rest/v1/admins?{query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))
            if isinstance(rows, list) and rows:
                return rows[0]
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase admins lookup failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    raise HTTPException(status_code=403, detail="Admin access required.")

    full_name = str(userinfo.get("name") or email.split("@")[0]).strip()
    location = str(userinfo.get("locale") or "").strip() or None
    phone_number = str(userinfo.get("phone_number") or f"pending-{google_sub}").strip()

    insert_payload = [
        {
            "full_name": full_name,
            "email": email,
            "phone_number": phone_number,
            "location": location,
        }
    ]
    insert_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/students",
        data=json.dumps(insert_payload).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(insert_req, timeout=20) as response:
            created = json.loads(response.read().decode("utf-8"))
            if isinstance(created, list) and created:
                return created[0]
            return {}
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase student create failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


def _is_student_onboarding_complete(student: dict) -> bool:
    phone_number = str(student.get("phone_number") or "")
    full_name = str(student.get("full_name") or "").strip()
    return bool(full_name and phone_number and not phone_number.startswith("pending-"))


class LeadProfile(BaseModel):
    full_name: str
    phone: str
    email: str | None = None
    target_country: str | None = None
    gpa: float | None = Field(default=None, ge=0, le=10)
    budget_inr: int | None = Field(default=None, ge=0)
    intake_term: str | None = None
    ielts_score: float | None = Field(default=None, ge=0, le=9)
    course_interest: str | None = None


class LeadCreateRequest(BaseModel):
    profile: LeadProfile


class LeadUpdateRequest(BaseModel):
    profile: LeadProfile
    sentiment: SentimentLabel | None = None


class LeadScoreResponse(BaseModel):
    lead_id: str
    score: int = Field(ge=0, le=100)
    bucket: LeadLabel


class RecommendationResponse(BaseModel):
    lead_id: str
    universities: list[str]


class AppointmentCreateRequest(BaseModel):
    lead_id: str
    starts_at: datetime
    provider: Literal["google_calendar", "calendly"] = "google_calendar"


class SaveSessionRequest(BaseModel):
    transcript: str

class CallWebhookRequest(BaseModel):
    call_id: str
    event_type: str
    transcript_chunk: str | None = None
    sentiment: SentimentLabel | None = None


class OutboundCallRequest(BaseModel):
    to_number: str | None = None
    student_id: str | None = None
    student_phone: str | None = None
    context: str | None = None
    student_name: str | None = None


class RagQueryRequest(BaseModel):
    query: str = Field(min_length=3)
    top_k: int = Field(default=3, ge=1, le=8)
    category: str | None = None


class RagContextChunk(BaseModel):
    id: int
    category: str | None
    content: str
    score: float


class RagQueryResponse(BaseModel):
    answer: str
    contexts: list[RagContextChunk]


class CalendarBookRequest(BaseModel):
    access_token: str
    startTime: datetime
    endTime: datetime
    subject: str | None = None
    description: str | None = None


class StudentCompleteRequest(BaseModel):
    access_token: str
    full_name: str = Field(min_length=1)
    phone_number: str = Field(min_length=6)
    location: str | None = None


class WhatsAppSummaryRequest(BaseModel):
    student_id: str
    call_session_id: str | None = None


class WhatsAppReminderRequest(BaseModel):
    student_id: str
    scheduled_at: datetime
    meeting_link: str | None = None


class ProfileExtractRequest(BaseModel):
    student_id: str
    source: Literal["whatsapp", "website"]
    text: str = Field(min_length=1)


def _extract_terms(text: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z0-9]+", text.lower())
    stopwords = {
        "a",
        "an",
        "the",
        "is",
        "are",
        "to",
        "of",
        "for",
        "in",
        "on",
        "and",
        "or",
        "with",
        "what",
        "how",
        "can",
        "i",
        "you",
        "we",
    }
    return [token for token in tokens if token not in stopwords and len(token) > 1]


def _encode_auth_state(mode: str, origin: str, role: str | None = None) -> str:
    payload = {"mode": mode, "origin": origin}
    if role:
        payload["role"] = role
    return _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))


def _parse_auth_state(state: str | None) -> dict[str, str]:
        if not state:
                return {}

        try:
                padded = state + "=" * (-len(state) % 4)
                decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
                parsed = json.loads(decoded)
                if isinstance(parsed, dict):
                        return {str(k): str(v) for k, v in parsed.items()}
                return {}
        except Exception:
                return {}


def _sync_admin_on_login(userinfo: dict[str, str]) -> dict:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    email = str(userinfo.get("email") or "").strip().lower()
    full_name = str(userinfo.get("name") or "").strip() or email.split("@", 1)[0]
    if not email:
        raise HTTPException(status_code=400, detail="Google user info did not include email.")

    query = urlencode(
        {
            "select": "id,full_name,email",
            "email": f"eq.{email}",
            "limit": "1",
        }
    )
    get_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/admins?{query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(get_req, timeout=20) as response:
            existing = json.loads(response.read().decode("utf-8"))
            if isinstance(existing, list) and existing:
                return existing[0]
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase admins lookup failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    auth_user_id = _get_or_create_auth_user_id(email=email, full_name=full_name)
    if not auth_user_id:
        raise HTTPException(status_code=502, detail="Failed to provision Supabase auth user for admin.")

    insert_payload = [
        {
            "id": auth_user_id,
            "full_name": full_name,
            "email": email,
        }
    ]
    insert_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/admins",
        data=json.dumps(insert_payload).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(insert_req, timeout=20) as response:
            created = json.loads(response.read().decode("utf-8"))
            if isinstance(created, list) and created:
                return created[0]
            return {}
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase admin create failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


def _get_or_create_auth_user_id(email: str, full_name: str) -> str | None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    list_req = urlrequest.Request(
        f"{supabase_url}/auth/v1/admin/users?email={urlencode({'': email})[1:]}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(list_req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
            if isinstance(payload, dict):
                users = payload.get("users") or []
                if users:
                    user_id = users[0].get("id")
                    if user_id:
                        return str(user_id)
    except HTTPError:
        # Continue to create if lookup fails.
        pass
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    create_payload = {
        "email": email,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name},
    }
    create_req = urlrequest.Request(
        f"{supabase_url}/auth/v1/admin/users",
        data=json.dumps(create_payload).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(create_req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
            user_id = payload.get("id") if isinstance(payload, dict) else None
            return str(user_id) if user_id else None
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        # If user already exists, re-query the users list and return that id.
        lowered = detail.lower()
        if "already" in lowered or "exists" in lowered or "registered" in lowered or err.code in {409, 422}:
            try:
                with urlrequest.urlopen(list_req, timeout=20) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                    if isinstance(payload, dict):
                        users = payload.get("users") or []
                        if users:
                            user_id = users[0].get("id")
                            if user_id:
                                return str(user_id)
            except Exception:
                pass
            return None
        raise HTTPException(status_code=502, detail=f"Supabase auth user create failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


def _popup_response(origin: str, payload: dict[str, str]) -> HTMLResponse:
        safe_origin = json.dumps(origin)
        safe_payload = json.dumps(payload)
        html = f"""<!doctype html>
<html>
    <body>
        <script>
            (function () {{
                var origin = {safe_origin};
                var payload = {safe_payload};
                if (window.opener) {{
                    window.opener.postMessage(payload, origin);
                }}
                window.close();
            }})();
        </script>
    </body>
</html>"""
        return HTMLResponse(content=html)


def _rank_knowledge_chunks(query: str, rows: list[dict]) -> list[RagContextChunk]:
    query_terms = set(_extract_terms(query))
    ranked: list[RagContextChunk] = []
    for row in rows:
        content = str(row.get("content") or "")
        if not content.strip():
            continue
        content_terms = set(_extract_terms(content))
        if not content_terms:
            continue

        overlap = len(query_terms.intersection(content_terms))
        score = overlap / max(1, len(query_terms))

        if query_terms and overlap == 0:
            continue

        ranked.append(
            RagContextChunk(
                id=int(row.get("id") or 0),
                category=row.get("category"),
                content=content,
                score=round(score, 4),
            )
        )

    ranked.sort(key=lambda chunk: chunk.score, reverse=True)
    return ranked


def _supabase_fetch_knowledge_rows(category: str | None = None) -> list[dict]:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    query_params = {"select": "id,content,category,metadata", "limit": "100"}
    if category:
        query_params["category"] = f"eq.{category}"

    endpoint = f"{supabase_url}/rest/v1/knowledge_base?{urlencode(query_params)}"
    req = urlrequest.Request(
        endpoint,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
            if isinstance(payload, list):
                return payload
            return []
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase retrieval failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


def _generate_answer_from_context(query: str, contexts: list[RagContextChunk]) -> str:
    groq_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    if not groq_key:
        if not contexts:
            return (
                "No relevant context found in knowledge_base and GROQ_API_KEY is not configured. "
                "Set GROQ_API_KEY to enable a direct LLM answer."
            )

        # Fallback extractive response when context exists but LLM credentials are missing.
        preview = "\n".join([f"- {chunk.content[:180]}" for chunk in contexts[:3]])
        return (
            "Using the current knowledge base, here are the most relevant points:\n"
            f"{preview}\n\n"
            "Set GROQ_API_KEY to enable a fully generated answer."
        )

    if contexts:
        context_text = "\n\n".join(
            [f"[Chunk {idx + 1}] ({chunk.category or 'general'})\n{chunk.content}" for idx, chunk in enumerate(contexts)]
        )
        system_prompt = (
            "You are a concise admissions counsellor assistant. "
            "Answer strictly from provided context. If context is insufficient, state that clearly."
        )
        user_prompt = f"Question: {query}\n\nContext:\n{context_text}"
    else:
        system_prompt = (
            "You are a concise admissions counsellor assistant. "
            "No vector database context was found for this question. "
            "Answer from general knowledge and mention this is a general response."
        )
        user_prompt = f"Question: {query}"

    body = {
        "model": groq_model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
    }
    req = urlrequest.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Claude9-RAG/1.0 (+http://localhost)",
        },
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return str(payload["choices"][0]["message"]["content"]).strip()
    except HTTPError as err:
        body = err.read().decode("utf-8") if err.fp else ""
        preview = "\n".join([f"- {chunk.content[:180]}" for chunk in contexts[:3]])
        return (
            f"Could not call LLM (HTTP {err.code}). Groq response: {body[:300]}\n\n"
            f"Relevant context found:\n{preview}"
        )
    except Exception as err:
        # If LLM call fails, still return useful extracted result.
        preview = "\n".join([f"- {chunk.content[:180]}" for chunk in contexts[:3]])
        return f"Could not call LLM ({type(err).__name__}: {str(err)[:200]}), but relevant context found:\n{preview}"


@app.get("/health", tags=["system"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "claude9-backend"}


@app.get("/api/v1/auth/google/login", tags=["auth"])
def google_login(
    response: Response,
    redirect_uri: str | None = Query(default=None),
) -> dict[str, str]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    configured_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    final_redirect_uri = redirect_uri or configured_redirect_uri

    if not client_id or not final_redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI configuration.",
        )

    state = os.urandom(16).hex()
    query_params = {
        "client_id": client_id,
        "redirect_uri": final_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/calendar",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(query_params)}"
    cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=cookie_secure,
        samesite="lax",
        max_age=600,
    )
    return {"auth_url": auth_url, "state": state}


@app.get("/api/v1/auth/google", tags=["auth"])
def google_auth_start(
    request: Request,
    mode: Literal["popup", "redirect"] = Query(default="redirect"),
    origin: str | None = Query(default=None),
) -> dict[str, str]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not redirect_uri:
        redirect_uri = f"{str(request.base_url).rstrip('/')}/api/v1/auth/callback"

    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI configuration.")

    app_origin = origin or request.headers.get("origin") or str(request.base_url).rstrip("/")
    encoded_state = _encode_auth_state(mode=mode, origin=app_origin, role="student")
    oauth_scopes = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
    ]
    query_params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(oauth_scopes),
        "state": encoded_state,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(query_params)}"
    return {"url": url}


@app.get("/api/v1/admin/auth/google", tags=["admin"])
def admin_google_auth_start(
    request: Request,
    mode: Literal["popup", "redirect"] = Query(default="redirect"),
    origin: str | None = Query(default=None),
) -> dict[str, str]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not redirect_uri:
        redirect_uri = f"{str(request.base_url).rstrip('/')}/api/v1/auth/callback"

    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI configuration.")

    app_origin = origin or request.headers.get("origin") or str(request.base_url).rstrip("/")
    encoded_state = _encode_auth_state(mode=mode, origin=app_origin, role="admin")
    oauth_scopes = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
    ]
    query_params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(oauth_scopes),
        "state": encoded_state,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(query_params)}"
    return {"url": url}


@app.get("/api/v1/auth/google/callback", tags=["auth"])
def google_callback(
    request: Request,
    response: Response,
    code: str = Query(...),
    state: str = Query(...),
    redirect_uri: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> dict[str, str | int | None]:
    parsed_state = _parse_auth_state(state)
    mode = parsed_state.get("mode", "")
    app_origin = parsed_state.get("origin")
    role = parsed_state.get("role", "student")
    is_popup_flow = mode in {"popup", "redirect"} and bool(app_origin)

    if error:
        if is_popup_flow and app_origin:
            if mode == "popup":
                return _popup_response(app_origin, {"type": "google-oauth-error", "error": error})
            return RedirectResponse(url=f"{app_origin}/dashboard?error={error}", status_code=307)
        raise HTTPException(status_code=400, detail=f"Google OAuth error: {error}")

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    configured_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    final_redirect_uri = redirect_uri or configured_redirect_uri

    if not client_id or not client_secret or not final_redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI configuration.",
        )

    if not is_popup_flow:
        state_cookie = request.cookies.get("oauth_state")
        if not state_cookie or not hmac.compare_digest(state_cookie, state):
            raise HTTPException(status_code=400, detail="Invalid or missing OAuth state.")
        response.delete_cookie("oauth_state")

    token_payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": final_redirect_uri,
        "grant_type": "authorization_code",
    }

    encoded_payload = urlencode(token_payload).encode("utf-8")
    req = urlrequest.Request(
        "https://oauth2.googleapis.com/token",
        data=encoded_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=15) as response:
            token_data = json.loads(response.read().decode("utf-8"))
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Google token endpoint unreachable: {err.reason}") from err

    access_token = token_data.get("access_token")
    if not access_token:
        if is_popup_flow and app_origin:
            if mode == "popup":
                return _popup_response(app_origin, {"type": "google-oauth-error", "error": "missing_access_token"})
            return RedirectResponse(url=f"{app_origin}/dashboard?error=missing_access_token", status_code=307)
        raise HTTPException(status_code=400, detail="Google did not return an access token.")

    userinfo = _fetch_google_userinfo(str(access_token))
    student_record = _sync_student_on_login(userinfo) if role != "admin" else None
    admin_record = _sync_admin_on_login(userinfo) if role == "admin" else None
    user_sub = userinfo.get("sub")
    user_email = userinfo.get("email")

    if not user_sub or not user_email:
        raise HTTPException(status_code=400, detail="Google user info did not include sub/email.")

    if is_popup_flow and app_origin:
        redirect_path = "/admin/dashboard" if role == "admin" else "/dashboard"
        if mode == "popup":
            return _popup_response(app_origin, {"type": "google-oauth-success", "accessToken": str(access_token)})
        return RedirectResponse(
            url=f"{app_origin}{redirect_path}?access_token={str(access_token)}",
            status_code=307,
        )

    supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
    if not supabase_jwt_secret:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_JWT_SECRET configuration.")

    now = int(time.time())
    ttl_seconds = int(os.getenv("SESSION_TTL_SECONDS", "3600"))
    session_payload: dict[str, str | int | dict] = {
        "iss": "claude9-backend",
        "aud": "authenticated",
        "sub": user_sub,
        "email": user_email,
        "role": "authenticated",
        "iat": now,
        "exp": now + ttl_seconds,
        "app_metadata": {"provider": "google", "roles": ["authenticated"]},
        "user_metadata": {"email": user_email},
    }
    session_jwt = _create_hs256_jwt(session_payload, supabase_jwt_secret)

    return {
        "state": state,
        "session_token": session_jwt,
        "session_expires_in": ttl_seconds,
        "student_id": student_record.get("id") if isinstance(student_record, dict) else None,
        "admin_id": admin_record.get("id") if isinstance(admin_record, dict) else None,
        "user_id": user_sub,
        "email": user_email,
        "access_token": token_data.get("access_token"),
        "refresh_token": token_data.get("refresh_token"),
        "id_token": token_data.get("id_token"),
        "token_type": token_data.get("token_type"),
        "expires_in": token_data.get("expires_in"),
    }


@app.get("/api/v1/auth/callback", tags=["auth"])
def google_auth_callback_compat(
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
):
    parsed_state = _parse_auth_state(state)
    mode = parsed_state.get("mode", "redirect")
    app_origin = parsed_state.get("origin") or request.headers.get("origin") or "http://localhost:3000"
    role = parsed_state.get("role", "student")

    if error:
        if mode == "popup":
            return _popup_response(app_origin, {"type": "google-oauth-error", "error": error})
        return RedirectResponse(url=f"{app_origin}/dashboard?error={error}", status_code=307)

    if not code:
        if mode == "popup":
            return _popup_response(app_origin, {"type": "google-oauth-error", "error": "missing_code"})
        return RedirectResponse(url=f"{app_origin}/dashboard?error=missing_code", status_code=307)

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI configuration.",
        )

    token_payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    req = urlrequest.Request(
        "https://oauth2.googleapis.com/token",
        data=urlencode(token_payload).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=20) as token_res:
            token_data = json.loads(token_res.read().decode("utf-8"))
    except Exception:
        if mode == "popup":
            return _popup_response(app_origin, {"type": "google-oauth-error", "error": "token_exchange_failed"})
        return RedirectResponse(url=f"{app_origin}/dashboard?error=token_exchange_failed", status_code=307)

    access_token = str(token_data.get("access_token") or "")
    if not access_token:
        if mode == "popup":
            return _popup_response(app_origin, {"type": "google-oauth-error", "error": "missing_access_token"})
        return RedirectResponse(url=f"{app_origin}/dashboard?error=missing_access_token", status_code=307)

    userinfo = _fetch_google_userinfo(access_token)
    if role == "admin":
        _sync_admin_on_login(userinfo)
    else:
        _sync_student_on_login(userinfo)

    if mode == "popup":
        return _popup_response(app_origin, {"type": "google-oauth-success", "accessToken": access_token})

    return RedirectResponse(
        url=f"{app_origin}{'/admin/dashboard' if role == 'admin' else '/dashboard'}?access_token={access_token}",
        status_code=307,
    )


@app.post("/api/v1/leads", tags=["leads"])
def create_lead(payload: LeadCreateRequest) -> dict[str, str]:
    # TODO: insert lead profile into Supabase.
    return {"message": "Create lead route", "full_name": payload.profile.full_name}


@app.get("/api/v1/leads", tags=["leads"])
def list_leads(status: LeadLabel | None = None) -> dict[str, str | None]:
    # TODO: fetch paginated leads from Supabase.
    return {"message": "List leads route", "status": status}


@app.get("/api/v1/leads/{lead_id}", tags=["leads"])
def get_lead(lead_id: str) -> dict[str, str]:
    # TODO: fetch lead details + transcript summary from Supabase.
    return {"message": "Get lead route", "lead_id": lead_id}


@app.patch("/api/v1/leads/{lead_id}", tags=["leads"])
def update_lead(lead_id: str, payload: LeadUpdateRequest) -> dict[str, str]:
    # TODO: update lead profile and latest sentiment in Supabase.
    return {"message": "Update lead route", "lead_id": lead_id, "full_name": payload.profile.full_name}


@app.post("/api/v1/leads/{lead_id}/score", response_model=LeadScoreResponse, tags=["scoring"])
def score_lead(lead_id: str) -> LeadScoreResponse:
    # TODO: compute scoring from collected 12-point JSON state.
    return LeadScoreResponse(lead_id=lead_id, score=55, bucket="warm")


@app.get(
    "/api/v1/leads/{lead_id}/recommendations",
    response_model=RecommendationResponse,
    tags=["recommendations"],
)
def get_recommendations(lead_id: str) -> RecommendationResponse:
    # TODO: compute university recommendations from GPA and budget.
    return RecommendationResponse(
        lead_id=lead_id,
        universities=[
            "University of Essex",
            "University of Kent",
            "University of Greenwich",
        ],
    )


@app.post("/api/v1/appointments", tags=["appointments"])
def create_appointment(payload: AppointmentCreateRequest, background_tasks: BackgroundTasks) -> dict[str, str]:
    meeting = _create_meeting_row(student_id=payload.lead_id, scheduled_at=payload.starts_at, meeting_link=None)
    background_tasks.add_task(_send_whatsapp_reminder, payload.lead_id, payload.starts_at, None)
    return {
        "message": "Appointment created",
        "lead_id": payload.lead_id,
        "provider": payload.provider,
        "meeting_id": str(meeting.get("id") or ""),
    }


@app.post("/api/v1/calls/webhook", tags=["voice"])
def ingest_call_webhook(payload: CallWebhookRequest) -> dict[str, str]:
    # TODO: verify webhook signature, persist transcript chunk, and fan out realtime updates.
    return {"message": "Call webhook route", "call_id": payload.call_id, "event": payload.event_type}


def _normalize_phone_for_whatsapp(phone: str) -> str:
    cleaned = (phone or "").strip()
    if cleaned.startswith("whatsapp:"):
        suffix = cleaned.split("whatsapp:", 1)[1].strip()
        if suffix and not suffix.startswith("+"):
            return f"whatsapp:+{suffix}"
        return cleaned
    if cleaned and not cleaned.startswith("+"):
        cleaned = f"+{cleaned}"
    return f"whatsapp:{cleaned}"


def _normalize_phone_for_call(phone: str) -> str:
    raw = (phone or "").strip()
    if not raw:
        return ""

    # Keep leading + if provided, then strip non-digit characters from the rest.
    has_plus = raw.startswith("+")
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return ""

    if has_plus:
        return f"+{digits}"

    if raw.startswith("00"):
        return f"+{digits[2:]}" if len(digits) > 2 else ""

    # Default to India country code when caller does not specify one.
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"

    return f"+91{digits}"


def _supabase_base_and_key() -> tuple[str, str]:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")
    return supabase_url, service_key


def _supabase_headers(service_key: str, with_json: bool = False, prefer_representation: bool = False) -> dict[str, str]:
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    }
    if with_json:
        headers["Content-Type"] = "application/json"
    if prefer_representation:
        headers["Prefer"] = "return=representation"
    return headers


def _supabase_select(table: str, params: dict[str, str]) -> list[dict]:
    supabase_url, service_key = _supabase_base_and_key()
    req = urlrequest.Request(
        f"{supabase_url}/rest/v1/{table}?{urlencode(params)}",
        headers=_supabase_headers(service_key),
        method="GET",
    )
    with urlrequest.urlopen(req, timeout=20) as response:
        rows = json.loads(response.read().decode("utf-8"))
        return rows if isinstance(rows, list) else []


def _supabase_insert(table: str, row: dict[str, Any]) -> dict[str, Any]:
    supabase_url, service_key = _supabase_base_and_key()
    req = urlrequest.Request(
        f"{supabase_url}/rest/v1/{table}",
        data=json.dumps([row]).encode("utf-8"),
        headers=_supabase_headers(service_key, with_json=True, prefer_representation=True),
        method="POST",
    )
    with urlrequest.urlopen(req, timeout=20) as response:
        rows = json.loads(response.read().decode("utf-8"))
        return rows[0] if isinstance(rows, list) and rows else {}


def _supabase_patch(table: str, row: dict[str, Any], filter_query: str) -> dict[str, Any]:
    supabase_url, service_key = _supabase_base_and_key()
    req = urlrequest.Request(
        f"{supabase_url}/rest/v1/{table}?{filter_query}",
        data=json.dumps(row).encode("utf-8"),
        headers=_supabase_headers(service_key, with_json=True, prefer_representation=True),
        method="PATCH",
    )
    with urlrequest.urlopen(req, timeout=20) as response:
        rows = json.loads(response.read().decode("utf-8"))
        return rows[0] if isinstance(rows, list) and rows else {}


def _get_student_by_id(student_id: str) -> dict[str, Any] | None:
    rows = _supabase_select(
        "students",
        {
            "select": "id,full_name,phone_number,email",
            "id": f"eq.{student_id}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def _get_student_by_phone(phone_number: str) -> dict[str, Any] | None:
    normalized = (phone_number or "").replace("whatsapp:", "").strip()
    candidates = [normalized]
    if normalized.startswith("+"):
        candidates.append(normalized[1:])

    for candidate in candidates:
        if not candidate:
            continue
        rows = _supabase_select(
            "students",
            {
                "select": "id,full_name,phone_number,email",
                "phone_number": f"eq.{candidate}",
                "limit": "1",
            },
        )
        if rows:
            return rows[0]

    target_digits = _phone_digits(normalized)
    if not target_digits:
        return None
    rows = _supabase_select("students", {"select": "id,full_name,phone_number,email", "limit": "1000"})
    for row in rows:
        if _phone_digits(str(row.get("phone_number") or "")) == target_digits:
            return row
    return None


def _get_call_session(call_session_id: str) -> dict[str, Any] | None:
    rows = _supabase_select(
        "call_sessions",
        {
            "select": "id,student_id,transcript,sentiment,lead_score,classification,recommended_actions,detailed_report,created_at",
            "id": f"eq.{call_session_id}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def _get_latest_call_session(student_id: str) -> dict[str, Any] | None:
    rows = _supabase_select(
        "call_sessions",
        {
            "select": "id,student_id,transcript,sentiment,lead_score,classification,recommended_actions,detailed_report,created_at",
            "student_id": f"eq.{student_id}",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def _build_summary_message(student_name: str, session: dict[str, Any]) -> str:
    recommended_actions = str(session.get("recommended_actions") or "").strip()
    detailed_report = str(session.get("detailed_report") or "").strip()

    lines = [
        f"Hi {student_name}! Here is your consultation summary.",
        "",
    ]
    if detailed_report:
        compact_report = detailed_report.strip()
        if len(compact_report) > 900:
            compact_report = compact_report[:900].rstrip() + "..."
        lines += [f"Report:\n{compact_report}", ""]
    else:
        transcript_preview = str(session.get("transcript") or "").strip()
        if transcript_preview:
            if len(transcript_preview) > 280:
                transcript_preview = transcript_preview[:280].rstrip() + "..."
            lines += [f"Conversation Snapshot:\n{transcript_preview}", ""]

    if recommended_actions:
        compact_actions = recommended_actions.strip()
        if len(compact_actions) > 450:
            compact_actions = compact_actions[:450].rstrip() + "..."
        lines += [f"Next Steps:\n{compact_actions}", ""]
    lines.append("Our team will follow up with you shortly.")
    return "\n".join(lines)


def _twilio_send_whatsapp_message(to_number: str, body: str) -> str:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    raw_from = os.getenv("TWILIO_WHATSAPP_FROM") or "whatsapp:+14155238886"
    status_callback = (os.getenv("TWILIO_WEBHOOK_BASE_URL") or "").strip().rstrip("/")
    status_url = f"{status_callback}/api/v1/webhook/whatsapp-status" if _is_public_webhook_base(status_callback) else ""
    if not account_sid or not auth_token:
        raise HTTPException(status_code=500, detail="Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN.")

    payload: dict[str, str] = {
        "From": _normalize_phone_for_whatsapp(raw_from),
        "To": _normalize_phone_for_whatsapp(to_number),
        "Body": body,
    }
    if status_url:
        payload["StatusCallback"] = status_url

    with httpx.Client(timeout=20) as client:
        response = client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
            auth=(account_sid, auth_token),
            data=payload,
        )

    data = response.json() if response.content else {}
    if response.status_code >= 400:
        raise HTTPException(status_code=500, detail=data.get("message") or "Failed to send WhatsApp message")
    return str(data.get("sid") or "")


def _send_whatsapp_summary(student_id: str, call_session_id: str | None = None) -> dict[str, str]:
    student = _get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    phone = str(student.get("phone_number") or "").strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Student phone number is missing.")

    session = _get_call_session(call_session_id) if call_session_id else _get_latest_call_session(student_id)
    if not session:
        raise HTTPException(status_code=404, detail="No call session found for summary.")

    body = _build_summary_message(str(student.get("full_name") or "Student"), session)
    sid = _twilio_send_whatsapp_message(phone, body)
    return {
        "message_sid": sid,
        "student_id": student_id,
        "session_id": str(session.get("id") or ""),
    }


def _send_whatsapp_reminder(student_id: str, scheduled_at: datetime, meeting_link: str | None = None) -> dict[str, str]:
    student = _get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    phone = str(student.get("phone_number") or "").strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Student phone number is missing.")

    time_label = scheduled_at.strftime("%d %b %Y, %I:%M %p")
    body = (
        f"Hi {str(student.get('full_name') or 'Student')}, reminder: your counseling appointment is at {time_label}."
        + (f"\nMeeting link: {meeting_link}" if meeting_link else "")
    )
    sid = _twilio_send_whatsapp_message(phone, body)
    return {"message_sid": sid, "student_id": student_id}


def _create_meeting_row(student_id: str, scheduled_at: datetime, meeting_link: str | None = None) -> dict[str, Any]:
    return _supabase_insert(
        "meetings",
        {
            "student_id": student_id,
            "scheduled_at": scheduled_at.isoformat(),
            "meeting_link": meeting_link,
            "status": "scheduled",
        },
    )


def _extract_profile_fields_from_text(text: str) -> dict[str, Any]:
    extracted: dict[str, Any] = {}
    body = text.strip()
    if not body:
        return extracted

    lower = body.lower()
    country_match = re.search(r"(?:country|countries|target country)\s*[:=-]\s*([a-zA-Z,\s]+)", body, re.IGNORECASE)
    if country_match:
        countries = [item.strip() for item in country_match.group(1).split(",") if item.strip()]
        if countries:
            extracted["target_countries"] = countries

    course_match = re.search(r"(?:course|program|course interest)\s*[:=-]\s*([^\n;]+)", body, re.IGNORECASE)
    if course_match:
        extracted["course_interest"] = course_match.group(1).strip()

    gpa_match = re.search(r"(?:gpa|cgpa|percentage)\s*[:=-]\s*([0-9]+(?:\.[0-9]+)?)", lower)
    if gpa_match:
        try:
            extracted["gpa_percentage"] = float(gpa_match.group(1))
        except Exception:
            pass

    budget_match = re.search(r"(?:budget|funds|fees)\s*[:=-]\s*([^\n;]+)", body, re.IGNORECASE)
    if budget_match:
        extracted["budget_range"] = budget_match.group(1).strip()

    intake_match = re.search(r"(?:intake|timeline|session)\s*[:=-]\s*([^\n;]+)", body, re.IGNORECASE)
    if intake_match:
        extracted["intake_timing"] = intake_match.group(1).strip()

    level_match = re.search(r"(?:level|edu level|education level)\s*[:=-]\s*([^\n;]+)", body, re.IGNORECASE)
    if level_match:
        extracted["edu_level"] = level_match.group(1).strip()

    field_match = re.search(r"(?:field|current field|background)\s*[:=-]\s*([^\n;]+)", body, re.IGNORECASE)
    if field_match:
        extracted["current_field"] = field_match.group(1).strip()

    return extracted


def _upsert_academic_profile(student_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    filtered = {k: v for k, v in fields.items() if v is not None and str(v).strip() != ""}
    if not filtered:
        return {}

    existing = _supabase_select(
        "academic_profiles",
        {
            "select": "id,student_id",
            "student_id": f"eq.{student_id}",
            "limit": "1",
        },
    )
    filtered["updated_at"] = datetime.utcnow().isoformat()

    if existing:
        profile_id = str(existing[0].get("id") or "")
        if not profile_id:
            return {}
        return _supabase_patch("academic_profiles", filtered, urlencode({"id": f"eq.{profile_id}"}))

    return _supabase_insert("academic_profiles", {**filtered, "student_id": student_id})


def _summarize_transcript_with_groq(transcript: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    if not api_key:
        return transcript[:700]

    body = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "Summarize phone call transcripts into 3 concise bullet points.",
            },
            {
                "role": "user",
                "content": f"Transcript:\n{transcript}",
            },
        ],
        "temperature": 0.2,
    }

    try:
        with httpx.Client(timeout=20) as client:
            response = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                return transcript[:700]
            content = choices[0].get("message", {}).get("content", "")
            return content.strip() or transcript[:700]
    except Exception:
        return transcript[:700]


TWILIO_CALL_STATE: dict[str, dict[str, Any]] = {}
TWILIO_SAVED_CALL_SIDS: set[str] = set()


def _phone_digits(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def _resolve_student_id_by_phone(phone_number: str) -> str | None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        return None

    cleaned = phone_number.strip()
    exact_candidates = [cleaned]
    if cleaned.startswith("+"):
        exact_candidates.append(cleaned[1:])

    for candidate in exact_candidates:
        if not candidate:
            continue
        query = urlencode({"select": "id", "phone_number": f"eq.{candidate}", "limit": "1"})
        req = urlrequest.Request(
            f"{supabase_url}/rest/v1/students?{query}",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Accept": "application/json",
            },
            method="GET",
        )
        try:
            with urlrequest.urlopen(req, timeout=20) as response:
                rows = json.loads(response.read().decode("utf-8"))
                if isinstance(rows, list) and rows and rows[0].get("id"):
                    return str(rows[0]["id"])
        except Exception:
            pass

    # Fallback: compare on digits when stored format differs (+91 vs 91 etc.).
    req = urlrequest.Request(
        f"{supabase_url}/rest/v1/students?{urlencode({'select': 'id,phone_number', 'limit': '1000'})}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        target_digits = _phone_digits(cleaned)
        with urlrequest.urlopen(req, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))
            if isinstance(rows, list):
                for row in rows:
                    row_digits = _phone_digits(str(row.get("phone_number") or ""))
                    if row_digits and row_digits == target_digits and row.get("id"):
                        return str(row["id"])
    except Exception:
        pass
    return None


def _resolve_student_phone_by_id(student_id: str) -> str | None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key or not student_id:
        return None

    query = urlencode({"select": "phone_number", "id": f"eq.{student_id}", "limit": "1"})
    req = urlrequest.Request(
        f"{supabase_url}/rest/v1/students?{query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))
            if isinstance(rows, list) and rows:
                phone = str(rows[0].get("phone_number") or "").strip()
                return phone or None
    except Exception:
        pass
    return None


def _analyze_transcript_for_call_session(transcript: str) -> dict[str, Any]:
    lead_score = None
    classification = None
    sentiment = None
    detailed_report = None
    raw_ai_response = None
    score_breakdown = None

    groq_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    score_keys = [
        "financial_clarity",
        "academic_readiness",
        "program_familiarity",
        "admission_commitment",
        "institution_familiarity",
    ]

    if groq_key and transcript.strip():
        system_prompt = """You are an expert student admission counselor evaluator.
Analyze the provided transcript of an avatar session with a student.
Output your analysis ONLY as a valid JSON object with the exact following keys:
1. \"lead_score\": integer between 0 and 100. Set this equal to the average of the 5 score_breakdown values.
2. \"classification\": One of [\"Hot\", \"Warm\", \"Cold\", \"Hard\", \"Soft\"]. Since we specifically want Hard and Soft leads, prioritize \"Hard\" (strong commitment/clear plan) or \"Soft\" (uncertain/exploring).
3. \"sentiment\": A short string describing the student's emotional tone (e.g., \"Enthusiastic\", \"Anxious\", \"Curious\").
4. \"score_breakdown\": A JSON object with EXACTLY these numeric keys, each from 0 to 100:
   - \"financial_clarity\"
   - \"academic_readiness\"
   - \"program_familiarity\"
   - \"admission_commitment\"
   - \"institution_familiarity\"
5. \"detailed_report\": A paragraph summarizing the student's needs, objections, and next steps.
"""
        try:
            with httpx.Client(timeout=20) as client:
                res = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    json={
                        "model": groq_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": transcript},
                        ],
                        "response_format": {"type": "json_object"},
                    },
                )
            if res.status_code == 200:
                data = res.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                parsed = json.loads(content)
                raw_breakdown = parsed.get("score_breakdown")
                if isinstance(raw_breakdown, dict):
                    normalized_breakdown: dict[str, int] = {}
                    for key in score_keys:
                        raw_value = raw_breakdown.get(key, 0)
                        try:
                            normalized_value = max(0, min(100, int(raw_value)))
                        except (TypeError, ValueError):
                            normalized_value = 0
                        normalized_breakdown[key] = normalized_value
                    score_breakdown = normalized_breakdown
                    lead_score = round(sum(normalized_breakdown.values()) / len(score_keys))
                else:
                    score_breakdown = {key: 0 for key in score_keys}
                    lead_score = 0

                raw_classification = parsed.get("classification")
                if isinstance(raw_classification, str):
                    normalized = raw_classification.strip().title()
                    if normalized in {"Hot", "Warm", "Cold", "Hard", "Soft"}:
                        classification = normalized
                sentiment = parsed.get("sentiment")
                detailed_report = parsed.get("detailed_report")
                raw_ai_response = parsed
        except Exception:
            pass

    return {
        "lead_score": lead_score,
        "classification": classification,
        "sentiment": sentiment,
        "detailed_report": detailed_report,
        "score_breakdown": score_breakdown,
        "raw_ai_response": raw_ai_response,
    }


def _insert_call_session(transcript: str, student_id: str | None = None) -> dict[str, Any]:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    analysis = _analyze_transcript_for_call_session(transcript)
    row = {
        "transcript": transcript,
        "lead_score": analysis.get("lead_score"),
        "classification": analysis.get("classification"),
        "sentiment": analysis.get("sentiment"),
        "detailed_report": analysis.get("detailed_report"),
        "score_breakdown": analysis.get("score_breakdown"),
        "raw_ai_response": analysis.get("raw_ai_response"),
        "student_id": student_id if student_id and student_id != "undefined" else None,
    }

    insert_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/call_sessions",
        data=json.dumps([row]).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )

    with urlrequest.urlopen(insert_req, timeout=20) as response:
        rows = json.loads(response.read().decode("utf-8"))
        return rows[0] if isinstance(rows, list) and rows else {}


def _generate_call_opening_with_groq(context: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    if not api_key:
        return "Hi, I am your StudyAbroad AI counselor. I am calling to guide your admissions journey."

    body = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a warm study-abroad counselor speaking on a phone call. "
                    "Write a short opening in 2 to 3 sentences and end with one clear question."
                ),
            },
            {
                "role": "user",
                "content": f"Conversation context:\n{context}",
            },
        ],
        "temperature": 0.3,
    }

    try:
        with httpx.Client(timeout=8) as client:
            response = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                return "Hi, I am your StudyAbroad AI counselor. Could you share your top preferred country?"
            content = choices[0].get("message", {}).get("content", "")
            return content.strip() or "Hi, I am your StudyAbroad AI counselor. Could you share your top preferred country?"
    except Exception:
        return "Hi, I am your StudyAbroad AI counselor. Could you share your top preferred country?"


def _generate_next_call_turn_with_groq(context: str, transcript: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    if not api_key:
        return "Thanks. What is your target country and intake?"

    body = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a study abroad counselor on a phone call. "
                    "Ask exactly one concise next question based on the conversation. "
                    "Keep response under 35 words. "
                    "If enough details are collected, respond with [[END]] at the end."
                ),
            },
            {
                "role": "user",
                "content": f"Counselor context:\n{context}\n\nCall transcript so far:\n{transcript}",
            },
        ],
        "temperature": 0.3,
    }

    try:
        with httpx.Client(timeout=7) as client:
            response = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={**body, "max_tokens": 80},
            )
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                return "Thanks. What budget range do you have in mind?"
            content = choices[0].get("message", {}).get("content", "")
            return content.strip() or "Thanks. What budget range do you have in mind?"
    except Exception:
        return "Thanks. What budget range do you have in mind?"


def _extract_student_phone_from_call(from_number: str, to_number: str) -> str:
    twilio_number = (os.getenv("TWILIO_PHONE_NUMBER") or "").strip()
    if twilio_number and to_number.strip() == twilio_number:
        return from_number.strip()
    if twilio_number and from_number.strip() == twilio_number:
        return to_number.strip()
    return to_number.strip() or from_number.strip()


def _is_public_webhook_base(url: str) -> bool:
    if not url:
        return False
    normalized = url.strip().lower()
    if not (normalized.startswith("https://") or normalized.startswith("http://")):
        return False
    blocked_hosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"]
    return not any(host in normalized for host in blocked_hosts)


def _build_call_gather_twiml(message: str, action_url: str, end_call: bool = False) -> str:
    safe_message = escape(message)
    if end_call:
        return (
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            "<Response>"
            f"<Say voice=\"alice\">{safe_message}</Say>"
            "<Hangup/>"
            "</Response>"
        )

    return (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<Response>"
        f"<Gather input=\"speech\" actionOnEmptyResult=\"true\" timeout=\"6\" speechTimeout=\"auto\" action=\"{escape(action_url)}\" method=\"POST\">"
        f"<Say voice=\"alice\">{safe_message}</Say>"
        "</Gather>"
        f"<Redirect method=\"POST\">{escape(action_url)}</Redirect>"
        "</Response>"
    )


def _finalize_twilio_call_session(call_sid: str, fallback_phone: str = "") -> bool:
    state = TWILIO_CALL_STATE.get(call_sid)
    if not state:
        return False
    transcript_lines = state.get("history", [])
    transcript = "\n".join(line for line in transcript_lines if isinstance(line, str)).strip()
    if not transcript:
        TWILIO_CALL_STATE.pop(call_sid, None)
        return False

    student_id = state.get("student_id")
    if not student_id and fallback_phone:
        student_id = _resolve_student_id_by_phone(fallback_phone)
    if not student_id:
        state_phone = str(state.get("phone") or "").strip()
        if state_phone:
            student_id = _resolve_student_id_by_phone(state_phone)

    saved = False
    try:
        inserted = _insert_call_session(transcript=transcript, student_id=student_id)
        inserted_id = str(inserted.get("id") or "") if isinstance(inserted, dict) else ""
        saved = bool(inserted_id)
        if saved:
            TWILIO_SAVED_CALL_SIDS.add(str(call_sid))
        if student_id and inserted_id:
            _send_whatsapp_summary(str(student_id), inserted_id)
    except Exception:
        pass
    finally:
        TWILIO_CALL_STATE.pop(call_sid, None)
    return saved


TWILIO_TERMINAL_STATUSES = {"completed", "busy", "failed", "no-answer", "canceled"}


@app.post("/api/v1/calls/outbound", tags=["voice"])
def create_outbound_call(payload: OutboundCallRequest) -> dict[str, str]:
    _load_local_env()
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER")

    if not account_sid or not auth_token or not from_number:
        raise HTTPException(
            status_code=500,
            detail="Missing Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).",
        )

    target_number = (payload.to_number or "").strip()
    if not target_number and payload.student_phone:
        target_number = payload.student_phone.strip()
    if not target_number and payload.student_id:
        target_number = _resolve_student_phone_by_id(payload.student_id) or ""

    target_number = _normalize_phone_for_call(target_number)
    if not target_number:
        raise HTTPException(status_code=400, detail="Unable to determine student phone number for call.")

    base_context = os.getenv("ANAM_SYSTEM_PROMPT", "You are a study abroad counselor")
    student_label = f"Student name: {payload.student_name}." if payload.student_name else ""
    call_context = (payload.context or "").strip()
    full_context = " ".join(part for part in [base_context, student_label, call_context] if part).strip()
    opening_script = _generate_call_opening_with_groq(full_context)
    webhook_base = (os.getenv("TWILIO_WEBHOOK_BASE_URL") or "").strip().rstrip("/")
    voice_turn_url = f"{webhook_base}/api/v1/webhook/voice-turn" if _is_public_webhook_base(webhook_base) else ""
    voice_status_url = f"{webhook_base}/api/v1/webhook/voice-status" if _is_public_webhook_base(webhook_base) else ""
    if not voice_turn_url:
        raise HTTPException(
            status_code=400,
            detail=(
                "Interactive call flow is disabled. Set TWILIO_WEBHOOK_BASE_URL to a public HTTPS URL "
                "(for example an ngrok URL) so Twilio can post speech responses to /api/v1/webhook/voice-turn."
            ),
        )

    twiml = _build_call_gather_twiml(opening_script, voice_turn_url, end_call=False)
    student_id = payload.student_id or _resolve_student_id_by_phone(target_number)

    try:
        with httpx.Client(timeout=20) as client:
            response = client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json",
                auth=(account_sid, auth_token),
                data={
                    "To": target_number,
                    "From": from_number,
                    "Twiml": twiml,
                    "StatusCallback": voice_status_url,
                    "StatusCallbackMethod": "POST",
                    "StatusCallbackEvent": "completed",
                },
            )

        data = response.json() if response.content else {}
        if response.status_code >= 400:
            raise HTTPException(
                status_code=500,
                detail=data.get("message") or f"Twilio call failed with status {response.status_code}",
            )

        call_sid = data.get("sid")
        if not call_sid:
            raise HTTPException(status_code=500, detail="Twilio call created but SID missing in response.")

        TWILIO_CALL_STATE[str(call_sid)] = {
            "history": [f"[AI]: {opening_script}"],
            "context": full_context,
            "turns": 0,
            "no_input_count": 0,
            "student_id": student_id,
            "phone": target_number,
        }
        return {"message": "Outbound call initiated", "call_sid": str(call_sid)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to initiate outbound call: {exc}") from exc


@app.post("/api/v1/webhook/voice-status", tags=["voice"])
def handle_voice_status(
    CallSid: str = Form(...),
    CallStatus: str = Form(default=""),
    From: str = Form(default=""),
    To: str = Form(default=""),
):
    status = (CallStatus or "").strip().lower()
    finalized = False
    had_state = CallSid in TWILIO_CALL_STATE
    saved = False

    if status in TWILIO_TERMINAL_STATUSES:
        fallback_phone = _extract_student_phone_from_call(From, To)
        saved = _finalize_twilio_call_session(CallSid, fallback_phone=fallback_phone)

        if not saved and CallSid not in TWILIO_SAVED_CALL_SIDS:
            # Fail-safe: if process reload/loss removed state, still persist a session marker.
            student_id = _resolve_student_id_by_phone(fallback_phone) if fallback_phone else None
            fallback_transcript = (
                f"[SYSTEM] Twilio call ended. Call SID: {CallSid}. "
                f"Status: {status}. Transcript unavailable from webhook state."
            )
            try:
                inserted = _insert_call_session(transcript=fallback_transcript, student_id=student_id)
                inserted_id = str(inserted.get("id") or "") if isinstance(inserted, dict) else ""
                if inserted_id:
                    saved = True
                    TWILIO_SAVED_CALL_SIDS.add(str(CallSid))
            except Exception:
                saved = False

        finalized = True

    return {
        "status": "ok",
        "call_sid": CallSid,
        "call_status": status,
        "had_state": had_state,
        "saved": saved,
        "finalized": finalized,
    }

@app.post("/api/v1/webhook/incoming-call")
def handle_incoming_call(
    CallSid: str = Form(...),
    From: str = Form(default=""),
    To: str = Form(default=""),
):
    webhook_base = (os.getenv("TWILIO_WEBHOOK_BASE_URL") or "").strip().rstrip("/")
    voice_turn_url = f"{webhook_base}/api/v1/webhook/voice-turn" if webhook_base else ""
    if not voice_turn_url:
        return Response(content="<Response><Say>Server is not configured for call flow.</Say><Hangup/></Response>", media_type="text/xml")

    base_context = os.getenv("ANAM_SYSTEM_PROMPT", "You are a study abroad counselor")
    opening_script = _generate_call_opening_with_groq(base_context)
    caller_phone = _extract_student_phone_from_call(From, To)
    TWILIO_CALL_STATE[CallSid] = {
        "history": [f"[AI]: {opening_script}"],
        "context": base_context,
        "turns": 0,
        "no_input_count": 0,
        "student_id": _resolve_student_id_by_phone(caller_phone),
        "phone": caller_phone,
    }

    return Response(content=_build_call_gather_twiml(opening_script, voice_turn_url, end_call=False), media_type="text/xml")


@app.post("/api/v1/webhook/voice-turn", tags=["voice"])
def handle_voice_turn(
    CallSid: str = Form(...),
    SpeechResult: str = Form(default=""),
    From: str = Form(default=""),
    To: str = Form(default=""),
):
    webhook_base = (os.getenv("TWILIO_WEBHOOK_BASE_URL") or "").strip().rstrip("/")
    voice_turn_url = f"{webhook_base}/api/v1/webhook/voice-turn" if webhook_base else ""
    if not voice_turn_url:
        return Response(content="<Response><Say>Server is not configured for call flow.</Say><Hangup/></Response>", media_type="text/xml")
    try:
        state = TWILIO_CALL_STATE.get(CallSid)
        if not state:
            base_context = os.getenv("ANAM_SYSTEM_PROMPT", "You are a study abroad counselor")
            caller_phone = _extract_student_phone_from_call(From, To)
            state = {
                "history": [],
                "context": base_context,
                "turns": 0,
                "no_input_count": 0,
                "student_id": _resolve_student_id_by_phone(caller_phone),
                "phone": caller_phone,
            }
            TWILIO_CALL_STATE[CallSid] = state

        user_text = (SpeechResult or "").strip()
        if not user_text:
            no_input_count = int(state.get("no_input_count", 0)) + 1
            state["no_input_count"] = no_input_count
            if no_input_count >= 3:
                closing = "I could not hear a response, so I will end this call now. We can continue later."
                state.setdefault("history", []).append(f"[AI]: {closing}")
                fallback_phone = _extract_student_phone_from_call(From, To)
                _finalize_twilio_call_session(CallSid, fallback_phone=fallback_phone)
                return Response(content=_build_call_gather_twiml(closing, voice_turn_url, end_call=True), media_type="text/xml")

            reprompt = "I did not catch that. Please say your answer after the beep."
            state.setdefault("history", []).append(f"[AI]: {reprompt}")
            return Response(content=_build_call_gather_twiml(reprompt, voice_turn_url, end_call=False), media_type="text/xml")

        state["no_input_count"] = 0
        state.setdefault("history", []).append(f"[USER]: {user_text}")
        lowered = user_text.lower()
        if any(word in lowered for word in ["bye", "goodbye", "stop", "end call", "thank you"]):
            closing = "Thanks for your time. I will save this session and our team will follow up with next steps."
            state.setdefault("history", []).append(f"[AI]: {closing}")
            fallback_phone = _extract_student_phone_from_call(From, To)
            _finalize_twilio_call_session(CallSid, fallback_phone=fallback_phone)
            return Response(content=_build_call_gather_twiml(closing, voice_turn_url, end_call=True), media_type="text/xml")

        turns = int(state.get("turns", 0)) + 1
        state["turns"] = turns

        transcript_so_far = "\n".join(state.get("history", []))
        next_reply = _generate_next_call_turn_with_groq(str(state.get("context", "")), transcript_so_far)
        model_requested_end = "[[END]]" in next_reply
        max_turns = int(os.getenv("TWILIO_MAX_TURNS", "12"))
        should_end = (model_requested_end and turns >= 3) or turns >= max_turns
        next_reply = next_reply.replace("[[END]]", "").strip() or "Thank you for sharing."
        state.setdefault("history", []).append(f"[AI]: {next_reply}")

        if should_end:
            final_message = f"{next_reply} Thank you. I have recorded this session and we will share next steps shortly."
            state.setdefault("history", []).append(f"[AI]: {final_message}")
            fallback_phone = _extract_student_phone_from_call(From, To)
            _finalize_twilio_call_session(CallSid, fallback_phone=fallback_phone)
            return Response(content=_build_call_gather_twiml(final_message, voice_turn_url, end_call=True), media_type="text/xml")

        return Response(content=_build_call_gather_twiml(next_reply, voice_turn_url, end_call=False), media_type="text/xml")
    except Exception:
        # Always return valid TwiML so Twilio does not announce an application error.
        safe_reprompt = "I hit a temporary issue. Please repeat your answer."
        return Response(content=_build_call_gather_twiml(safe_reprompt, voice_turn_url, end_call=False), media_type="text/xml")

@app.post("/api/v1/webhook/transcription")
def handle_call_transcription(
    CallSid: str = Form(...),
    TranscriptionText: str = Form(default=""),
    RecordingUrl: str = Form(default=""),
    Caller: str = Form(default=""),
    Called: str = Form(default=""),
):
    if not TranscriptionText.strip():
        return {"status": "skipped", "reason": "empty_transcription", "call_sid": CallSid}

    student_phone = _extract_student_phone_from_call(Caller, Called)
    student_id = _resolve_student_id_by_phone(student_phone)
    inserted_session_id = ""
    whatsapp: dict[str, Any] = {
        "attempted": False,
        "sent": False,
        "message_sid": None,
        "error": None,
    }

    try:
        inserted = _insert_call_session(transcript=TranscriptionText, student_id=student_id)
        inserted_session_id = str(inserted.get("id") or "") if isinstance(inserted, dict) else ""

        if student_id and inserted_session_id:
            whatsapp["attempted"] = True
            try:
                sent = _send_whatsapp_summary(str(student_id), inserted_session_id)
                whatsapp["sent"] = True
                whatsapp["message_sid"] = sent.get("message_sid")
            except Exception as err:
                whatsapp["error"] = str(err)
    except Exception:
        if not whatsapp["error"]:
            whatsapp["error"] = "Failed to save call session from transcription webhook."

    return {
        "status": "ok",
        "call_sid": CallSid,
        "student_id": student_id,
        "session_id": inserted_session_id,
        "whatsapp": whatsapp,
    }

@app.post("/api/v1/webhook/whatsapp-incoming")
@app.post("/api/v1/webhook/whatsapp/incoming")
def handle_whatsapp_incoming(
    Body: str = Form(...),
    From: str = Form(...),
    ProfileName: str = Form(default=""),
    WaId: str = Form(default=""),
):
    text = (Body or "").strip()
    student = _get_student_by_phone(From)

    if not student:
        fallback_phone = WaId.strip()
        if fallback_phone:
            student = _get_student_by_phone(f"+{fallback_phone}")

    if not student:
        reply = "Hi! We do not have your number on file. Please contact our team to get registered."
        twiml = (
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            "<Response>"
            f"<Message>{escape(reply)}</Message>"
            "</Response>"
        )
        return Response(content=twiml, media_type="application/xml")

    student_id = str(student.get("id") or "")
    student_name = str(student.get("full_name") or ProfileName or "there")
    upper = text.upper()

    if upper.startswith("SUMMARY"):
        try:
            _send_whatsapp_summary(student_id)
            reply = "Done. I sent your latest session summary."
        except Exception as err:
            reply = f"Could not send summary right now: {err}"
    elif upper.startswith("BOOK"):
        raw = text[4:].strip()
        parsed_time = None
        for fmt in ("%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M", "%d-%m-%Y %H:%M"):
            try:
                parsed_time = datetime.strptime(raw, fmt)
                break
            except ValueError:
                continue

        if not parsed_time:
            reply = "Booking format not recognized. Use: BOOK YYYY-MM-DD HH:MM"
        else:
            try:
                meeting = _create_meeting_row(student_id=student_id, scheduled_at=parsed_time, meeting_link=None)
                _send_whatsapp_reminder(student_id, parsed_time, None)
                reply = f"Appointment booked. Meeting ID: {meeting.get('id', '')}"
            except Exception as err:
                reply = f"Could not book appointment: {err}"
    else:
        extracted = _extract_profile_fields_from_text(text)
        if extracted:
            try:
                _upsert_academic_profile(student_id, extracted)
                keys = ", ".join(sorted(extracted.keys()))
                reply = f"Thanks {student_name}. I updated your profile fields: {keys}."
            except Exception as err:
                reply = f"I read your details but could not update profile now: {err}"
        else:
            reply = (
                f"Hi {student_name}. Send SUMMARY for latest call summary, "
                "BOOK YYYY-MM-DD HH:MM to schedule, or share profile details like "
                "country: Canada, course: MS CS, gpa: 8.2, budget: 30L."
            )

    twiml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<Response>"
        f"<Message>{escape(reply)}</Message>"
        "</Response>"
    )
    return Response(content=twiml, media_type="application/xml")


@app.post("/api/v1/webhook/whatsapp-status")
@app.post("/api/v1/webhook/whatsapp/status")
def handle_whatsapp_status(
    MessageSid: str = Form(...),
    MessageStatus: str = Form(...),
    To: str = Form(default=""),
    ErrorCode: str = Form(default=""),
    ErrorMessage: str = Form(default=""),
):
    return {
        "status": "ok",
        "message_sid": MessageSid,
        "message_status": MessageStatus,
        "to": To,
        "error_code": ErrorCode,
        "error_message": ErrorMessage,
    }


@app.post("/api/v1/messages/whatsapp/send-summary", tags=["messaging"])
def send_whatsapp_summary(
    student_id: str | None = Query(default=None),
    lead_id: str | None = Query(default=None),
    call_session_id: str | None = Query(default=None),
) -> dict[str, str]:
    final_student_id = (student_id or lead_id or "").strip()
    if not final_student_id:
        raise HTTPException(status_code=400, detail="Provide student_id or lead_id.")
    result = _send_whatsapp_summary(final_student_id, call_session_id)
    return {
        "message": "WhatsApp summary sent",
        "student_id": result["student_id"],
        "session_id": result["session_id"],
        "message_sid": result["message_sid"],
    }


@app.post("/api/v1/messages/whatsapp/send-reminder", tags=["messaging"])
def send_whatsapp_reminder(payload: WhatsAppReminderRequest) -> dict[str, str]:
    result = _send_whatsapp_reminder(
        student_id=payload.student_id,
        scheduled_at=payload.scheduled_at,
        meeting_link=payload.meeting_link,
    )
    return {
        "message": "WhatsApp reminder sent",
        "student_id": result["student_id"],
        "message_sid": result["message_sid"],
    }


@app.post("/api/v1/profiles/extract", tags=["students"])
def extract_profile_data(payload: ProfileExtractRequest) -> dict[str, Any]:
    student = _get_student_by_id(payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    extracted = _extract_profile_fields_from_text(payload.text)
    if not extracted:
        return {
            "message": "No profile fields extracted",
            "student_id": payload.student_id,
            "source": payload.source,
            "updated_profile": {},
        }

    updated_profile = _upsert_academic_profile(payload.student_id, extracted)
    return {
        "message": "Profile data extracted and saved",
        "student_id": payload.student_id,
        "source": payload.source,
        "extracted": extracted,
        "updated_profile": updated_profile,
    }


@app.post("/api/v1/book", tags=["appointments"])
def book_calendar_event(payload: CalendarBookRequest):
    if payload.endTime <= payload.startTime:
        raise HTTPException(status_code=400, detail="endTime must be after startTime.")

    event_payload = {
        "summary": (payload.subject or "AI Counselling Session").strip() or "AI Counselling Session",
        "description": (payload.description or "Scheduled via StudyAbroad.AI dashboard").strip(),
        "start": {"dateTime": payload.startTime.isoformat()},
        "end": {"dateTime": payload.endTime.isoformat()},
    }

    req = urlrequest.Request(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        data=json.dumps(event_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {payload.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
            return {
                "success": True,
                "eventId": data.get("id"),
                "htmlLink": data.get("htmlLink"),
            }
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=400, detail=f"Failed to create calendar event: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Google Calendar API unreachable: {err.reason}") from err


@app.get("/api/v1/calendar/events", tags=["appointments"])
def get_calendar_events(
    request: Request,
    access_token: str | None = Query(default=None),
    max_results: int = Query(default=10, ge=1, le=50),
):
    bearer_token = ""
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        bearer_token = auth_header[7:].strip()

    token = (bearer_token or access_token or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token.")

    now_utc = datetime.utcnow().isoformat() + "Z"
    params = urlencode(
        {
            "maxResults": str(max_results),
            "singleEvents": "true",
            "orderBy": "startTime",
            "timeMin": now_utc,
        }
    )
    req = urlrequest.Request(
        f"https://www.googleapis.com/calendar/v3/calendars/primary/events?{params}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
            items = payload.get("items", []) if isinstance(payload, dict) else []
            events = []
            for item in items:
                start_obj = item.get("start", {}) if isinstance(item, dict) else {}
                start_time = start_obj.get("dateTime") or start_obj.get("date")
                events.append(
                    {
                        "id": item.get("id"),
                        "summary": item.get("summary") or "Untitled Event",
                        "start": start_time,
                        "htmlLink": item.get("htmlLink"),
                    }
                )

            return {"success": True, "events": events}
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        lower_detail = detail.lower()
        if err.code in {400, 401, 403} and (
            "invalid credentials" in lower_detail
            or "insufficient" in lower_detail
            or "permission" in lower_detail
            or "scope" in lower_detail
            or "login required" in lower_detail
        ):
            return {
                "success": True,
                "events": [],
                "warning": "Google Calendar access expired or missing permission. Reconnect Google to sync events.",
            }
        raise HTTPException(status_code=400, detail=f"Failed to fetch calendar events: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Google Calendar API unreachable: {err.reason}") from err


@app.get("/api/v1/auth/google/profile", tags=["auth"])
def get_google_profile(access_token: str = Query(...)) -> dict[str, str | bool | None]:
    profile = _fetch_google_userinfo(access_token)
    student = _sync_student_on_login(profile)
    return {
        "sub": profile.get("sub"),
        "student_id": student.get("id") if isinstance(student, dict) else None,
        "full_name": profile.get("name"),
        "email": profile.get("email"),
        "picture": profile.get("picture"),
        "phone_number": student.get("phone_number") if isinstance(student, dict) else None,
        "location": student.get("location") if isinstance(student, dict) else None,
        "needs_onboarding": not _is_student_onboarding_complete(student if isinstance(student, dict) else {}),
    }


@app.post("/api/v1/students/complete", tags=["auth"])
def complete_student_profile(payload: StudentCompleteRequest) -> dict[str, str | bool | None]:
    profile = _fetch_google_userinfo(payload.access_token)
    student = _sync_student_on_login(profile)
    student_id = student.get("id") if isinstance(student, dict) else None
    if not student_id:
        raise HTTPException(status_code=400, detail="Student record not found for current login.")

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    update_payload = {
        "full_name": payload.full_name.strip(),
        "phone_number": payload.phone_number.strip(),
        "location": payload.location.strip() if payload.location else None,
    }
    update_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/students?id=eq.{student_id}",
        data=json.dumps(update_payload).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        },
        method="PATCH",
    )

    try:
        with urlrequest.urlopen(update_req, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))
            updated = rows[0] if isinstance(rows, list) and rows else {}
            return {
                "student_id": updated.get("id"),
                "full_name": updated.get("full_name"),
                "email": updated.get("email"),
                "phone_number": updated.get("phone_number"),
                "location": updated.get("location"),
                "needs_onboarding": not _is_student_onboarding_complete(updated),
            }
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=400, detail=f"Failed to complete student profile: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


@app.post("/api/v1/rag/query", response_model=RagQueryResponse, tags=["rag"])
def rag_query(payload: RagQueryRequest) -> RagQueryResponse:
    rows = _supabase_fetch_knowledge_rows(category=payload.category)
    ranked = _rank_knowledge_chunks(payload.query, rows)
    selected_contexts = ranked[: payload.top_k]
    answer = _generate_answer_from_context(payload.query, selected_contexts)
    return RagQueryResponse(answer=answer, contexts=selected_contexts)


@app.get("/api/v1/universities", tags=["admin"])
def list_universities(access_token: str = Query(...)) -> dict[str, list[dict]]:
    _require_admin(access_token)

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    query = urlencode(
        {
            "select": "id,name,country,description,admission_requirements,average_cost_usd,scholarships_available",
            "order": "created_at.desc",
            "limit": "200",
        }
    )
    req = urlrequest.Request(
        f"{supabase_url}/rest/v1/universities?{query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))
            return {"universities": rows if isinstance(rows, list) else []}
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase universities fetch failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


@app.get("/api/v1/admin/priority-queue", tags=["admin"])
def get_priority_queue(access_token: str = Query(...)) -> dict[str, list[dict]]:
    _require_admin(access_token)

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    sessions_query = urlencode(
        {
            "select": "student_id,lead_score,classification,created_at",
            "order": "lead_score.desc,created_at.desc",
            "limit": "12",
        }
    )
    sessions_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/call_sessions?{sessions_query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(sessions_req, timeout=20) as response:
            sessions = json.loads(response.read().decode("utf-8"))
            if not isinstance(sessions, list):
                sessions = []
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase call sessions fetch failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    student_ids = [row.get("student_id") for row in sessions if row.get("student_id")]
    unique_ids = list(dict.fromkeys(student_ids))
    if not unique_ids:
        return {"students": []}

    in_values = ",".join(unique_ids)
    students_query = urlencode(
        {
            "select": "id,full_name,email,phone_number",
            "id": f"in.({in_values})",
        }
    )
    students_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/students?{students_query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(students_req, timeout=20) as response:
            students_rows = json.loads(response.read().decode("utf-8"))
            if not isinstance(students_rows, list):
                students_rows = []
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase students fetch failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    student_lookup = {row.get("id"): row for row in students_rows if row.get("id")}
    results: list[dict[str, str]] = []
    for row in sessions:
        student_id = row.get("student_id")
        if not student_id:
            continue
        student = student_lookup.get(student_id, {})
        lead_score = row.get("lead_score")
        classification = row.get("classification")
        priority_label = classification or ("High" if (lead_score or 0) >= 75 else "Medium" if (lead_score or 0) >= 50 else "Low")
        stage_label = f"Lead score {lead_score}" if lead_score is not None else "Lead score TBD"

        results.append(
            {
                "id": student_id,
                "full_name": student.get("full_name") or "Unnamed Student",
                "stage": stage_label,
                "priority": priority_label,
            }
        )

    return {"students": results}


@app.get("/api/v1/admin/students/{student_id}/reports", tags=["admin"])
def get_student_reports(student_id: str, access_token: str = Query(...)) -> dict[str, Any]:
    _require_admin(access_token)

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE key.")

    student_query = urlencode(
        {
            "select": "id,full_name,email,phone_number",
            "id": f"eq.{student_id}",
            "limit": "1",
        }
    )
    student_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/students?{student_query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(student_req, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))
            student = rows[0] if isinstance(rows, list) and rows else None
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase students fetch failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    sessions_query = urlencode(
        {
            "select": "id,student_id,transcript,sentiment,lead_score,classification,score_breakdown,recommended_actions,raw_ai_response,created_at,detailed_report",
            "student_id": f"eq.{student_id}",
            "order": "created_at.desc",
            "limit": "200",
        }
    )
    sessions_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/call_sessions?{sessions_query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlrequest.urlopen(sessions_req, timeout=20) as response:
            sessions = json.loads(response.read().decode("utf-8"))
            if not isinstance(sessions, list):
                sessions = []
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase call sessions fetch failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    return {"student": student, "reports": sessions}


@app.get("/api/v1/dashboard/metrics", tags=["dashboard"])
def dashboard_metrics() -> dict[str, int]:
    # TODO: aggregate metrics from Supabase for analytics charts.
    return {"total_calls": 0, "hot_leads": 0, "warm_leads": 0, "cold_leads": 0}
class SessionTokenResponse(BaseModel):
    session_token: str


class SessionTokenRequest(BaseModel):
    languageCode: str | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/save-session", tags=["session"])
async def save_session(request: SaveSessionRequest) -> dict[str, str]:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE credentials.")

    payload = [
        {
            "transcript": request.transcript
        }
    ]
    
    insert_req = urlrequest.Request(
        f"{supabase_url}/rest/v1/call_sessions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=minimal"
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(insert_req, timeout=10) as response:
            if response.status >= 400:
                raise HTTPException(status_code=response.status, detail="Failed to save transcript to Supabase")
            return {"status": "saved"}
    except HTTPError as err:
        body = err.read().decode('utf-8', errors='ignore')
        print(f"Supabase HTTPError: {err.reason}, Body: {body}")
        raise HTTPException(status_code=502, detail=f"Supabase create failed: {err.reason}, {body}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


@app.post("/anam/session", response_model=SessionTokenResponse)
async def create_anam_session(request: Request) -> SessionTokenResponse:
    # Reload .env at request time so updated keys are picked up without a full restart.
    _load_local_env()
    auth_header = request.headers.get("authorization", "")
    header_api_key = request.headers.get("x-anam-api-key")
    bearer_token = auth_header[7:].strip() if auth_header.lower().startswith("bearer ") else ""

    anam_api_key = (os.getenv("ANAM_API_KEY") or header_api_key or bearer_token or "").strip()
    avatar_id = os.getenv("ANAM_AVATAR_ID", DEFAULT_AVATAR_ID)
    persona_id = os.getenv("ANAM_PERSONA_ID")
    voice_id = os.getenv("ANAM_VOICE_ID")
    llm_id = os.getenv("ANAM_LLM_ID")
    persona_name = os.getenv("ANAM_PERSONA_NAME")
    system_prompt = os.getenv("ANAM_SYSTEM_PROMPT")

    body: dict[str, Any] = {}
    try:
        body = await request.json()
    except Exception:
        body = {}

    requested_language = str(body.get("languageCode") or body.get("language_code") or "").strip().lower()
    configured_language = os.getenv("ANAM_LANGUAGE_CODE", "").strip().lower()
    language_code = requested_language or configured_language

    if language_code and not re.fullmatch(r"[a-z]{2}", language_code):
        raise HTTPException(status_code=400, detail="languageCode must be a 2-letter ISO-639-1 code")

    if not anam_api_key:
        raise HTTPException(status_code=500, detail="ANAM_API_KEY is not set")

    # Use published persona when available, otherwise send the provided persona fields.
    if persona_id:
        persona_config: dict[str, Any] = {"personaId": persona_id}
        if language_code:
            persona_config["languageCode"] = language_code
    else:
        if not avatar_id or not voice_id:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Incomplete Anam persona configuration. Set ANAM_PERSONA_ID, or set "
                    "ANAM_AVATAR_ID + ANAM_VOICE_ID in backend environment."
                ),
            )

        persona_config = {
            "avatarId": avatar_id,
            "voiceId": voice_id,
        }

        if llm_id:
            persona_config["llmId"] = llm_id

        if persona_name:
            persona_config["name"] = persona_name
        if system_prompt:
            persona_config["systemPrompt"] = system_prompt
        if language_code:
            persona_config["languageCode"] = language_code

    payload = {"personaConfig": persona_config}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                os.getenv("ANAM_SESSION_URL", ANAM_SESSION_URL),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {anam_api_key}",
                },
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to contact Anam API: {exc}") from exc

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Anam API returned an error",
                "status_code": response.status_code,
                "body": response.text,
            },
        )

    data = response.json()
    session_token = data.get("sessionToken") or data.get("session_token")

    if not session_token:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "session token missing in Anam API response",
                "body": data,
            },
        )

    return SessionTokenResponse(session_token=session_token)


class SaveSessionRequest(BaseModel):
    transcript: str
    student_id: Optional[str] = None
    student_phone: Optional[str] = None

class RecommendationResponse(BaseModel):
    id: str | None = None
    name: str | None = None
    country: str | None = None
    flag: str | None = None
    tuition: str | None = None
    ranking: str | None = None
    course: str | None = None
    match: int | None = None
    deadline: str | None = None
    tag: str | None = None
    tagColor: str | None = None
    reason: str | None = None


def _country_flag(country: str | None) -> str:
    country_map = {
        "united kingdom": "GB",
        "uk": "GB",
        "great britain": "GB",
        "ireland": "IE",
        "united states": "US",
        "usa": "US",
        "canada": "CA",
        "australia": "AU",
        "new zealand": "NZ",
        "germany": "DE",
        "france": "FR",
        "italy": "IT",
        "spain": "ES",
        "netherlands": "NL",
        "sweden": "SE",
        "singapore": "SG",
        "uae": "AE",
    }
    key = (country or "").strip().lower()
    code = country_map.get(key)
    if not code:
        return "ðŸŽ“"
    return "".join(chr(127397 + ord(ch)) for ch in code)


def _format_tuition(cost: Any) -> str:
    if cost in (None, ""):
        return "N/A"
    try:
        value = float(cost)
        return f"${value:,.0f}/yr"
    except (TypeError, ValueError):
        return str(cost)


def _build_recommendation_from_db(
    uni: dict[str, Any],
    llm_item: dict[str, Any] | None = None,
) -> RecommendationResponse:
    llm_item = llm_item or {}
    match_raw = llm_item.get("match", 80)
    try:
        match_value = int(match_raw)
    except (TypeError, ValueError):
        match_value = 80
    match_value = max(0, min(100, match_value))

    return RecommendationResponse(
        id=str(uni.get("id") or ""),
        name=str(uni.get("name") or ""),
        country=str(uni.get("country") or ""),
        flag=_country_flag(uni.get("country")),
        tuition=_format_tuition(uni.get("average_cost_usd")),
        ranking="N/A",
        course=str(llm_item.get("course") or "Recommended Program"),
        match=match_value,
        deadline=str(llm_item.get("deadline") or "Rolling"),
        tag=str(llm_item.get("tag") or "Top Match"),
        tagColor=str(llm_item.get("tagColor") or "blue"),
        reason=str(llm_item.get("reason") or "Recommended based on your latest counseling session."),
    )


def _fetch_universities(limit: int = 50) -> list[dict[str, Any]]:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not service_key:
        return []

    req = urlrequest.Request(
        f"{supabase_url}/rest/v1/universities?select=*&order=created_at.asc&limit={max(1, limit)}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urlrequest.urlopen(req, timeout=10) as res:
            rows = json.loads(res.read().decode("utf-8"))
            return rows if isinstance(rows, list) else []
    except Exception:
        return []


@app.get("/api/v1/universities/default-recommendations", response_model=list[RecommendationResponse], tags=["recommendations"])
async def get_default_university_recommendations(limit: int = Query(default=3, ge=1, le=10)):
    universities = _fetch_universities(limit=limit)
    return [_build_recommendation_from_db(u) for u in universities[:limit]]

@app.get("/api/v1/students/{student_id}/recommendations", response_model=list[RecommendationResponse], tags=["recommendations"])
async def get_student_recommendations(student_id: str):
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not supabase_url or not service_key:
            raise HTTPException(status_code=500, detail="Missing DB config")

        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        }
        
        session_req = urlrequest.Request(
            f"{supabase_url}/rest/v1/call_sessions?student_id=eq.{student_id}&select=transcript,detailed_report,raw_ai_response&order=created_at.desc&limit=1",
            headers=headers,
            method="GET"
        )
        transcript_text = ""
        try:
            with urlrequest.urlopen(session_req, timeout=10) as res:
                sessions = json.loads(res.read().decode('utf-8'))
                if sessions:
                    transcript_text = str(sessions[0])
        except Exception as e:
            print("Sessions error", e)

        universities = _fetch_universities(limit=50)
            
        if not universities:
            return []

        if not transcript_text:
            # Default view before session insights are available.
            return [_build_recommendation_from_db(u) for u in universities[:3]]

        universities_by_id = {
            str(row.get("id")): row
            for row in universities
            if row.get("id")
        }

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            # DB-only fallback when LLM is unavailable.
            return [_build_recommendation_from_db(u) for u in universities[:3]]

        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        prompt = f"""
You are a study-abroad counselor.
Pick the top 3 universities ONLY from the provided database IDs.

Student session details:
{transcript_text}

Available universities (DB rows):
{json.dumps(universities)}

Return strict JSON array with exactly 3 items.
Each item must contain only:
- id (must be one of the provided IDs)
- course
- match (0-100 integer)
- deadline
- tag
- tagColor (blue|green|purple|orange|gray)
- reason
No markdown. No extra keys.
"""

        llm_req = urlrequest.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(
                {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Output raw JSON array only. Use only IDs from input universities.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                }
            ).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlrequest.urlopen(llm_req, timeout=30) as res:
                resp_data = json.loads(res.read().decode("utf-8"))
                content = resp_data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if content.startswith("```"):
                    content = content.replace("```json", "").replace("```", "").strip()

                llm_recs = json.loads(content)
                if not isinstance(llm_recs, list):
                    raise ValueError("LLM response is not a list")

                resolved: list[RecommendationResponse] = []
                seen: set[str] = set()
                for item in llm_recs:
                    if not isinstance(item, dict):
                        continue
                    rec_id = str(item.get("id") or "")
                    if not rec_id or rec_id in seen:
                        continue
                    uni_row = universities_by_id.get(rec_id)
                    if not uni_row:
                        continue
                    resolved.append(_build_recommendation_from_db(uni_row, item))
                    seen.add(rec_id)
                    if len(resolved) == 3:
                        break

                if len(resolved) < 3:
                    for row in universities:
                        row_id = str(row.get("id") or "")
                        if not row_id or row_id in seen:
                            continue
                        resolved.append(_build_recommendation_from_db(row))
                        seen.add(row_id)
                        if len(resolved) == 3:
                            break

                return resolved[:3]
        except Exception as e:
            print(f"Error calling Groq for recommendations: {e}")
            return [_build_recommendation_from_db(u) for u in universities[:3]]
    except Exception as general_err:
        print(f"General error: {general_err}")
        fallback = _fetch_universities(limit=3)
        return [_build_recommendation_from_db(u) for u in fallback[:3]]

@app.post("/save-session")
async def save_session(request: SaveSessionRequest):
    try:
        normalized_student_id = request.student_id if request.student_id and request.student_id != "undefined" else None
        if not normalized_student_id and request.student_phone:
            normalized_student_id = _resolve_student_id_by_phone(request.student_phone)

        inserted = _insert_call_session(
            transcript=request.transcript,
            student_id=normalized_student_id,
        )
        session_id = str(inserted.get("id") or "") if isinstance(inserted, dict) else ""
        student_id = str(inserted.get("student_id") or normalized_student_id or "").strip()
        whatsapp: dict[str, Any] = {
            "attempted": False,
            "sent": False,
            "message_sid": None,
            "error": None,
        }

        if student_id and session_id:
            whatsapp["attempted"] = True
            try:
                result = _send_whatsapp_summary(student_id, session_id)
                whatsapp["sent"] = True
                whatsapp["message_sid"] = result.get("message_sid")
            except Exception as err:
                whatsapp["error"] = str(err)

        return {"status": "success", "inserted": inserted, "whatsapp": whatsapp}
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Failed to insert call session: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

# --- PDF routes (sessions endpoint + report-pdf) ------------------------------
import pdf_routes  # noqa: F401  – registers /api/v1/students/{id}/sessions and /api/v1/sessions/{id}/report-pdf


# PDF routes - sessions + report PDF
import pdf_routes  # noqa: F401
