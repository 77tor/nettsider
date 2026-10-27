// --- ALL TILSTAND OG VARIABLER ÅPNES ØVERST FOR Å UNNGÅ REFERENCEERROR ---
let currentCategory = "Alle";
let activeData = (typeof linkData !== 'undefined') ? linkData : {};
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
let previewEnabled = true;

// Dekode Google Token (JWT)
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

// Global Google Sign-In Callback
window.handleGoogleSignIn = function(response) {
    const payload = parseJwt(response.credential);
    if (!payload || !payload.email) {
        showAuthError("Kunne ikke bekrefte Google-innlogging.");
        return;
    }
    processLogin(payload.email, payload.name);
};

// Felles logikk for innlogging (Google eller manuell felt)
function processLogin(emailInput, displayName = '') {
    const email = emailInput.trim().toLowerCase();
    const isUserAdmin = typeof ADMIN_EMAILS !== 'undefined' && ADMIN_EMAILS.includes(email);

    if (email.endsWith('@ikrs.no') || isUserAdmin) {
        currentUser = {
            name: displayName || email.split('@')[0],
            email: email,
            isAdmin: isUserAdmin
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        checkAuthStatus();
    } else {
        showAuthError(`Tilgang nektet: (${email}). Kun @ikrs.no e-poster har tilgang.`);
    }
}

// DOM Elementer
let authOverlay, appContainer, authError, userInfo, globalLogoutBtn, adminTabBtn;
let emailLoginForm, userEmailInput, accordionContainer, adminAccordionContainer;
let categoryTabs, searchInput, urlPreviewBar, recentLinksList, togglePreviewBtn, previewStatusText;
let hoverPreviewCard, hoverFavicon, hoverTitle, hoverImage, hoverIframe, hoverUrl, previewLoader;
let adminArea, addLinkForm, addModal, openAddModalBtn, closeAddModalBtn, generateCodeBtn, exportCodeTextarea;

// Oppstart
document.addEventListener('DOMContentLoaded', () => {
    // Hvis linkData ble lastet inn etter app.js
    if (Object.keys(activeData).length === 0 && typeof linkData !== 'undefined') {
        activeData = linkData;
    }

    // Koble opp DOM Elementer
    authOverlay = document.getElementById('authOverlay');
    appContainer = document.getElementById('appContainer');
    authError = document.getElementById('authError');
    userInfo = document.getElementById('userInfo');
    globalLogoutBtn = document.getElementById('globalLogoutBtn');
    adminTabBtn = document.getElementById('adminTabBtn');

    emailLoginForm = document.getElementById('emailLoginForm');
    userEmailInput = document.getElementById('userEmailInput');

    accordionContainer = document.getElementById('accordionContainer');
    adminAccordionContainer = document.getElementById('adminAccordionContainer');
    categoryTabs = document.getElementById('categoryTabs');
    searchInput = document.getElementById('searchInput');
    urlPreviewBar = document.getElementById('urlPreviewBar');
    recentLinksList = document.getElementById('recentLinksList');

    togglePreviewBtn = document.getElementById('togglePreviewBtn');
    previewStatusText = document.getElementById('previewStatusText');

    hoverPreviewCard = document.getElementById('hoverPreviewCard');
    hoverFavicon = document.getElementById('hoverFavicon');
    hoverTitle = document.getElementById('hoverTitle');
    hoverImage = document.getElementById('hoverImage');
    hoverIframe = document.getElementById('hoverIframe');
    hoverUrl = document.getElementById('hoverUrl');
    previewLoader = document.getElementById('previewLoader');

    adminArea = document.getElementById('adminArea');
    addLinkForm = document.getElementById('addLinkForm');
    addModal = document.getElementById('addModal');
    openAddModalBtn = document.getElementById('openAddModalBtn');
    closeAddModalBtn = document.getElementById('closeAddModalBtn');
    generateCodeBtn = document.getElementById('generateCodeBtn');
    exportCodeTextarea = document.getElementById('exportCode');

    checkAuthStatus();
    setupEventListeners();
});

function checkAuthStatus() {
    if (currentUser) {
        if (authOverlay) authOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        if (userInfo) userInfo.innerHTML = `👤 ${currentUser.name} (${currentUser.email})`;
        
        if (adminTabBtn) {
            adminTabBtn.style.display = currentUser.isAdmin ? 'inline-block' : 'none';
        }

        renderAccordion();
        renderRecentLinks();
    } else {
        if (authOverlay) authOverlay.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }
}

function setupEventListeners() {
    if (globalLogoutBtn) {
        globalLogoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            checkAuthStatus();
        });
    }

    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = userEmailInput.value;
            processLogin(email);
        });
    }

    if (togglePreviewBtn) {
        togglePreviewBtn.addEventListener('click', () => {
            previewEnabled = !previewEnabled;
            previewStatusText.innerText = previewEnabled ? 'PÅ' : 'AV';
            previewStatusText.style.color = previewEnabled ? '#38bdf8' : '#ef4444';
            if (!previewEnabled) hideHoverPreview();
        });
    }

    if (categoryTabs) {
        categoryTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentCategory = btn.dataset.category;
            
            if (currentCategory === 'Admin') {
                if (accordionContainer) accordionContainer.style.display = 'none';
                if (adminArea) adminArea.style.display = 'block';
                renderAdminAccordion();
            } else {
                if (accordionContainer) accordionContainer.style.display = 'flex';
                if (adminArea) adminArea.style.display = 'none';
                if (searchInput) searchInput.value = '';
                renderAccordion();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            renderAccordion(query);
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (!hoverPreviewCard || !hoverPreviewCard.classList.contains('visible')) return;

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

    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            updateExportCode();
            if (addModal) addModal.style.display = 'flex';
        });
    }

    if (closeAddModalBtn) {
        closeAddModalBtn.addEventListener('click', () => {
            if (addModal) addModal.style.display = 'none';
        });
    }

    if (generateCodeBtn) {
        generateCodeBtn.addEventListener('click', () => {
            addNewLinkToState();
            updateExportCode();
        });
    }

    if (addLinkForm) {
        addLinkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addNewLinkToState();
            updateExportCode();
            
            if (exportCodeTextarea) {
                exportCodeTextarea.select();
                document.execCommand('copy');
            }
            alert('Koden er kopiert og lagret lokalt! Lim den inn i din linkdata.js-fil på GitHub.');
            if (addModal) addModal.style.display = 'none';
        });
    }
}

