const SLIDESHOW_INTERVAL = 5000; // Intervallo di 5 secondi per lo slideshow
const SLIDESHOW_NUM_IMAGES = 6; // Numero massimo di immagini da mostrare nello slideshow
const GRID_PAGE_SIZE = 6;
const FEED_PAGE_SIZE = 4;
const gridFeedState = {
    sortedData: [],
    renderedCount: 0,
    observer: null,
    sentinel: null,
    isAppending: false
};

const slideshowState = {
    timerId: null,
    imageUrls: [],
    currentIndex: 0
};

const feedPanelState = {
    sortedData: [],
    renderedCount: 0,
    observer: null,
    sentinel: null,
    isAppending: false,
    pendingTargetCount: 0
};

let detachFeedInfiniteScrollActivation = null;

const GRID_FEED_STATE_KEY = 'gridFeedState';
const SLIDESHOW_STATE_KEY = 'slideshowState';
const MAX_SELECTED_FILES = 4;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

let selectedFiles = []; // Array per memorizzare i file selezionati per l'upload


let startY = 0;
let currentY = 0;
let isPulling = false;
const PULL_THRESHOLD = 80; // Pixel di trascinamento necessari per attivare l'azione

let ptrIndicator;
let ptrText;

function getPullDistance() {
    return Math.max(0, currentY - startY);
}

function getPulledDistance() {
    return getPullDistance() / 2.5;
}


// 1. Quando l'utente tocca lo schermo
window.addEventListener('touchstart', (e) => {

  const lastPanel = sessionStorage.getItem('lastActivePanel');
  if (lastPanel !== 'grid') return; // Attiva la logica solo se il pannello attivo è la Grid

    const gridScreen = document.getElementById('grid-screen');
    if (!gridScreen) return;

    // Attiva la logica solo se la pagina si trova in cima
    if (gridScreen.scrollTop === 0) {
    startY = e.touches[0].pageY;
    isPulling = true;

    console.log("Touch start: ", startY, "scrollTop: ", gridScreen.scrollTop);
  }

}, { passive: true });

// 2. Mentre l'utente trascina il dito verso il basso
window.addEventListener('touchmove', (e) => {
  const lastPanel = sessionStorage.getItem('lastActivePanel');
  if (lastPanel !== 'grid') return; // Attiva la logica solo se il pannello attivo è la Grid

  if (!isPulling) return;

  currentY = e.touches[0].pageY;
    const pulledDistance = getPulledDistance();

  // Stiamo trascinando verso il basso
    if (pulledDistance > 0) {
        // Applichiamo una resistenza fisica (diviso 2.5) per rendere il movimento fluido
        const visibleDistance = Math.min(pulledDistance, PULL_THRESHOLD + 20);
        ptrIndicator.style.height = `${visibleDistance}px`;

        if (visibleDistance >= PULL_THRESHOLD) {
        ptrText.textContent = 'Rilascia per aggiornare';
        } else {
        ptrText.textContent = 'Scorri per aggiornare';
        }

        console.log("Touch move: ", startY, "Current Y: ", currentY);
    } else {
        ptrIndicator.style.height = '0px';
        ptrText.textContent = 'Scorri per aggiornare';
    }
}, { passive: true });

// 3. Quando l'utente stacca il dito dallo schermo
window.addEventListener('touchend', async () => {
  const lastPanel = sessionStorage.getItem('lastActivePanel');
  if (lastPanel !== 'grid') return; // Attiva la logica solo se il pannello attivo è la Grid

  if (!isPulling) return;

  isPulling = false;

    const pulledDistance = getPulledDistance();

  if (pulledDistance >= PULL_THRESHOLD) {
    //ptrText.textContent = 'Aggiornamento in corso...';
    //ptrIndicator.style.height = '50px'; // Mantiene visibile lo spinner/testo
    console.log("Touch end: ", startY, "Current Y: ", currentY);

    // --- Inserisci qui la tua funzione di aggiornamento ---
    await refreshGalleryData(); 

    // Ripristina l'interfaccia a caricamento completato
    ptrIndicator.style.height = '0px';
    ptrText.textContent = 'Scorri per aggiornare';
  } else {
    // Se non si è tirato abbastanza, annulla il movimento
    ptrIndicator.style.height = '0px';
  }

  startY = 0;
  currentY = 0;
});


function refreshGalleryData() {

    // Reset dello stato della Grid e dello Slideshow
    resetGridPaginationState();
    resetSlideshow();

    showGridPanel();
}



if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('Service Worker registrato con successo:', registration.scope);
      })
      .catch(error => {
        console.error('Errore durante la registrazione del Service Worker:', error);
      });
  });
}


document.addEventListener('DOMContentLoaded', function() {
    const submitButton = document.getElementById('login-submit');
    const nameInput = document.getElementById('login-name');

    if (submitButton) {
        submitButton.onclick = handleLoginSubmit;
    }

    if (nameInput) {
        nameInput.onkeydown = handleLoginNameKeydown;
        nameInput.oninput = handleLoginNameInput;
    }

    // Inizializza l'app controllando se è primo caricamento o refresh
    initializeApp();
});


function getSerializableGridFeedState() {
    return {
        sortedData: Array.isArray(gridFeedState.sortedData) ? gridFeedState.sortedData : [],
        renderedCount: Number.isFinite(gridFeedState.renderedCount) ? gridFeedState.renderedCount : 0,
        isAppending: false
    };
}

