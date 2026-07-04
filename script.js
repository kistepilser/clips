/* ============================================================
   CONSTANTS
   ============================================================ */
const CSV_FILE          = 'clips.csv';
const LOGO_SRC          = 'LOGO.PNG';
const API_URL           = 'https://script.google.com/macros/s/AKfycbxLZSUUjGZWvEfmcwg_NAwQGuuTI1OSMT5jKNKJQbG0klgR4dFEjmPQT7JKc-S8hW6U/exec';
const STRIP_COUNT       = 55;
const WINNER_INDEX      = 45;
const CARD_WIDTH        = 200;
const CARD_GAP          = 8;
const SPIN_DURATION_MS  = 5500;
const EASING            = 'cubic-bezier(0.1, 0.9, 0.2, 1)';

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const spinBtn           = document.getElementById('spinBtn');
const spinBtnText       = spinBtn.querySelector('.spin-btn__text');
const rouletteTrack     = document.getElementById('rouletteTrack');
const rouletteViewport  = document.getElementById('rouletteViewport');
const twitchEmbed       = document.getElementById('twitchEmbed');
const playerPlaceholder = document.getElementById('playerPlaceholder');
const clipMeta          = document.getElementById('clipMeta');
const clipTitle         = document.getElementById('clipTitle');
const clipClipper       = document.getElementById('clipClipper');
const totalClipsEl      = document.getElementById('totalClips');
const spinCountEl       = document.getElementById('spinCount');

// Tabs
const tabBtnRoulette    = document.getElementById('tabBtnRoulette');
const tabBtnLeaderboard = document.getElementById('tabBtnLeaderboard');
const tabRoulette       = document.getElementById('tabRoulette');
const tabLeaderboard    = document.getElementById('tabLeaderboard');

// Rating widget
const ratingStars       = document.getElementById('ratingStars');
const ratingAvg         = document.getElementById('ratingAvg');
const ratingVotes       = document.getElementById('ratingVotes');
const ratingStatus      = document.getElementById('ratingStatus');

// Leaderboard
const leaderboardGrid   = document.getElementById('leaderboardGrid');
const leaderboardLoading = document.getElementById('leaderboardLoading');
const leaderboardEmpty  = document.getElementById('leaderboardEmpty');

/* ============================================================
   STATE
   ============================================================ */
let allClips        = [];
let isSpinning      = false;
let spinCount       = 0;
let currentClipId   = null;
let leaderboardLoaded = false;

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
function switchTab(tabName) {
  // Update buttons
  tabBtnRoulette.classList.toggle('tabs__btn--active', tabName === 'roulette');
  tabBtnLeaderboard.classList.toggle('tabs__btn--active', tabName === 'leaderboard');

  // Update content
  tabRoulette.classList.toggle('tab-content--active', tabName === 'roulette');
  tabLeaderboard.classList.toggle('tab-content--active', tabName === 'leaderboard');

  // Re-trigger fade-in animation
  const activeTab = tabName === 'roulette' ? tabRoulette : tabLeaderboard;
  activeTab.style.animation = 'none';
  void activeTab.offsetWidth;
  activeTab.style.animation = '';

  // Load leaderboard data when switching to that tab
  if (tabName === 'leaderboard') {
    loadLeaderboard();
  }
}

tabBtnRoulette.addEventListener('click', () => switchTab('roulette'));
tabBtnLeaderboard.addEventListener('click', () => switchTab('leaderboard'));

/* ============================================================
   CSV DATA LOADING (PapaParse)
   ============================================================ */