function showAuthError(msg) {
    if (authError) {
        authError.innerText = msg;
        authError.style.display = 'block';
    }
}

function renderAccordion(searchQuery = '') {
    if (!accordionContainer) return;
    accordionContainer.innerHTML = '';
    
    const allCategories = Object.keys(activeData).filter(cat => cat !== 'Admin');
    const categoriesToRender = (currentCategory === 'Alle') ? allCategories : [currentCategory];

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
                const linkRow = createLinkRow(item, catName, index, false);
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

function renderAdminAccordion() {
    if (!adminAccordionContainer) return;
    adminAccordionContainer.innerHTML = '';
    
    const catName = "Admin";
    const links = activeData[catName] || [];

    const itemEl = document.createElement('div');
    itemEl.className = 'accordion-item open';

    const headerEl = document.createElement('div');
    headerEl.className = 'accordion-header';
    headerEl.innerHTML = `
        <div class="accordion-title">
            🔐 Admin-ressurser
            <span class="accordion-badge">${links.length} lenker</span>
        </div>
        <span class="accordion-icon">▼</span>
    `;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'accordion-body';

    const listEl = document.createElement('div');
    listEl.className = 'link-list';

    if (links.length === 0) {
        listEl.innerHTML = `<p style="padding: 0.8rem; color: var(--text-secondary); font-size: 0.85rem;">Ingen admin-lenker ennå.</p>`;
    } else {
        links.forEach((item, index) => {
            const linkRow = createLinkRow(item, catName, index, true);
            listEl.appendChild(linkRow);
        });
    }

    bodyEl.appendChild(listEl);
    itemEl.appendChild(headerEl);
    itemEl.appendChild(bodyEl);
    adminAccordionContainer.appendChild(itemEl);
}

function createLinkRow(item, category, index, showDelete = false) {
    // Endret fra <a> til <div> for å unngå nettleserens overlappende adressefelt nede i hjørnet
    const a = document.createElement('div');
    a.className = 'link-row';
    a.style.cursor = 'pointer';

    // Stilrent, innebygd fallback-ikon (SVG-lenke i en sirkel/firkant)
    const fallbackSVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
            <rect width="36" height="36" rx="8" fill="#1e293b"/>
            <path fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
                d="M15 21l6-6M13.5 16.5l-2.2 2.2a4 4 0 105.6 5.6l2.2-2.2M22.5 19.5l2.2-2.2a4 4 0 10-5.6-5.6l-2.2 2.2"/>
        </svg>
    `);

    // Bruker egendefinert ikon fra ikon/-mappen om det finnes, ellers SVG-reserve
    const iconUrl = item.icon || fallbackSVG;

    const tagsHtml = (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');

    let deleteBtnHtml = '';
    if (showDelete && currentUser && currentUser.isAdmin) {
        deleteBtnHtml = `<button class="btn btn-danger btn-sm" onclick="deleteLink('${category}', ${index}, event)">Slett</button>`;
    }

    a.innerHTML = `
        <div class="link-left">
            <img class="link-favicon" src="${iconUrl}" alt="" onerror="this.onerror=null; this.src='${fallbackSVG}';">
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

    a.addEventListener('mouseenter', (e) => {
        if (urlPreviewBar) urlPreviewBar.innerHTML = `<span>🔗 <strong>${item.title}:</strong> ${item.url}</span>`;
        if (previewEnabled) showHoverPreview(item, e);
    });

    a.addEventListener('mouseleave', () => {
        if (urlPreviewBar) urlPreviewBar.innerHTML = `<span>Hold musen over en lenke for å se nettadressen her...</span>`;
        hideHoverPreview();
    });

    // Åpner lenken i ny fane ved klikk og registrerer den som sist besøkt
    a.addEventListener('click', () => {
        addRecentLink(item);
        window.open(item.url, '_blank', 'noopener,noreferrer');
    });

    return a;
}

function showHoverPreview(item, event) {
    if (!hoverPreviewCard) return;
    if (item.url.includes('drive.google.com') || item.url.includes('docs.google.com')) {
        return;
    }

    if (hoverTitle) hoverTitle.innerText = item.title;
    if (hoverUrl) hoverUrl.innerText = item.url;
    
    try {
        const domain = new URL(item.url).hostname;
        const defaultFavicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
        if (hoverFavicon) hoverFavicon.src = item.icon || defaultFavicon;
    } catch {
        if (hoverFavicon) hoverFavicon.src = '';
    }

    if (hoverImage) hoverImage.style.display = 'block';
    if (hoverIframe) hoverIframe.style.display = 'none';

    // 1. Hvis et eget forhåndsvisningsbilde er oppgitt (f.eks. side/kartside.png)
    if (item.previewImage) {
        if (previewLoader) previewLoader.style.opacity = '0';
        if (hoverImage) hoverImage.src = item.previewImage;
    } else {
        // 2. Ellers hents automatisk skjermbilde via Microlink
        if (previewLoader) previewLoader.style.opacity = '1';
        const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(item.url)}&screenshot=true&embed=screenshot.url`;
        if (hoverImage) hoverImage.src = screenshotUrl;

        if (hoverImage) {
            hoverImage.onload = () => { if (previewLoader) previewLoader.style.opacity = '0'; };
            hoverImage.onerror = () => {
                hoverImage.style.display = 'none';
                if (hoverIframe) {
                    hoverIframe.style.display = 'block';
                    hoverIframe.src = item.url;
                }
                if (previewLoader) previewLoader.style.opacity = '0';
            };
        }
    }

    hoverPreviewCard.style.left = `${event.clientX + 15}px`;
    hoverPreviewCard.style.top = `${event.clientY + 15}px`;
    hoverPreviewCard.classList.add('visible');
}

function hideHoverPreview() {
    if (!hoverPreviewCard) return;
    hoverPreviewCard.classList.remove('visible');
    if (hoverImage) hoverImage.src = '';
    if (hoverIframe) hoverIframe.src = '';
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
    if (!recentLinksList) return;
    const recent = JSON.parse(localStorage.getItem('recentLinks')) || [];
    if (recent.length === 0) {
        recentLinksList.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.8rem;">Ingen nylig besøkte lenker ennå.</span>`;
        return;
    }

    recentLinksList.innerHTML = recent.map(item => `
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="recent-chip" 
           onmouseenter="if(document.getElementById('urlPreviewBar')) document.getElementById('urlPreviewBar').innerHTML = '<span>🔗 <strong>${item.title}:</strong> ${item.url}</span>'"
           onmouseleave="if(document.getElementById('urlPreviewBar')) document.getElementById('urlPreviewBar').innerHTML = '<span>Hold musen over en lenke for å se nettadressen her...</span>'">
            ${item.title}
        </a>
    `).join('');
}

