const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = 'api_key=3fd2be6f0c70a2a598f084ddfb75487c';
const IMG_PATH = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_PATH = 'https://image.tmdb.org/t/p/w1280';

// Global State Trackers
let activeMode = 'movie'; 
let viewContext = 'home'; 
let currentGenreId = '';
let currentRegionCode = ''; 
let localWatchlist = JSON.parse(localStorage.getItem('mw_watchlist')) || [];

// Authentication Database Simulator (Uses LocalStorage to remember registered accounts)
let registeredUsersDB = JSON.parse(localStorage.getItem('mw_users_db')) || [];
let activeLoggedInUser = localStorage.getItem('mw_current_user') || null;

// Cache dictionaries for names mapping
let genresCache = {};
let countriesCache = {};

// UI Element Selections
const mainContentArea = document.getElementById('main-content-area');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const genreSelect = document.getElementById('genre-select');
const regionSelect = document.getElementById('region-select');
const switchMovies = document.getElementById('switch-movies');
const switchTV = document.getElementById('switch-tv');
const navHome = document.getElementById('nav-home');
const navWatchlist = document.getElementById('nav-watchlist');
const brandHome = document.getElementById('brand-home');
const watchlistCount = document.getElementById('watchlist-count');
const authTriggerBtn = document.getElementById('auth-trigger-btn');

// Modal UI Element Selections
const detailsModal = document.getElementById('details-modal');
const closeModal = document.getElementById('close-modal');
const modalHero = document.getElementById('modal-hero');
const modalTitle = document.getElementById('modal-title');
const modalWatchlistToggle = document.getElementById('modal-watchlist-toggle');
const modalRating = document.getElementById('modal-rating');
const modalDate = document.getElementById('modal-date');
const modalRuntime = document.getElementById('modal-runtime');
const modalCountry = document.getElementById('modal-country');
const modalGenres = document.getElementById('modal-genres');
const modalOverview = document.getElementById('modal-overview');
let targetedItemData = null;

// Auth Modal UI Element Selections
const authModal = document.getElementById('auth-modal');
const closeAuthModal = document.getElementById('close-auth-modal');
const signupBox = document.getElementById('signup-box');
const signinBox = document.getElementById('signin-box');
const goToSignin = document.getElementById('go-to-signin');
const goToSignup = document.getElementById('go-to-signup');
const signupForm = document.getElementById('signup-form');
const signinForm = document.getElementById('signin-form');

// Initialize App Setup Execution
initializeApp();

async function initializeApp() {
    updateWatchlistCountBadge();
    checkLoginStateStatus();
    await loadGlobalCountriesList(); 
    await loadGenreOptionsList();
    renderPageUI();
}

// Check if user is logged in on boot reload
function checkLoginStateStatus() {
    if (activeLoggedInUser) {
        authTriggerBtn.innerText = Hi, ${activeLoggedInUser};
        authTriggerBtn.style.background = '#1a1a1a';
        authTriggerBtn.style.color = '#38bdf8';
        authTriggerBtn.style.border = '1px solid #333';
    } else {
        authTriggerBtn.innerText = 'Sign In';
        authTriggerBtn.style.background = '#38bdf8';
        authTriggerBtn.style.color = '#000';
    }
}

// Fetches every country around the globe dynamically
async function loadGlobalCountriesList() {
    const url = ${BASE_URL}/configuration/countries?${API_KEY};
    try {
        const response = await fetch(url);
        const countries = await response.json();
        
        countries.sort((a, b) => a.english_name.localeCompare(b.english_name));
        regionSelect.innerHTML = '<option value="">🌍 All Regions (Worldwide)</option>';
        
        const priorityHubs = [
            { iso_3166_1: 'ZA', english_name: '🇿🇦 South Africa' },
            { iso_3166_1: 'US', english_name: '🇺🇸 United States (Hollywood)' },
            { iso_3166_1: 'IN', english_name: '🇮🇳 India (Bollywood/Mollywood)' },
            { iso_3166_1: 'NG', english_name: '🇳🇬 Nigeria (Nollywood)' }
        ];

        priorityHubs.forEach(hub => {
            countriesCache[hub.iso_3166_1] = hub.english_name;
            const option = document.createElement('option');
            option.value = hub.iso_3166_1;
            option.innerText = hub.english_name;
            regionSelect.appendChild(option);
        });

        const divider = document.createElement('option');
        divider.disabled = true;
        divider.innerText = '────────────────────';
        regionSelect.appendChild(divider);

        countries.forEach(country => {
            countriesCache[country.iso_3166_1] = country.english_name;
            if (!['ZA', 'US', 'IN', 'NG'].includes(country.iso_3166_1)) {
                const option = document.createElement('option');
                option.value = country.iso_3166_1;
                option.innerText = country.english_name;
                regionSelect.appendChild(option);
            }
        });
    } catch (e) { 
        console.error("Global regions load failure:", e);
        regionSelect.innerHTML = '<option value="">🌍 All Regions (Worldwide)</option>';
    }
}

