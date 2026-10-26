// Tilstand
let currentCategory = "Alle";
let activeData = JSON.parse(localStorage.getItem('myLinkData')) || linkData;
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
let previewEnabled = true;

// DOM Elementer
const authOverlay = document.getElementById('authOverlay');
const appContainer = document.getElementById('appContainer');
const authError = document.getElementById('authError');
const userInfo = document.getElementById('userInfo');
const globalLogoutBtn = document.getElementById('globalLogoutBtn');
const adminTabBtn = document.getElementById('adminTabBtn');

const accordionContainer = document.getElementById('accordionContainer');
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

function checkAuthStatus() {
    if (currentUser) {
        authOverlay.style.display = 'none';
        appContainer.style.display = 'flex';
        userInfo.innerHTML = `👤 ${currentUser.name} (${currentUser.email})`;
        
        if (currentUser.isAdmin) {
            adminTabBtn.style.display = 'inline-block';
        } else {
            adminTabBtn.style.display = 'none';
        }

        renderAccordion();
        renderRecentLinks();
    } else {
        authOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
    }
}

function setupEventListeners() {
    // Innlogging
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

    globalLogoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        currentUser = null;
        checkAuthStatus();
    });

    togglePreviewBtn.addEventListener('click', () => {
        previewEnabled = !previewEnabled;
        previewStatusText.innerText = previewEnabled ? 'PÅ' : 'AV';
        previewStatusText.style.color = previewEnabled ? '#38bdf8' : '#ef4444';
        if (!previewEnabled) hideHoverPreview();
    });

    // Menytabs
    categoryTabs.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-btn')) return;
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        currentCategory = e.target.dataset.category;
        
        if (currentCategory === 'Admin') {
            accordionContainer.style.display = 'none';
            adminArea.style.display = 'block';
            updateExportCode();
        } else {
            accordionContainer.style.display = 'flex';
            adminArea.style.display = 'none';
            searchInput.value = '';
            renderAccordion();
        }
    });

    // Søk
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        renderAccordion(query);
    });

    // Mus-bevegelse for forhåndsvisningskort
    document.addEventListener('mousemove', (e) => {
        if (!hoverPreviewCard.classList.contains('visible')) return;

        const cardWidth = 320;
        const cardHeight = 240;
        const padding = 15;

        let left = e.clientX + padding;
        let top = e.clientY + padding;

        if (left + cardWidth > window.innerWidth) left = e.clientX - cardWidth - padding;
        if (top + cardHeight > window.innerHeight) top = e.clientY - cardHeight - padding;

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

function showAuthError(msg) {
    authError.innerText = msg;
    authError.style.display = 'block';
}

// Render nedtrekksmenyer (Accordion)
function renderAccordion(searchQuery = '') {
    accordionContainer.innerHTML = '';
    
    const categoriesToRender = (currentCategory === 'Alle') 
        ? Object.keys(activeData) 
        : [currentCategory];

    let hasMatches = false;

    categoriesToRender.forEach(catName => {
        let links = activeData[catName] || [];

        if (searchQuery) {
            links = links.filter(item => {
                return item.title.toLowerCase().includes(searchQuery) ||
                       (item.description && item.description.toLowerCase().includes(searchQuery)) ||
                       item.url.toLowerCase().includes(searchQuery) ||
                       (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery)));
            });
        }

        if (links.length === 0 && searchQuery) return;

        hasMatches = true;

        const itemEl = document.createElement('div');
        itemEl.className = `accordion-item ${searchQuery || currentCategory !== 'Alle' ? 'open' : ''}`;

        const headerEl = document.createElement('div');
        headerEl.className = 'accordion-header';
        headerEl.innerHTML = `
            <div class="accordion-title">
                📁 ${catName}
                <span class="accordion-badge">${links.length} lenker</span>
            </div>
            <span class="accordion-icon">▼</span>
        `;

        headerEl.addEventListener('click', () => {
            itemEl.classList.toggle('open');
        });

        const bodyEl = document.createElement('div');
        bodyEl.className = 'accordion-body';

        const listEl = document.createElement('div');
        listEl.className = 'link-list';

        if (links.length === 0) {
            listEl.innerHTML = `<p style="padding: 0.8rem; color: var(--text-secondary); font-size: 0.85rem;">Ingen lenker her ennå.</p>`;
        } else {
            links.forEach((item, index) => {
                const linkRow = createLinkRow(item, catName, index);
                listEl.appendChild(linkRow);
            });
        }

        bodyEl.appendChild(listEl);
        itemEl.appendChild(headerEl);
        itemEl.appendChild(bodyEl);
        accordionContainer.appendChild(itemEl);
    });

    if (!hasMatches && searchQuery) {
        accordionContainer.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Ingen lenker matchet søket "${searchQuery}".</p>`;
    }
}

// Lag én enkelt rad i listevisningen
function createLinkRow(item, category, index) {
    const a = document.createElement('a');
    a.className = 'link-row';
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    let domain = '';
    try { domain = new URL(item.url).hostname; } catch(e) {}
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '';

    const tagsHtml = (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');

    let deleteBtnHtml = '';
    if (currentUser && currentUser.isAdmin && currentCategory === 'Admin') {
        deleteBtnHtml = `<button class="btn btn-danger btn-sm" onclick="deleteLink('${category}', ${index}, event)">Slett</button>`;
    }

    a.innerHTML = `
        <div class="link-left">
            <img class="link-favicon" src="${faviconUrl}" alt="">
            <div class="link-info">
                <span class="link-title">${item.title}</span>
                <span class="link-desc">${item.description || item.url}</span>
            </div>
        </div>
        <div class="link-right">
            ${tagsHtml}
            ${deleteBtnHtml}
        </div>
    `;

    // Hover effekter for URL Bar & Bildeforhåndsvisning
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

// Bildeforhåndsvisning
function showHoverPreview(item, event) {
    if (item.url.includes('sites.google.com') || item.url.includes('drive.google.com') || item.url.includes('docs.google.com')) {
        return;
    }

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

    const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(item.url)}&screenshot=true&embed=screenshot.url`;
    hoverImage.src = screenshotUrl;

    hoverImage.onload = () => { previewLoader.style.opacity = '0'; };
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
        recentLinksList.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.8rem;">Ingen nylig besøkte lenker ennå.</span>`;
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
        renderAccordion();
        updateExportCode();
    }
}

function updateExportCode() {
    const code = `const linkData = ${JSON.stringify(activeData, null, 4)};\n\nconst ADMIN_EMAILS = ${JSON.stringify(ADMIN_EMAILS, null, 4)};`;
    exportCodeTextarea.value = code;
}