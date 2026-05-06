# 🤖 Prepper AI - Advanced Interview Prep Platform

<p align="center">
  <img src="https://img.shields.io/badge/MERN%20Stack-Ready-blue?style=for-the-badge&logo=react" alt="MERN Stack" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Razorpay-Integration-11397b?style=for-the-badge&logo=razorpay" alt="Razorpay" />
</p>

A comprehensive, full-stack web application designed to help users prepare for interviews using AI. This platform empowers candidates by analyzing their resumes and conducting dynamic mock interview sessions based on real-world scenarios.

## ✨ Features

- **🛡️ Secure Authentication**: Robust login and authorization powered by Firebase and JWT.
- **🎙️ AI-Powered Interview Sessions**: Start and interact with advanced AI models for realistic mock interview rounds.
- **📄 Advanced Resume Analysis**: Seamless resume uploading via Multer with PDF parsing powered by `pdfjs-dist`. Instantly extracts key information (skills, past projects, experience) for a tailored interview setup.
- **💳 Credit System & Payments**: Integrated Razorpay payment gateway for purchasing interview credits and managing subscription tiers.
- **📊 Interactive Data Visualization**: Integrated `recharts` and `react-circular-progressbar` for clear, visual feedback on user progress, strengths, and areas of improvement.
- **🎨 Modern & Responsive UI**: Beautiful interfaces built with React and TailwindCSS, featuring smooth micro-animations using Framer Motion and custom components like `CapabilityCard`.
- **🚀 State & API Management**: Robust frontend data management with Redux Toolkit and fast, secure API communication via Axios.
- **🔒 Backend Security**: Built-in rate limiting using `express-rate-limit` to prevent abuse, secure endpoints, and ensure high availability.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling & UI**: TailwindCSS, Framer Motion
- **Data Visualization**: Recharts, React Circular Progressbar
- **State Management**: Redux Toolkit & React-Redux
- **Routing**: React Router DOM (v7)
- **Payment Integration**: Razorpay Web SDK
- **Other Tools**: Axios, Firebase Web SDK, React Icons

### Backend
- **Server Environment**: Node.js & Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: Firebase Auth, JWT (`jsonwebtoken`), bcryptjs
- **File Uploads & Processing**: Multer, `pdfjs-dist`
- **Security & Rate Limiting**: `express-rate-limit`, Helmet, CORS
- **Payment Gateway**: Razorpay Node.js SDK
- **Other Utilities**: `cookie-parser`, `dotenvx` for secure environment variable management

## 📁 Project Structure

```text
Prepper/
│
├── Backend/                 # Express Server & API logic
│   ├── config/              # Database connection configuration
│   ├── controllers/         # API business logic (e.g., payment, auth)
│   ├── middleware/          # Custom middlewares (e.g., auth verification)
│   ├── models/              # Mongoose database schemas 
│   ├── routes/              # API endpoints (auth, user, interview, payment)
│   ├── server.js            # Entry point for the backend server
│   └── package.json
│
├── Frontend/                # Vite + React Application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route components (Home, Dashboard, Pricing, Interview)
│   │   ├── redux/           # Redux slices and store configuration
│   │   ├── App.jsx          # Main application component & routing logic
│   │   └── main.jsx         # React application mounting
│   └── package.json
│
└── README.md                # Project documentation
```

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)
- [Firebase](https://firebase.google.com/) (Project setup for Auth integration)
- [Razorpay](https://razorpay.com/) (Account for payment gateway keys)

### 1. Clone the repository

```bash
git clone https://github.com/KRISHNA-0425/Prepper.git
cd Prepper
```

### 2. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Backend` directory:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   SERVER_URL=http://localhost:5173
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   # Include any additional Firebase Admin or AI API keys as required
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server should now be running (default: http://localhost:3000).*

### 3. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Frontend` directory:
   ```env
   VITE_SERVER_URL=http://localhost:3000
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   # Add your Firebase Web SDK config keys if needed
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend application should now be accessible at http://localhost:5173.*

## 🤝 Contributing

Contributions, issues, and feature requests are always welcome! Feel free to explore the code, understand the architecture, or suggest improvements to make this platform even better.

## 📝 License

This project is licensed under the **ISC License**.