async function loadGenreOptionsList() {
    const url = ${BASE_URL}/genre/${activeMode}/list?${API_KEY};
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        genreSelect.innerHTML = '<option value="">🎭 All Genres</option>';
        data.genres.forEach(genre => {
            genresCache[genre.id] = genre.name;
            const option = document.createElement('option');
            option.value = genre.id;
            option.innerText = genre.name;
            if(currentGenreId == genre.id) option.selected = true;
            genreSelect.appendChild(option);
        });
    } catch (e) { console.error("Genre load failure:", e); }
}

function renderPageUI() {
    if (viewContext === 'home') {
        renderNetflixStyleDashboard();
    } else if (viewContext === 'search') {
        renderVerticalSearchGrid();
    } else if (viewContext === 'watchlist') {
        renderWatchlistGrid();
    }
}

async function renderNetflixStyleDashboard() {
    mainContentArea.innerHTML = ''; 
    let filterParams = '';
    if (currentGenreId) filterParams += &with_genres=${currentGenreId};
    if (currentRegionCode) filterParams += &with_origin_country=${currentRegionCode};

    let contextLabel = 'Global';
    if (currentRegionCode && countriesCache[currentRegionCode]) {
        contextLabel = countriesCache[currentRegionCode].replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
    }

    const paths = {
        Trending ${contextLabel} Listings: ${BASE_URL}/discover/${activeMode}?sort_by=popularity.desc&${API_KEY}${filterParams},
        Top Rated & Critically Acclaimed: ${BASE_URL}/${activeMode}/top_rated?${API_KEY}${filterParams},
        Fresh New Releases: ${BASE_URL}/discover/${activeMode}?sort_by=primary_release_date.desc&${API_KEY}${filterParams}
    };

    for (const [rowTitle, url] of Object.entries(paths)) {
        await createSliderRow(rowTitle, url);
    }
}

async function createSliderRow(title, url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        const items = data.results ? data.results.filter(i => i.poster_path) : [];

        if (items.length === 0) return;

        const rowContainer = document.createElement('div');
        rowContainer.classList.add('slider-row-container');
        rowContainer.innerHTML = `
            <h2 class="row-title">${title}</h2>
            <div class="slider-track-viewport"></div>
        `;
        
        const track = rowContainer.querySelector('.slider-track-viewport');
        items.forEach(item => track.appendChild(buildMediaCardElement(item)));
        mainContentArea.appendChild(rowContainer);
    } catch(e) { console.error("Slider row build failure:", e); }
}

