import os
import json
import time
import hmac
import base64
import hashlib
import re
from pathlib import Path
from datetime import datetime
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field


def _load_local_env() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Always override os.environ when reading from .env to ensure hot-reloading 
        # picks up the brand new API key or persona ID
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


def _encode_auth_state(mode: str, origin: str) -> str:
        payload = {"mode": mode, "origin": origin}
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
    encoded_state = _encode_auth_state(mode=mode, origin=app_origin)
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
    student_record = _sync_student_on_login(userinfo)
    user_sub = userinfo.get("sub")
    user_email = userinfo.get("email")

    if not user_sub or not user_email:
        raise HTTPException(status_code=400, detail="Google user info did not include sub/email.")

    if is_popup_flow and app_origin:
        if mode == "popup":
            return _popup_response(app_origin, {"type": "google-oauth-success", "accessToken": str(access_token)})
        return RedirectResponse(
            url=f"{app_origin}/dashboard?access_token={str(access_token)}",
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
    _sync_student_on_login(userinfo)

    if mode == "popup":
        return _popup_response(app_origin, {"type": "google-oauth-success", "accessToken": access_token})

    return RedirectResponse(
        url=f"{app_origin}/dashboard?access_token={access_token}",
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
def create_appointment(payload: AppointmentCreateRequest) -> dict[str, str]:
    # TODO: create booking in Google Calendar/Calendly and persist in Supabase.
    return {
        "message": "Create appointment route",
        "lead_id": payload.lead_id,
        "provider": payload.provider,
    }


@app.post("/api/v1/calls/webhook", tags=["voice"])
def ingest_call_webhook(payload: CallWebhookRequest) -> dict[str, str]:
    # TODO: verify webhook signature, persist transcript chunk, and fan out realtime updates.
    return {"message": "Call webhook route", "call_id": payload.call_id, "event": payload.event_type}


@app.post("/api/v1/messages/whatsapp/send-summary", tags=["messaging"])
def send_whatsapp_summary(lead_id: str = Query(...)) -> dict[str, str]:
    # TODO: send call summary and recommendations through Twilio WhatsApp.
    return {"message": "WhatsApp summary route", "lead_id": lead_id}


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
    access_token: str = Query(...),
    max_results: int = Query(default=10, ge=1, le=50),
):
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
            "Authorization": f"Bearer {access_token}",
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
