# Sanding Monitoring Web App

A React TypeScript application with MongoDB backend for sanding pass monitoring and notes.

## Features

- React 18 with TypeScript
- Vite for fast development and building
- Express backend API with MongoDB
- Pass notes management
- Clean, modern UI

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB instance)

### 1. Install dependencies:

```bash
npm install
```

### 2. Configure MongoDB

Create a `.env` file in the `server/` directory:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
MONGODB_DB=viking
PORT=3001
```

### 3. Start the backend server:

```bash
npm run server
```

The API will be available at `http://localhost:3001`

### 4. Test the backend API:

```bash
npm run test:api
```

Add `--cleanup` flag to remove test data:

```bash
npm run test:api -- --cleanup
```

### 5. Start the frontend (in a separate terminal):

```bash
npm run dev
```

### 6. Start the viam proxy (in a separate terminal):

```bash
viam module local-app-testing --app-url http://localhost:3000 --machine-id <machine-id>
```

## Available Scripts

- `npm run dev` - Start frontend development server
- `npm run server` - Start backend API server
- `npm run test:api` - Run API tests against the backend
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

## API Endpoints

### POST `/api/notes`

Create or update a note for a pass.

**Request body:**

```json
{
  "organization_id": "string",
  "location_id": "string",
  "robot_id": "string",
  "pass_id": "string",
  "note_text": "string",
  "created_by": "string (optional)"
}
```

### GET `/api/notes`

Fetch notes for multiple passes.

**Query parameters:**

- `organizationId` - Organization ID (required)
- `robotId` - Robot ID (required)
- `locationId` - Location ID (required)
- `passIds` - Comma-separated list of pass IDs (required)

### DELETE `/api/notes`

Delete all notes for a specific pass.

**Query parameters:**

- `organizationId` - Organization ID (required)
- `robotId` - Robot ID (required)
- `locationId` - Location ID (required)
- `passId` - Pass ID (required)

### DELETE `/api/notes/old`

Delete old notes for a pass (keeps the newest one).

**Query parameters:**

- `organizationId` - Organization ID (required)
- `robotId` - Robot ID (required)
- `locationId` - Location ID (required)
- `passId` - Pass ID (required)

## MongoDB Schema

### Collection: `sanding_notes`

```typescript
{
  _id: ObjectId,
  organization_id: string,
  location_id: string,
  robot_id: string,
  pass_id: string,
  note_text: string,
  created_at: string (ISO date),
  created_by: string
}
```

## Project Structure

- `src/` - Frontend React application
  - `App.tsx` - Main application component
  - `AppInterface.tsx` - Main UI interface
- `server/` - Backend Express API
  - `index.ts` - API server
  - `test-api.ts` - API test suite
  - `.env` - Environment variables
- `vite.config.ts` - Vite configuration (proxies `/api` to backend)

## Testing

The test suite (`server/test-api.ts`) covers:

1. Creating notes
2. Fetching notes for multiple passes
3. Deleting old notes (keeping newest)
4. Deleting all notes for a pass
5. Data validation

View test results in MongoDB Atlas:

1. Go to https://cloud.mongodb.com/
2. Select your cluster
3. Click "Browse Collections"
4. Navigate to `viking` database → `sanding_notes` collection

## Development Workflow

1. Start backend: `npm run server` (Terminal 1)
2. Start frontend: `npm run dev` (Terminal 2)
3. Start viam proxy: `viam module local-app-testing --app-url http://localhost:3000 --machine-id <id>` (Terminal 3)

## Dependencies

### Frontend

- React 18.2.0
- @viamrobotics/sdk
- js-cookie

### Backend

- express 5.1.0
- mongodb 6.20.0
- cors 2.8.5
- dotenv 17.2.3
