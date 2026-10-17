# 🚀 Prepper AI — Frontend Web Client

<p align="center">
  <img src="https://img.shields.io/badge/React-19.1-blue.svg?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF.svg?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Redux_Toolkit-2.x-764ABC.svg?style=for-the-badge&logo=redux" alt="Redux Toolkit" />
  <img src="https://img.shields.io/badge/Framer_Motion-12.x-0055FF.svg?style=for-the-badge&logo=framer" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Razorpay-Web_Checkout-11397b.svg?style=for-the-badge&logo=razorpay" alt="Razorpay" />
</p>

**Prepper Frontend** is a modern, responsive web application for interactive AI mock interviews. It features real-time conversational voice interactions (Speech-to-Text and Text-to-Speech), synchronized interviewer video avatars, automated resume information extraction, dynamic countdown timers, and rich visual performance analytics.

---

## 📑 Table of Contents

- [🎨 Design Philosophy & Dual-Theme Architecture](#-design-philosophy--dual-theme-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [⚡ Key Features & Interview Workflow](#-key-features--interview-workflow)
- [📁 Directory Architecture](#-directory-architecture)
- [🔑 Environment Variables](#-environment-variables)
- [🧠 State Management (Redux Store)](#-state-management-redux-store)
- [🎙️ Speech API & Browser Compatibility](#️-speech-api--browser-compatibility)
- [🚀 Local Installation & Scripts](#-local-installation--scripts)
- [🌐 Deployment & Production Build](#-deployment--production-build)

---

## 🎨 Design Philosophy & Dual-Theme Architecture

Prepper features a **dual-theme transition architecture** built with **Tailwind CSS v4** and **Framer Motion**:

*   **Public Landing & Authentication (`#F5EC5A` & Slate-900)**: High-energy, contrast-rich yellow and slate interfaces featuring fluid, physics-based entrance transitions. Floating blobs, interactive badges, and micro-interactions draw visual interest.
*   **Interview Console & Analytics (Slate-950 / Deep Command Center)**: When entering setup or conducting an interview session, the application seamlessly transitions to a focused, dark command-center aesthetic. This minimizes eye strain during vocal practice sessions and mimics modern developer workstations.

---

## 🛠️ Technology Stack

<table width="100%">
  <tr>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="React" width="45" height="45" />
        <h4>React 19</h4>
      </div>
      <p>Component-based UI state architecture utilizing React 19's fast rendering cycles and concurrent capabilities.</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vitejs/vitejs-original.svg" alt="Vite" width="45" height="45" />
        <h4>Vite Bundler</h4>
      </div>
      <p>Ultra-fast development environment and optimized rollup bundling pipeline with instantaneous Hot Module Replacement (HMR).</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" alt="TailwindCSS" width="45" height="45" />
        <h4>Tailwind CSS v4</h4>
      </div>
      <p>Next-gen utility-first styling with integrated Vite plugin (<code>@tailwindcss/vite</code>) and zero-config CSS compilation.</p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redux/redux-original.svg" alt="Redux Toolkit" width="45" height="45" />
        <h4>Redux Toolkit</h4>
      </div>
      <p>Centralized, predictable client-side global state store for keeping track of authenticated user profiles and credit balances.</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/firebase/firebase-original.svg" alt="Firebase" width="45" height="45" />
        <h4>Firebase Auth</h4>
      </div>
      <p>Client-side Google Auth Provider popup integration initializing federated user sign-in sessions.</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://img.icons8.com/color/48/000000/microphone.png" alt="HTML5 Speech API" width="45" height="45" />
        <h4>Web Speech API</h4>
      </div>
      <p>Native client-side speech synthesis (TTS) and <code>webkitSpeechRecognition</code> (STT) for hands-free mock dialogues.</p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://img.icons8.com/fluency/48/000000/combo-chart.png" alt="Recharts" width="45" height="45" />
        <h4>Recharts Visuals</h4>
      </div>
      <p>Responsive SVG charting engine compiling Radar Charts (skills overview) and Bar Charts (question-wise scores).</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://img.icons8.com/color/48/ffffff/framer-motion.png" alt="Framer Motion" width="45" height="45" style="background:#0F172A; border-radius:10px; padding:4px;" />
        <h4>Framer Motion</h4>
      </div>
      <p>Spring physics transitions, staggered lists, modal entrance effects, and tactile card micro-interactions.</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/axios/axios-plain.svg" alt="Axios" width="45" height="45" />
        <h4>Axios Client</h4>
      </div>
      <p>Pre-configured HTTP client using <code>withCredentials: true</code> for automatic cookie synchronization across API endpoints.</p>
    </td>
  </tr>
</table>

---

## ⚡ Key Features & Interview Workflow

### 1. Resume Scanner & Auto-Compilation (`Step1Setup.jsx`)
- **Drag-and-Drop Uploader**: Accepts PDF resumes via multipart upload.
- **AI Profile Extraction**: Instantly populates the candidate's core skills, top projects, target job title, and years of experience into editable tags.
- **Interview Configuration**: Allows selecting **Technical** or **HR** modes and reviewing available platform credits before launching.

### 2. Conversational Voice Console (`Step2Interview.jsx`)
- **Text-to-Speech (TTS)**: The AI interviewer reads the generated questions out loud with speech rate and pitch control.
- **Lip-Sync Video Avatar**: Synchronizes video playback state with speech events (`onstart`, `onend`), delivering a live face-to-face simulation.
- **Speech-to-Text (STT)**: Uses browser microphone recognition to transcribe verbal answers directly in real-time.
- **Circular Progress Timer**: Visually counts down time limits (60s for Easy, 90s for Medium, 120s for Hard), automatically submitting answers if the clock expires.

### 3. Analytics & Feedback Reports (`Step3Report.jsx` & `InterviewReport.jsx`)
- **Overall Score Radial**: Displays aggregate performance percentage via `react-circular-progressbar`.
- **Tri-Factor Radar Chart**: Compares **Confidence**, **Communication**, and **Correctness** metrics.
- **Question-by-Question Breakdown**: Displays question text, candidate's spoken response, AI feedback, and per-question score.

### 4. Credits & Monetization (`Pricing.jsx`)
- Seamless Razorpay checkout modal for purchasing credit bundles (50 credits deducted per interview).
- Dispatches Redux updates upon verified transaction to update navbar credits instantly.

---

## 📁 Directory Architecture

```text
Frontend/
├── public/                 # Static assets (favicons, interview avatar video)
├── src/
│   ├── assets/             # Branding graphics, illustrations, and logos
│   ├── components/         # Reusable UI elements
│   │   ├── AuthModel.jsx   # Modal overlay for Google sign-in
│   │   ├── CapabilityCard  # Hover-animated feature cards
│   │   ├── FeatureCard.jsx # Grid card showing platform capabilities
│   │   ├── ModeCard.jsx    # Selectable card for HR / Technical mode
│   │   ├── Navbar.jsx      # Navigation bar showing avatar & live credit badge
│   │   └── Timer.jsx       # Circular countdown timer component
│   ├── pages/              # Routed view pages
│   │   ├── Auth.jsx        # Authentication page with animated background blobs
│   │   ├── Home.jsx        # Landing page with hero banner & testimonials
│   │   ├── InterViewHistory.jsx # Historical interview sessions log
│   │   ├── InterviewPage.jsx    # Wizard router handling Step 1, 2, and 3
│   │   ├── InterviewReport.jsx  # Permanent report detail viewer (by ID)
│   │   ├── Pricing.jsx     # Credit tiers & Razorpay checkout integration
│   │   ├── Step1Setup.jsx  # Resume upload & interview configuration wizard
│   │   ├── Step2Interview.jsx # Active vocal console with TTS/STT and video avatar
│   │   └── Step3Report.jsx  # Post-interview scorecards and Recharts breakdown
│   ├── redux/              # Central Redux Toolkit store
│   │   ├── store.js        # Redux store config
│   │   └── userSlice.js    # User state slice (profile, credits, login actions)
│   ├── utils/
│   │   └── firebase.js     # Firebase Client SDK & Google Auth initialization
│   ├── App.css             # Root styles
│   ├── App.jsx             # Main Router element & currentUser fetch on boot
│   ├── index.css           # Tailwind v4 theme configuration
│   └── main.jsx            # React root DOM mounting
├── index.html              # Single page application HTML template
├── package.json            # Project dependencies & scripts
├── vercel.json             # SPA rewrites config for Vercel deployment
└── vite.config.js          # Vite config with React & Tailwind plugins
```

---

## 🔑 Environment Variables

Create a `.env` file in the `Frontend/` directory:

```env
# Backend API Base URL
VITE_SERVER_URL=http://localhost:5000

# Razorpay Checkout Public Key
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx

# Firebase Web SDK Configuration
VITE_FIREBASE_APIKEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AUTHDOMAIN=your-app-id.firebaseapp.com
VITE_PROJECT_ID=your-app-id
VITE_STORAGE_BUCKET=your-app-id.appspot.com
VITE_MESSAGE_SENDERID=123456789012
VITE_APPID=1:123456789012:web:xxxxxxxxxxxxxxxxx
```

### Environment Variables Reference

| Variable | Description |
| :--- | :--- |
| `VITE_SERVER_URL` | Base URL pointing to the running backend Express server (e.g. `http://localhost:5000` or production Render/Heroku URL) |
| `VITE_RAZORPAY_KEY_ID` | Public test or live Razorpay Key ID for client-side checkout |
| `VITE_FIREBASE_APIKEY` | Firebase Web API key |
| `VITE_AUTHDOMAIN` | Firebase authentication domain |
| `VITE_PROJECT_ID` | Firebase project identifier |
| `VITE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_MESSAGE_SENDERID` | Firebase Cloud Messaging Sender ID |
| `VITE_APPID` | Firebase web application identifier |

---

## 🧠 State Management (Redux Store)

The client uses **Redux Toolkit** to synchronize user state:

- **Store**: Configured in `src/redux/store.js`.
- **Slice (`src/redux/userSlice.js`)**:
  - `userData`: Stores `{ _id, name, email, credits }` or `null`.
  - `setUserData(payload)`: Updates the logged-in user profile and balance.
  - `clearUserData()`: Resets user state to `null` upon logout.
- **Session Restoration**: When `App.jsx` mounts, an Axios request checks `GET /api/user/currentUser` with cookie credentials. If authenticated, Redux state is automatically restored.

---

## 🎙️ Speech API & Browser Compatibility

The voice console uses standard **Web Speech APIs**:
- **Speech Synthesis**: `window.speechSynthesis` and `SpeechSynthesisUtterance` for speaking questions.
- **Speech Recognition**: `window.SpeechRecognition` or `window.webkitSpeechRecognition` for microphone transcription.

### Recommended Browsers:
- **Google Chrome** (Recommended for optimal STT accuracy)
- **Microsoft Edge**
- **Brave / Chromium-based browsers**

> **Note**: Users must grant microphone permissions when prompted by the browser. If speech recognition is unavailable, candidates can still manually review question text and submit responses.

---

## 🚀 Local Installation & Scripts

### 1. Install Dependencies
```bash
cd Frontend
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The application will launch at: `http://localhost:5173`

### 3. Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `vite` | Starts local development server with Hot Module Replacement (HMR) |
| `build` | `vite build` | Compiles and optimizes assets into production bundle (`dist/`) |
| `preview` | `vite preview` | Serves local production build for pre-deployment testing |
| `lint` | `eslint .` | Runs ESLint checks on all JavaScript and JSX source files |

---

## 🌐 Deployment & Production Build

### Building for Production
```bash
npm run build
```
This generates the optimized static build in the `Frontend/dist` folder.

### Vercel Deployment
The repository includes a `Frontend/vercel.json` file configuring SPA routing rewrites:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
```
Ensure all environment variables specified in the [Environment Variables](#-environment-variables) section are added in the Vercel Project Settings under **Environment Variables**.
