model that understands different languages

voice call to calender meet, followed by whatsapp summary 

Sentiment Detection: Identify if student is excited/confused/hesitant and
adapt tone
Smart Follow-ups: Ask contextual questions based on previous answers
Multi-turn Memory: Remember details across the conversation without
repeating questions

University Recommendations: Suggest 3 suitable universities based on profile
during call
WhatsApp Integration: Send follow-up message with call summary and
recommendations
Live Dashboard: Real-time view of ongoing conversations with lead scores
Regional Language Support: Add one regional language
(Punjabi/Gujarati/Other)
Appointment Booking: Integrate calendar to book counsellor slots during the
call
Call Analytics Dashboard: Show call volume trends, common questions,
conversion metrics

a kanban on user side to classify university based on custom metrics

Phase 1: The Voice Pipeline & Latency Optimization (Objective 1)

Do not build the WebRTC/telephony stack from scratch. It will ruin your latency.

    Orchestrator Setup: Create an account on Vapi.ai. Configure your inbound phone number.

    Model Selection: In the Vapi dashboard, route the STT to Deepgram (enable the hi and mr language parameters for Hindi and Marathi) and the TTS to an empathetic ElevenLabs voice profile.

    Server Connection: Point the Vapi orchestrator to your custom FastAPI backend via a secure webhook/WebSocket.

Phase 2: The LLM Brain & Multi-Turn Memory (Bonus Tier 1 & Objective 3)

This is where the AI actually thinks, remembers, and fetches facts.

    System Prompting: Write a robust system prompt in FastAPI. Instruct the LLM on its persona ("You are a Fateh Education counsellor") and mandate that it keeps a rolling summary of the conversation to achieve Multi-turn Memory.

    RAG Integration (Knowledge Base): * Upload the Fateh FAQ (visas, IELTS, costs) into a Vector DB (Pinecone).

        Give the LLM a tool called query_knowledge_base(topic). When a student asks about UK living costs, the LLM pauses, fetches the exact figures from Pinecone, and speaks them back.

    Sentiment Detection: Add an instruction to the system prompt: "Before every response, classify the user's sentiment as [excited, confused, hesitant]. If hesitant, begin your response with a reassuring phrase."

Phase 3: Data Extraction & Lead Scoring (Objective 2, 4 & 5)

Extracting the 12 data points without sounding like an interrogation.

    The JSON State: Maintain a JSON object in your backend containing the 12 required fields (Name, GPA, Budget, etc.).

    Smart Follow-ups (Bonus Tier 1): The LLM checks the JSON state. If Target_Country is "UK" but IELTS_Score is null, the LLM naturally asks, "Since you're aiming for the UK, have you started preparing for your IELTS yet?"

    Lead Scoring Algorithm: Write a Python function that triggers at the end of the call:

        Intent (40%): +40 if course interest and intake timing are defined.

        Finances (30%): +30 if budget matches UK/Ireland standards.

        Timeline (30%): +30 if applying for the immediate next intake.

    Classification: Score > 70 = Hot, 40-69 = Warm, < 40 = Cold. Save this final JSON to Supabase.

Phase 4: Integrations & Actions (Bonus Tier 2 & 3)

The high-value automation that wows the judges.

    University Recommendations: Build a simple Python dictionary mapping GPA/Budget to 3 specific Fateh partner universities. Give the LLM a tool get_university_recs(gpa, budget) to call during the conversation.

    Appointment Booking: Give the LLM a book_counsellor(date, time) tool. When called, it hits the Calendly API to reserve a slot and confirms it on the call.

    WhatsApp Handoff: The moment the call disconnects, a FastAPI background task triggers the Twilio API. It sends a WhatsApp message to the student containing:

        A thank you note.

        The 3 recommended universities.

        The Calendly confirmation link.

Phase 5: The "God View" Live Dashboard (Bonus Tier 2 & 3)

The visual wow-factor for the demo.

    Real-Time Subscriptions: Use Supabase's real-time WebSockets. As the FastAPI backend updates the student's JSON profile mid-call, it pushes to Supabase.

    Next.js UI: The React frontend listens to Supabase.

        Left Column: A live transcript scrolling as the user speaks.

        Middle Column: A Kanban board (Hot, Warm, Cold) where a new card pops up the moment the lead is scored.

        Right Column: Call Analytics (graphs built with Recharts showing total calls, average scores, and common queries).


a user should be able to schedule a meeting on google calender based on the lead score so only way to login is google oauth 