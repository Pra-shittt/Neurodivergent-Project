# Project Roadmap & Task Backlog

## Phase 1: Full Frontend UI (COMPLETED)
- [x] Vite + React 18 + Tailwind CSS setup
- [x] Inclusive Auth & Onboarding UI (`Login.jsx`, `Register.jsx`, pronouns/roles)
- [x] Individual Dashboard with 1-5 sliders (Mood, Executive Function, Sensory, Masking)
- [x] Environmental trigger tagging & free-text journal entry
- [x] Recharts longitudinal trend graphs
- [x] Psychometric assessment stepper UI (CAT-Q, ASRS, AQ-10)
- [x] Automated frontend scoring & sub-score visualization
- [x] Clinician workstation, patient roster, & burnout alert flags (🚨)
- [x] Mock API service layer (`mockApi.js`)

## Phase 2: Step-by-Step Express Backend Integration (NEXT)
- [ ] **Step 2.1: Server Infrastructure & Database Setup**
  - [ ] Node.js + Express server setup (`server.js`, `app.js`)
  - [ ] MongoDB connection via Mongoose (`config/db.js`)
  - [ ] Environment variable validation (`.env`)
- [ ] **Step 2.2: User Model & Authentication API**
  - [ ] Create `User` Mongoose schema with Bcrypt password hashing
  - [ ] Implement `POST /api/v1/auth/register` & `POST /api/v1/auth/login`
  - [ ] JWT authentication middleware & secure `httpOnly` cookies
- [ ] **Step 2.3: User & Privacy Module**
  - [ ] `PATCH /api/v1/users/profile` & privacy sharing toggle
  - [ ] Clinician-patient linking via unique `inviteCode`
- [ ] **Step 2.4: Psychometric Assessment Engine**
  - [ ] Schemas: `AssessmentTemplate` & `UserAssessment`
  - [ ] Server-side psychometric scoring engine (`utils/scoringEngine.js`)
  - [ ] `POST /api/v1/assessments/submit` & risk band categorization
- [ ] **Step 2.5: Daily Logs & Aggregation Pipelines**
  - [ ] `DailyLog` schema & `POST /api/v1/logs`
  - [ ] MongoDB `$group` & `$facet` aggregation pipelines for weekly/monthly trends
- [ ] **Step 2.6: Clinician Workstation & Burnout Alert Logic**
  - [ ] `ClinicalNote` schema
  - [ ] Server-side alert trigger rules (3 consecutive high masking fatigue days)
  - [ ] `GET /api/v1/clinician/patients` endpoint with alert flags