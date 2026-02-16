# Project Title

HeyaWeb

## Description

HeyaWeb is the frontend client for campus room booking. It exists to provide users and admins with a simple interface for authentication, booking submission, approval workflow, and booking management.

## Features

- Authentication screens (register and sign in)
- Role-based UI (`User` and `Admin` views)
- Building and room browsing
- Booking request creation
- Admin booking management with status filters (`Pending`, `Approved`, `Rejected`)
- Booking detail popup with approve/reject/status-move/delete actions

## Tech Stack

- React
- TypeScript
- Vite
- CSS

## Installation

1. Open a terminal in the frontend directory:
   - `cd frontend/campus-rooms-web`
2. Install dependencies:
   - `npm install`

## Usage

- Start development server:
  - `npm run dev`
- Build production assets:
  - `npm run build`
- Preview production build locally:
  - `npm run preview`

By default, the app runs on `http://localhost:5173`.

## Environment Variables

Create a `.env.local` file in `frontend/campus-rooms-web` if needed.

Required/Supported settings:

- `VITE_API_BASE_URL=http://localhost:5216/api`

If not set, the app uses the default value from the frontend API configuration.