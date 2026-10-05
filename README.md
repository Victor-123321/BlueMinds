<div align="center">

<img src="https://raw.githubusercontent.com/YOUR_ORG/neuroblue-minds/main/NeuroBlueMinds/wwwroot/android-chrome-512x512.png" width="100" alt="BlueMinds Logo" />

# NeuroBlueMinds

**Adaptive Neuro-Education Platform for Neurodivergent Children**

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![Blazor](https://img.shields.io/badge/Blazor-WebAssembly-512BD4?style=flat-square&logo=blazor)](https://blazor.net)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat-square&logo=postgresql)](https://supabase.com)
[![AI](https://img.shields.io/badge/AI-Groq%20%2F%20Llama%203.3-FF6B35?style=flat-square)](https://groq.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)

*Identify · Support · Track — every neurodivergent child deserves a personalized learning path*

[Live Demo](#) · [Documentation](#architecture) · [Onfire Learning](https://onfirelearning.com)

</div>

---

## What is NeuroBlueMinds?

NeuroBlueMinds is a clinically-informed, AI-powered education platform designed to **identify, support, and track children with neurodivergent learning needs** — including ADHD, ASD, dyslexia, and sensory processing differences.

Unlike generic e-learning tools, NeuroBlueMinds builds a permanent **Neuro-Profile** for each child that grows with them across institutions, therapists, and years. Every game played, every quiz answered, and every parental observation feeds a **Child State Model (CSM)** that drives real-time adaptive content delivery.

The platform is built for three audiences simultaneously:
- 👨‍👩‍👧 **Families** — monitor progress, receive actionable recommendations, invite specialists
- 🧑‍⚕️ **Therapists & Teachers** — clinical dashboards, longitudinal data, professional notes
- 🏫 **Schools & Institutions** — group analytics, license management, pedagogical metrics

---

## Key Features

### 🧠 Adaptive Learning Engine
- **Child State Model (CSM)** — per-child JSON snapshot of learning state, updated after every session
- **Mastery scoring** = accuracy × response speed (not just correctness — slow+correct = still struggling)
- **Automatic level promotion/demotion** per learning style (Visual, Auditory, Kinesthetic, Reading/Writing)
- **Confidence restore** — detects abandoned sessions and starts next session with guaranteed-win activities
- **Style rotation** — every 3rd session injects the weakest style at reduced difficulty
- **Fatigue threshold** — personal session length limits learned from each child's accuracy drop patterns

### 🎮 Gamified Assessment
- **Child Quiz** — 20 interactive questions across 4 learning styles and 3 difficulty levels
- **Parent Quiz** — 18 questions capturing behavioral indicators and communication style at home
- **Three-path selector** — Parent screening / Child interactive / Professional diagnostic
- **Per-answer persistence** — quiz resumes from exact question if browser closed
- **IRT-inspired difficulty** (Sprint 3) — questions selected dynamically based on child's ability estimate

### 👥 Family Profiles (Netflix-style)
- One parent account → up to 10 child profiles
- Each child has their **own isolated User row** — all quiz/game data is completely separate
- Parent taps a child card → server issues a **child-scoped JWT** → all subsequent API calls are authenticated as that child with zero code changes in existing endpoints
- 4-hour inactivity auto-expiry with per-child session restoration
- Parent must re-enter password to access the parent dashboard from the profile selector

### 🔐 Role-Based Access Control (RBAC + ABAC)
Five roles with five information layers (C1–C5):

| Role | C1 Basic | C2 Educational | C3 Behavioral | C4 Neurocognitive | C5 Clinical |
|---|---|---|---|---|---|
| Parent/Tutor | ✅ | ✅ | ✅ | ✅ | 👁 shared |
| Therapist | ✅ | ✅ | ✅ | ✅ | ✅ |
| Teacher | ✅ | ✅ | ✅ | 📖 simplified | ❌ |
| Institutional Admin | ✅ | ✅ | aggregate | ❌ | ❌ |
| Government | anon. | anon. | ❌ | ❌ | ❌ |

### 🤖 AI-Powered Analysis (BlueBot)
- Powered by **Groq API** with `llama-3.3-70b-versatile`
- Returns structured JSON: roadmap, weekly plan, strengths, challenges, parent tips, game recommendations
- Cross-references child quiz responses, parent quiz responses, and game accuracy trends
- Weekly longitudinal pattern detection — flags regressions, detects style shifts, optimal learning times

### 🌐 Internationalization
- **Spanish (Mexico)** — primary
- **English (US)** — second locale
- Scaffolded stubs for Spanish (Spain) and Portuguese (Brazil)
- JSON-based locale files, runtime locale switching, persisted in localStorage

---

## Architecture

```
NeuroBlueMinds/              ← Blazor Server host
├── Components/              ← App.razor, Routes.razor
├── Data/                    ← EF Core DbContext
├── Endpoints/               ← AuthEndpoints, DashboardController,
│                               FamilyController, AdaptiveController
├── Services/                ← ServerAuthService, DashboardService,
│                               GroqService, AdaptiveEngineService
└── wwwroot/                 ← Static assets, game HTML files, JS interop

NeuroBlueMinds.Client/       ← Blazor WASM interactive layer
├── Components/
│   ├── Dashboards/          ← ChildDashboard, ParentDashboard, SpecialistDashboard
│   └── LanguageSwitcher, NavItem, StatCard
├── Layout/                  ← MainLayout, NavMenu
├── Pages/
│   ├── Auth/                ← Login, Register, Onboarding
│   ├── Family/              ← ProfileSelector, FamilySelector
│   ├── Games/               ← GameContainer, JuegosAuditivo/Visual/etc
│   └── Quizzes/             ← QuizSelector, QuizNinos, QuizPadres
├── Services/                ← WebAuthService, ClientDashboardService,
│                               ClientLocalizationService, ChildAwareHttpHandler
└── wwwroot/
    ├── games-static/        ← Static HTML5 games by style and level
    ├── js/                  ← gameInterop.js, inactivity.js
    └── locales/             ← es-MX.json, en-US.json

NeuroBlueMinds.Shared/       ← DTOs, DB models, interfaces
├── DbModels/                ← User, ChildProfile, QuizSession, GameResult, ...
├── DTOs/                    ← AuthDtos, FamilyDtos, AdaptiveDtos, DashboardModels
└── Interfaces/              ← IAuthService, IDashboardService, IAdaptiveEngineService
```

### Technology Stack

| Layer | Technology |
|---|---|
| Framework | .NET 10 · Blazor Web App (WASM + SSR) |
| Database | PostgreSQL via Supabase (Session Pooler) |
| ORM | Entity Framework Core 9 |
| Authentication | JWT Bearer + Google OAuth (`Google.Apis.Auth`) |
| AI Engine | Groq API · `llama-3.3-70b-versatile` |
| Styling | Tailwind CSS (pre-built, no JIT compiler required) |
| Icons | Material Symbols Outlined |
| Password Hashing | BCrypt.Net |

---

## Database Schema

```
users                   → parent/specialist accounts + child user rows
child_profiles          → links parent_user_id ↔ child_user_id, stores adaptive_state (JSONB)
quiz_sessions           → per-child quiz attempts with resume support
quiz_responses          → per-answer data: style, level, correct, response_time_ms
parent_quiz_sessions    → parent questionnaire sessions
parent_quiz_responses   → parent questionnaire answers by section
game_results            → per-game play data: accuracy, response_time, learning_style
game_progress           → best scores and level reached per game per child
therapy_sessions        → specialist session records
```

---

## Getting Started

### Prerequisites
- .NET 10 SDK
- Node.js (for Tailwind build, optional)
- Supabase account (or any PostgreSQL instance)
- Groq API key (free tier available at [console.groq.com](https://console.groq.com))

### Configuration

Create `NeuroBlueMinds/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=...;Database=...;Username=...;Password=..."
  },
  "Jwt": {
    "Key": "your-secret-key-minimum-32-characters",
    "Issuer": "https://yourapp.com",
    "Audience": "https://yourapp.com"
  },
  "Groq": {
    "ApiKey": "gsk_..."
  },
  "Google": {
    "ClientId": "your-google-client-id.apps.googleusercontent.com"
  }
}
```

### Run

```bash
# Apply database migrations
cd NeuroBlueMinds
dotnet ef database update

# Run the app
dotnet run
```

The app starts at `http://localhost:5001`. The first screen is the profile selector — click "Crear cuenta" to register.

---

## User Flows

### New Parent
1. `/register` → name + email + password
2. `/onboarding` → pick role ("Soy Padre/Madre") + country
3. `/family` → empty Netflix screen → click `+` → create first child profile (name, avatar emoji, optional birth date)
4. Click child card → child-scoped JWT issued → `/dashboard` (Parent Dashboard)
5. Go to `/quiz` → complete Parent Quiz to calibrate AI analysis

### New Child (via parent account)
1. Parent creates child profile in `/family`
2. Each child has their own isolated `User` row in the DB
3. Child taps their avatar on the profile selector → instant access → Child Dashboard (games only, no analytics)
4. Child completes quiz → `AdaptiveEngineService` updates their `ChildStateModel`
5. Next session starts with AI-ranked activity recommendations

### Therapist
1. Register → pick "Especialista" in onboarding
2. Parent invites therapist from their profile management screen
3. Therapist sees Specialist Dashboard with C1–C5 clinical data layers
4. Can add professional notes, generate reports, track multiple children

---

## Adaptive Engine

The `AdaptiveEngineService` maintains a **Child State Model (CSM)** per child:

```
observe response → update mastery score → adjust level → rank next activities
     ↑                                                           ↓
     └──────────── child plays next recommended game ───────────┘
```

**Mastery score formula:**
```
masteryScore = accuracy × 0.7 + (accuracy × speedFactor) × 0.3
speedFactor  = clamp(1000ms / avgResponseTimeMs, 0.3, 1.0)
```

This means a child who answers correctly in 1 second scores `1.0`, while a child who answers correctly in 8 seconds scores approximately `0.83` — reflecting that true mastery requires both accuracy and fluency.

See [`ADAPTIVE_PLATFORM_DESIGN.md`](docs/ADAPTIVE_PLATFORM_DESIGN.md) for the full 5-sprint roadmap including IRT-based quiz difficulty, fatigue detection, clinical regression alerts, and time-of-day optimization.

---

## Roadmap

- [x] Core Blazor WASM + Server architecture
- [x] JWT auth + Google OAuth
- [x] Child quiz with per-answer persistence and resume
- [x] Parent quiz with cross-quiz AI analysis
- [x] Static HTML5 games (12 games across 4 styles × 3 levels)
- [x] AI-powered Neuro-Profile roadmap (BlueBot)
- [x] Netflix-style family profile selector
- [x] Child-scoped JWT architecture (each child has isolated data)
- [x] Role-based dashboards (Child / Parent / Specialist)
- [x] Adaptive Engine v1 (CSM + level promotion + confidence restore)
- [x] Internationalization (ES-MX, EN-US)
- [x] 4-hour inactivity session management
- [ ] IRT-based adaptive quiz difficulty (Sprint 3)
- [ ] Fatigue detection and session length adaptation (Sprint 4)
- [ ] Clinical regression alerts for specialists (Sprint 5)
- [ ] Stripe payment integration
- [ ] Professional certification system
- [ ] Activity kit downloads (PDF packs per learning style)
- [ ] M-CHAT-R/F, CAST, AQ-Adolescent diagnostic integrations
- [ ] Portuguese (Brazil) and Spanish (Spain) locales
- [ ] Mobile app (iOS/Android via .NET MAUI)

---

## Scientific Basis

The learning style detection and adaptive difficulty system is grounded in:

- **VARK Model** (Fleming & Mills, 1992) — Visual, Auditory, Read/Write, Kinesthetic learning preferences
- **Item Response Theory (IRT)** — 1-parameter logistic model for adaptive question difficulty
- **Working Memory Load Theory** (Baddeley, 2000) — basis for session length limits and fatigue detection
- **Neurodiversity-affirming design principles** — no deficit framing, strength-first UI, sensory-sensitive color palette

Validated screening instruments targeted for future integration:
- **M-CHAT-R/F** (Robins et al.) — autism screening 16–30 months
- **CAST** (Baron-Cohen et al., ARC Cambridge) — autism screening 4–11 years
- **AQ-Adolescent** (ARC Cambridge) — autism traits 12–16 years
- **VARK Junior** (VARK Learn Ltd.) — official learning style assessment

> ⚠️ **Ethical note:** No result on this platform constitutes a clinical diagnosis. All screening outputs are presented as *support-need indicators* to be interpreted by qualified professionals. DSM-5 support levels are shown as reference information only.

---

## Contributing

This is a proprietary project by **Onfire Learning**. For partnership inquiries, clinical validation collaborations, or institutional licensing, contact the team.

---

## License

Proprietary — © 2026 Onfire Learning / NeuroBlueMinds. All rights reserved.

---

<div align="center">
<sub>Built with ❤️ for every neurodivergent child who learns differently</sub>
</div>