function addNewLinkToState() {
    const catEl = document.getElementById('newCategory');
    const titleEl = document.getElementById('newTitle');
    const urlEl = document.getElementById('newUrl');
    const iconEl = document.getElementById('newIcon');
    const previewImgEl = document.getElementById('newPreviewImage');
    const descEl = document.getElementById('newDesc');
    const tagsEl = document.getElementById('newTags');

    if (!catEl || !titleEl || !urlEl) return;

    const cat = catEl.value;
    const title = titleEl.value.trim();
    const url = urlEl.value.trim();
    const icon = iconEl ? iconEl.value.trim() : '';
    const previewImage = previewImgEl ? previewImgEl.value.trim() : '';
    const desc = descEl ? descEl.value.trim() : '';
    const tagsRaw = tagsEl ? tagsEl.value.trim() : '';

    if (!title || !url) return;

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (!activeData[cat]) {
        activeData[cat] = [];
    }

    const existingIndex = activeData[cat].findIndex(l => l.url === url);
    const newObj = { title, url, description: desc, tags };
    
    if (icon) newObj.icon = icon;
    if (previewImage) newObj.previewImage = previewImage;

    if (existingIndex >= 0) {
        activeData[cat][existingIndex] = newObj;
    } else {
        activeData[cat].push(newObj);
    }

    localStorage.setItem('myLinkData', JSON.stringify(activeData));
    if (currentCategory === 'Admin') renderAdminAccordion();
    else renderAccordion();
}

