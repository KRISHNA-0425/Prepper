# AI Interview Prep Website

A comprehensive full-stack web application designed to help users prepare for interviews using AI. This platform includes user authentication, interview setup with resume uploads, and dynamic mock interview sessions. Built using the MERN stack

## 🌟 Features

- **User Authentication**: Secure login and authorization powered by Firebase and JWT.
- **AI-Powered Interview Sessions**: Start and interact with AI for mock interview rounds.
- **Advanced Resume Analysis**: Upload functionality for resumes via Multer, with PDF parsing utilizing `pdfjs-dist`. Instantly extracts and displays key information like past projects for a comprehensive interview setup.
- **Modern & Responsive UI**: Beautiful interfaces built with React, TailwindCSS, and smooth animations using Framer Motion. Features custom components like `CapabilityCard` and dynamic data visualization.
- **Data Visualization**: Integrated `recharts` and `react-circular-progressbar` for clear visual feedback on user progress and interview analytics.
- **State Management**: Robust frontend data management with Redux Toolkit.
- **Real-time Server Comm**: Fast API communication via Axios.
- **API Security**: Built-in rate limiting using `express-rate-limit` to prevent abuse, secure endpoints, and ensure high availability.

## 🚀 Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling & UI**: TailwindCSS, Framer Motion for animations
- **Data Visualization**: Recharts, React Circular Progressbar
- **State Management**: Redux Toolkit & React-Redux
- **Routing**: React Router DOM (v7)
- **Other Tools**: Axios, Firebase Web SDK, React Icons

### Backend
- **Server Environment**: Node.js & Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: Firebase Auth, `jsonwebtoken` (JWT), `bcryptjs`
- **File Uploads & Processing**: `multer`, `pdfjs-dist`
- **Security & Rate Limiting**: `express-rate-limit`
- **Other Utilities**: `cors`, `cookie-parser`, `dotenv` for environment variables

## 📁 Project Structure

```text
AI-Interview-II/
│
├── Backend/                 # Express Server & API logic
│   ├── config/              # DB connection config
│   ├── models/              # Mongoose database schemas (e.g., interview.model.js)
│   ├── routes/              # API endpoints (auth, user, interview)
│   ├── server.js            # Entry point for backend
│   └── package.json
│
├── Frontend/                # Vite + React Application
│   ├── src/
│   │   ├── pages/           # Components for distinct routes (Home, Auth, InterviewPage, Step1Setup)
│   │   ├── redux/           # Redux slices (e.g., userSlice) and store configuration
│   │   ├── App.jsx          # Main application component & routing logic
│   │   └── main.jsx         # React application mounting
│   └── package.json
│
└── README.md                # Project documentation
```

## 🛠️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) local instance or Atlas URI
- [Firebase](https://firebase.google.com/) project setup (for Auth integration)

### 1. Clone the repository

```bash
git clone https://github.com/KRISHNA-0425/Prepper
cd AI-Interview-II
```

### 2. Backend Setup

1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd Backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Backend` directory and define the necessary environment variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   SERVER_URL=http://localhost:5173
   # Include any additional Firebase Admin or AI API keys as required
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server should now be running (default: http://localhost:5000).*

### 3. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd Frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Frontend` directory and supply the variables:
   ```env
   VITE_SERVER_URL=http://localhost:5000
   # Add your Firebase Web SDK config keys if needed
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend application should now be accessible at http://localhost:5173.*

## 🤝 Contribution

Contributions, issues, and feature requests are welcome! Feel free to explore the code to understand the architecture or suggest improvements.

## 📝 License

This project is licensed under the ISC License.
