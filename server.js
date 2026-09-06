const express = require('express');
const path = require('path');
const { randomUUID } = require('crypto');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI environment variable. Set it before starting the server.');
  process.exit(1);
}

let videosCollection;

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  });
  await client.connect();
  const db = client.db('freakout-slop');
  videosCollection = db.collection('videos');
  console.log('Connected to MongoDB');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function extractYouTubeId(url) {
  const match = String(url).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return match ? match[1] : null;
}

async function fetchYouTubeTitle(url) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return 'Untitled clip';
    const data = await res.json();
    return data.title || 'Untitled clip';
  } catch {
    return 'Untitled clip';
  }
}

app.get('/api/videos', async (req, res) => {
  const videos = await videosCollection.find({}).toArray();
  videos.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
  res.json(videos);
});

app.post('/api/videos', async (req, res) => {
  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return res.status(400).json({ error: 'Only YouTube links are supported right now' });
  }

  const title = await fetchYouTubeTitle(url);

  const video = {
    id: randomUUID(),
    title,
    originalUrl: url,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    submittedBy: null, // reserved for future Twitch login
    upvotes: 0,
    downvotes: 0,
    submittedAt: Date.now()
  };

  await videosCollection.insertOne(video);
  res.status(201).json(video);
});

app.post('/api/videos/:id/vote', async (req, res) => {
  const { direction } = req.body || {};
  const field = direction === 'down' ? 'downvotes' : 'upvotes';

  const result = await videosCollection.findOneAndUpdate(
    { id: req.params.id },
    { $inc: { [field]: 1 } },
    { returnDocument: 'after' }
  );

  if (!result) return res.status(404).json({ error: 'not found' });
  res.json(result);
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Video board running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
