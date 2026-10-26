// Håndter e-postinnlogging
document.getElementById('emailLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('userEmailInput').value.trim().toLowerCase();
    
    if (input.endsWith('@ikrs.no') || ADMIN_EMAILS.includes(input)) {
        currentUser = {
            name: input.split('@')[0],
            email: input,
            isAdmin: ADMIN_EMAILS.includes(input)
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        checkAuthStatus();
    } else {
        showAuthError("Kun e-postadresser som slutter på @ikrs.no har tilgang.");
    }
});

// Applikasjonstilstand
let currentCategory = "Lesing";
let activeData = JSON.parse(localStorage.getItem('myLinkData')) || linkData;
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
let previewEnabled = true;

// DOM-elementer
const authOverlay = document.getElementById('authOverlay');
const appContainer = document.getElementById('appContainer');
const authError = document.getElementById('authError');
const userInfo = document.getElementById('userInfo');
const globalLogoutBtn = document.getElementById('globalLogoutBtn');
const adminTabBtn = document.getElementById('adminTabBtn');

const cardsGrid = document.getElementById('cardsGrid');
const categoryTabs = document.getElementById('categoryTabs');
const searchInput = document.getElementById('searchInput');
const urlPreviewBar = document.getElementById('urlPreviewBar');
const recentLinksList = document.getElementById('recentLinksList');

const togglePreviewBtn = document.getElementById('togglePreviewBtn');
const previewStatusText = document.getElementById('previewStatusText');

const hoverPreviewCard = document.getElementById('hoverPreviewCard');
const hoverFavicon = document.getElementById('hoverFavicon');
const hoverTitle = document.getElementById('hoverTitle');
const hoverImage = document.getElementById('hoverImage');
const hoverIframe = document.getElementById('hoverIframe');
const hoverUrl = document.getElementById('hoverUrl');
const previewLoader = document.getElementById('previewLoader');

const adminArea = document.getElementById('adminArea');
const addLinkForm = document.getElementById('addLinkForm');
const exportCodeTextarea = document.getElementById('exportCode');
const copyExportBtn = document.getElementById('copyExportBtn');

// Oppstart
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

// Dekode Google JWT Token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Global Callback for Google Sign-In
window.handleGoogleSignIn = function(response) {
    const payload = parseJwt(response.credential);
    
    if (!payload || !payload.email) {
        showAuthError("Kunne ikke verifisere Google-innlogging.");
        return;
    }

    const email = payload.email.toLowerCase();
    const domain = email.split('@')[1];

    // Sjekk domene eller om det er en av de eksplisitte admin-adressene
    if (domain === 'ikrs.no' || ADMIN_EMAILS.includes(email)) {
        currentUser = {
            name: payload.name,
            email: email,
            picture: payload.picture,
            isAdmin: ADMIN_EMAILS.includes(email)
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        checkAuthStatus();
    } else {
        showAuthError(`Tilgang nektet: (${email}). Kun @ikrs.no e-poster har tilgang.`);
    }
};

function showAuthError(msg) {
    authError.innerText = msg;
    authError.style.display = 'block';
}

function checkAuthStatus() {
    if (currentUser) {
        authOverlay.style.display = 'none';
        appContainer.style.display = 'block';
        
        userInfo.innerHTML = `👤 ${currentUser.name} (${currentUser.email})`;
        
        // Vis Admin-fane kun hvis brukeren er godkjent admin
        if (currentUser.isAdmin) {
            adminTabBtn.style.display = 'inline-block';
        } else {
            adminTabBtn.style.display = 'none';
        }

        renderCards();
        renderRecentLinks();
    } else {
        authOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
    }
}

function handleLogout() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    checkAuthStatus();
}

function setupEventListeners() {
    globalLogoutBtn.addEventListener('click', handleLogout);

    togglePreviewBtn.addEventListener('click', () => {
        previewEnabled = !previewEnabled;
        previewStatusText.innerText = previewEnabled ? 'PÅ' : 'AV';
        previewStatusText.style.color = previewEnabled ? '#38bdf8' : '#ef4444';
        if (!previewEnabled) hideHoverPreview();
    });

    categoryTabs.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-btn')) return;
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        currentCategory = e.target.dataset.category;
        
        if (currentCategory === 'Admin') {
            cardsGrid.style.display = 'none';
            adminArea.style.display = 'block';
            updateExportCode();
        } else {
            cardsGrid.style.display = 'grid';
            adminArea.style.display = 'none';
            searchInput.value = '';
            renderCards();
        }
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length > 0) {
            renderSearchResults(query);
        } else {
            renderCards();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!hoverPreviewCard.classList.contains('visible')) return;

        const cardWidth = 330;
        const cardHeight = 250;
        const padding = 15;

        let left = e.clientX + padding;
        let top = e.clientY + padding;

        if (left + cardWidth > window.innerWidth) {
            left = e.clientX - cardWidth - padding;
        }
        if (top + cardHeight > window.innerHeight) {
            top = e.clientY - cardHeight - padding;
        }

        hoverPreviewCard.style.left = `${left}px`;
        hoverPreviewCard.style.top = `${top}px`;
    });

    addLinkForm.addEventListener('submit', handleAddLink);

    copyExportBtn.addEventListener('click', () => {
        exportCodeTextarea.select();
        document.execCommand('copy');
        alert('Koden er kopiert! Lim den inn i din linkdata.js-fil.');
    });
}

function renderCards() {
    const links = activeData[currentCategory] || [];
    cardsGrid.innerHTML = '';

    if (links.length === 0) {
        cardsGrid.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1/-1;">Ingen lenker i denne kategorien ennå.</p>`;
        return;
    }

    links.forEach((item, index) => {
        const card = createCardElement(item, currentCategory, index);
        cardsGrid.appendChild(card);
    });
}

