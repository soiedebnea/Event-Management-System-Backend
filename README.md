# Event Management System — Backend

A Node.js + Express REST API for managing events, attendee registrations,
and event schedules. Data is stored in a single JSON file, so there's no
database server to install to get running.

## Tech stack

- Node.js + Express
- Storage: `data/db.json` (read/written by `db.js`) — no external database
  required

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or later (includes npm)

## Setup & run

```bash
npm install
npm start
```

The API starts on **http://localhost:5000**. You should see:

```
Event Management API listening on http://localhost:5000
```

For auto-restart on file changes during development:

```bash
npm run dev
```

(uses the `nodemon` dev dependency already listed in `package.json`)

To use a different port:

```bash
PORT=4000 npm start
```

## Project structure

```
backend/
├── package.json
├── server.js          # Express app + startup, CORS, JSON body parsing
├── db.js              # Tiny JSON-file read/write helper
├── data/
│   └── db.json         # All event/attendee/schedule data lives here
└── routes/
    └── events.js       # All /api/events routes (events, attendees, schedule)
```

## REST API reference

Base URL: `http://localhost:5000/api`

### Events

| Method | Endpoint            | Description                    |
|--------|----------------------|--------------------------------|
| GET    | `/events`            | List all events (summary)      |
| POST   | `/events`            | Create an event                |
| GET    | `/events/:id`        | Get one event, full detail     |
| PUT    | `/events/:id`        | Update an event                |
| DELETE | `/events/:id`        | Delete an event                |

`POST /events` body:
```json
{
  "title": "Autumn Product Summit",
  "description": "Annual product showcase",
  "date": "2026-10-15",
  "time": "09:00",
  "location": "Hall B, Convention Centre",
  "capacity": 150
}
```
`title`, `date`, `time`, and `location` are required. `capacity` is optional
— omit it (or leave blank) for unlimited registrations.

### Attendees

| Method | Endpoint                              | Description                 |
|--------|-----------------------------------------|----------------------------|
| GET    | `/events/:id/attendees`                 | List attendees for an event |
| POST   | `/events/:id/attendees`                 | Register an attendee        |
| DELETE | `/events/:id/attendees/:attendeeId`     | Remove a registration       |

`POST /events/:id/attendees` body:
```json
{ "name": "Sam Rivera", "email": "sam@example.com", "phone": "555-0100" }
```
`name` and `email` are required. Registration is rejected if the event is at
capacity or the email is already registered for that event.

### Schedule

| Method | Endpoint                                   | Description             |
|--------|----------------------------------------------|--------------------------|
| GET    | `/events/:id/schedule`                       | List sessions (sorted by start time) |
| POST   | `/events/:id/schedule`                       | Add a session            |
| PUT    | `/events/:id/schedule/:itemId`               | Update a session         |
| DELETE | `/events/:id/schedule/:itemId`               | Remove a session         |

`POST /events/:id/schedule` body:
```json
{
  "title": "Opening keynote",
  "startTime": "09:00",
  "endTime": "09:45",
  "speaker": "Jordan Blake",
  "description": "Main hall"
}
```
`title`, `startTime`, and `endTime` are required.

## Data storage

All data lives in `data/db.json`, structured as:

```json
{
  "events": [
    {
      "id": "uuid",
      "title": "...",
      "description": "...",
      "date": "2026-10-15",
      "time": "09:00",
      "location": "...",
      "capacity": 150,
      "attendees": [ { "id": "uuid", "name": "...", "email": "...", "phone": "...", "registeredAt": "..." } ],
      "schedule": [ { "id": "uuid", "title": "...", "startTime": "09:00", "endTime": "09:45", "speaker": "...", "description": "..." } ],
      "createdAt": "..."
    }
  ]
}
```

`db.js` is intentionally small and isolated (`readDB()` / `writeDB()`), so
swapping this out for a real database (MongoDB, PostgreSQL, etc.) later only
requires changing that file and the calls to it in `routes/events.js` — the
API shape can stay the same.

## Notes

- CORS is enabled for all origins to simplify local development with the
  frontend. Restrict `cors()` in `server.js` before deploying publicly.
- There is no authentication layer — add one before exposing this beyond
  local development.
