# ⚙️ Prepper AI — Backend Server & API Service

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-green.svg?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.x-black.svg?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/JWT-Secure_Auth-orange.svg?style=for-the-badge&logo=json-web-tokens" alt="JWT" />
  <img src="https://img.shields.io/badge/Razorpay-Node_SDK-blue.svg?style=for-the-badge&logo=razorpay" alt="Razorpay" />
  <img src="https://img.shields.io/badge/OpenRouter-AI_LLM-purple.svg?style=for-the-badge" alt="OpenRouter" />
</p>

The **Prepper Backend** is a scalable REST API server powering the Prepper AI interview platform. Built on **Node.js (ES Modules)** and **Express 5**, it orchestrates AI model interactions via **OpenRouter**, parses PDF resumes using **pdfjs-dist**, securely manages authentication with **JWT cookies**, and processes credit payments through **Razorpay**.

---

## 📑 Table of Contents

- [Architectural Highlights](#-architectural-highlights)
- [Tech Stack](#-tech-stack)
- [Directory Structure](#-directory-structure)
- [Environment Variables](#-environment-variables)
- [API Endpoints Reference](#-api-endpoints-reference)
  - [Authentication Routes](#1-authentication-routes-apiauth)
  - [User Routes](#2-user-routes-apiuser)
  - [Interview Routes](#3-interview-routes-apiinterview)
  - [Payment Routes](#4-payment-routes-apipayment)
- [Installation & Local Setup](#-installation--local-setup)
- [Database Models](#-database-models)
- [Security & Production Configuration](#-security--production-configuration)

---

## 🏗️ Architectural Highlights

1. **AI Question Generation & Scoring Pipeline**:
   - Integrates with OpenRouter to dynamically generate difficulty-tiered interview questions (Easy → Medium → Hard) personalized to candidate role, experience level, projects, and parsed resume content.
   - Evaluates spoken answers across three dimensions (**Confidence**, **Communication**, and **Correctness**) on a 0–10 scale and delivers actionable human-like feedback.
2. **Server-Side PDF Resume Parsing**:
   - Uploads resumes securely in memory/temp storage via `multer`.
   - Utilizes `pdfjs-dist` to extract raw text content across all PDF pages.
   - Leverages AI to extract candidate skills, projects, targeted role, and experience into structured JSON before unlinking temporary files.
3. **Credit Economy & Payment Flow**:
   - Users consume 50 credits per mock interview session.
   - Razorpay Order creation with HMAC-SHA256 signature verification prevents fraud and atomically credits user accounts.
4. **Stateless JWT in HTTP-Only Cookies**:
   - Issues 7-day JWT tokens stored inside secure, HTTP-only cookies (`sameSite: 'none'` in production, `lax` in development).

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Node.js (v18+)** | Runtime environment configured with native ECMAScript Modules (`"type": "module"`) |
| **Express.js (v5.x)** | Web application framework handling routing, middleware, and controllers |
| **MongoDB & Mongoose (v9.x)** | NoSQL document database and Object Data Modeling (ODM) |
| **OpenRouter API** | Multi-LLM provider for structured resume extraction, dynamic question generation, and candidate grading |
| **pdfjs-dist (v5.x legacy)** | PDF stream decoding and text extraction |
| **Multer** | Multipart form-data parser for resume file uploads |
| **Razorpay SDK & Crypto** | Payment orders generation and cryptographic HMAC verification |
| **JWT (`jsonwebtoken`) & Cookie-Parser** | Secure cookie session tokens |
| **Helmet & Express Rate Limit** | Security headers protection and API throttling |
| **CORS** | Cross-Origin Resource Sharing configured with credentials support |

---

## 📁 Directory Structure

```text
Backend/
├── config/
│   ├── db.js                   # Mongoose connection logic
│   └── token.js                # JWT token signing utility
├── controllers/
│   ├── googleAuth.controller.js # Google login session creation & logout
│   ├── interview.controller.js  # Resume parsing, question gen, answer evaluation & reports
│   ├── payment.controller.js    # Razorpay order generation and HMAC signature verification
│   └── user.controller.js       # Current authenticated user details
├── middleware/
│   ├── isAuth.js               # JWT cookie extraction and verification middleware
│   ├── multer.js               # File upload handler configured for resume uploads
│   └── rateLimiter.js          # Express rate limiter configuration
├── models/
│   ├── interview.model.js      # Interview session, question subschemas & scores
│   ├── payment.model.js        # Razorpay transaction log
│   └── user.model.js           # User profiles and credit balance
├── routes/
│   ├── auth.routes.js          # /api/auth endpoints
│   ├── interview.routes.js     # /api/interview endpoints
│   ├── payment.routes.js       # /api/payment endpoints
│   └── user.routes.js          # /api/user endpoints
├── services/
│   ├── openRouter.service.js   # OpenRouter LLM HTTP client wrapper
│   └── razorpay.service.js     # Razorpay client instance initialization
├── public/                     # Static assets / temporary upload directory
├── .env                        # Local environment variables (do not commit)
├── package.json                # Dependencies and npm scripts
└── server.js                   # Express application bootstrap & port listener
```

---

## 🔑 Environment Variables

Create a `.env` file in the `Backend/` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
SERVER_URL=http://localhost:5173

# Database
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/prepper?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# OpenRouter AI API
OPEN_ROUTER_URL=https://openrouter.ai/api/v1/chat/completions
OPEN_ROUTER_APIKEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPEN_ROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

### Environment Variable Explanations

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Port the Express server listens on | `5000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `SERVER_URL` | Allowed frontend origin for CORS and cookie credentials | `http://localhost:5173` |
| `MONGO_URL` | MongoDB connection string URI | `mongodb://localhost:27017/prepper` |
| `JWT_SECRET` | Secret string used to sign and verify JWT authentication cookies | `random_32_char_secret` |
| `OPEN_ROUTER_URL` | OpenRouter completions API endpoint | `https://openrouter.ai/api/v1/chat/completions` |
| `OPEN_ROUTER_APIKEY` | OpenRouter API authentication key | `sk-or-v1-...` |
| `OPEN_ROUTER_MODEL` | AI model identifier used for extraction, question gen & scoring | `meta-llama/llama-3.3-70b-instruct:free` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (from Razorpay Dashboard) | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret for webhook/signature verification | `...` |

---

## 📡 API Endpoints Reference

### 1. Authentication Routes (`/api/auth`)

#### `POST /api/auth/googleAuth`
- **Description**: Verifies Google authenticated user details, creates or fetches the user in MongoDB, and sets an `httpOnly` cookie with a JWT.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "message": "user created",
    "user": {
      "_id": "670...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "credits": 100
    }
  }
  ```

#### `GET /api/auth/logout`
- **Description**: Clears the `token` authentication cookie.
- **Response** (`200 OK`):
  ```json
  { "message": "logout successful" }
  ```

---

### 2. User Routes (`/api/user`)

#### `GET /api/user/currentUser`
- **Description**: Returns the profile information and credit balance of the currently authenticated user.
- **Headers/Cookie**: Requires valid `token` cookie (`isAuth` middleware).
- **Response** (`200 OK`):
  ```json
  {
    "user": {
      "_id": "670...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "credits": 50
    }
  }
  ```

---

### 3. Interview Routes (`/api/interview`)

#### `POST /api/interview/resume`
- **Description**: Uploads a PDF resume, parses the text with `pdfjs-dist`, and prompts AI to extract structured profile information.
- **Headers**: `Content-Type: multipart/form-data`, requires auth cookie.
- **Form Data**: `resume` (PDF file).
- **Response** (`200 OK`):
  ```json
  {
    "role": "Full Stack Developer",
    "experience": "2 years",
    "projects": ["E-Commerce Platform", "Real-Time Chat App"],
    "skills": ["React", "Node.js", "MongoDB", "Express", "TailwindCSS"],
    "resumeText": "Extracted text content..."
  }
  ```

#### `POST /api/interview/generateQuestions`
- **Description**: Deducts 50 credits from the user, generates 5 tailored interview questions with incremental difficulty (Easy → Medium → Hard) and configured countdown limits, and persists the interview session.
- **Request Body**:
  ```json
  {
    "role": "Frontend Developer",
    "experience": "3",
    "mode": "Technical",
    "resumeText": "...",
    "projects": ["Portfolio", "Dashboard"],
    "skills": ["JavaScript", "React", "CSS"]
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "interviewId": "670...",
    "creditsLeft": 50,
    "userName": "Jane Doe",
    "mode": "Technical",
    "questions": [
      {
        "question": "Can you explain how React reconciles virtual DOM trees and updates the real DOM efficiently?",
        "difficulty": "easy",
        "timeLimit": 60,
        "score": 0
      }
    ]
  }
  ```

#### `POST /api/interview/submitAnswer`
- **Description**: Submits the candidate's transcribed answer for a specific question. Evaluates it via AI against **Confidence**, **Communication**, and **Correctness** (0–10 scale).
- **Request Body**:
  ```json
  {
    "interviewId": "670...",
    "questionIndex": 0,
    "answer": "React uses a virtual DOM to compare changes with a diffing algorithm...",
    "timeTaken": 42
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "feedback": "Strong answer with clear explanation of diffing algorithm.",
    "score": 8
  }
  ```

#### `POST /api/interview/finish`
- **Description**: Computes overall performance metrics, marks the interview as `Completed`, and returns the final aggregates.
- **Request Body**:
  ```json
  {
    "interviewId": "670..."
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "finalScore": 8,
    "confidence": 9,
    "communication": 8,
    "correctness": 8,
    "questions": [ ... ]
  }
  ```

#### `GET /api/interview/getInterview`
- **Description**: Retrieves all historic interview sessions for the logged-in user.
- **Response** (`200 OK`): List of interview summaries (`role`, `experience`, `mode`, `finalScore`, `status`, `createdAt`).

#### `GET /api/interview/report/:id`
- **Description**: Retrieves detailed performance analytics for a specific interview session.
- **Response** (`200 OK`):
  ```json
  {
    "role": "Frontend Developer",
    "finalScore": 8,
    "confidence": 9,
    "communication": 8,
    "correctness": 8,
    "questions": [ ... ]
  }
  ```

---

### 4. Payment Routes (`/api/payment`)

#### `POST /api/payment/order`
- **Description**: Creates a Razorpay order in INR paisa and creates a payment transaction record in MongoDB.
- **Request Body**:
  ```json
  {
    "planId": "pro_tier",
    "amount": 499,
    "credits": 250
  }
  ```
- **Response** (`200 OK`): Returns the Razorpay order object with `id`, `amount`, and `currency`.

#### `POST /api/payment/verify`
- **Description**: Cryptographically verifies the Razorpay signature (`HMAC-SHA256`) and updates the user's credit balance upon success.
- **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_xxxx",
    "razorpay_payment_id": "pay_xxxx",
    "razorpay_signature": "signature_hash"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "payment verified",
    "user": { "credits": 300 }
  }
  ```

---

## 💻 Installation & Local Setup

### 1. Prerequisites
- Node.js (v18 or later recommended)
- A running MongoDB instance (Local or MongoDB Atlas)
- An active [OpenRouter](https://openrouter.ai/) account with an API key
- A [Razorpay](https://razorpay.com/) test mode key pair

### 2. Install Dependencies
```bash
cd Backend
npm install
```

### 3. Configure `.env`
Copy your environment credentials into `Backend/.env` as detailed in the [Environment Variables](#-environment-variables) section.

### 4. Run Development Server
```bash
npm run dev
```
The server will boot up and log:
```
Server is running on port: 5000
Db connected successfully
```

---

## 🗄️ Database Models

### `User` (`models/user.model.js`)
- `name` (String, required)
- `email` (String, required, unique, lowercase)
- `credits` (Number, default: 100)
- `timestamps` (createdAt, updatedAt)

### `Interview` (`models/interview.model.js`)
- `userId` (ObjectId referencing `User`, required)
- `role` (String, required)
- `experience` (String, required)
- `mode` (String: `"HR"` | `"Technical"`)
- `resumeText` (String)
- `questions` (Array of question objects containing `question`, `difficulty`, `timeLimit`, `answer`, `feedback`, `score`, `confidence`, `communication`, `correctness`)
- `finalScore` (Number, default: 0)
- `status` (String: `"Completed"` | `"Incompleted"`)

### `Payment` (`models/payment.model.js`)
- `userId` (ObjectId referencing `User`, required)
- `planId` (String)
- `amount` (Number, required)
- `credits` (Number, required)
- `razorpayOrderId` (String, required)
- `razorpayPaymentId` (String)
- `razorpaySignature` (String)
- `status` (String: `"Created"` | `"Paid"` | `"Failed"`)

---

## 🛡️ Security & Production Configuration

- **Reverse Proxy Support**: Configured with `app.set('trust proxy', 1)` to handle secure cookies when deployed behind cloud proxies like Render or AWS ELB.
- **Cross-Site Cookies**: When `NODE_ENV === "production"`, authentication cookies are automatically secured with:
  ```javascript
  {
    secure: true,
    sameSite: "none",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
  ```
- **File System Cleanliness**: Uploaded resume files in `Backend/public/` are unlinked via `fs.unlinkSync` immediately after parsing or upon caught exceptions.
- **Security Headers**: `helmet()` is applied globally to defend against common vulnerabilities like clickjacking and MIME-type sniffing.
