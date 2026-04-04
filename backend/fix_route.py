import sys

app_code = """
class SaveSessionRequest(BaseModel):
    transcript: str
    student_id: Optional[str] = None

@app.post("/save-session")
async def save_session(request: SaveSessionRequest):
    groq_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    lead_score = None
    classification = None
    sentiment = None
    detailed_report = None
    raw_ai_response = None
    score_breakdown = None

    if groq_key and request.transcript.strip():
        system_prompt = \"\"\"You are an expert student admission counselor evaluator. 
Analyze the provided transcript of an avatar session with a student.
Output your analysis ONLY as a valid JSON object with the exact following keys:
1. "lead_score": integer between 0 and 100 representing how likely they are to enroll.
2. "classification": One of ["Hot", "Warm", "Cold", "Hard", "Soft"]. Since we specifically want Hard and Soft leads, prioritize "Hard" (strong commitment/clear plan) or "Soft" (uncertain/exploring).
3. "sentiment": A short string describing the student's emotional tone (e.g., "Enthusiastic", "Anxious", "Curious").
4. "score_breakdown": A JSON object breaking down the score (e.g. {"academic_readiness": 20, "financial_clarity": 15}).
5. "detailed_report": A paragraph summarizing the student's needs, objections, and next steps.
\"\"\"
        
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer " + groq_key},
                    json={
                        "model": groq_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": request.transcript}
                        ],
                        "response_format": {"type": "json_object"}
                    },
                    timeout=15.0
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    try:
                        import json
                        parsed = json.loads(content)
                        lead_score = parsed.get("lead_score")
                        classification = parsed.get("classification")
                        sentiment = parsed.get("sentiment")
                        score_breakdown = parsed.get("score_breakdown")
                        detailed_report = parsed.get("detailed_report")
                        raw_ai_response = parsed
                    except Exception:
                        print("Failed to parse Groq JSON output")
                else:
                    print(f"Groq API Error: {res.status_code} {res.text}")
        except Exception as e:
            print(f"Failed to process transcript with Groq: {e}")

    row = {
        "transcript": request.transcript,
        "lead_score": lead_score,
        "classification": classification,
        "sentiment": sentiment,
        "detailed_report": detailed_report,
        "score_breakdown": score_breakdown,
        "raw_ai_response": raw_ai_response,
        "student_id": request.student_id if request.student_id and request.student_id != 'undefined' else None
    }

    try:
        supa_res = supabase.table("call_sessions").insert(row).execute()
        return {"status": "success", "inserted": supa_res.data}
    except Exception as e:
        print(f"Error inserting into call_sessions: {e}")
        return {"status": "error", "message": str(e)}
"""

with open("main.py", "r", encoding="utf-8") as f:
    text = f.read()

if "from typing import" in text and "Optional" not in text:
    text = text.replace("from typing import Literal", "from typing import Literal, Optional")

if "save-session" not in text:
    with open("main.py", "w", encoding="utf-8") as f:
        f.write(text + "\n" + app_code)
        
