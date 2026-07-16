# 🚀 PREPPER — Frontend Console

Prepper is an interactive, AI-driven mock interview platform designed to help candidates prepare for real-world job interviews. It provides a real-time conversational interface where an AI interviewer speaks questions aloud and listens to verbal answers, culminating in a detailed, visual performance breakdown.

---

## 🎨 Design Philosophy & UI Transitions

Prepper features a distinct **dual-theme transition architecture** built with **Tailwind CSS v4** and **Framer Motion**:

*   **Public Landing & Authentication (`#F5EC5A` & Slate-900)**: High-energy, contrast-rich yellow and slate interfaces featuring fluid, physics-based entrance transitions. Blobs and custom micro-interactions draw visual interest.
*   **Interview Console & Reports (Slate-950 / Dark Mode)**: When entering setup or starting an interview session, the application seamlessly transitions to a premium, dark command-center aesthetic. This focuses attention, reduces glare during mock speaking sessions, and matches standard IDE/terminal environments.

---

## 🛠️ Technology Stack (Tech Cards)

<table width="100%">
  <tr>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="React" width="45" height="45" />
        <h4>React 19</h4>
      </div>
      <p size="2">Component-based UI state architecture utilizing React 19's fast rendering cycles and concurrent rendering features.</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vitejs/vitejs-original.svg" alt="Vite" width="45" height="45" />
        <h4>Vite Config</h4>
      </div>
      <p size="2">Ultra-fast modern development environment and bundling pipeline with instantaneous Hot Module Replacement (HMR).</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" alt="TailwindCSS" width="45" height="45" />
        <h4>Tailwind CSS v4</h4>
      </div>
      <p size="2">High-performance utility-first styling with integrated PostCSS parsing and custom keyframes animations.</p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redux/redux-original.svg" alt="Redux Toolkit" width="45" height="45" />
        <h4>Redux Toolkit</h4>
      </div>
      <p size="2">Centralized, predictable client-side global state store for keeping track of authenticated user accounts and platform credits.</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/firebase/firebase-original.svg" alt="Firebase" width="45" height="45" />
        <h4>Firebase OAuth</h4>
      </div>
      <p size="2">Seamless client-side integration utilizing Firebase Google Auth Provider popups to kickstart user sessions.</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://img.icons8.com/color/48/000000/microphone.png" alt="HTML5 Speech API" width="45" height="45" />
        <h4>Web Speech API</h4>
      </div>
      <p size="2">Native client-side speech synthesis (Text-to-Speech) and webkitSpeechRecognition (Speech-to-Text) for hands-free mock dialogues.</p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://img.icons8.com/fluency/48/000000/combo-chart.png" alt="Recharts" width="45" height="45" />
        <h4>Recharts Visuals</h4>
      </div>
      <p size="2">Responsive SVG charting engine compiling Radar Charts (skills overview) and Bar Charts (question-wise scores).</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://img.icons8.com/color/48/ffffff/framer-motion.png" alt="Framer Motion" width="45" height="45" style="background:#0F172A; border-radius:10px; padding:4px;" />
        <h4>Framer Motion</h4>
      </div>
      <p size="2">Spring physics transitions, staggered lists, and entry/exit card animations that establish tactile responsiveness.</p>
    </td>
    <td width="33%" valign="top">
      <div align="center">
        <br/>
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/axios/axios-plain.svg" alt="Axios" width="45" height="45" />
        <h4>Axios client</h4>
      </div>
      <p size="2">Configured with credentials support for HTTP cookie persistence during cross-origin api handshakes.</p>
    </td>
  </tr>
</table>

---

## ⚡ Key Functionality & Features

### 📂 1. Profile Sync & Resume Parsing
*   **Drag-and-Drop Resume Scanner**: Users can upload a resume (PDF/DOCX) using a custom multipart/form-data interface.
*   **AI Auto-Extraction**: The backend analyzes the document, extracting the candidate's core skills, notable projects, targeted role, and experience level, immediately pre-filling the interview wizard.

### 👥 2. Adaptive Interview Generation
*   **Custom Adjustments**: Refine skills, add specific projects, toggle between Technical or HR focus, and input years of experience.
*   **Credit Verification**: Starting an interview utilizes global user state to query and display active credits before calling the AI generation model.

### 🗣️ 3. Simulated Face-to-Face Voice Console
*   **Web Speech Synthesis (TTS)**: The AI speaks questions using high-fidelity voices configured inside the browser environment.
*   **Web Speech Recognition (STT)**: Recognizes speech input automatically, transcribing verbal answers in real-time.
*   **Animated Persona Sync**: A simulated video element synchronizes play state based on SpeechSynthesis events (`onstart` / `onend`), simulating a live speaker.
*   **Smart Time Control**: Countdown timer tracks time left for each question, warning the user and automatically submitting response data when the clock reaches zero.

### 📊 4. Deep Metrics Analytics Dashboard
*   **Composite Scoring**: Single-metric indicator representing performance percentage.
*   **Radar Overview**: Visual display scoring three crucial factors: **Confidence**, **Communication**, and **Correctness**.
*   **Performance Progress Bar Chart**: Question-by-question scoring display mapped via Recharts.
*   **Comprehensive Feedbacks**: Comparative display showing the original question, your spoken answer, AI's ideal answer guidance, and bulleted improvements.

### 📁 5. Session History Archive
*   **Persisted Log**: Pulls all historic interview sessions conducted under the user profile.
*   **Quick Navigate**: Instant link-backs to historical report pages.

---

## 📁 Directory Architecture

Below is the layout of the frontend application assets:

```bash
Frontend/
├── public/                 # Static public resources
├── src/
│   ├── assets/             # Media and static graphics
│   ├── components/         # Reusable presentation components
│   │   ├── AuthModel.jsx   # Portal modal trigger for authentication
│   │   ├── CapabilityCard  # Hover-responsive features listing card
│   │   ├── FeatureCard.jsx # Feature dashboard summary grid card
│   │   ├── ModeCard.jsx    # Selectable interview focus state card
│   │   ├── Navbar.jsx      # Navigation bar showing user credits and avatar
│   │   └── Timer.jsx       # Custom circular progress countdown timer
│   ├── pages/              # Routed pages
│   │   ├── Auth.jsx        # Google login template with active blobs
│   │   ├── Home.jsx        # Landing dashboard page
│   │   ├── InterViewHistory.jsx # Historical sessions record viewer
│   │   ├── InterviewPage.jsx    # Wizard router (Setup -> Active -> Final)
│   │   ├── InterviewReport.jsx  # Permanent report detail retriever
│   │   ├── Pricing.jsx     # Credit plans list page
│   │   ├── Step1Setup.jsx  # Drag & Drop resume profile compiler
│   │   ├── Step2Interview.jsx # Active TTS/STT interviewer console
│   │   └── Step3Report.jsx  # Local charts and feedback generator
│   ├── redux/              # Client-side redux global state store
│   │   ├── store.js        # Redux store orchestrator
│   │   └── userSlice.js    # User state slice & credentials sync actions
│   ├── utils/
│   │   └── firebase.js     # Firebase client setup & provider instance
│   ├── App.css             # Main styling rules
│   ├── App.jsx             # Main Router element with axios initializer
│   ├── index.css           # Global CSS variables mapping
│   └── main.jsx            # DOM entrypoint
├── index.html              # HTML shell template
├── package.json            # NPM dependencies configuration
└── vite.config.js          # Vite config bundling instructions
```

---

## 🚀 Running Locally

To bootstrap the application locally, run these commands in the terminal:

1. Install current dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build the production package:
   ```bash
   npm run build
   ```
