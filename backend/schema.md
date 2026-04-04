-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.academic_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  edu_level text,
  current_field text,
  institution text,
  gpa_percentage numeric,
  target_countries ARRAY,
  course_interest text,
  intake_timing text,
  test_status jsonb,
  budget_range text,
  scholarship_interest boolean DEFAULT false,
  application_timeline date,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT academic_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT academic_profiles_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.admins (
  id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.call_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  transcript text,
  recording_url text,
  sentiment text,
  lead_score integer CHECK (lead_score >= 0 AND lead_score <= 100),
  classification text CHECK (classification = ANY (ARRAY['Hot'::text, 'Warm'::text, 'Cold'::text, 'Hard'::text, 'Soft'::text])),
  score_breakdown jsonb,
  recommended_actions text,
  raw_ai_response jsonb,
  created_at timestamp with time zone DEFAULT now(),
  detailed_report text,
  CONSTRAINT call_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT call_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.knowledge_base (
  id bigint NOT NULL DEFAULT nextval('knowledge_base_id_seq'::regclass),
  content text NOT NULL,
  category text,
  embedding USER-DEFINED,
  metadata jsonb,
  CONSTRAINT knowledge_base_pkey PRIMARY KEY (id)
);
CREATE TABLE public.meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  admin_id uuid,
  scheduled_at timestamp with time zone NOT NULL,
  meeting_link text,
  notes text,
  status USER-DEFINED DEFAULT 'scheduled'::meeting_status,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meetings_pkey PRIMARY KEY (id),
  CONSTRAINT meetings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT meetings_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text,
  phone_number text NOT NULL UNIQUE,
  email text,
  location text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
);
CREATE TABLE public.universities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  description text,
  admission_requirements text,
  average_cost_usd numeric,
  scholarships_available boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT universities_pkey PRIMARY KEY (id)
);