function buildMediaCardElement(item) {
    const isSaved = localWatchlist.some(w => w.id === item.id && w.media_type === activeMode);
    const card = document.createElement('div');
    card.classList.add('movie-card');

    const titleText = item.title || item.name;
    const dateText = item.release_date || item.first_air_date;
    const year = dateText ? dateText.split('-')[0] : 'N/A';
    const score = item.vote_average ? item.vote_average.toFixed(1) : '0.0';

    card.innerHTML = `
        <button class="card-badge-bookmark ${isSaved ? 'saved' : ''}"><i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i></button>
        <img src="${IMG_PATH + item.poster_path}" alt="${titleText}" loading="lazy">
        <div class="card-details">
            <p class="title" title="${titleText}">${titleText}</p>
            <div class="meta-row">
                <span class="year">${year}</span>
                <span class="score">⭐ ${score}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if(e.target.closest('.card-badge-bookmark')) {
            e.stopPropagation();
            toggleItemFromWatchlist(item, activeMode);
            const btn = card.querySelector('.card-badge-bookmark');
            btn.classList.toggle('saved');
            btn.querySelector('i').className = btn.classList.contains('saved') ? 'fas fa-bookmark' : 'far fa-bookmark';
            return;
        }
        openDetailModalWindow(item.id, activeMode);
    });

    return card;
}

async function renderVerticalSearchGrid() {
    const query = encodeURIComponent(searchInput.value.trim());
    const url = ${BASE_URL}/search/${activeMode}?${API_KEY}&query=${query};
    
    mainContentArea.innerHTML = <h2 class="row-title">Global Results for "${searchInput.value}"</h2><div class="vertical-display-grid" id="search-grid"></div>;
    const targetGrid = document.getElementById('search-grid');

    try {
        const response = await fetch(url);
        const data = await response.json();
        const items = data.results ? data.results.filter(i => i.poster_path) : [];

        if(items.length === 0) {
            targetGrid.innerHTML = <p class="no-results">No media profiles discovered across regional indexes matching that query.</p>;
            return;
        }
        items.forEach(item => targetGrid.appendChild(buildMediaCardElement(item)));
    } catch(e) { console.error("Search failed:", e); }
}

function renderWatchlistGrid() {
    mainContentArea.innerHTML = <h2 class="row-title">My Saved Watchlist Items</h2><div class="vertical-display-grid" id="watchlist-grid"></div>;
    const targetGrid = document.getElementById('watchlist-grid');

    const activeWatchlistSubset = localWatchlist.filter(w => w.media_type === activeMode);

    if(activeWatchlistSubset.length === 0) {
        targetGrid.innerHTML = <p class="no-results">No titles saved inside this watchlist subcategory container index yet.</p>;
        return;
    }

    activeWatchlistSubset.forEach(item => {
        const mockItemDataObj = {
            id: item.id, poster_path: item.poster_path,
            title: item.title, name: item.title,
            release_date: item.date, first_air_date: item.date,
            vote_average: parseFloat(item.score)
        };
        targetGrid.appendChild(buildMediaCardElement(mockItemDataObj));
    });
}

async function openDetailModalWindow(id, type) {
    const url = ${BASE_URL}/${type}/${id}?${API_KEY};
    try {
        const response = await fetch(url);
        targetedItemData = await response.json();
        
        modalHero.style.backgroundImage = targetedItemData.backdrop_path ? url(${BACKDROP_PATH + targetedItemData.backdrop_path}) : 'none';
        modalTitle.innerText = targetedItemData.title || targetedItemData.name;
        modalOverview.innerText = targetedItemData.overview || "No localized synopsis text logged for this profile.";
        modalRating.innerText = ⭐ ${targetedItemData.vote_average ? targetedItemData.vote_average.toFixed(1) : '0.0'};
        
        const rawDate = targetedItemData.release_date || targetedItemData.first_air_date;
        modalDate.innerText = rawDate ? rawDate.split('-')[0] : 'N/A';
        
        const runtimeValue = targetedItemData.runtime || (targetedItemData.episode_run_time ? targetedItemData.episode_run_time[0] : null);
        modalRuntime.style.display = runtimeValue ? 'inline-block' : 'none';
        if(runtimeValue) modalRuntime.innerText = ${runtimeValue} min;

        const countryCode = targetedItemData.origin_country ? targetedItemData.origin_country[0] : (targetedItemData.production_countries && targetedItemData.production_countries[0] ? targetedItemData.production_countries[0].iso_3166_1 : '');
        modalCountry.innerText = countryCode && countriesCache[countryCode] ? Origin: ${countriesCache[countryCode]} : 'Origin: Global Content';

        modalGenres.innerText = targetedItemData.genres ? targetedItemData.genres.map(g => g.name).join(', ') : 'Unclassified';

        const isAlreadySaved = localWatchlist.some(w => w.id === targetedItemData.id && w.media_type === type);
        modalWatchlistToggle.className = isAlreadySaved ? 'modal-bookmark-btn saved' : 'modal-bookmark-btn';
        modalWatchlistToggle.innerHTML = isAlreadySaved ? <i class="fas fa-bookmark"></i> Saved in Watchlist : <i class="far fa-bookmark"></i> Add to Watchlist;

        detailsModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    } catch(e) { console.error("Modal compilation failure:", e); }
}

function closeDetailModalWindow() {
    detailsModal.classList.remove('open');
    document.body.style.overflow = 'auto';
}

function toggleItemFromWatchlist(item, type) {
    const matchIndex = localWatchlist.findIndex(w => w.id === item.id && w.media_type === type);
    if (matchIndex > -1) {
        localWatchlist.splice(matchIndex, 1);
    } else {
        localWatchlist.push({
            id: item.id, media_type: type,
            title: item.title || item.name, poster_path: item.poster_path,
            date: item.release_date || item.first_air_date,
            score: item.vote_average ? item.vote_average.toFixed(1) : '0.0'
        });
    }
    localStorage.setItem('mw_watchlist', JSON.stringify(localWatchlist));
    updateWatchlistCountBadge();
    if(viewContext === 'watchlist') renderWatchlistGrid();
}

function updateWatchlistCountBadge() {
    watchlistCount.innerText = localWatchlist.filter(w => w.media_type === activeMode).length;
}

// AUTH MODAL LOGIC TRIGGERS
authTriggerBtn.addEventListener('click', () => {
    // If user clicks while logged in, treat it as a "Log Out" option
    if (activeLoggedInUser) {
        if(confirm("Would you like to sign out of your profile?")) {
            activeLoggedInUser = null;
            localStorage.removeItem('mw_current_user');
            checkLoginStateStatus();
            alert("Signed out successfully!");
        }
        return;
    }
    signupBox.style.display = 'block';
    signinBox.style.display = 'none';
    authModal.classList.add('open');
});

closeAuthModal.addEventListener('click', () => { authModal.classList.remove('open'); });

goToSignin.addEventListener('click', () => {
    signupBox.style.display = 'none';
    signinBox.style.display = 'block';
});

goToSignup.addEventListener('click', () => {
    signinBox.style.display = 'none';
    signupBox.style.display = 'block';
});

// SIGN UP PROCESS LOGIC
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    // Check if user already exists
    if (registeredUsersDB.some(user => user.username.toLowerCase() === username.toLowerCase())) {
        alert("This username is already taken! Try another one.");
        return;
    }

    // Save user profile object into database simulator
    registeredUsersDB.push({ username, email, password });
    localStorage.setItem('mw_users_db', JSON.stringify(registeredUsersDB));

    alert("Account created successfully! Now sign in with your credentials.");
    signupForm.reset();
    
    // Auto shift to sign in screen
    signupBox.style.display = 'none';
    signinBox.style.display = 'block';
});

// SIGN IN PROCESS LOGIC
signinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('signin-username').value.trim();
    const password = document.getElementById('signin-password').value;

    // Search profile index inside storage array
    const userMatch = registeredUsersDB.find(user => user.username.toLowerCase() === username.toLowerCase() && user.password === password);

    if (!userMatch) {
        alert("Invalid Username or Password. Please try again or create an account.");
        return;
    }

    // Connect user state session
    activeLoggedInUser = userMatch.username;
    localStorage.setItem('mw_current_user', activeLoggedInUser);
    
    checkLoginStateStatus();
    signinForm.reset();
    authModal.classList.remove('open');
    alert(Welcome back, ${activeLoggedInUser}! Your personalized streaming hub is fully unlocked.);
});

// Controls Wireup Selectors
closeModal.addEventListener('click', closeDetailModalWindow);
detailsModal.addEventListener('click', (e) => { if(e.target === detailsModal) closeDetailModalWindow(); });

modalWatchlistToggle.addEventListener('click', () => {
    if(!targetedItemData) return;
    toggleItemFromWatchlist(targetedItemData, activeMode);
    const isSaved = localWatchlist.some(w => w.id === targetedItemData.id && w.media_type === activeMode);
    modalWatchlistToggle.className = isSaved ? 'modal-bookmark-btn saved' : 'modal-bookmark-btn';
    modalWatchlistToggle.innerHTML = isSaved ? <i class="fas fa-bookmark"></i> Saved in Watchlist : <i class="far fa-bookmark"></i> Add to Watchlist;
    renderPageUI();
});

switchMovies.addEventListener('click', () => {
    if(activeMode === 'movie') return;
    activeMode = 'movie';
    switchTV.classList.remove('active');
    switchMovies.classList.add('active');
    currentGenreId = '';
    loadGenreOptionsList();
    updateWatchlistCountBadge();
    renderPageUI();
});

switchTV.addEventListener('click', () => {
    if(activeMode === 'tv') return;
    activeMode = 'tv';
    switchMovies.classList.remove('active');
    switchTV.classList.add('active');
    currentGenreId = '';
    loadGenreOptionsList();
    updateWatchlistCountBadge();
    renderPageUI();
});

genreSelect.addEventListener('change', (e) => {
    currentGenreId = e.target.value;
    if(viewContext !== 'home') viewContext = 'home';
    renderPageUI();
});

regionSelect.addEventListener('change', (e) => {
    currentRegionCode = e.target.value;
    if(viewContext !== 'home') viewContext = 'home';
    renderPageUI();
});

function executeSearchQuery() {
    if(searchInput.value.trim() !== '') {
        viewContext = 'search';
        renderPageUI();
    }
}

searchBtn.addEventListener('click', executeSearchQuery);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') executeSearchQuery(); });

navHome.addEventListener('click', (e) => {
    e.preventDefault(); viewContext = 'home'; searchInput.value = '';
    navWatchlist.classList.remove('active'); navHome.classList.add('active');
    renderPageUI();
});

brandHome.addEventListener('click', () => {
    viewContext = 'home'; searchInput.value = '';
    navWatchlist.classList.remove('active'); navHome.classList.add('active');
    renderPageUI();
});

navWatchlist.addEventListener('click', (e) => {
    e.preventDefault(); viewContext = 'watchlist'; searchInput.value = '';
    navHome.classList.remove('active'); navWatchlist.classList.add('active');
    renderPageUI();
});