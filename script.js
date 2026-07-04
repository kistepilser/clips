/* ============================================================
   CONSTANTS
   ============================================================ */
const CSV_FILE          = 'clips.csv';
const STRIP_COUNT       = 55;        // Total cards in the roulette track (40–60 range)
const WINNER_INDEX      = 45;        // The winning card index (0-based)
const CARD_WIDTH        = 200;       // px — must match CSS .roulette-card width
const CARD_GAP          = 8;         // px — must match CSS .roulette-track gap
const SPIN_DURATION_MS  = 5500;      // ~5.5 seconds
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

/* ============================================================
   STATE
   ============================================================ */
let allClips   = [];      // Full dataset parsed from CSV
let isSpinning = false;
let spinCount  = 0;

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

    // Enable button
    spinBtn.disabled = false;
    spinBtnText.textContent = 'Крутить рулетку';

    // Pre-fill roulette with preview cards
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

/** Pick a random element from the array */
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Create a roulette card DOM element */
function createCard(clip) {
  const card = document.createElement('div');
  card.className = 'roulette-card';

  const img = document.createElement('img');
  img.src = clip.previewImageUrl;
  img.alt = clip.title;
  img.loading = 'eager';
  img.draggable = false;

  card.appendChild(img);
  return card;
}

/** Create a skeleton card (for loading state) */
function createSkeletonCard() {
  const card = document.createElement('div');
  card.className = 'roulette-card roulette-card--skeleton';
  return card;
}

/* ============================================================
   ROULETTE TRACK BUILDING
   ============================================================ */

/** Show initial preview track */
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

/** Build a full track for spinning. Returns the winning clip data. */
function buildSpinTrack() {
  rouletteTrack.innerHTML = '';
  rouletteTrack.style.transition = 'none';
  rouletteTrack.style.transform = 'translateX(0)';

  // Pick a random winner from the full dataset
  const winner = randomItem(allClips);

  // Fill track with random clips, place winner at WINNER_INDEX
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

  // Build track & get winner
  const winner = buildSpinTrack();

  // Calculate offset:
  // We want the WINNER_INDEX card to land under the center pointer
  const viewportWidth = rouletteViewport.offsetWidth;
  const cardFullWidth = CARD_WIDTH + CARD_GAP;
  const centerOfWinner = (WINNER_INDEX * cardFullWidth) + (CARD_WIDTH / 2);

  // Add a small random offset within the card so it doesn't always land dead-center
  const randomOffset = (Math.random() - 0.5) * (CARD_WIDTH * 0.6);

  const translateX = -(centerOfWinner - viewportWidth / 2 + randomOffset);

  // Force reflow before applying transition
  void rouletteTrack.offsetWidth;

  // Apply CSS transition animation
  rouletteTrack.style.transition = `transform ${SPIN_DURATION_MS}ms ${EASING}`;
  rouletteTrack.style.transform  = `translateX(${translateX}px)`;

  // After animation ends
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

  // Highlight winner card
  const cards = rouletteTrack.querySelectorAll('.roulette-card');
  if (cards[WINNER_INDEX]) {
    cards[WINNER_INDEX].classList.add('roulette-card--winner');
  }

  // Show clip in player
  showClip(winner);

  // Confetti burst!
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

  // Metadata
  clipTitle.textContent   = clip.title;
  clipClipper.textContent = clip.clipper;
  clipMeta.style.display  = 'block';

  // Smooth scroll to player
  clipMeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============================================================
   CONFETTI EFFECT
   ============================================================ */

function spawnConfetti() {
  const colors = ['#a855f7', '#c084fc', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#ec4899'];
  const count  = 40;

  // Get the pointer position as burst origin
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

    // Cleanup after animation
    particle.addEventListener('animationend', () => particle.remove());
  }
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

spinBtn.addEventListener('click', spin);

// Keyboard support: Enter or Space triggers spin
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
