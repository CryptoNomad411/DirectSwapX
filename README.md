# DirectSwapX

DirectSwapX is a wallet-first crypto swap application with a React/Vite frontend and an Express backend. It focuses on cross-chain swap quotes, provider-aware routing, and a non-custodial flow where users review and authorize wallet transactions themselves.

## Project Structure

```text
DirectSwapX/
  swap-backend/    Express API, swap providers, route handling, data store
  swap-frontend/   React + TypeScript + Vite frontend
```

## Features

- Cross-chain swap interface with live route checks
- Wallet-first, non-custodial swap flow
- Backend provider integrations for quotes and swap routes
- Frontend pages for swap, support, FAQ, policies, and product information
- Basic API hardening with Helmet, CORS, rate limiting, and structured error handling

## Prerequisites

- Node.js
- npm
- Git

## Backend Setup

```powershell
cd swap-backend
npm install
npm run dev
```

The backend defaults to port `5000` unless `PORT` is set in the environment.

## Frontend Setup

```powershell
cd swap-frontend
npm install
npm run dev
```

The frontend dev server runs on port `3000`.

## Useful Commands

Backend:

```powershell
npm start
npm run dev
```

Frontend:

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

## Environment

Environment variables should be stored in local `.env` files. They are intentionally ignored by Git.

## Git Notes

Dependency folders such as `node_modules/` are not committed. Install dependencies locally with `npm install` inside each app directory after cloning.
