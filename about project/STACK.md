# Technical Stack Specification

## Phase 1: Frontend (Client)
- **Framework**: React 18 with Vite 5
- **Styling**: Tailwind CSS (Sensory-friendly dark mode theme)
- **Icons**: Lucide React
- **Visualization**: Recharts (Line charts, Bar charts, Radar charts)
- **Routing**: React Router DOM (v6)
- **State & Service Layer**: Context API + `mockApi.js` (Simulated async server delay)

## Phase 2: Backend (Server & Database)
- **Runtime**: Node.js 20 LTS
- **Web Framework**: Express 4.18
- **Database**: MongoDB 7 / Mongoose 8 ODM
- **Authentication**: JWT (JSON Web Tokens) stored in secure `httpOnly` cookies
- **Security & Utilities**:
  - `bcryptjs`: Password hashing
  - `zod` / `joi`: Request body validation
  - `helmet`: Security HTTP headers
  - `cors`: Cross-Origin Resource Sharing
  - `cookie-parser`: Cookie parsing middleware