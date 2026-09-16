const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const { readDB, writeDB } = require('../db');

function findEventOr404(req, res, db) {
  const event = db.events.find((e) => e.id === req.params.id);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return null;
  }
  return event;
}

/* ------------------------------- EVENTS -------------------------------- */

// GET /api/events - list all events (summary view)
router.get('/', (req, res) => {
  const db = readDB();
  const summary = db.events
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      time: e.time,
      location: e.location,
      capacity: e.capacity,
      registeredCount: e.attendees.length,
      scheduleCount: e.schedule.length
    }));
  res.json(summary);
});

// GET /api/events/:id - full event detail (attendees + schedule included)
router.get('/:id', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;
  res.json(event);
});

// POST /api/events - create a new event
router.post('/', (req, res) => {
  const { title, description, date, time, location, capacity } = req.body;

  if (!title || !date || !time || !location) {
    return res
      .status(400)
      .json({ error: 'title, date, time and location are required' });
  }

  if (capacity !== undefined && capacity !== null && capacity !== '') {
    const num = Number(capacity);
    if (Number.isNaN(num) || num < 0) {
      return res.status(400).json({ error: 'capacity must be a positive number' });
    }
  }

  const db = readDB();
  const newEvent = {
    id: randomUUID(),
    title,
    description: description || '',
    date,
    time,
    location,
    capacity: capacity ? Number(capacity) : null,
    attendees: [],
    schedule: [],
    createdAt: new Date().toISOString()
  };
  db.events.push(newEvent);
  writeDB(db);
  res.status(201).json(newEvent);
});

// PUT /api/events/:id - update an existing event
router.put('/:id', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;

  const { title, description, date, time, location, capacity } = req.body;
  if (title !== undefined) event.title = title;
  if (description !== undefined) event.description = description;
  if (date !== undefined) event.date = date;
  if (time !== undefined) event.time = time;
  if (location !== undefined) event.location = location;
  if (capacity !== undefined) {
    event.capacity = capacity === '' || capacity === null ? null : Number(capacity);
  }

  writeDB(db);
  res.json(event);
});

// DELETE /api/events/:id - remove an event entirely
router.delete('/:id', (req, res) => {
  const db = readDB();
  const idx = db.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found' });
  db.events.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Event deleted' });
});

/* ------------------------------ ATTENDEES ------------------------------- */

// GET /api/events/:id/attendees - list attendees registered for an event
router.get('/:id/attendees', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;
  res.json(event.attendees);
});

// POST /api/events/:id/attendees - register a new attendee
router.post('/:id/attendees', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;

  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  if (event.capacity !== null && event.attendees.length >= event.capacity) {
    return res.status(400).json({ error: 'This event has reached full capacity' });
  }

  const alreadyRegistered = event.attendees.some(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
  if (alreadyRegistered) {
    return res
      .status(400)
      .json({ error: 'This email address is already registered for the event' });
  }

  const attendee = {
    id: randomUUID(),
    name,
    email,
    phone: phone || '',
    registeredAt: new Date().toISOString()
  };
  event.attendees.push(attendee);
  writeDB(db);
  res.status(201).json(attendee);
});

// DELETE /api/events/:id/attendees/:attendeeId - cancel a registration
router.delete('/:id/attendees/:attendeeId', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;

  const idx = event.attendees.findIndex((a) => a.id === req.params.attendeeId);
  if (idx === -1) return res.status(404).json({ error: 'Attendee not found' });

  event.attendees.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Attendee removed' });
});

/* ------------------------------- SCHEDULE -------------------------------- */

// GET /api/events/:id/schedule - list schedule items, ordered by start time
router.get('/:id/schedule', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;

  const sorted = [...event.schedule].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  res.json(sorted);
});

// POST /api/events/:id/schedule - add a session/slot to the event schedule
router.post('/:id/schedule', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;

  const { title, startTime, endTime, speaker, description } = req.body;
  if (!title || !startTime || !endTime) {
    return res
      .status(400)
      .json({ error: 'title, startTime and endTime are required' });
  }

  const item = {
    id: randomUUID(),
    title,
    startTime,
    endTime,
    speaker: speaker || '',
    description: description || ''
  };
  event.schedule.push(item);
  writeDB(db);
  res.status(201).json(item);
});

// PUT /api/events/:id/schedule/:itemId - edit a schedule item
router.put('/:id/schedule/:itemId', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;

  const item = event.schedule.find((s) => s.id === req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Schedule item not found' });

  const { title, startTime, endTime, speaker, description } = req.body;
  if (title !== undefined) item.title = title;
  if (startTime !== undefined) item.startTime = startTime;
  if (endTime !== undefined) item.endTime = endTime;
  if (speaker !== undefined) item.speaker = speaker;
  if (description !== undefined) item.description = description;

  writeDB(db);
  res.json(item);
});

// DELETE /api/events/:id/schedule/:itemId - remove a schedule item
router.delete('/:id/schedule/:itemId', (req, res) => {
  const db = readDB();
  const event = findEventOr404(req, res, db);
  if (!event) return;

  const idx = event.schedule.findIndex((s) => s.id === req.params.itemId);
  if (idx === -1) return res.status(404).json({ error: 'Schedule item not found' });

  event.schedule.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Schedule item removed' });
});

module.exports = router;