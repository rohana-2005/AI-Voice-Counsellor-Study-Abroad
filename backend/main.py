import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

DEFAULT_AVATAR_ID = "f208e2ef-8905-471a-a749-e35f197613b2"
ANAM_SESSION_URL = os.getenv("ANAM_SESSION_URL", "https://api.anam.ai/v1/auth/session-token")

app = FastAPI(title="Anam Session Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionTokenResponse(BaseModel):
    session_token: str


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/anam/session", response_model=SessionTokenResponse)
async def create_anam_session(request: Request) -> SessionTokenResponse:
    auth_header = request.headers.get("authorization", "")
    header_api_key = request.headers.get("x-anam-api-key")
    bearer_token = auth_header[7:].strip() if auth_header.lower().startswith("bearer ") else ""

    anam_api_key = (os.getenv("ANAM_API_KEY") or header_api_key or bearer_token).strip()
    avatar_id = os.getenv("ANAM_AVATAR_ID", DEFAULT_AVATAR_ID)
    persona_id = os.getenv("ANAM_PERSONA_ID")
    voice_id = os.getenv("ANAM_VOICE_ID")
    llm_id = os.getenv("ANAM_LLM_ID")
    persona_name = os.getenv("ANAM_PERSONA_NAME")
    system_prompt = os.getenv("ANAM_SYSTEM_PROMPT")

    if not anam_api_key:
        raise HTTPException(status_code=500, detail="ANAM_API_KEY is not set")

    # Use published persona when available, otherwise send the provided persona fields.
    if persona_id:
        persona_config: dict[str, Any] = {"personaId": persona_id}
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

    payload = {"personaConfig": persona_config}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                ANAM_SESSION_URL,
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

    return response.json()