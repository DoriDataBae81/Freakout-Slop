const express = require('express');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- In-memory data store ---
// Swap this out for a real database (SQLite/Postgres) once you outgrow it.
let videos = [];

function toEmbeddable(url) {
  // Very light helper: converts a normal YouTube link to an embeddable one.
  const ytMatch = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return url;
}

app.get('/api/videos', (req, res) => {
  const sorted = [...videos].sort((a, b) => b.votes - a.votes);
  res.json(sorted);
});

app.post('/api/videos', (req, res) => {
  const { title, url } = req.body || {};
  if (!title || !url) {
    return res.status(400).json({ error: 'title and url are required' });
  }
  const video = {
    id: randomUUID(),
    title: String(title).slice(0, 140),
    url: toEmbeddable(String(url)),
    votes: 0,
    submittedAt: Date.now()
  };
  videos.push(video);
  res.status(201).json(video);
});

app.post('/api/videos/:id/vote', (req, res) => {
  const { direction } = req.body || {};
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'not found' });
  video.votes += direction === 'down' ? -1 : 1;
  res.json(video);
});

app.listen(PORT, () => {
  console.log(`Video board running on http://localhost:${PORT}`);
});