function deleteLink(cat, index, e) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Er du sikker på at du vil slette denne lenken?')) {
        activeData[cat].splice(index, 1);
        localStorage.setItem('myLinkData', JSON.stringify(activeData));
        if (currentCategory === 'Admin') renderAdminAccordion();
        else renderAccordion();
    }
}

function updateExportCode() {
    if (!exportCodeTextarea) return;
    const adminList = typeof ADMIN_EMAILS !== 'undefined' ? ADMIN_EMAILS : ["77tor@ikrs.no", "tor.skarprud@gmail.com"];
    
    let code = `/**\n * Datafil for lenkesamling (linkdata.js)\n */\n\nconst linkData = {\n`;
    
    const categories = Object.keys(activeData);
    categories.forEach((cat, catIdx) => {
        code += `    "${cat}": [\n`;
        activeData[cat].forEach((item, itemIdx) => {
            code += `        {\n`;
            code += `            title: ${JSON.stringify(item.title)},\n`;
            code += `            url: ${JSON.stringify(item.url)},\n`;
            code += `            description: ${JSON.stringify(item.description || '')},\n`;
            code += `            tags: ${JSON.stringify(item.tags || [])}`;
            if (item.icon) {
                code += `,\n            icon: ${JSON.stringify(item.icon)}`;
            }
            if (item.previewImage) {
                code += `,\n            previewImage: ${JSON.stringify(item.previewImage)}`;
            }
            code += `\n        }${itemIdx < activeData[cat].length - 1 ? ',' : ''}\n`;
        });
        code += `    ]${catIdx < categories.length - 1 ? ',' : ''}\n`;
    });

    code += `};\n\nconst ADMIN_EMAILS = ${JSON.stringify(adminList, null, 4)};\n`;
    exportCodeTextarea.value = code;
}