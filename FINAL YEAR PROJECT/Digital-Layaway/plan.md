# Comprehensive Development Plan: Digital Layaway Management System

**Document Version:** 1.0  
**Target Audience:** AI Agent / Development Team  
**Tech Stack:** React + TypeScript (Vite), Supabase (Auth + PostgreSQL), Tailwind CSS, jsPDF  
**Guiding Principles:** Security-First Architecture, Human-Computer Interaction (HCI) Best Practices, Purpose-Built Simplicity (Feature Intention).

---

## Preamble for the AI Agent
This document serves as the single source of truth for building the MVP. Every line of code must be written with **Security** (Row Level Security, input validation), **HCI** (Nielsen's heuristics: visibility, error prevention, consistency), and **Intention** (solving the artisan's paper-notebook problem) as primary constraints. Do not add speculative features. Keep the UI mobile-first, touch-friendly, and brutally simple.

---

## Table of Contents
- [Phase 0: Project Scaffolding & Infrastructure](#phase-0)
- [Phase 1: Security Architecture & Database Schema](#phase-1)
- [Phase 2: HCI-Driven UI/UX Foundation & Routing](#phase-2)
- [Phase 3: Feature Implementation (MVP Sprints)](#phase-3)
  - [Sprint 3.1: Artisan Authentication & Profile Management](#sprint-31)
  - [Sprint 3.2: Client Layaway Profile Management](#sprint-32)
  - [Sprint 3.3: Instalment Logging & Balance Calculation](#sprint-33)
  - [Sprint 3.4: Verifiable Receipt Generation & History](#sprint-34)
- [Phase 4: Internal Testing & Quality Assurance (QA)](#phase-4)
- [Phase 5: Deployment & Shipping (The Handover)](#phase-5)
- [Summary Checklist for the AI Agent](#summary-checklist)

---

## Phase 0: Project Scaffolding & Infrastructure {#phase-0}
**Goal:** Establish the development environment, connect to Supabase, and configure the toolchain.

**Description:** Initialize the React TypeScript project, install core dependencies, set up Tailwind CSS, and establish the connection to the Supabase project. Environment variables must be configured for secure API key management.

### Detailed Implementation Instructions
1. **Initialize Project**  
   Run `npm create vite@latest layaway-system -- --template react-ts`. Navigate into the directory and run `npm install`.

2. **Install Dependencies**  
   - Core: `@supabase/supabase-js`, `react-router-dom`  
   - Styling: `tailwindcss`, `postcss`, `autoprefixer`. Initialize Tailwind (`npx tailwindcss init -p`) and configure `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`.  
   - Utilities: `react-hook-form`, `zod`, `jspdf` + `jspdf-autotable`

3. **Supabase Setup**  
   - Create a project on Supabase Dashboard.  
   - Copy the `URL` and `anon/public` key.  
   - Create a `.env.local` file:  
     ```
     VITE_SUPABASE_URL=your_url
     VITE_SUPABASE_ANON_KEY=your_key
     ```  
   - Create `src/lib/supabase.ts` to initialize the client.

4. **Git Initialization**  
   Run `git init` and create a `.gitignore` (ensure `.env.local` is ignored). Make an initial commit.

---

## Phase 1: Security Architecture & Database Schema {#phase-1}
**Goal:** Implement stringent Row Level Security (RLS) and design the normalized database schema.

**Description:** Security is non-negotiable. Artisans must only ever see their own data. The schema consists of three core tables: `profiles` (extending auth.users), `layaway_profiles`, and `installments`. RLS policies will be written in SQL to enforce tenant isolation.

### Detailed Implementation Instructions
1. **Database Schema (SQL to run in Supabase SQL Editor)**  
   - Table `profiles`: `id` (UUID, references auth.users), `full_name` (text), `phone` (text), `created_at` (timestamp).  
   - Table `layaway_profiles`: `id` (UUID, pk), `artisan_id` (UUID, references profiles.id), `client_name` (text, not null), `item_description` (text, not null), `total_cost` (numeric, not null), `created_at` (timestamp).  
   - Table `installments`: `id` (UUID, pk), `profile_id` (UUID, references layaway_profiles.id on delete cascade), `amount` (numeric, not null), `payment_date` (timestamp, default now()), `receipt_id` (UUID, generated hash or sequence).

2. **Enable RLS**  
   ```sql
   ALTER TABLE layaway_profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```

3. **RLS Policies (Security Intent)**  
   - Policy for `layaway_profiles`:  
     ```sql
     USING (artisan_id = auth.uid())
     WITH CHECK (artisan_id = auth.uid())
     ```
   - Policy for `installments`:  
     ```sql
     USING (profile_id IN (SELECT id FROM layaway_profiles WHERE artisan_id = auth.uid()))
     ```
   - Policy for `profiles`: allow users to read/update only their own row.

4. **Database Triggers**  
   Create a trigger function that automatically inserts a row into `public.profiles` when a new user signs up in `auth.users` (using the `raw_user_meta_data` to capture full_name).

5. **TypeScript Types**  
   Generate types from Supabase using the CLI:  
   ```bash
   supabase gen types typescript --local --schema public > src/types/supabase.ts
   ```
   This ensures full end-to-end type safety.

---

## Phase 2: HCI-Driven UI/UX Foundation & Routing {#phase-2}
**Goal:** Establish the visual language, mobile-first layout, and secure route guards.

**Description:** HCI principles demand "Visibility of system status" and "Match between system and real world". The UI will mimic a physical notebook with large tabs. Navigation is minimal (Dashboard, New Client, Client List). Route guards protect authenticated routes.

### Detailed Implementation Instructions
1. **Layout Components (`src/components/layout`)**  
   - Create `MobileContainer.tsx`: Full viewport height, max-width 480px (centered on desktop to mimic mobile), padding for safe areas.  
   - Create `BottomNavigation.tsx`: 3 simple icons (Home, Plus, Receipts/History) using plain SVG or Heroicons.  
   - Create `TopBar.tsx`: Displays the artisan's name and a logout button (with a confirmation dialog to prevent accidental logout - Error Prevention heuristic).

2. **Authentication Routes**  
   - Set up `react-router-dom` with routes: `/login`, `/signup`, and a protected `Dashboard` layout.  
   - Create `ProtectedRoute.tsx` component. Logic: Check Supabase session. If null, redirect to `/login`. If session exists, allow rendering of `Outlet`.

3. **Global UI State**  
   Implement `React Context` or `Zustand` for global UI state (e.g., loading spinner overlay). Ensure loading states are visible during async operations (Feedback heuristic).

4. **Accessibility (A11y)**  
   Ensure color contrast meets WCAG 2.1 AA standards. Use semantic HTML `<main>`, `<nav>`, `<section>`. Focus indicators must be visible for keyboard navigation.

---

## Phase 3: Feature Implementation (MVP Sprints) {#phase-3}

### Sprint 3.1: Artisan Authentication & Profile Management {#sprint-31}
**Goal:** Enable sign-up and login with a streamlined, low-anxiety process.

**Description:** Artisans need to create an account without friction. The login page must be minimal, using only email and password (Magic Links can be a fallback, but email/pass is familiar). Auto-redirect to dashboard.

**Implementation Instructions:**
- Build Login/Signup pages using `react-hook-form` + `zod`. Zod schemas: `email` (string.email), `password` (min 6 chars).
- Supabase Auth integration: `signUp` and `signIn` functions.
- Error Handling: Map Supabase error codes (`Invalid login credentials`, `User already registered`) to user-friendly, plain-language messages.
- After login, fetch the `profiles` table to retrieve the artisan's name and display it in the TopBar immediately.

---

### Sprint 3.2: Client Layaway Profile Management {#sprint-32}
**Goal:** Allow artisans to create, view, and manage client layaway profiles.

**Description:** This is the "Home" of the system. The dashboard displays a list of active clients sorted by most recent. A floating "Add" button (FAB) triggers a modal to create a new profile.

**Implementation Instructions:**
- **Dashboard View:** Use `useEffect` and Supabase query to fetch profiles:  
  ```ts
  supabase.from('layaway_profiles').select('*').eq('artisan_id', user.id).order('created_at', { ascending: false })
  ```  
  Display client cards with: Client Name, Item, Total Cost, Outstanding Balance (fetched via a join or computed manually).
- **Create Profile Modal/Form:** Fields: "Client's Full Name", "Item/Service Description", "Agreed Total Cost (GHS)". On submit: insert into `layaway_profiles` and invalidate cache / refetch.
- **Profile Detail Page:** Route: `/profile/:id`. Shows summary card (Client name, item, total cost) and placeholder for payment history and payment form.
- **HCI Note:** Outstanding Balance must be displayed prominently in a large font, colored green if zero, red if positive.

---

### Sprint 3.3: Instalment Logging & Balance Calculation {#sprint-33}
**Goal:** Log a payment and automatically calculate the outstanding balance in real-time.

**Description:** This is the core transaction. The artisan enters the amount paid. The system calculates the new total paid. UI must prevent "overpayment" errors before submission (Error Prevention).

**Implementation Instructions:**
- **Backend Function (SQL):** Create a Postgres function `log_payment(profile_uuid, amount)` that:
  - Retrieves current sum of installments.
  - Checks if `current_sum + amount > total_cost`. If yes, throws an exception.
  - Inserts the installment.
  - Returns the new balance.
  - Use Supabase RPC to call this function to ensure atomicity.
- **Payment Form:** Input field "Amount paid (GHS)". Display current balance. On input change, calculate potential new balance locally. If `newAmount > balance`, disable the "Submit Payment" button and show a red text warning.
- **Database Update:** On successful submission, update the local state and display a success toast.

---

### Sprint 3.4: Verifiable Receipt Generation & History {#sprint-34}
**Goal:** Generate an on-screen and downloadable PDF receipt for every payment.

**Description:** HCI principle "Recognition rather than recall". The receipt acts as the independent proof of payment. It must look official.

**Implementation Instructions:**
- **Receipt Component (`src/components/Receipt.tsx`):** HTML modal displaying: Artisan's Name, Client's Name, Item, Payment Amount, Date, Outstanding Balance, and a unique Transaction Number (e.g., `LAY-{timestamp}-{random}`).
- **jsPDF Integration:** On "Download PDF", generate a structured PDF using `jsPDF` and `autoTable` to format the receipt data. Save as `Receipt_Layaway_[ClientName]_[Date].pdf`.
- **Payment History Table:** Fetch `SELECT * FROM installments WHERE profile_id = ? ORDER BY payment_date DESC` and display in a responsive table with a "Download Receipt" button for each.
- **Intent Check:** Ensure receipt cannot be tampered with (database record is source of truth; PDF is a view). Consider adding a QR code or link to the online profile (optional future enhancement).

---

## Phase 4: Internal Testing & Quality Assurance (QA) {#phase-4}
**Goal:** Validate that the system meets functional, security, and HCI standards before human evaluation.

**Description:** Run a simulated "Artisan Session" to ensure data integrity and identify edge cases.

### Detailed Implementation Instructions
1. **Security Stress Test**  
   - Authenticate as User A. Try to manually craft an API call to fetch profiles belonging to User B. Verify RLS blocks it (Supabase returns 403).  
   - Try to log a payment for a profile where `artisan_id` != `auth.uid()`. Verify it fails.

2. **Edge Cases (Data Integrity)**  
   - Payment of `0` (should be rejected).  
   - Payment exceeding balance (frontend validation + backend RPC exception).  
   - Very long names/descriptions (test max length handling in UI).  
   - Test concurrent payment logging (ensure atomicity prevents race conditions).

3. **Performance Audit (Lighthouse)**  
   - Run Lighthouse in Chrome DevTools on the Dashboard and Profile pages. Target score > 90 for Performance, Accessibility, and Best Practices.  
   - Fix Largest Contentful Paint (LCP) issues (e.g., preload fonts, optimize SVGs).

4. **Error Handling Walkthrough**  
   - Disconnect the internet and try to log a payment. Ensure a friendly "Network Error" message appears, not a raw fetch exception.  
   - Try to sign up with an already used email. Ensure the error message is clear.  
   - Try to submit an empty form – ensure validation messages appear.

---

## Phase 5: Deployment & Shipping (The Handover) {#phase-5}
**Goal:** Deploy the application to the web (Vercel/Netlify) with production environment variables.

**Description:** The system is ready for the human evaluation phase (the Artisan testing sessions). The deployment must be stable, with a custom domain if possible.

### Detailed Implementation Instructions
1. **Environment Variables**  
   In the hosting platform (Vercel/Netlify), add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (Do not use the `SERVICE_ROLE` key in the frontend).

2. **Build Process**  
   Run `npm run build` locally to ensure TypeScript compilation passes without errors. If using `@supabase/ssr` or specific packages, ensure they are optimized for production.

3. **Deploy**  
   - Connect the Git repository to Vercel/Netlify.  
   - Set the Build command: `npm run build`.  
   - Set the Output directory: `dist`.  
   - Optionally configure a custom domain.

4. **Post-Deployment Verification (Smoke Test)**  
   - Visit the live URL.  
   - Register a new test user.  
   - Create a profile, log a payment, and download a receipt.  
   - Check the Supabase dashboard to confirm data was written successfully.  
   - Test error scenarios (e.g., incorrect login) on the live site.

5. **Final Artifact**  
   Provide the live URL, the Git repository link, and the database diagram to the project lead. The AI agent's job is complete; the human researcher now takes over for the "Evaluation" stage (Chapter 5 of the thesis).

---

## Summary Checklist for the AI Agent {#summary-checklist}

- [ ] **Phase 0:** Vite setup, `.env` secured, Tailwind running.
- [ ] **Phase 1:** RLS enforced on ALL tables. Triggers set up.
- [ ] **Phase 2:** Mobile-first UI with top-bar and bottom-nav. Route guards working.
- [ ] **Phase 3.1:** Login/Signup works and catches errors gracefully.
- [ ] **Phase 3.2:** CRUD for Client Profiles. Dashboard lists them.
- [ ] **Phase 3.3:** Payment logging updates balance in real-time. Overpayments blocked.
- [ ] **Phase 3.4:** PDF receipt generates with clear layout. Payment history visible.
- [ ] **Phase 4:** RLS tested manually. Lighthouse > 90.
- [ ] **Phase 5:** Deployed to Vercel/Netlify. Smoke test passed.

---

**Proceed to Phase 0.** (The AI agent acknowledges this plan and begins execution.)

---

*Digital Layaway Management System – Comprehensive Development Plan*  
*Bright Agbemenu | University of Ghana | July 2026*