"""
pdf_routes.py — Session PDF generation + student sessions endpoint.
Registered into the main FastAPI `app` by importing this module at the
bottom of main.py:  `import pdf_routes  # noqa`
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from fastapi import HTTPException
from fastapi.responses import Response

# ── re-use the `app` from main ────────────────────────────────────────────────
from main import app   # type: ignore[import]


# ── helpers ───────────────────────────────────────────────────────────────────

def _supa_headers() -> dict[str, str]:
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not service_key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE key.")
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    }


def _supa_url() -> str:
    url = os.getenv("SUPABASE_URL")
    if not url:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL.")
    return url


# ── Student Sessions endpoint ──────────────────────────────────────────────────

@app.get("/api/v1/students/{student_id}/sessions", tags=["sessions"])
def get_student_sessions(student_id: str) -> dict[str, Any]:
    """Fetch all call sessions for a student (newest first, used by dashboard)."""
    query = urlencode({
        "select": "id,student_id,sentiment,lead_score,classification,created_at,detailed_report,transcript",
        "student_id": f"eq.{student_id}",
        "order": "created_at.desc",
        "limit": "20",
    })
    req = urlrequest.Request(
        f"{_supa_url()}/rest/v1/call_sessions?{query}",
        headers=_supa_headers(),
        method="GET",
    )
    try:
        with urlrequest.urlopen(req, timeout=20) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
        return {"sessions": rows if isinstance(rows, list) else []}
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase sessions fetch failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err


# ── Pure-Python PDF generator ──────────────────────────────────────────────────

def _escape_pdf(s: str) -> str:
    """Escape a Python string for use inside a PDF literal string ( ... )."""
    out: list[str] = []
    for ch in s:
        code = ord(ch)
        if ch == "\\":
            out.append("\\\\")
        elif ch == "(":
            out.append("\\(")
        elif ch == ")":
            out.append("\\)")
        elif code > 127:
            out.append("?")   # fall back – standard 14 fonts are Latin-1
        else:
            out.append(ch)
    return "".join(out)


def _build_pdf(title: str, date_str: str, session_short: str, report_text: str) -> bytes:
    """
    Generate a styled A4 PDF from plain text using only stdlib.
    Returns raw PDF bytes (PDF 1.4).
    """
    # ── typography constants ─────────────────────────────────────────────────
    PW, PH = 595, 842          # A4 points
    ML = 56                    # left margin
    MT_FIRST = 780             # top-of-content y on first page
    MT_REST  = 800             # top-of-content y on subsequent pages
    MB = 50                    # bottom margin
    LH_BODY = 15               # body line height
    LH_HEAD = 20               # heading line height
    FS_BODY  = 10
    FS_HEAD  = 12
    FS_TITLE = 18
    MAX_CHARS = 90             # chars per wrapped line

    # ── word-wrap & classify lines ────────────────────────────────────────────
    wrapped: list[tuple[str, bool]] = []   # (text, is_heading)
    for raw in (report_text or "No report content available.").splitlines():
        raw = raw.rstrip()
        is_h = (
            (raw.isupper() and len(raw) > 3) or
            raw.startswith("#") or
            (raw.endswith(":") and 2 < len(raw) < 60) or
            (raw.startswith("**") and raw.endswith("**"))
        )
        clean = raw.lstrip("#").strip().strip("*").strip()
        if not clean:
            wrapped.append(("", False))
            continue
        if is_h:
            wrapped.append((clean, True))
            continue
        words = clean.split()
        curr = ""
        for w in words:
            if len(curr) + len(w) + 1 <= MAX_CHARS:
                curr = (curr + " " + w).strip()
            else:
                if curr:
                    wrapped.append((curr, False))
                curr = w
        if curr:
            wrapped.append((curr, False))

    # ── paginate ──────────────────────────────────────────────────────────────
    FIRST_MAX = 30
    REST_MAX  = 44
    pages: list[list[tuple[str, bool]]] = []
    buf: list[tuple[str, bool]] = []
    for item in wrapped:
        lim = FIRST_MAX if not pages else REST_MAX
        if len(buf) >= lim:
            pages.append(buf)
            buf = []
        buf.append(item)
    if buf:
        pages.append(buf)
    if not pages:
        pages = [[("No report content available.", False)]]

    # ── render a single page's content stream ────────────────────────────────
    def render(lines: list[tuple[str, bool]], pg: int, is_first: bool) -> bytes:
        p: list[str] = []
        y = MT_FIRST if is_first else MT_REST

        if is_first:
            # Blue header bar
            p.append(f"q 0.149 0.384 0.922 rg {ML - 8} {y + 10} 487 48 re f Q")
            p.append(f"BT /F2 {FS_TITLE} Tf 1 1 1 rg {ML} {y + 24} Td ({_escape_pdf(title)}) Tj ET")
            y -= 10
            p.append(f"BT /F1 9 Tf 0.45 0.45 0.45 rg {ML} {y} Td ({_escape_pdf(date_str)}  |  {_escape_pdf(session_short)}) Tj ET")
            y -= 18
            p.append(f"q 0.86 0.89 0.91 rg {ML - 8} {y} 487 1 re f Q")
            y -= 14

        for text, is_h in lines:
            if not text:
                y -= LH_BODY // 2
                continue
            if is_h:
                needed = LH_HEAD + 6
                if y - needed < MB:
                    break
                p.append(f"q 0.94 0.95 0.99 rg {ML - 6} {y - 3} 491 {LH_HEAD} re f Q")
                p.append(f"BT /F2 {FS_HEAD} Tf 0.055 0.169 0.573 rg {ML} {y} Td ({_escape_pdf(text)}) Tj ET")
                y -= LH_HEAD + 4
            else:
                if y - LH_BODY < MB:
                    break
                p.append(f"BT /F1 {FS_BODY} Tf 0.118 0.157 0.231 rg {ML} {y} Td ({_escape_pdf(text)}) Tj ET")
                y -= LH_BODY

        # Footer
        p.append(f"q 0.86 0.89 0.91 rg {ML - 8} {MB + 12} 487 1 re f Q")
        p.append(f"BT /F1 8 Tf 0.6 0.6 0.6 rg {ML} {MB + 2} Td (StudyAbroad.AI  |  Confidential Session Report  |  Page {pg + 1}) Tj ET")
        return ("\n".join(p) + "\n").encode()

    # ── assemble PDF objects ──────────────────────────────────────────────────
    # Object numbering (1-based):
    #   1 → Catalog
    #   2 → Pages
    #   3 → Font /Helvetica        (F1)
    #   4 → Font /Helvetica-Bold   (F2)
    #   5, 6 → content stream & page dict for page 1
    #   7, 8 → content stream & page dict for page 2
    #   …
    raw: list[bytes] = [b""] * 4   # placeholders for objs 1-4
    page_ids: list[int] = []

    for i, pg_lines in enumerate(pages):
        stream_data = render(pg_lines, i, is_first=(i == 0))
        content_obj = (
            f"<</Length {len(stream_data)}>>\nstream\n".encode()
            + stream_data
            + b"\nendstream"
        )
        c_id = 5 + i * 2          # 5, 7, 9 …
        p_id = 5 + i * 2 + 1      # 6, 8, 10 …
        assert len(raw) == c_id - 1
        raw.append(content_obj)
        raw.append((
            f"<</Type /Page /Parent 2 0 R "
            f"/MediaBox [0 0 {PW} {PH}] "
            f"/Contents {c_id} 0 R "
            f"/Resources <</Font <</F1 3 0 R /F2 4 0 R>>>>>>"
        ).encode())
        page_ids.append(p_id)

    kids = " ".join(f"{k} 0 R" for k in page_ids)
    raw[0] = b"<</Type /Catalog /Pages 2 0 R>>"
    raw[1] = f"<</Type /Pages /Kids [{kids}] /Count {len(page_ids)}>>".encode()
    raw[2] = b"<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>"
    raw[3] = b"<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding>>"

    # ── serialise ──────────────────────────────────────────────────────────────
    out = bytearray()
    out.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    xrefs: list[int] = []
    for idx, body in enumerate(raw):
        xrefs.append(len(out))
        out.extend(f"{idx + 1} 0 obj\n".encode())
        out.extend(body)
        out.extend(b"\nendobj\n")

    xref_pos = len(out)
    total = len(raw) + 1
    out.extend(f"xref\n0 {total}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for off in xrefs:
        out.extend(f"{off:010d} 00000 n \n".encode())
    out.extend(
        f"trailer\n<</Size {total} /Root 1 0 R>>\n"
        f"startxref\n{xref_pos}\n%%EOF\n".encode()
    )
    return bytes(out)


# ── Report-PDF endpoint ───────────────────────────────────────────────────────

@app.get("/api/v1/sessions/{session_id}/report-pdf", tags=["sessions"])
def get_session_report_pdf(session_id: str) -> Response:
    """Stream a session's detailed_report as a downloadable PDF."""
    query = urlencode({
        "select": "id,detailed_report,transcript,created_at,sentiment,lead_score,classification",
        "id": f"eq.{session_id}",
        "limit": "1",
    })
    req = urlrequest.Request(
        f"{_supa_url()}/rest/v1/call_sessions?{query}",
        headers=_supa_headers(),
        method="GET",
    )
    try:
        with urlrequest.urlopen(req, timeout=20) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
    except HTTPError as err:
        detail = err.read().decode("utf-8") if err.fp else str(err)
        raise HTTPException(status_code=502, detail=f"Supabase fetch failed: {detail}") from err
    except URLError as err:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {err.reason}") from err

    if not isinstance(rows, list) or not rows:
        raise HTTPException(status_code=404, detail="Session not found.")

    row = rows[0]
    report_text = str(row.get("detailed_report") or row.get("transcript") or "No report content available.")

    created_raw = str(row.get("created_at") or "")
    try:
        dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
        date_str = dt.strftime("%B %d, %Y  at  %I:%M %p UTC")
    except Exception:
        date_str = created_raw[:10] if created_raw else "Unknown date"

    session_short = f"Session {str(session_id)[:8].upper()}"
    classification = str(row.get("classification") or "")
    lead_score = row.get("lead_score")
    title = "AI Counseling Session Report"
    if classification or lead_score is not None:
        title = f"Session Report  –  {classification or 'N/A'}  –  Lead Score: {lead_score if lead_score is not None else 'N/A'}"

    pdf_bytes = _build_pdf(title, date_str, session_short, report_text)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="session-report-{str(session_id)[:8].upper()}.pdf"',
            "Cache-Control": "no-cache",
        },
    )