function renderSearchResults(query) {
    cardsGrid.innerHTML = '';
    let matchesCount = 0;

    Object.keys(activeData).forEach(cat => {
        activeData[cat].forEach((item, index) => {
            const matchesTitle = item.title.toLowerCase().includes(query);
            const matchesDesc = item.description.toLowerCase().includes(query);
            const matchesUrl = item.url.toLowerCase().includes(query);
            const matchesTags = item.tags && item.tags.some(t => t.toLowerCase().includes(query));

            if (matchesTitle || matchesDesc || matchesUrl || matchesTags) {
                const card = createCardElement(item, cat, index);
                cardsGrid.appendChild(card);
                matchesCount++;
            }
        });
    });

    if (matchesCount === 0) {
        cardsGrid.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1/-1;">Ingen lenker matchet søket "${query}".</p>`;
    }
}

function createCardElement(item, category, index) {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    const tagsHtml = (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');

    let deleteBtnHtml = '';
    if (currentUser && currentUser.isAdmin && currentCategory === 'Admin') {
        deleteBtnHtml = `<button class="btn btn-danger btn-sm" onclick="deleteLink('${category}', ${index}, event)" style="position: absolute; top: 10px; right: 10px;">Slett</button>`;
    }

    a.innerHTML = `
        ${deleteBtnHtml}
        <div>
            <div class="card-title">${item.title}</div>
            <div class="card-desc">${item.description || ''}</div>
        </div>
        <div class="card-tags">${tagsHtml}</div>
    `;

    a.addEventListener('mouseenter', (e) => {
        urlPreviewBar.innerHTML = `<span>🔗 <strong>${item.title}:</strong> ${item.url}</span>`;
        if (previewEnabled) showHoverPreview(item, e);
    });

    a.addEventListener('mouseleave', () => {
        urlPreviewBar.innerHTML = `<span>Hold musen over en lenke for å se nettadressen her...</span>`;
        hideHoverPreview();
    });

    a.addEventListener('click', () => {
        addRecentLink(item);
    });

    return a;
}

function showHoverPreview(item, event) {
    hoverTitle.innerText = item.title;
    hoverUrl.innerText = item.url;
    
    try {
        const domain = new URL(item.url).hostname;
        hoverFavicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
        hoverFavicon.src = '';
    }

    previewLoader.style.opacity = '1';
    hoverImage.style.display = 'block';
    hoverIframe.style.display = 'none';
    hoverIframe.src = '';

    const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(item.url)}&screenshot=true&embed=screenshot.url`;
    hoverImage.src = screenshotUrl;

    hoverImage.onload = () => {
        previewLoader.style.opacity = '0';
    };

    hoverImage.onerror = () => {
        hoverImage.style.display = 'none';
        hoverIframe.style.display = 'block';
        hoverIframe.src = item.url;
        previewLoader.style.opacity = '0';
    };

    hoverPreviewCard.style.left = `${event.clientX + 15}px`;
    hoverPreviewCard.style.top = `${event.clientY + 15}px`;
    hoverPreviewCard.classList.add('visible');
}

function hideHoverPreview() {
    hoverPreviewCard.classList.remove('visible');
    hoverImage.src = '';
    hoverIframe.src = '';
}

function addRecentLink(item) {
    let recent = JSON.parse(localStorage.getItem('recentLinks')) || [];
    recent = recent.filter(r => r.url !== item.url);
    recent.unshift(item);
    recent = recent.slice(0, 5);

    localStorage.setItem('recentLinks', JSON.stringify(recent));
    renderRecentLinks();
}

function renderRecentLinks() {
    const recent = JSON.parse(localStorage.getItem('recentLinks')) || [];
    if (recent.length === 0) {
        recentLinksList.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.85rem;">Ingen nylig besøkte lenker ennå.</span>`;
        return;
    }

    recentLinksList.innerHTML = recent.map(item => `
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="recent-chip" 
           onmouseenter="document.getElementById('urlPreviewBar').innerHTML = '<span>🔗 <strong>${item.title}:</strong> ${item.url}</span>'"
           onmouseleave="document.getElementById('urlPreviewBar').innerHTML = '<span>Hold musen over en lenke for å se nettadressen her...</span>'">
            ${item.title}
        </a>
    `).join('');
}

function handleAddLink(e) {
    e.preventDefault();
    const cat = document.getElementById('newCategory').value;
    const title = document.getElementById('newTitle').value.trim();
    const url = document.getElementById('newUrl').value.trim();
    const desc = document.getElementById('newDesc').value.trim();
    const tagsRaw = document.getElementById('newTags').value.trim();

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

    if (!activeData[cat]) {
        activeData[cat] = [];
    }

    activeData[cat].push({ title, url, description: desc, tags });
    localStorage.setItem('myLinkData', JSON.stringify(activeData));
    
    addLinkForm.reset();
    updateExportCode();
    alert(`Lenken "${title}" ble lagt til i kategorien ${cat}!`);
}

function deleteLink(cat, index, e) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Er du sikker på at du vil slette denne lenken?')) {
        activeData[cat].splice(index, 1);
        localStorage.setItem('myLinkData', JSON.stringify(activeData));
        renderCards();
        updateExportCode();
    }
}

function updateExportCode() {
    const code = `const linkData = ${JSON.stringify(activeData, null, 4)};\n\nconst ADMIN_EMAILS = ${JSON.stringify(ADMIN_EMAILS, null, 4)};`;
    exportCodeTextarea.value = code;
}