function getSerializableSlideshowState() {
    return {
        imageUrls: Array.isArray(slideshowState.imageUrls) ? slideshowState.imageUrls : [],
        currentIndex: Number.isFinite(slideshowState.currentIndex) ? slideshowState.currentIndex : 0
    };
}

function saveGridFeedStateToSession() {
    sessionStorage.setItem(GRID_FEED_STATE_KEY, JSON.stringify(getSerializableGridFeedState()));
}

function saveSlideshowStateToSession() {
    sessionStorage.setItem(SLIDESHOW_STATE_KEY, JSON.stringify(getSerializableSlideshowState()));
}

function saveAppStatesToSession() {
    saveGridFeedStateToSession();
    saveSlideshowStateToSession();
}

function readAppStatesFromSession() {
    const gridRaw = sessionStorage.getItem(GRID_FEED_STATE_KEY);
    const slideshowRaw = sessionStorage.getItem(SLIDESHOW_STATE_KEY);

    if (!gridRaw || !slideshowRaw) {
        return null;
    }

    try {
        const parsedGridState = JSON.parse(gridRaw);
        const parsedSlideshowState = JSON.parse(slideshowRaw);

        if (!parsedGridState || !Array.isArray(parsedGridState.sortedData)) {
            return null;
        }

        if (!parsedSlideshowState || !Array.isArray(parsedSlideshowState.imageUrls)) {
            return null;
        }

        if (parsedGridState.sortedData.length === 0 && parsedSlideshowState.imageUrls.length === 0) {
            return null;
        }

        return {
            grid: {
                sortedData: parsedGridState.sortedData,
                renderedCount: Number.isFinite(parsedGridState.renderedCount) ? parsedGridState.renderedCount : 0,
                isAppending: false
            },
            slideshow: {
                imageUrls: parsedSlideshowState.imageUrls,
                currentIndex: Number.isFinite(parsedSlideshowState.currentIndex) ? parsedSlideshowState.currentIndex : 0
            }
        };
    } catch (error) {
        console.warn('Stato sessionStorage non valido, verrà ignorato:', error);
        return null;
    }
}

function applyStatesFromSession(sessionStates) {
    if (!sessionStates) {
        return false;
    }

    gridFeedState.sortedData = sessionStates.grid.sortedData;
    gridFeedState.renderedCount = 0;
    gridFeedState.isAppending = false;

    slideshowState.imageUrls = sessionStates.slideshow.imageUrls;
    slideshowState.currentIndex = sessionStates.slideshow.currentIndex;

    return true;
}

function tryRestoreGridPanelFromSession(feedContainer) {
    if (!feedContainer) {
        return false;
    }

    const sessionStates = readAppStatesFromSession();
    if (!applyStatesFromSession(sessionStates)) {
        return false;
    }

    if (gridFeedState.sortedData.length === 0) {
        feedContainer.innerHTML = "<p style='text-align:center;'>Nessun elemento presente nella galleria.</p>";
        initializeSlideshow([]);
        saveAppStatesToSession();
        return true;
    }

    feedContainer.innerHTML = '';
    appendNextGridPage(feedContainer);
    setupGridInfiniteScroll(feedContainer);
    setTimeout(function() {
        initializeSlideshow(gridFeedState.sortedData);
        saveAppStatesToSession();
    }, 0);
    saveAppStatesToSession();
    return true;
}



/**
 * Controlla se è la prima volta che l'applicazione viene caricata
 * o se è un refresh di pagina
 * @returns {boolean} true se è la prima volta, false se è un refresh
 */
function isFirstLoad() {
    // Verifica usando Navigation API moderna
    const navigationEntries = performance.getEntriesByType('navigation');
    let isRefresh = false;
    
    if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        isRefresh = navEntry.type === 'reload';
    } else {
        // Fallback per browser più vecchi
        isRefresh = performance.navigation && performance.navigation.type === performance.navigation.TYPE_RELOAD;
    }
    
    // Verifica anche il sessionStorage per distinguere tra nuova sessione e refresh
    const hasSessionData = sessionStorage.getItem('appLoaded');
    
    if (!hasSessionData && !isRefresh) {
        // Prima volta in questa sessione
        sessionStorage.setItem('appLoaded', 'true');
        return true;
    }
    
    return false;
}


/**
 * Inizializza l'applicazione in base al tipo di caricamento
 */
function initializeApp() {
    if (isFirstLoad()) {
        onFirstLoad();
    } else {
        onPageRefresh();
    }
}

/**
 * Logica eseguita al primo caricamento
 */
function onFirstLoad() {
    // Qui puoi aggiungere logica specifica per il primo caricamento
    // Ad esempio: tutorial, animazioni di benvenuto, etc.
   
    // Se è stato già inserito il nome allora va direttamente alla schermata della Grid
    const userName = localStorage.getItem('userName');

    if (userName) {
        showGridPanel();
        return;
    } else {
        showLoginPanel();
        return;
    }

}

/**
 * Logica eseguita durante il refresh
 */
function onPageRefresh() {
    // Qui puoi aggiungere logica per il refresh
    // Ad esempio: ripristinare stato, saltare intro, etc.
    hideAllPanels();
    
    // Controlla se c'era un pannello salvato
    const lastPanel = sessionStorage.getItem('lastActivePanel');
    
    if (lastPanel) {
        switch(lastPanel) {
            case 'grid':
                showGridPanel();
                break;
            case 'login':
                showLoginPanel();
                break;
            case 'upload':
                showUploadPanel();
                break;
            case 'feed':
                showFeedPanel();
                break;          
        }
    } else {
        showLoginPanel();
    }
}


