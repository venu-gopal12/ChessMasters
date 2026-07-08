# ChessMasters

ChessMasters is a full-stack chess platform for real-time games, player and coach profiles, subscriptions, educational articles and videos, game history, and administrative reporting.

## Live application

- Frontend: [chess-masters-gray.vercel.app](https://chess-masters-gray.vercel.app/)
- Backend API documentation: [chessmasters.onrender.com/api-docs](https://chessmasters.onrender.com/api-docs/)

The frontend is deployed on Vercel and the backend is deployed on Render.

## Features

- Real-time multiplayer chess powered by Socket.IO and Chess.js
- Server-authoritative move validation, game results, ELO updates, and reconnection handling
- Player and coach registration, authentication, profiles, and role-based access
- Coach discovery and 30-day content subscriptions
- Coach-created articles and videos with view analytics
- Player game history and statistics
- Coach subscription, revenue, and content dashboards
- Protected admin dashboard for users, content, games, statistics, and revenue
- Responsive React interface with route-level code splitting

> Billing currently runs in clearly labelled demo mode. The application does not collect card data or make real charges. Integrate a PCI-compliant payment provider before enabling production payments.

## Technology

### Frontend

- React 18 and Vite
- React Router
- Redux Toolkit
- Axios
- Socket.IO Client
- Chess.js and React Chessboard
- Tailwind CSS
- Recharts and Chart.js
- Vitest and Testing Library

### Backend

- Node.js and Express
- MongoDB and Mongoose
- Socket.IO
- JSON Web Tokens stored in HttpOnly cookies
- bcrypt password hashing
- Multer file uploads
- Swagger/OpenAPI
- Jest and Supertest

## Project structure

```text
.
|-- Backend/
|   |-- controllers/
|   |-- jobs/
|   |-- middlewares/
|   |-- models/
|   |-- routes/
|   |-- tests/
|   `-- server.js
|-- public/
|-- src/
|   |-- components/
|   |-- redux/
|   `-- main.jsx
|-- docker-compose.yml
|-- Dockerfile
`-- vite.config.js
```

## Local development

### Requirements

- Node.js 22 or newer
- npm
- MongoDB, either locally or through a hosted connection

### 1. Install dependencies

From the project root:

```bash
npm install
```

Then install backend dependencies:

```bash
cd Backend
npm install
cd ..
```

### 2. Configure the frontend

Copy `.env.example` to `.env`:

```env
VITE_BACKEND=http://localhost:3000
```

Vite reads this value at build time. Restart the frontend after changing it.

### 3. Configure the backend

Create `Backend/.env`:

```env
PORT=3000
JWT_SECRET_KEY=replace-with-a-long-random-secret
MONGODB_URI=mongodb://localhost:27017/chessmasters
FRONTEND_URL=http://localhost:5173
VITE_BACKEND=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

`VITE_BACKEND` on the backend is the public URL the server uses for its internal game-result requests. In production, set it to the deployed backend URL. `REDIS_URL` enables persistent active-game snapshots and cross-instance Socket.IO broadcasts. When it is omitted, the backend falls back to single-instance in-memory coordination.

Never commit real secrets or production connection strings.

### 4. Start the application

Run the backend from `Backend`:

```bash
npm start
```

In another terminal, run the frontend from the project root:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Docker

The included Compose configuration starts the frontend, backend, MongoDB, and Redis:

```bash
docker compose up --build
```

The frontend is available at [http://localhost](http://localhost), the backend at `http://localhost:3000`, MongoDB at `mongodb://localhost:27017`, and Redis within Compose at `redis://redis:6379`.

Create `Backend/.env` before starting Compose. When using the Compose MongoDB service, use:

```env
MONGODB_URI=mongodb://mongo:27017/chessmasters
```

## User roles

### Player

Players can play games, view their statistics and history, browse coaches, and activate demo subscriptions to coach content.

### Coach

Coaches can complete a professional profile, publish and manage content, view subscribers, and inspect revenue and view analytics.

### Admin

The project currently retains the following development credentials:

```text
Username: admin
Password: secret
```

Admin API operations require the signed admin session created at login. Replace the hardcoded credentials before using the project in a real production environment.

## Commands

### Frontend

```bash
npm run dev       # Start the Vite development server
npm run build     # Create the production bundle
npm run preview   # Preview the production bundle
npm test          # Run frontend tests with Vitest
npm run lint      # Run ESLint
```

### Backend

Run these commands from `Backend`:

```bash
npm start         # Start the API and Socket.IO server
npm run dev       # Start with Nodemon
npm test          # Run Jest/Supertest tests
```

## API and authentication

- Swagger UI is served from `/api-docs`.
- Authentication uses a signed JWT stored in an HttpOnly cookie.
- Cross-origin frontend requests must include credentials.
- Admin, coach, player, and internal game endpoints enforce their corresponding access rules.
- Game result and ELO mutation endpoints are server-internal.

## Deployment

### Frontend on Vercel

Set:

```env
VITE_BACKEND=https://your-backend.example.com
```

The repository includes `vercel.json`, which builds the Vite application and rewrites client-side routes to `index.html`.

### Backend on Render

Set:

```env
NODE_ENV=production
JWT_SECRET_KEY=your-production-secret
MONGODB_URI=your-production-mongodb-uri
FRONTEND_URL=https://your-frontend.example.com
VITE_BACKEND=https://your-backend.example.com
REDIS_URL=rediss://your-managed-redis-url
```

The included `render.yaml` uses `Backend` as the service directory and `/` as its health-check path.

## Testing and verification

The project contains:

- Backend controller tests using Jest and Supertest
- Frontend state tests using Vitest
- A Vite production build
- ESLint configuration for source review

Before submitting a change, run:

```bash
npm test
npm run build
cd Backend
npm test
```

## Contributors

- Mihir Chandra Loke
- Sundar R
- Kache Nivas
- B Venu Gopal Reddy
- P Sujith Kumar
