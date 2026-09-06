const grid = document.getElementById('grid');
const toggleBtn = document.getElementById('submit-toggle');
const panel = document.getElementById('submit-panel');
const submitBtn = document.getElementById('submit-btn');
const urlInput = document.getElementById('url-input');

toggleBtn.addEventListener('click', () => panel.classList.toggle('hidden'));

async function loadVideos() {
  const res = await fetch('/api/videos');
  const videos = await res.json();
  grid.innerHTML = '';
  videos.forEach(renderCard);
}

function renderCard(video) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <iframe src="${video.url}" allowfullscreen loading="lazy"></iframe>
    <div class="card-body">
      <div class="vote-controls">
        <button class="vote-btn" data-dir="up">▲</button>
        <span class="vote-count">${video.votes}</span>
        <button class="vote-btn" data-dir="down">▼</button>
      </div>
    </div>
  `;
  card.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dir = btn.dataset.dir;
      const res = await fetch(`/api/videos/${video.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: dir })
      });
      const updated = await res.json();
      card.querySelector('.vote-count').textContent = updated.votes;
    });
  });
  grid.appendChild(card);
}

submitBtn.addEventListener('click', async () => {
  
  const url = urlInput.value.trim();
  if (!url) return;
  await fetch('/api/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  urlInput.value = '';
  panel.classList.add('hidden');
  loadVideos();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadVideos();