function showLoginPanel() {

    console.log("Entrato in showLoginPanel()");

    // Logica per mostrare il pannello del menu
    hideAllPanels();

    // Reset dello stato della Grid e dello Slideshow
    resetGridPaginationState();
    resetSlideshow();

    sessionStorage.setItem('lastActivePanel', 'login');
    document.getElementById('login-screen').style.display = 'block';

    const nameInput = document.getElementById('login-name');
    const submitButton = document.getElementById('login-submit');
    setLoginLoading(false);

    if (!nameInput || !submitButton) {
        return;
    }

    // Re-bind difensivo: garantisce i listener anche dopo eventuali re-render/rimpiazzi DOM.
    submitButton.onclick = handleLoginSubmit;
    nameInput.onkeydown = handleLoginNameKeydown;
    nameInput.oninput = handleLoginNameInput;

    submitButton.disabled = false;

    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
        nameInput.value = savedUserName;
    }

}

function handleLoginSubmit() {
    const nameInput = document.getElementById('login-name');
    const submitButton = document.getElementById('login-submit');

    if (!nameInput || !submitButton) {
        return;
    }

    const userName = nameInput.value.trim();

    if (!userName) {
        nameInput.classList.add('is-error');
        nameInput.focus();
        showMessage("Inserisci un nome valido per procedere.");
        return;
    }
    nameInput.classList.remove('is-error');

    // Se l'username è lo stesso di quello salvato, procede direttamente con il login
    const savedUserName = localStorage.getItem('userName');

    if (savedUserName && savedUserName.toLowerCase() === userName.toLowerCase()) {
        showGridPanel();
        return;
    }

    // Se l'username è diverso da quello salvato o non esiste, genera un nuovo token e salva entrambi
    const token = generateToken(userName);

    setLoginLoading(true);
    submitButton.disabled = true;

    login(userName, token)
        .finally(function() {
            setLoginLoading(false);
            localStorage.setItem('userName', userName.trim());
            localStorage.setItem('userToken', token);
            submitButton.disabled = false;
        });

}

function handleLoginNameKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleLoginSubmit();
    }
}

function handleLoginNameInput() {
    const nameInput = document.getElementById('login-name');
    if (nameInput && nameInput.value.trim()) {
        nameInput.classList.remove('is-error');
    }
}

function setLoginLoading(isVisible) {
    const loginLoading = document.getElementById('login-loading');
    if (!loginLoading) {
        return;
    }

    loginLoading.classList.toggle('is-visible', !!isVisible);
    loginLoading.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

function showMessage(message) {
    const modal = document.getElementById('message-modal');
    const modalText = document.getElementById('message-modal-text');

    if (!modal || !modalText) {
        return;
    }

    modalText.textContent = message || 'Si e verificato un errore.';
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');

    const okButton = document.getElementById('message-modal-ok');
    if (okButton) {
        okButton.focus();
    }
}

function hideMessage() {
    const modal = document.getElementById('message-modal');
    if (!modal) {
        return;
    }

    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
}

function generateToken(userName) {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000);
    return `${userName.toLowerCase()}-${timestamp}-${randomNum}`;
}

async function showGridPanel() {

    hideAllPanels();
    document.getElementById('grid-screen').style.display = 'block';

    ptrIndicator = document.getElementById('ptr-indicator');
    ptrText = document.getElementById('ptr-text');

    const feedContainer = document.getElementById('feed');

    // Il feed viene mantenuto sincronizzato con la grid.
    resetFeedPanelState();

    if (tryRestoreGridPanelFromSession(feedContainer)) {
        syncFeedDataWithGridData(gridFeedState.sortedData);
        ensureFeedRenderedCount(Math.max(FEED_PAGE_SIZE, gridFeedState.renderedCount));
        sessionStorage.setItem('lastActivePanel', 'grid');
        console.log("Grid panel restored from sessionStorage.");
        return;
    }

    // Logica per mostrare il pannello del menu
    console.log("Richiesta dati per la galleria a Google Drive...");

    document.getElementById('slideshow-image').style.display = "none"; // Nasconde l'immagine dello slideshow durante l'aggiornamento

    if (feedContainer) {
        feedContainer.innerHTML = "<div class='grid-loading'><span class='loading-spinner' aria-label='Caricamento in corso'></span></div>";
    }

    try {
        const data = await loadFeed();

        if (data.length === 0) {
          showMessage("Nessun elemento presente nella galleria.")
          feedContainer.innerHTML = "<p style='text-align:center;'></p>";
          return;
        }

        if (!Array.isArray(data) || !feedContainer) {
            sessionStorage.setItem('lastActivePanel', 'grid');
            return;
        }

        const sortedData = data.slice().sort(function(a, b) {
            return new Date(b.created).getTime() - new Date(a.created).getTime();
        });

        gridFeedState.sortedData = sortedData;
        syncFeedDataWithGridData(sortedData);
        feedContainer.innerHTML = '';

        appendNextGridPage(feedContainer);
        setupGridInfiniteScroll(feedContainer);
        saveAppStatesToSession();

        // Differito: la grid ha già sottomesso la richiesta per image[0] via stagger 0ms,
        // quindi il slideshow trova la stessa URL già in volo/cache invece di aprire una connessione nuova.
        setTimeout(function() {
            initializeSlideshow(sortedData);
            document.getElementById('slideshow-image').style.display = "block";
            saveAppStatesToSession();
        }, 0);
        
    } catch (error) {
        console.error('Errore in showGridPanel: ', error.message);
        resetSlideshow();
        resetGridPaginationState();
        showMessage(error.message || 'Impossibile caricare la galleria.');
        
        if (feedContainer) {
            feedContainer.innerHTML = "<p style='text-align:center; color:red;'></p>";
        }
    }

    sessionStorage.setItem('lastActivePanel', 'grid');

}


