System
GET /health
Google OAuth
GET /api/v1/auth/google/login
GET /api/v1/auth/google/callback
Leads
POST /api/v1/leads
GET /api/v1/leads
GET /api/v1/leads/{lead_id}
PATCH /api/v1/leads/{lead_id}l
Scoring + Recommendations
POST /api/v1/leads/{lead_id}/score
GET /api/v1/leads/{lead_id}/recommendations
Booking + Voice + Messaging
POST /api/v1/appointments
POST /api/v1/calls/webhook
POST /api/v1/messages/whatsapp/send-summary
Dashboard
GET /api/v1/dashboard/metrics