async function loadClips() {
  try {
    const response = await fetch(CSV_FILE);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: не удалось загрузить ${CSV_FILE}`);
    }

    const csvText = await response.text();

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    if (parsed.errors.length > 0) {
      console.warn('CSV parse warnings:', parsed.errors);
    }

    allClips = parsed.data;
    totalClipsEl.textContent = allClips.length;

    spinBtn.disabled = false;
    spinBtnText.textContent = 'Крутить рулетку';

    buildInitialTrack();

    console.log(`Loaded ${allClips.length} clips from ${CSV_FILE}`);
  } catch (err) {
    console.error('Failed to load clips:', err);
    spinBtnText.textContent = 'Ошибка загрузки';
  }
}

/* ============================================================
   HELPERS
   ============================================================ */
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createCard(clip) {
  const card = document.createElement('div');
  card.className = 'roulette-card';

  const img = document.createElement('img');
  img.src = LOGO_SRC;
  img.alt = clip.title;
  img.loading = 'eager';
  img.draggable = false;

  card.appendChild(img);
  return card;
}

function createSkeletonCard() {
  const card = document.createElement('div');
  card.className = 'roulette-card roulette-card--skeleton';
  return card;
}

/* ============================================================
   ROULETTE TRACK BUILDING
   ============================================================ */
function buildInitialTrack() {
  rouletteTrack.innerHTML = '';
  rouletteTrack.style.transition = 'none';
  rouletteTrack.style.transform = 'translateX(0)';

  for (let i = 0; i < 8; i++) {
    rouletteTrack.appendChild(
      allClips.length > 0 ? createCard(randomItem(allClips)) : createSkeletonCard()
    );
  }
}

function buildSpinTrack() {
  rouletteTrack.innerHTML = '';
  rouletteTrack.style.transition = 'none';
  rouletteTrack.style.transform = 'translateX(0)';

  const winner = randomItem(allClips);

  for (let i = 0; i < STRIP_COUNT; i++) {
    const clip = (i === WINNER_INDEX) ? winner : randomItem(allClips);
    rouletteTrack.appendChild(createCard(clip));
  }

  return winner;
}

/* ============================================================
   SPIN ANIMATION
   ============================================================ */
function spin() {
  if (isSpinning || allClips.length === 0) return;
  isSpinning = true;

  spinBtn.disabled = true;
  spinBtn.classList.add('spin-btn--spinning');
  spinBtnText.textContent = 'Крутится...';

  const winner = buildSpinTrack();

  const viewportWidth = rouletteViewport.offsetWidth;
  const cardFullWidth = CARD_WIDTH + CARD_GAP;
  const centerOfWinner = (WINNER_INDEX * cardFullWidth) + (CARD_WIDTH / 2);
  const randomOffset = (Math.random() - 0.5) * (CARD_WIDTH * 0.6);
  const translateX = -(centerOfWinner - viewportWidth / 2 + randomOffset);

  void rouletteTrack.offsetWidth;

  rouletteTrack.style.transition = `transform ${SPIN_DURATION_MS}ms ${EASING}`;
  rouletteTrack.style.transform  = `translateX(${translateX}px)`;

  setTimeout(() => {
    onSpinComplete(winner);
  }, SPIN_DURATION_MS + 200);
}

function onSpinComplete(winner) {
  isSpinning = false;
  spinCount++;
  spinCountEl.textContent = spinCount;

  spinBtn.disabled = false;
  spinBtn.classList.remove('spin-btn--spinning');
  spinBtnText.textContent = 'Крутить ещё раз';

  const cards = rouletteTrack.querySelectorAll('.roulette-card');
  if (cards[WINNER_INDEX]) {
    cards[WINNER_INDEX].classList.add('roulette-card--winner');
  }

  showClip(winner);
  spawnConfetti();
}

/* ============================================================
   PLAYER / TWITCH EMBED
   ============================================================ */
function showClip(clip) {
  const parentHost = window.location.hostname || 'localhost';
  const embedUrl   = `https://clips.twitch.tv/embed?clip=${clip.ID}&parent=${parentHost}&autoplay=true`;

  twitchEmbed.src = embedUrl;
  twitchEmbed.style.display = 'block';
  playerPlaceholder.style.display = 'none';

  clipTitle.textContent   = clip.title;
  clipClipper.textContent = clip.clipper;
  clipMeta.style.display  = 'block';

  // Update current clip ID and fetch its rating
  currentClipId = clip.ID;
  fetchClipRating(clip.ID);

  // Reset star visual state
  clearStarSelection();

  clipMeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============================================================
   STAR RATING — FETCH & VOTE
   ============================================================ */

/** Safely parse JSON from a response; returns null if not JSON */
async function safeJson(resp) {
  const ct = resp.headers.get('content-type') || '';
  const text = await resp.text();
  if (ct.includes('application/json') || (text.startsWith('{') || text.startsWith('['))) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }
  return null;
}

/** Fetch current rating for a clip */
async function fetchClipRating(clipId) {
  ratingStatus.textContent = '';
  ratingAvg.textContent = '—';
  ratingVotes.textContent = '(0 голосов)';

  try {
    const resp = await fetch(`${API_URL}?action=get&clip_id=${encodeURIComponent(clipId)}`);
    const data = await safeJson(resp);

    if (data) {
      updateRatingDisplay(data);
    } else {
      ratingStatus.textContent = 'Рейтинг недоступен';
    }
  } catch (err) {
    console.error('Failed to fetch rating:', err);
    ratingStatus.textContent = 'Не удалось загрузить рейтинг';
  }
}

/** Submit a vote */
async function submitVote(clipId, score) {
  ratingStatus.textContent = 'Отправка оценки...';

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'vote',
        clip_id: clipId,
        score: score
      })
    });

    const data = await safeJson(resp);

    if (data) {
      updateRatingDisplay(data);
      ratingStatus.textContent = 'Спасибо за оценку! ✨';
    } else {
      ratingStatus.textContent = 'Оценка отправлена';
    }

    // Invalidate leaderboard cache
    leaderboardLoaded = false;

    // Fade out status message
    setTimeout(() => {
      ratingStatus.textContent = '';
    }, 3000);
  } catch (err) {
    console.error('Failed to submit vote:', err);
    ratingStatus.textContent = 'Ошибка отправки оценки';
  }
}