function resetGridPaginationState() {
    if (gridFeedState.observer) {
        gridFeedState.observer.disconnect();
    }

    if (gridFeedState.sentinel && gridFeedState.sentinel.parentNode) {
        gridFeedState.sentinel.parentNode.removeChild(gridFeedState.sentinel);
    }

    gridFeedState.sortedData = [];
    gridFeedState.renderedCount = 0;
    gridFeedState.observer = null;
    gridFeedState.sentinel = null;
    gridFeedState.isAppending = false;
    saveGridFeedStateToSession();
}

function resetSlideshow() {
    if (slideshowState.timerId) {
        window.clearInterval(slideshowState.timerId);
    }

    slideshowState.timerId = null;
    slideshowState.imageUrls = [];
    slideshowState.currentIndex = 0;
    saveSlideshowStateToSession();
}

function transitionSlideshowImage(nextImageUrl) {
    const slideshowImage = document.getElementById('slideshow-image');
    if (!slideshowImage) {
        return;
    }

    slideshowImage.classList.add('is-fading');

    window.setTimeout(function() {
        slideshowImage.src = nextImageUrl;
        window.requestAnimationFrame(function() {
            slideshowImage.classList.remove('is-fading');
        });
    }, 220);
}

function escapeText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeJsSingleQuotedValue(value) {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}

