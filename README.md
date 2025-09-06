# Electronic Health Record (EHR) System

A full-stack web app for managing electronic health records with secure authentication, patient/doctor directories, appointment scheduling, and medical records — built with React + Vite + TypeScript, Tailwind CSS, shadcn/ui, and Supabase (Auth + Postgres).

## ✨ Features

Email/password authentication using Supabase Auth (persisted sessions).

Role-based profiles (patient, doctor, admin).

CRUD for Patients, Doctors, Appointments, and Medical Records.

Appointment status tracking (scheduled, completed, cancelled, no_show).

Typed database access powered by Supabase generated types.

Modern UI with React + Vite + Tailwind + shadcn/ui (Radix primitives).


## 🗂️ App Pages

Dashboard

Auth (Sign in/Sign up)

Patients

Doctors

Appointments

Medical Records


## 🧱 Tech Stack

Frontend: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix UI)

Auth & DB: Supabase (Auth, Postgres)

Types: Supabase auto-generated Database types for end-to-end typing

Tooling: ESLint, Prettier


## 🏗️ Project Structure (excerpt)

Electronic-Health-Record-System-main/
├─ src/
│  ├─ pages/                # Dashboard, Patients, Doctors, Appointments, Records, Auth
│  ├─ contexts/             # AuthContext (session, user profile, sign in/out/up)
│  ├─ integrations/
│  │  └─ supabase/
│  │     ├─ client.ts      # Supabase client (URL & anon key)
│  │     └─ types.ts       # Typed DB schema from Supabase
│  └─ lib/                  # Utilities
├─ supabase/
│  ├─ config.toml           # Supabase CLI project config
│  └─ migrations/           # SQL migrations for DB schema
├─ index.html
├─ package.json
└─ tailwind.config.ts

## 🧰 Prerequisites

Node.js ≥ 18

pnpm (recommended) or npm/yarn

Optional: Supabase CLI if you want to run the database locally or manage migrations


## ⚙️ Environment Setup

This template includes a generated Supabase client with hardcoded credentials (for development):

SUPABASE_URL: https://yzsuhfhhzcggawjsuyxk.supabase.co
SUPABASE_ANON_KEY: <embedded in src/integrations/supabase/client.ts>

> For production, replace these with your own project URL and anon key.
If you prefer environment variables, refactor the client to read from import.meta.env values (e.g. VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and add them to a .env file at project root.



## 🗃️ Database Schema (key tables)

profiles — user profile with role (patient | doctor | admin), linked to auth.users

patients — patient demographics & contact fields

doctors — doctor directory with specialization & contact

appointments — links patient ↔ doctor, date/time, duration, and status

medical_records — diagnosis, medications, allergies, notes


## 🚀 Getting Started (Local)

# install dependencies
pnpm install
# or: npm install

# start dev server
pnpm dev
# or: npm run dev

Vite will start the app on a local port (typically http://localhost:5173).

## 📦 Scripts

dev — vite

build — vite build

build:dev — vite build --mode development

lint — eslint .

preview — vite preview


## 🧪 Linting & Formatting

pnpm lint
# or: npm run lint

🔐 Authentication Notes

Sessions are persisted (see AuthContext using the Supabase client).

On sign-up, the app stores role and profile info in public.profiles.

Adjust policies/Row Level Security (RLS) in Supabase as needed.


## 🛠️ Development Tips

Tailwind + shadcn/ui give a head start on accessible, themeable components.

The Supabase types.ts file ensures typed queries across the app.

Prefer async/await and typed DTOs for data fetching in pages under src/pages/.


## 🗄️ Running Migrations (via CLI)

# Install Supabase CLI if you haven't
brew install supabase/tap/supabase

# Login and link your project, then:
supabase db push         # apply local migrations

Or run the SQL from supabase/migrations/*.sql in the Supabase SQL Editor.

## 🧪 Test Data (optional)

Insert a few rows into profiles, patients, and doctors.

Then create appointments with valid patient_id and doctor_id.

Add medical_records referencing patient_id.


## 🛳️ Deployment

Deploy easily to Netlify, Vercel, or any static host.

Ensure environment variables or client.ts constants point to production Supabase.


pnpm build
# or: npm run build

Then deploy the dist/ directory.


