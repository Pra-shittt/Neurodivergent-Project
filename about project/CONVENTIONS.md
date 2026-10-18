# Coding Conventions & Development Rules

## Directory Structure
- **Frontend**:
  - `src/components/`: Reusable UI components (Navbar, Modal, Sliders).
  - `src/pages/`: Page-level components (`IndividualDashboard.jsx`, `AssessmentTake.jsx`, etc.).
  - `src/services/`: API abstraction layer (`mockApi.js` transitioning to Axios/Fetch).
  - `src/context/`: Auth and Theme global context providers.
- **Backend**:
  - `src/models/`: Mongoose schemas (`User.js`, `AssessmentTemplate.js`, `DailyLog.js`, etc.).
  - `src/controllers/`: Route handler functions and business logic.
  - `src/routes/`: Express router definitions.
  - `src/middleware/`: Auth verification, RBAC, Zod validation, error handling.
  - `src/utils/`: Pure utility functions (scoring engine, token generation).

## Code Style & Naming
- **Components**: PascalCase (e.g., `IndividualDashboard.jsx`)
- **Utility Files & Helpers**: camelCase (e.g., `scoringEngine.js`, `authMiddleware.js`)
- **Database Models**: PascalCase singular (e.g., `User.js`, `DailyLog.js`)
- **API Endpoints**: Plural, hyphenated lower-case REST style (e.g., `/api/v1/user-assessments/submit`)
- **API Response Contract**:
  - Success: `{ "success": true, "data": { ... } }`
  - Error: `{ "success": false, "error": "Error message description" }`