function formatFeedCreatedAt(createdValue) {
    const createdDate = new Date(createdValue);
    if (Number.isNaN(createdDate.getTime())) {
        return '';
    }

    const italyDateFormatter = new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const createdItalyDate = italyDateFormatter.format(createdDate);
    const todayItalyDate = italyDateFormatter.format(new Date());
    const isToday = createdItalyDate === todayItalyDate;

    if (isToday) {
        return createdDate.toLocaleTimeString('it-IT', {
            timeZone: 'Europe/Rome',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return createdDate.toLocaleString('it-IT', {
        timeZone: 'Europe/Rome',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Placeholder: implementa qui la logica reale di conteggio like.
async function getMediaLikesCount(mediaId) {
    return 0;
}

// Placeholder: implementa qui la logica reale di conteggio commenti.
async function getMediaCommentsCount(mediaId) {
    return 0;
}

function initializeSlideshow(sortedData) {
    resetSlideshow();

    const slideshowImage = document.getElementById('slideshow-image');
    if (!slideshowImage || !Array.isArray(sortedData)) {
        return;
    }

    const imageUrls = sortedData
        .filter(function(item) {
            return item && item.src && item.mimeType && item.mimeType.startsWith('image/');
        })
        .slice(0, SLIDESHOW_NUM_IMAGES) // Prendi solo le prime 6 immagini
        .map(function(item) {
            return item.src;
        });

    if (imageUrls.length === 0) {
        slideshowImage.src = 'img/no-image.jpg';
        saveSlideshowStateToSession();
        return;
    }

    slideshowState.imageUrls = imageUrls;
    slideshowState.currentIndex = 0;
    slideshowImage.src = imageUrls[0];
    saveSlideshowStateToSession();

    if (imageUrls.length === 1) {
        return;
    }
    
    // Funzione di slideshow che cambia immagine ogni SLIDESHOW_INTERVAL millisecondi
    slideshowState.timerId = window.setInterval(function() {
        slideshowState.currentIndex = (slideshowState.currentIndex + 1) % slideshowState.imageUrls.length;
        transitionSlideshowImage(slideshowState.imageUrls[slideshowState.currentIndex]);
        saveSlideshowStateToSession();
    }, SLIDESHOW_INTERVAL);
}

function createGalleryItemMarkup(item, index) {
    const safeMediaId = escapeJsSingleQuotedValue(item && item.id ? item.id : '');

    if (item.mimeType && item.mimeType.startsWith('video/')) {
        return `<div class="gallery-item" role="button" tabindex="0" onclick="openFeedPanelFromGridSelection(${index}, '${safeMediaId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openFeedPanelFromGridSelection(${index}, '${safeMediaId}');}"><video src="${item.src}" controls playsinline preload="none"></video></div>`;
    }

    return `<div class="gallery-item" role="button" tabindex="0" onclick="openFeedPanelFromGridSelection(${index}, '${safeMediaId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openFeedPanelFromGridSelection(${index}, '${safeMediaId}');}"><img src="${item.src}" alt="Foto matrimonio" loading="lazy" /></div>`;
}

function appendNextGridPage(feedContainer) {
    if (!feedContainer || gridFeedState.isAppending) {
        return;
    }

    const totalItems = gridFeedState.sortedData.length;
    if (gridFeedState.renderedCount >= totalItems) {
        if (gridFeedState.observer) {
            gridFeedState.observer.disconnect();
            gridFeedState.observer = null;
        }
        return;
    }

    gridFeedState.isAppending = true;

    const start = gridFeedState.renderedCount;
    const end = Math.min(start + GRID_PAGE_SIZE, totalItems);

    console.log(`Caricamento paginato attivato: elementi ${start + 1}-${end} di ${totalItems}`);
   
    const chunkHtml = gridFeedState.sortedData
        .slice(start, end)
        .map(function(item, chunkIndex) {
            return createGalleryItemMarkup(item, start + chunkIndex);
        })
        .join('');

    // Inserisce prima il markup senza src per evitare il burst di richieste concorrenti
    feedContainer.insertAdjacentHTML('beforeend', chunkHtml);

    // Stagger: assegna i src con piccolo ritardo per ridurre richieste simultanee a Drive
    const newItems = feedContainer.querySelectorAll('.gallery-item:not([data-src-loaded]) img[src]');
    newItems.forEach(function(img, i) {
        const src = img.getAttribute('src');
        img.removeAttribute('src');
        img.closest('.gallery-item').setAttribute('data-src-loaded', '1');
        setTimeout(function() { img.src = src; }, i * 80);
    });
    gridFeedState.renderedCount = end;
    ensureFeedRenderedCount(end);
    saveGridFeedStateToSession();

    if (gridFeedState.renderedCount >= totalItems && gridFeedState.observer) {
        gridFeedState.observer.disconnect();
        gridFeedState.observer = null;
    }

    gridFeedState.isAppending = false;
}

function detachGridInfiniteScroll() {
    if (gridFeedState.observer) {
        gridFeedState.observer.disconnect();
        gridFeedState.observer = null;
    }

    if (gridFeedState.sentinel && gridFeedState.sentinel.parentNode) {
        gridFeedState.sentinel.parentNode.removeChild(gridFeedState.sentinel);
    }

    gridFeedState.sentinel = null;
}

function setupGridInfiniteScroll(feedContainer) {
    const totalItems = gridFeedState.sortedData.length;
    if (!feedContainer || totalItems <= GRID_PAGE_SIZE) {
        return;
    }

    detachGridInfiniteScroll();

    const sentinelParent = feedContainer.parentElement || feedContainer;
    const sentinel = document.createElement('div');
    sentinel.id = 'feed-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.width = '100%';
    sentinel.style.height = '1px';
    sentinel.style.margin = '0';
    sentinel.style.opacity = '0';
    sentinel.style.pointerEvents = 'none';
    sentinelParent.appendChild(sentinel);

    gridFeedState.sentinel = sentinel;
    gridFeedState.observer = new IntersectionObserver(function(entries) {
        if (entries[0] && entries[0].isIntersecting) {
            appendNextGridPage(feedContainer);
        }
    }, {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.01
    });

    gridFeedState.observer.observe(sentinel);
}


function resetFeedPanelState() {
    if (feedPanelState.observer) {
        feedPanelState.observer.disconnect();
    }

    if (feedPanelState.sentinel && feedPanelState.sentinel.parentNode) {
        feedPanelState.sentinel.parentNode.removeChild(feedPanelState.sentinel);
    }

    feedPanelState.sortedData = [];
    feedPanelState.renderedCount = 0;
    feedPanelState.observer = null;
    feedPanelState.sentinel = null;
    feedPanelState.isAppending = false;
    feedPanelState.pendingTargetCount = 0;

    const feedList = document.getElementById('feed-post-list');
    if (feedList) {
        feedList.innerHTML = '';
    }
}

function openFeedPanelFromGridSelection(startIndex, mediaId) {
    showFeedPanel(startIndex, mediaId);
}

async function getSortedFeedDataSource() {
    if (Array.isArray(gridFeedState.sortedData) && gridFeedState.sortedData.length > 0) {
        return gridFeedState.sortedData.slice();
    }

    const data = await loadFeed();
    return data.slice().sort(function(a, b) {
        return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
}

function syncFeedDataWithGridData(sortedData) {
    if (!Array.isArray(sortedData)) {
        feedPanelState.sortedData = [];
        feedPanelState.pendingTargetCount = 0;
        return;
    }

    feedPanelState.sortedData = sortedData.slice();
    feedPanelState.pendingTargetCount = Math.min(
        feedPanelState.pendingTargetCount,
        feedPanelState.sortedData.length
    );
}

async function ensureFeedRenderedCount(targetCount) {
    const feedList = document.getElementById('feed-post-list');
    const totalItems = feedPanelState.sortedData.length;

    if (!feedList || totalItems === 0) {
        return;
    }

    const normalizedTarget = Math.max(0, Math.min(Number(targetCount) || 0, totalItems));
    feedPanelState.pendingTargetCount = Math.max(feedPanelState.pendingTargetCount, normalizedTarget);

    if (feedPanelState.isAppending) {
        return;
    }

    while (feedPanelState.renderedCount < feedPanelState.pendingTargetCount) {
        await appendNextFeedPage(feedList);

        // Sicurezza anti-loop in caso di append bloccato/non avanzante.
        if (feedPanelState.renderedCount >= totalItems) {
            break;
        }
    }
}

function createFeedMediaMarkup(item) {
    if (item && item.mimeType && item.mimeType.startsWith('video/')) {
        return `<video src="${item.src}" controls playsinline preload="none"></video>`;
    }

    return `<img src="${item.src}" alt="Post matrimonio" loading="lazy" />`;
}

async function createFeedPostMarkup(item, absoluteIndex) {
    const safeCaption = escapeText(item && item.caption ? item.caption : 'Ospite');
    const mediaMarkup = createFeedMediaMarkup(item);
    const createdAtLabel = formatFeedCreatedAt(item && item.created ? item.created : null);
    const createdAtMarkup = createdAtLabel
        ? `<div class="feed-post-date">${escapeText(createdAtLabel)}</div>`
        : '';

    let likesCount = 0;
    let commentsCount = 0;

    try {
        const counts = await Promise.all([
            getMediaLikesCount(item.id),
            getMediaCommentsCount(item.id)
        ]);

        likesCount = Number.isFinite(Number(counts[0])) ? Number(counts[0]) : 0;
        commentsCount = Number.isFinite(Number(counts[1])) ? Number(counts[1]) : 0;
    } catch (error) {
        console.warn('Impossibile caricare like/commenti per il media:', item && item.id, error);
    }

    return `
        <article class="feed-post" data-media-id="${escapeText(item && item.id ? item.id : '')}" data-feed-index="${absoluteIndex}">
            <header class="feed-post-header">
                <img class="feed-post-avatar" src="img/profilo.jpg" alt="Profilo" loading="lazy" />
                <span class="feed-post-user">${safeCaption}</span>
            </header>
            <div class="feed-post-media">${mediaMarkup}</div>
            <footer class="feed-post-meta">
                <span class="feed-post-stat"><i class="fa fa-heart-o" aria-hidden="true"></i><span>${likesCount}</span></span>
                <span class="feed-post-stat"><i class="fa fa-comment-o" aria-hidden="true"></i><span>${commentsCount}</span></span>
            </footer>
            ${createdAtMarkup}
        </article>
    `;
}

async function appendNextFeedPage(feedList) {
    if (!feedList || feedPanelState.isAppending) {
        return;
    }

    const totalItems = feedPanelState.sortedData.length;
    if (feedPanelState.renderedCount >= totalItems) {
        if (feedPanelState.observer) {
            feedPanelState.observer.disconnect();
            feedPanelState.observer = null;
        }
        return;
    }

    feedPanelState.isAppending = true;

    try {
        const start = feedPanelState.renderedCount;
        const end = Math.min(start + FEED_PAGE_SIZE, totalItems);
        const itemsChunk = feedPanelState.sortedData.slice(start, end);
        const postsHtml = await Promise.all(itemsChunk.map(function(item, chunkIndex) {
            return createFeedPostMarkup(item, start + chunkIndex);
        }));

        feedList.insertAdjacentHTML('beforeend', postsHtml.join(''));
        feedPanelState.renderedCount = end;

        if (feedPanelState.renderedCount >= totalItems && feedPanelState.observer) {
            feedPanelState.observer.disconnect();
            feedPanelState.observer = null;
        }
    } finally {
        feedPanelState.isAppending = false;
    }
}

function scrollToFeedIndex(feedList, targetIndex) {
    if (!feedList || !Number.isInteger(targetIndex) || targetIndex < 0) {
        return false;
    }

    const targetPost = feedList.querySelector(`[data-feed-index="${targetIndex}"]`);
    if (!targetPost) {
        return false;
    }

    const feedScreen = document.getElementById('feed-screen');
    if (!feedScreen) {
        targetPost.scrollIntoView({ block: 'start', behavior: 'auto' });
        return true;
    }

    // Scroll il container reale (non il window) per compatibilità mobile
    const headerEl = feedScreen.querySelector('.feed-header');
    const headerHeight = headerEl ? headerEl.offsetHeight : 0;
    const postTop = targetPost.getBoundingClientRect().top
        - feedScreen.getBoundingClientRect().top
        + feedScreen.scrollTop;
    feedScreen.scrollTop = postTop - headerHeight;

    return true;
}

function findFeedPostByMediaId(feedList, targetMediaId) {
    if (!feedList || !targetMediaId) {
        return null;
    }

    const mediaIdString = String(targetMediaId);
    const posts = feedList.querySelectorAll('[data-media-id]');
    for (let i = 0; i < posts.length; i += 1) {
        const currentPost = posts[i];
        if (currentPost.getAttribute('data-media-id') === mediaIdString) {
            return currentPost;
        }
    }

    return null;
}

function scrollToFeedMediaId(feedList, targetMediaId) {
    const targetPost = findFeedPostByMediaId(feedList, targetMediaId);
    if (!targetPost) {
        return false;
    }

    const feedScreen = document.getElementById('feed-screen');
    if (!feedScreen) {
        targetPost.scrollIntoView({ block: 'start', behavior: 'auto' });
        return true;
    }

    const headerEl = feedScreen.querySelector('.feed-header');
    const headerHeight = headerEl ? headerEl.offsetHeight : 0;
    const postTop = targetPost.getBoundingClientRect().top
        - feedScreen.getBoundingClientRect().top
        + feedScreen.scrollTop;
    feedScreen.scrollTop = postTop - headerHeight;

    return true;
}

function getFeedTargetPost(feedList, targetIndex, targetMediaId) {
    return findFeedPostByMediaId(feedList, targetMediaId)
        || (feedList ? feedList.querySelector(`[data-feed-index="${targetIndex}"]`) : null);
}

function alignFeedTargetPost(feedList, targetIndex, targetMediaId) {
    return scrollToFeedMediaId(feedList, targetMediaId)
        || scrollToFeedIndex(feedList, targetIndex);
}

function scrollToFeedIndexStable(feedList, targetIndex, targetMediaId) {
    // Un solo allineamento dopo il render del layout: nessun riallineamento successivo.
    window.requestAnimationFrame(function() {
        window.requestAnimationFrame(function() {
            alignFeedTargetPost(feedList, targetIndex, targetMediaId);
        });
    });
}

function detachFeedInfiniteScroll() {
    if (feedPanelState.observer) {
        feedPanelState.observer.disconnect();
        feedPanelState.observer = null;
    }

    if (feedPanelState.sentinel && feedPanelState.sentinel.parentNode) {
        feedPanelState.sentinel.parentNode.removeChild(feedPanelState.sentinel);
    }

    feedPanelState.sentinel = null;
}

function detachFeedInfiniteScrollActivationListeners() {
    if (typeof detachFeedInfiniteScrollActivation === 'function') {
        detachFeedInfiniteScrollActivation();
    }
    detachFeedInfiniteScrollActivation = null;
}

function setupFeedInfiniteScrollOnUserInteraction(feedScreen, feedList) {
    const totalItems = feedPanelState.sortedData.length;
    if (!feedScreen || !feedList || totalItems <= FEED_PAGE_SIZE) {
        return;
    }

    detachFeedInfiniteScrollActivationListeners();

    let activated = false;
    const activate = function() {
        if (activated) {
            return;
        }
        activated = true;
        detachFeedInfiniteScrollActivationListeners();
        setupFeedInfiniteScroll(feedList);
    };

    const touchHandler = function() {
        activate();
    };
    const wheelHandler = function() {
        activate();
    };
    const keyHandler = function(event) {
        const key = event && event.key ? event.key : '';
        if (key === 'ArrowDown' || key === 'PageDown' || key === ' ' || key === 'End') {
            activate();
        }
    };

    feedScreen.addEventListener('touchstart', touchHandler, { passive: true });
    feedScreen.addEventListener('wheel', wheelHandler, { passive: true });
    feedScreen.addEventListener('keydown', keyHandler);

    detachFeedInfiniteScrollActivation = function() {
        feedScreen.removeEventListener('touchstart', touchHandler);
        feedScreen.removeEventListener('wheel', wheelHandler);
        feedScreen.removeEventListener('keydown', keyHandler);
    };
}

function setupFeedInfiniteScroll(feedList) {
    const totalItems = feedPanelState.sortedData.length;
    if (!feedList || totalItems <= FEED_PAGE_SIZE) {
        return;
    }

    detachFeedInfiniteScroll();

    const sentinelParent = feedList.parentElement || feedList;
    const sentinel = document.createElement('div');
    sentinel.id = 'feed-post-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.width = '100%';
    sentinel.style.height = '1px';
    sentinel.style.margin = '0';
    sentinel.style.opacity = '0';
    sentinel.style.pointerEvents = 'none';
    sentinelParent.appendChild(sentinel);

    feedPanelState.sentinel = sentinel;
    feedPanelState.observer = new IntersectionObserver(function(entries) {
        if (entries[0] && entries[0].isIntersecting) {
            appendNextFeedPage(feedList);
        }
    }, {
        root: document.getElementById('feed-screen'), // scroll container reale
        rootMargin: '240px 0px',
        threshold: 0.01
    });

    feedPanelState.observer.observe(sentinel);
}

async function showFeedPanel(startIndex, startMediaId) {
    hideAllPanels();
    sessionStorage.setItem('lastActivePanel', 'feed');

    const feedScreen = document.getElementById('feed-screen');
    const feedList = document.getElementById('feed-post-list');
    if (!feedScreen || !feedList) {
        return;
    }

    feedScreen.style.display = 'block';

    try {
        let sortedData = Array.isArray(feedPanelState.sortedData) && feedPanelState.sortedData.length > 0
            ? feedPanelState.sortedData
            : null;

        if (!sortedData) {
            sortedData = await getSortedFeedDataSource();
            syncFeedDataWithGridData(sortedData);
            const firstTargetCount = Math.max(FEED_PAGE_SIZE, gridFeedState.renderedCount || 0);
            await ensureFeedRenderedCount(firstTargetCount);
        }

        if (!Array.isArray(sortedData) || sortedData.length === 0) {
            feedList.innerHTML = "<p class='feed-empty'>Nessun elemento presente nella galleria.</p>";
            return;
        }

        syncFeedDataWithGridData(sortedData);

        let normalizedStartIndex = Number.isInteger(startIndex) && startIndex >= 0 && startIndex < sortedData.length
            ? startIndex
            : 0;

        const requestedMediaId = startMediaId || '';
        if (requestedMediaId) {
            const mediaIdIndex = sortedData.findIndex(function(item) {
                return String(item && item.id ? item.id : '') === String(requestedMediaId);
            });

            if (mediaIdIndex >= 0) {
                normalizedStartIndex = mediaIdIndex;
            }
        }

        const requiredItems = Math.max(
            FEED_PAGE_SIZE,
            Math.min(
                sortedData.length,
                (Math.floor(normalizedStartIndex / FEED_PAGE_SIZE) + 1) * FEED_PAGE_SIZE
            )
        );

        await ensureFeedRenderedCount(requiredItems);

        scrollToFeedIndexStable(feedList, normalizedStartIndex, requestedMediaId);
        setupFeedInfiniteScrollOnUserInteraction(feedScreen, feedList);
    } catch (error) {
        console.error('Errore in showFeedPanel:', error && error.message ? error.message : error);
        feedList.innerHTML = "<p class='feed-empty'>Impossibile caricare il feed.</p>";
        showMessage(error && error.message ? error.message : 'Impossibile caricare il feed.');
    }
}

function showUploadPanel() {
    hideAllPanels();
    sessionStorage.setItem('lastActivePanel', 'upload');
    document.getElementById('upload-screen').style.display = 'block';
    renderSelectedFilesGrid();
}

function hideAllPanels() {

    detachFeedInfiniteScrollActivationListeners();

    // Evita accumulo observer/sentinel al cambio pannello.
    detachGridInfiniteScroll();
    detachFeedInfiniteScroll();

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('grid-screen').style.display = 'none';
    document.getElementById('upload-screen').style.display = 'none';
    document.getElementById('feed-screen').style.display = 'none';
}


function login(username, token) {
    console.log("Tentativo di login per utente:", username);
    
    return glogin(username, token)
        .then(() => {
            console.log("Login riuscito per utente:", username);
            showGridPanel();
        })
        .catch((error) => {
            console.error("Errore durante il login:", error.message);
            showMessage("Errore durante il login: " + error.message);
            showLoginPanel();
        });

}

function showSelectedFiles() {

    const fileInput = document.getElementById('fileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showMessage("Nessun file selezionato. Seleziona almeno un file prima di caricare.");
        return;
    }

    const newFiles = Array.from(fileInput.files);
    const oversizedFiles = newFiles.filter(function(file) {
        return file && file.size > MAX_FILE_SIZE_BYTES;
    });

    const validNewFiles = newFiles.filter(function(file) {
        return file && file.size <= MAX_FILE_SIZE_BYTES;
    });

    if (oversizedFiles.length > 0) {
        showMessage("Uno o piu file superano la dimensione massima di 10 MB.");
    }

    const mergedFiles = selectedFiles.concat(validNewFiles);

    if (mergedFiles.length > MAX_SELECTED_FILES) {
        showMessage("Puoi selezionare al massimo 4 file alla volta.");
    }

    selectedFiles = mergedFiles.slice(0, MAX_SELECTED_FILES);
    fileInput.value = '';

    if (selectedFiles.length === 0) {
        return;
    }

    showUploadPanel();

}

function removeSelectedFile(index) {
    if (!Number.isInteger(index) || index < 0 || index >= selectedFiles.length) {
        return;
    }

    selectedFiles.splice(index, 1);
    renderSelectedFilesGrid();
}

function renderSelectedFilesGrid() {
    const grid = document.getElementById('upload-preview-grid');
    const counter = document.getElementById('upload-counter');
    const uploadSubmitButton = document.getElementById('upload-submitBtn');

    if (!grid || !counter || !uploadSubmitButton) {
        return;
    }

    uploadSubmitButton.disabled = selectedFiles.length === 0;
    counter.textContent = `${selectedFiles.length} / ${MAX_SELECTED_FILES} file selezionati`;

    if (selectedFiles.length === 0) {
        grid.innerHTML = '<div class="upload-empty">Tocca "Aggiungi" per scegliere foto o video.</div>';
        return;
    }

    const markup = selectedFiles.map(function(file, index) {
        const previewUrl = URL.createObjectURL(file);
        const isVideo = file.type && file.type.startsWith('video/');
        const media = isVideo
            ? `<video src="${previewUrl}" controls playsinline preload="metadata"></video>`
            : `<img src="${previewUrl}" alt="Anteprima file selezionato" loading="lazy" />`;

        return `<div class="upload-card">${media}<button class="upload-remove" type="button" onclick="removeSelectedFile(${index})" aria-label="Rimuovi file">X</button></div>`;
    }).join('');

    grid.innerHTML = markup;
}

async function handleUploadSelectedFiles() {
    if (!Array.isArray(selectedFiles) || selectedFiles.length === 0) {
        showMessage("Nessun file selezionato. Aggiungi almeno un file.");
        return;
    }

    const oversizedFiles = selectedFiles.filter(function(file) {
        return file && file.size > MAX_FILE_SIZE_BYTES;
    });

    if (oversizedFiles.length > 0) {
        showMessage("Uno o piu file superano la dimensione massima di 10 MB.");
        return;
    }

    const uploadSubmitButton = document.getElementById('upload-submitBtn');
    const uploadSubmitLabel = uploadSubmitButton ? uploadSubmitButton.querySelector('.upload-submit-label') : null;
    const originalLabel = uploadSubmitLabel ? uploadSubmitLabel.textContent : 'Carica media';

    if (uploadSubmitButton) {
        uploadSubmitButton.disabled = true;
        uploadSubmitButton.classList.add('is-loading');
        uploadSubmitButton.setAttribute('aria-busy', 'true');
    }

    if (uploadSubmitLabel) {
        uploadSubmitLabel.textContent = 'Caricamento in corso...';
    }

    try {
        await uploadMedia(selectedFiles, localStorage.getItem('userName'));
        selectedFiles = [];
        renderSelectedFilesGrid();
        showMessage('File caricati con successo.');

        // Reset dello stato della Grid e dello Slideshow
        resetGridPaginationState();
        resetSlideshow();
        
        showGridPanel();
    } catch (error) {
        const uploadError = error && error.message ? error.message : 'Errore durante il caricamento dei file.';
        showMessage(uploadError);
    } finally {
        if (uploadSubmitLabel) {
            uploadSubmitLabel.textContent = originalLabel;
        }

        if (uploadSubmitButton) {
            uploadSubmitButton.classList.remove('is-loading');
            uploadSubmitButton.setAttribute('aria-busy', 'false');
            uploadSubmitButton.disabled = selectedFiles.length === 0;
        }
    }
}