/** Update the star display and text from API data */
function updateRatingDisplay(data) {
  const totalScore = data.total_score || 0;
  const votes = data.votes_count || 0;
  const avg = votes > 0 ? totalScore / votes : 0;

  ratingAvg.textContent = avg > 0 ? avg.toFixed(1) : '—';
  ratingVotes.textContent = `(${votes} ${pluralVotes(votes)})`;

  // Highlight stars up to the average (rounded)
  highlightStars(Math.round(avg));
}

/** Clear star visual selection */
function clearStarSelection() {
  const stars = ratingStars.querySelectorAll('.rating-widget__star');
  stars.forEach(s => {
    s.classList.remove('rating-widget__star--active', 'rating-widget__star--hover');
  });
}

/** Highlight stars up to a given score */
function highlightStars(score) {
  const stars = ratingStars.querySelectorAll('.rating-widget__star');
  stars.forEach((s, i) => {
    s.classList.toggle('rating-widget__star--active', i < score);
  });
}

/** Plural form for Russian "голосов" */
function pluralVotes(n) {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return 'голосов';
  if (lastDigit === 1) return 'голос';
  if (lastDigit >= 2 && lastDigit <= 4) return 'голоса';
  return 'голосов';
}

/* Star event listeners */
ratingStars.addEventListener('click', (e) => {
  const star = e.target.closest('.rating-widget__star');
  if (!star || !currentClipId) return;

  const score = parseInt(star.dataset.score, 10);
  highlightStars(score);
  submitVote(currentClipId, score);
});

// Hover effects on stars
ratingStars.addEventListener('mouseover', (e) => {
  const star = e.target.closest('.rating-widget__star');
  if (!star) return;

  const score = parseInt(star.dataset.score, 10);
  const stars = ratingStars.querySelectorAll('.rating-widget__star');
  stars.forEach((s, i) => {
    s.classList.toggle('rating-widget__star--hover', i < score);
  });
});

ratingStars.addEventListener('mouseleave', () => {
  const stars = ratingStars.querySelectorAll('.rating-widget__star');
  stars.forEach(s => s.classList.remove('rating-widget__star--hover'));
});

/* ============================================================
   LEADERBOARD
   ============================================================ */

/**
 * Fetch JSON from Google Apps Script via JSONP-style workaround.
 * GAS returns opaque error pages without CORS headers when the
 * handler is missing, which makes regular fetch() throw a TypeError.
 * We wrap the call with a timeout so we always resolve cleanly.
 */
async function fetchApi(params) {
  const url = `${API_URL}?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return await safeJson(resp);
  } catch (err) {
    clearTimeout(timeout);
    console.warn('fetchApi failed for', params, err.message);
    return null;
  }
}

async function loadLeaderboard() {
  // Show loading, hide others
  leaderboardLoading.style.display = 'block';
  leaderboardEmpty.style.display = 'none';
  leaderboardGrid.innerHTML = '';

  const ratings = await fetchApi('action=get_all');

  leaderboardLoading.style.display = 'none';

  if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
    leaderboardEmpty.style.display = 'block';
    leaderboardEmpty.querySelector('p').textContent =
      !ratings
        ? 'Рейтинг пока недоступен. Убедитесь, что Code.gs задеплоен с поддержкой get_all.'
        : 'Пока никто не оценил клипы. Будь первым!';
    return;
  }

  // Build a lookup map from allClips
  const clipMap = {};
  allClips.forEach(c => {
    clipMap[c.ID] = c;
  });

  // Enrich rating data with clip metadata
  const enriched = ratings
    .map(r => {
      const clip = clipMap[r.clip_id];
      if (!clip) return null;
      const votes = r.votes_count || 0;
      const total = r.total_score || 0;
      return {
        ...r,
        title: clip.title,
        clipper: clip.clipper,
        previewImageUrl: clip.previewImageUrl,
        average: votes > 0 ? total / votes : 0
      };
    })
    .filter(Boolean);

  // Sort: by average desc, then by votes_count desc
  enriched.sort((a, b) => {
    if (b.average !== a.average) return b.average - a.average;
    return b.votes_count - a.votes_count;
  });

  if (enriched.length === 0) {
    leaderboardEmpty.style.display = 'block';
    leaderboardEmpty.querySelector('p').textContent = 'Пока никто не оценил клипы. Будь первым!';
    return;
  }

  // Render cards
  enriched.forEach((item, index) => {
    leaderboardGrid.appendChild(createLeaderboardCard(item, index + 1));
  });

  leaderboardLoaded = true;
}

function createLeaderboardCard(item, rank) {
  const card = document.createElement('div');
  card.className = 'lb-card';

  // Top-3 medal styling
  if (rank === 1) card.classList.add('lb-card--gold');
  else if (rank === 2) card.classList.add('lb-card--silver');
  else if (rank === 3) card.classList.add('lb-card--bronze');

  const avg = item.average.toFixed(1);

  card.innerHTML = `
    <div class="lb-card__img-wrap">
      <img class="lb-card__img" src="${LOGO_SRC}" alt="${escapeHtml(item.title)}" loading="lazy" />
      <div class="lb-card__rank">#${rank}</div>
      <div class="lb-card__play">
        <svg class="lb-card__play-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      </div>
    </div>
    <div class="lb-card__body">
      <div class="lb-card__title">${escapeHtml(item.title)}</div>
      <div class="lb-card__author">${escapeHtml(item.clipper)}</div>
      <div class="lb-card__stats">
        <div class="lb-card__rating">
          <span class="lb-card__rating-star">⭐</span>
          ${avg}
        </div>
        <div class="lb-card__votes">${item.votes_count} ${pluralVotes(item.votes_count)}</div>
      </div>
    </div>
  `;

  // Click → switch to Roulette tab and play this clip
  card.addEventListener('click', () => {
    const clip = allClips.find(c => c.ID === item.clip_id);
    if (clip) {
      switchTab('roulette');
      showClip(clip);
    }
  });

  return card;
}

/** Basic HTML escaping */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* ============================================================
   CONFETTI EFFECT
   ============================================================ */
function spawnConfetti() {
  const colors = ['#a855f7', '#c084fc', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#ec4899'];
  const count  = 40;

  const rouletteRect = rouletteViewport.getBoundingClientRect();
  const originX = rouletteRect.left + rouletteRect.width / 2;
  const originY = rouletteRect.top + rouletteRect.height / 2;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = `${originX + (Math.random() - 0.5) * 300}px`;
    particle.style.top  = `${originY + (Math.random() - 0.5) * 60}px`;
    particle.style.width  = `${4 + Math.random() * 8}px`;
    particle.style.height = `${4 + Math.random() * 8}px`;
    particle.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;

    document.body.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
spinBtn.addEventListener('click', spin);

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === spinBtn) {
    e.preventDefault();
    spin();
  }
});

/* ============================================================
   INIT
   ============================================================ */
loadClips();
