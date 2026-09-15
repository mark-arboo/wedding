const SLIDESHOW_INTERVAL = 5000; // Intervallo di 5 secondi per lo slideshow
const SLIDESHOW_NUM_IMAGES = 4; // Numero massimo di immagini da mostrare nello slideshow
const GRID_PAGE_SIZE = 6;
const gridFeedState = {
    media: [],
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

const GRID_FEED_STATE_KEY = 'gridFeedState';
const SLIDESHOW_STATE_KEY = 'slideshowState';
const DETAIL_STATE_KEY = 'detailScreenState';
const MAX_SELECTED_FILES = 4;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const likeCache = {};
const commentCache = {};
const commentListCache = {};

let selectedFiles = []; // Array per memorizzare i file selezionati per l'upload


let startY = 0;
let currentY = 0;
let isPulling = false;
const PULL_THRESHOLD = 80; // Pixel di trascinamento necessari per attivare l'azione

let ptrIndicator;
let ptrText;

const detailSwipeState = {
    startY: 0,
    currentY: 0,
    isDragging: false
};


const LIKE_SUMMARY_STORAGE_KEY = 'wedding-like-summary';
const COMMENT_SUMMARY_STORAGE_KEY = 'wedding-comment-summary';



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
    loadLikeCacheFromStorage();

    const nameInput = document.getElementById('login-name');
    const submitButton = document.getElementById('login-submit');

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
        media: Array.isArray(gridFeedState.media) ? gridFeedState.media : [],
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

        if (!parsedGridState || !Array.isArray(parsedGridState.media)) {
            return null;
        }

        if (!parsedSlideshowState || !Array.isArray(parsedSlideshowState.imageUrls)) {
            return null;
        }

        if (parsedGridState.media.length === 0 && parsedSlideshowState.imageUrls.length === 0) {
            return null;
        }

        return {
            grid: {
                media: parsedGridState.media,
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

    gridFeedState.media = sessionStates.grid.media;
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

    if (gridFeedState.media.length === 0) {
        feedContainer.innerHTML = "<p style='text-align:center;'>Nessun elemento presente nella galleria.</p>";
        initializeSlideshow([]);
        saveAppStatesToSession();
        return true;
    }

    feedContainer.innerHTML = '';
    appendNextGridPage(feedContainer);
    setupGridInfiniteScroll(feedContainer);
    setTimeout(function() {
        initializeSlideshow(gridFeedState.media);
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
            case 'detail':
                restoreDetailScreenFromSession();
                break;
            default:
                showLoginPanel();
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

    if (userName.length > 50) {
        nameInput.classList.add('is-error');
        nameInput.focus();
        showMessage("Il nome può contenere al massimo 50 caratteri.");
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
        .then(function() {
            localStorage.setItem('userName', userName.trim());
            localStorage.setItem('userToken', token);
        })
        .finally(function() {
            setLoginLoading(false);
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
    
    await ensureLikedMediaIdsForCurrentUser();

    if (tryRestoreGridPanelFromSession(feedContainer)) {
        sessionStorage.setItem('lastActivePanel', 'grid');
        console.log("Grid panel restored from sessionStorage.");
        return;
    }

    // Logica per mostrare il pannello del menu
    console.log("Richiesta dati per la galleria al server...");

    document.getElementById('slideshow-image').style.display = "none"; // Nasconde l'immagine dello slideshow durante l'aggiornamento

    if (feedContainer) {
        feedContainer.innerHTML = "<div class='grid-loading'><span class='loading-spinner' aria-label='Caricamento in corso'></span></div>";
    }

    try {

        const data = await loadImages();

        if (data.length === 0) {
          showMessage("Nessun elemento presente nella galleria.")
          feedContainer.innerHTML = "<p style='text-align:center;'></p>";
          return;
        }

        if (!Array.isArray(data) || !feedContainer) {
            sessionStorage.setItem('lastActivePanel', 'grid');
            return;
        }

        const mediaItems = Array.isArray(data) ? data : [];

        try {
            const bulkLikeSummary = await getBulkLikes();
            syncLikeSummaryForMedia(mediaItems, bulkLikeSummary);
            refreshSlideshowFromGrid();
        } catch (error) {
            console.warn('Impossibile caricare il riepilogo bulk dei like:', error);
        }

        try {
            const bulkCommentSummary = await getBulkComments();
            syncCommentSummaryForMedia(mediaItems, bulkCommentSummary);
        } catch (error) {
            console.warn('Impossibile caricare il riepilogo bulk dei commenti:', error);
        }

        gridFeedState.media = mediaItems;
        feedContainer.innerHTML = '';

        appendNextGridPage(feedContainer);
        setupGridInfiniteScroll(feedContainer);
        saveAppStatesToSession();

        // Differito: la grid ha già sottomesso la richiesta per image[0] via stagger 0ms,
        // quindi il slideshow trova la stessa URL già in volo/cache invece di aprire una connessione nuova.
        setTimeout(function() {
            initializeSlideshow(mediaItems);
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

    gridFeedState.media = [];
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

function getThumbnailMediaImageUrl(item) {
    if (!item) {
        return '';
    }

    return item.thumbnailUrl || item.src || '';
}

function refreshSlideshowFromGrid() {
    if (!Array.isArray(gridFeedState.media) || gridFeedState.media.length === 0) {
        resetSlideshow();
        return;
    }

    initializeSlideshow(gridFeedState.media);
}

function initializeSlideshow(sortedData) {
    resetSlideshow();

    const slideshowImage = document.getElementById('slideshow-image');
    if (!slideshowImage || !Array.isArray(sortedData)) {
        return;
    }

    const rankedImageItems = sortedData
        .map(function(item, index) {
            const mediaUrl = getThumbnailMediaImageUrl(item);
            if (!item || !mediaUrl || !item.mimeType || !item.mimeType.startsWith('image/')) {
                return null;
            }

            const mediaCode = getMediaCode(item);
            const likeCount = Number(
                getLikeCountByCode(mediaCode)
                || Number(item.likeCount || item.likes || 0)
                || 0
            );

            return {
                index: index,
                item: item,
                likeCount: likeCount,
                mediaUrl: mediaUrl
            };
        })
        .filter(Boolean);

    const hasLikedImages = rankedImageItems.some(function(entry) {
        return entry.likeCount > 0;
    });

    const selectedImageItems = rankedImageItems
        .sort(function(a, b) {
            if (hasLikedImages) {
                return b.likeCount - a.likeCount || a.index - b.index;
            }
            return a.index - b.index;
        })
        .slice(0, SLIDESHOW_NUM_IMAGES);

    const imageUrls = selectedImageItems.map(function(entry) {
        return entry.mediaUrl;
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
    const mediaUrl = getThumbnailMediaImageUrl(item);

    if (item && item.mimeType && item.mimeType.startsWith('video/')) {
        return `
            <div class="gallery-item gallery-item--video" data-media-index="${index}">
                <img src="${mediaUrl}" alt="Video matrimonio" loading="lazy" />
                <div class="gallery-video-overlay" aria-hidden="true">
                    <span class="gallery-video-play"></span>
                </div>
            </div>
        `;
    }

    return `<div class="gallery-item" data-media-index="${index}"><img src="${mediaUrl}" alt="Foto matrimonio" loading="lazy" /></div>`;
}

function bindGridItemClicks(feedContainer) {
    if (!feedContainer) {
        return;
    }

    const cards = feedContainer.querySelectorAll('.gallery-item');
    cards.forEach(function(card) {
        card.onclick = function() {
            const index = Number(card.dataset.mediaIndex);
            if (!Number.isInteger(index)) {
                return;
            }

            const item = gridFeedState.media[index];
            if (item) {
                showDetailScreen(item);
            }
        };
    });
}

function appendNextGridPage(feedContainer) {
    if (!feedContainer || gridFeedState.isAppending) {
        return;
    }

    const totalItems = gridFeedState.media.length;
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
   
    const chunkHtml = gridFeedState.media
        .slice(start, end)
        .map(function(item, index) {
            return createGalleryItemMarkup(item, start + index);
        })
        .join('');

    // Inserisce prima il markup senza src per evitare il burst di richieste concorrenti
    feedContainer.insertAdjacentHTML('beforeend', chunkHtml);
    bindGridItemClicks(feedContainer);

    // Stagger: assegna i src con piccolo ritardo per ridurre richieste simultanee al server
    const newItems = feedContainer.querySelectorAll('.gallery-item:not([data-src-loaded]) img[src]');
    newItems.forEach(function(img, i) {
        const src = img.getAttribute('src');
        img.removeAttribute('src');
        img.closest('.gallery-item').setAttribute('data-src-loaded', '1');
        setTimeout(function() { img.src = src; }, i * 80);
    });
    gridFeedState.renderedCount = end;
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
    const totalItems = gridFeedState.media.length;
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

function getMediaDetailSource(item) {
    if (!item) {
        return '';
    }

    if (item.mimeType && item.mimeType.startsWith('video/')) {
        return item.originalUrl || item.src || item.previewUrl || item.thumbnailUrl || '';
    }

    return item.previewUrl || item.thumbnailUrl || item.src || '';
}

function formatMediaDate(dateValue) {
    if (!dateValue) {
        return '';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getDetailMediaIndexByItem(mediaItem) {
    if (!Array.isArray(gridFeedState.media) || !mediaItem) {
        return 0;
    }

    const index = gridFeedState.media.findIndex(function(item) {
        return item === mediaItem;
    });

    return index >= 0 ? index : 0;
}

function showDetailMediaByIndex(targetIndex) {
    if (!Array.isArray(gridFeedState.media) || gridFeedState.media.length === 0) {
        return;
    }

    const maxIndex = gridFeedState.media.length - 1;
    const clampedIndex = Math.min(Math.max(targetIndex, 0), maxIndex);

    if (clampedIndex !== targetIndex) {
        return;
    }

    const nextMediaItem = gridFeedState.media[clampedIndex];
    if (nextMediaItem) {
        showDetailScreen(nextMediaItem, clampedIndex);
    }
}

function bindDetailSwipeNavigation(detailScreen) {
    if (!detailScreen) {
        return;
    }

    detailScreen.removeEventListener('touchstart', detailScreen._detailTouchStartHandler);
    detailScreen.removeEventListener('touchmove', detailScreen._detailTouchMoveHandler);
    detailScreen.removeEventListener('touchend', detailScreen._detailTouchEndHandler);
    detailScreen.removeEventListener('touchcancel', detailScreen._detailTouchEndHandler);

    detailScreen._detailTouchStartHandler = function(event) {
        if (!event || !event.touches || event.touches.length === 0) {
            return;
        }

        const target = event.target;
        if (target && target.closest && target.closest('button')) {
            return;
        }

        detailSwipeState.startY = event.touches[0].clientY;
        detailSwipeState.currentY = detailSwipeState.startY;
        detailSwipeState.isDragging = true;
    };

    detailScreen._detailTouchMoveHandler = function(event) {
        if (!detailSwipeState.isDragging || !event || !event.touches || event.touches.length === 0) {
            return;
        }

        detailSwipeState.currentY = event.touches[0].clientY;
    };

    detailScreen._detailTouchEndHandler = function() {
        if (!detailSwipeState.isDragging) {
            return;
        }

        const deltaY = detailSwipeState.currentY - detailSwipeState.startY;
        if (Math.abs(deltaY) > 80) {
            const currentIndex = Number(detailScreen.dataset.mediaIndex || 0);
            const lastIndex = gridFeedState.media.length - 1;

            if (currentIndex === 0 && deltaY > 0) {
                detailSwipeState.startY = 0;
                detailSwipeState.currentY = 0;
                detailSwipeState.isDragging = false;
                return;
            }

            if (currentIndex === lastIndex && deltaY < 0) {
                detailSwipeState.startY = 0;
                detailSwipeState.currentY = 0;
                detailSwipeState.isDragging = false;
                return;
            }

            showDetailMediaByIndex(currentIndex + (deltaY < 0 ? 1 : -1));
        }

        detailSwipeState.startY = 0;
        detailSwipeState.currentY = 0;
        detailSwipeState.isDragging = false;
    };

    detailScreen.addEventListener('touchstart', detailScreen._detailTouchStartHandler, { passive: true });
    detailScreen.addEventListener('touchmove', detailScreen._detailTouchMoveHandler, { passive: true });
    detailScreen.addEventListener('touchend', detailScreen._detailTouchEndHandler, { passive: true });
    detailScreen.addEventListener('touchcancel', detailScreen._detailTouchEndHandler, { passive: true });
}

function getMediaCode(mediaItem) {
    if (!mediaItem) {
        return null;
    }

    return mediaItem.codice || mediaItem.id || mediaItem.mediaId || mediaItem.code || mediaItem.name || null;
}

function saveDetailScreenState(mediaItem, mediaIndex) {
    if (!mediaItem) {
        return;
    }

    const detailState = {
        mediaCode: String(getMediaCode(mediaItem) || ''),
        mediaIndex: Number.isInteger(mediaIndex) ? mediaIndex : getDetailMediaIndexByItem(mediaItem)
    };

    sessionStorage.setItem(DETAIL_STATE_KEY, JSON.stringify(detailState));
}

function restoreDetailScreenFromSession() {
    const rawDetailState = sessionStorage.getItem(DETAIL_STATE_KEY);
    if (!rawDetailState) {
        showGridPanel();
        return;
    }

    try {
        const detailState = JSON.parse(rawDetailState);
        const mediaCode = detailState && detailState.mediaCode ? String(detailState.mediaCode) : null;
        const mediaIndex = detailState && Number.isInteger(detailState.mediaIndex) ? detailState.mediaIndex : 0;

        if (!mediaCode) {
            showGridPanel();
            return;
        }

        const mediaItem = Array.isArray(gridFeedState.media)
            ? gridFeedState.media.find(function(item) {
                return String(getMediaCode(item)) === mediaCode;
            })
            : null;

        if (mediaItem) {
            showDetailScreen(mediaItem, mediaIndex);
            return;
        }

        showGridPanel();
    } catch (error) {
        console.warn('Dettaglio non ripristinabile da sessionStorage:', error);
        showGridPanel();
    }
}

function getCurrentUserStorageKey() {
    const userName = (localStorage.getItem('userName') || 'guest').trim().toLowerCase();
    return `wedding-liked-media-${userName}`;
}



function loadLikeCacheFromStorage() {
    try {
        const storedValue = sessionStorage.getItem(LIKE_SUMMARY_STORAGE_KEY);
        if (!storedValue) {
            return;
        }

        const parsedValue = JSON.parse(storedValue);
        if (!parsedValue || typeof parsedValue !== 'object') {
            return;
        }

        Object.keys(likeCache).forEach(function(key) {
            delete likeCache[key];
        });

        Object.keys(parsedValue).forEach(function(key) {
            likeCache[key] = Number(parsedValue[key]) || 0;
        });
    } catch (error) {
        console.warn('Errore nel recupero della cache like dal sessionStorage:', error);
    }
}

function saveLikeCacheToStorage() {
    sessionStorage.setItem(LIKE_SUMMARY_STORAGE_KEY, JSON.stringify(likeCache));
}

function loadCommentCacheFromStorage() {
    try {
        const storedValue = sessionStorage.getItem(COMMENT_SUMMARY_STORAGE_KEY);
        if (!storedValue) {
            return;
        }

        const parsedValue = JSON.parse(storedValue);
        if (!parsedValue || typeof parsedValue !== 'object') {
            return;
        }

        Object.keys(commentCache).forEach(function(key) {
            delete commentCache[key];
        });

        Object.keys(parsedValue).forEach(function(key) {
            commentCache[key] = Number(parsedValue[key]) || 0;
        });
    } catch (error) {
        console.warn('Errore nel recupero della cache commenti dal sessionStorage:', error);
    }
}

function saveCommentCacheToStorage() {
    sessionStorage.setItem(COMMENT_SUMMARY_STORAGE_KEY, JSON.stringify(commentCache));
}

function normalizeCommentCacheKey(mediaCode) {
    return String(mediaCode || '').trim();
}

function getCachedCommentsByCode(mediaCode) {
    const key = normalizeCommentCacheKey(mediaCode);
    if (!key || !Object.prototype.hasOwnProperty.call(commentListCache, key)) {
        console.debug('[comments cache] miss per codice', key);
        return null;
    }

    const cachedValue = commentListCache[key];
    if (!Array.isArray(cachedValue)) {
        console.debug('[comments cache] entry non valida, rimuovo chiave', key);
        delete commentListCache[key];
        return null;
    }

    console.debug('[comments cache] hit per codice', key, 'numero commenti:', cachedValue.length);
    return cachedValue.slice();
}

function setCachedCommentsByCode(mediaCode, comments) {
    const key = normalizeCommentCacheKey(mediaCode);
    if (!key) {
        return;
    }

    const normalizedComments = Array.isArray(comments) ? comments.slice() : [];
    commentListCache[key] = normalizedComments;
    console.debug('[comments cache] salva in cache per codice', key, 'numero commenti:', normalizedComments.length);
}

function clearCommentListCacheForCode(mediaCode) {
    const key = normalizeCommentCacheKey(mediaCode);
    if (key && Object.prototype.hasOwnProperty.call(commentListCache, key)) {
        delete commentListCache[key];
        console.debug('[comments cache] svuota cache per codice', key, 'dopo inserimento nuovo commento');
    }
}

function clearCommentListCache() {
    console.debug('[comments cache] svuota cache completa');
    Object.keys(commentListCache).forEach(function(key) {
        delete commentListCache[key];
    });
}

function getLikeSummaryFromStorage() {
    try {
        const storedValue = sessionStorage.getItem(LIKE_SUMMARY_STORAGE_KEY);
        if (!storedValue) {
            return [];
        }

        const parsedValue = JSON.parse(storedValue);
        if (!parsedValue) {
            return [];
        }

        if (Array.isArray(parsedValue)) {
            return parsedValue.map(function(item) {
                return {
                    codice: String(item && item.codice || ''),
                    likeCount: Number(item && item.likeCount) || 0
                };
            }).filter(function(item) {
                return !!item.codice;
            });
        }

        if (typeof parsedValue !== 'object') {
            return [];
        }

        return Object.keys(parsedValue).map(function(key) {
            return {
                codice: String(key),
                likeCount: Number(parsedValue[key]) || 0
            };
        });
    } catch (error) {
        console.warn('Errore nel recupero del riepilogo like dal sessionStorage:', error);
        return [];
    }
}

function saveLikeSummaryToStorage(summaryList) {
    if (!Array.isArray(summaryList)) {
        return;
    }

    const cacheObject = {};
    summaryList.forEach(function(item) {
        if (item && item.codice) {
            cacheObject[String(item.codice)] = Number(item.likeCount) || 0;
        }
    });

    Object.keys(likeCache).forEach(function(key) {
        delete likeCache[key];
    });
    Object.keys(cacheObject).forEach(function(key) {
        likeCache[key] = Number(cacheObject[key]) || 0;
    });

    sessionStorage.setItem(LIKE_SUMMARY_STORAGE_KEY, JSON.stringify(cacheObject));
}

function getCommentSummaryFromStorage() {
    try {
        const storedValue = sessionStorage.getItem(COMMENT_SUMMARY_STORAGE_KEY);
        if (!storedValue) {
            return [];
        }

        const parsedValue = JSON.parse(storedValue);
        if (!parsedValue) {
            return [];
        }

        if (Array.isArray(parsedValue)) {
            return parsedValue.map(function(item) {
                return {
                    codice: String(item && item.codice || ''),
                    commentCount: Number(item && item.commentCount) || 0
                };
            }).filter(function(item) {
                return !!item.codice;
            });
        }

        if (typeof parsedValue !== 'object') {
            return [];
        }

        return Object.keys(parsedValue).map(function(key) {
            return {
                codice: String(key),
                commentCount: Number(parsedValue[key]) || 0
            };
        });
    } catch (error) {
        console.warn('Errore nel recupero del riepilogo commenti dal sessionStorage:', error);
        return [];
    }
}

function saveCommentSummaryToStorage(summaryList) {
    if (!Array.isArray(summaryList)) {
        return;
    }

    const cacheObject = {};
    summaryList.forEach(function(item) {
        if (item && item.codice) {
            cacheObject[String(item.codice)] = Number(item.commentCount) || 0;
        }
    });

    Object.keys(commentCache).forEach(function(key) {
        delete commentCache[key];
    });
    Object.keys(cacheObject).forEach(function(key) {
        commentCache[key] = Number(cacheObject[key]) || 0;
    });

    sessionStorage.setItem(COMMENT_SUMMARY_STORAGE_KEY, JSON.stringify(cacheObject));
}

function getLikeCountByCode(mediaCode) {
    if (!mediaCode) {
        return 0;
    }

    const normalizedCode = String(mediaCode);
    if (Object.prototype.hasOwnProperty.call(likeCache, normalizedCode)) {
        return Number(likeCache[normalizedCode]) || 0;
    }

    const summaryList = getLikeSummaryFromStorage();
    const match = summaryList.find(function(item) {
        return String(item && item.codice) === normalizedCode;
    });

    if (!match) {
        return 0;
    }

    return Number(match.likeCount) || 0;
}

function syncLikeSummaryForMedia(mediaItems, summaryList) {
    if (!Array.isArray(mediaItems)) {
        return;
    }

    const normalizedSummary = Array.isArray(summaryList) ? summaryList.map(function(item) {
        return {
            codice: String(item && item.codice || ''),
            likeCount: Number(item && item.likeCount) || 0
        };
    }).filter(function(item) {
        return !!item.codice;
    }) : [];

    const cacheObject = {};
    normalizedSummary.forEach(function(item) {
        cacheObject[item.codice] = item.likeCount;
    });

    Object.keys(likeCache).forEach(function(key) {
        delete likeCache[key];
    });
    Object.keys(cacheObject).forEach(function(key) {
        likeCache[key] = Number(cacheObject[key]) || 0;
    });

    sessionStorage.setItem(LIKE_SUMMARY_STORAGE_KEY, JSON.stringify(cacheObject));

    mediaItems.forEach(function(mediaItem) {
        const mediaCode = getMediaCode(mediaItem);
        if (!mediaCode) {
            return;
        }

        const count = Number(cacheObject[String(mediaCode)]) || 0;
        mediaItem.likeCount = count;
        mediaItem.likes = count;
    });

    if (Array.isArray(mediaItems) && mediaItems.length > 0) {
        refreshSlideshowFromGrid();
    }
}

function getCommentCountByCode(mediaCode) {
    if (!mediaCode) {
        return 0;
    }

    const normalizedCode = String(mediaCode);
    if (Object.prototype.hasOwnProperty.call(commentCache, normalizedCode)) {
        return Number(commentCache[normalizedCode]) || 0;
    }

    const summaryList = getCommentSummaryFromStorage();
    const match = summaryList.find(function(item) {
        return String(item && item.codice) === normalizedCode;
    });

    if (!match) {
        return 0;
    }

    return Number(match.commentCount) || 0;
}

function syncCommentSummaryForMedia(mediaItems, summaryList) {
    if (!Array.isArray(mediaItems)) {
        return;
    }

    const previousSummary = {};
    Object.keys(commentCache).forEach(function(key) {
        previousSummary[key] = Number(commentCache[key]) || 0;
    });

    const normalizedSummary = Array.isArray(summaryList) ? summaryList.map(function(item) {
        return {
            codice: String(item && item.codice || ''),
            commentCount: Number(item && item.commentCount) || 0
        };
    }).filter(function(item) {
        return !!item.codice;
    }) : [];

    const cacheObject = {};
    normalizedSummary.forEach(function(item) {
        cacheObject[item.codice] = item.commentCount;
    });

    const changedCodes = new Set();
    Object.keys(cacheObject).forEach(function(key) {
        const previousCount = Number(previousSummary[key]) || 0;
        const nextCount = Number(cacheObject[key]) || 0;
        if (previousCount !== nextCount) {
            changedCodes.add(key);
            console.debug('[bulk comments] conteggio cambiato per codice', key, 'da', previousCount, 'a', nextCount);
        }
    });

    Object.keys(commentListCache).forEach(function(key) {
        if (!Object.prototype.hasOwnProperty.call(cacheObject, key) || changedCodes.has(key)) {
            delete commentListCache[key];
            console.debug('[comments cache] svuotata lista commenti cache per codice', key, 'dopo bulk commenti');
        }
    });

    Object.keys(commentCache).forEach(function(key) {
        delete commentCache[key];
    });
    Object.keys(cacheObject).forEach(function(key) {
        commentCache[key] = Number(cacheObject[key]) || 0;
    });

    sessionStorage.setItem(COMMENT_SUMMARY_STORAGE_KEY, JSON.stringify(cacheObject));

    mediaItems.forEach(function(mediaItem) {
        const mediaCode = getMediaCode(mediaItem);
        if (!mediaCode) {
            return;
        }

        const count = Number(cacheObject[String(mediaCode)]) || 0;
        mediaItem.commentCount = count;
        mediaItem.comments = count;
    });
}


function getLikedMediaIdsForCurrentUser() {
    try {
        const storedValue = localStorage.getItem(getCurrentUserStorageKey());
        if (!storedValue) {
            return [];
        }
        
        const parsedValue = JSON.parse(storedValue);
        return Array.isArray(parsedValue) ? parsedValue.map(function(value) {
            return String(value);
        }) : [];
    } catch (error) {
        console.warn('Errore nel recupero dei like salvati nel localStorage:', error);
        return [];
    }
}

async function ensureLikedMediaIdsForCurrentUser() {
    const storageKey = getCurrentUserStorageKey();
    const storedValue = localStorage.getItem(storageKey);

    if (storedValue) {
        return getLikedMediaIdsForCurrentUser();
    }

    const currentUser = (localStorage.getItem('userName') || 'guest').trim();
    if (!currentUser) {
        return [];
    }

    try {
        const userLikes = await getUserLikes(currentUser);
        localStorage.setItem(storageKey, JSON.stringify(userLikes));
        return userLikes;
    } catch (error) {
        console.warn('Errore nel recupero dei like dell\'utente dal server:', error);
        return [];
    }
}

function saveLikedMediaForCurrentUser(mediaCode) {
    if (!mediaCode) {
        return;
    }

    const currentUserKey = getCurrentUserStorageKey();
    const likedIds = getLikedMediaIdsForCurrentUser();
    const normalizedCode = String(mediaCode);

    if (!likedIds.includes(normalizedCode)) {
        likedIds.push(normalizedCode);
        localStorage.setItem(currentUserKey, JSON.stringify(likedIds));
    }
}

function isMediaLikedByCurrentUser(mediaItem) {
    const mediaCode = getMediaCode(mediaItem);
    if (!mediaCode) {
        return false;
    }

    return (getLikedMediaIdsForCurrentUser()).includes(String(mediaCode));
}

function applyLikeVisualState(button, countElement, isLiked, countValue) {
    if (!button || !countElement) {
        return;
    }

    const numericCount = Number(countValue) || 0;
    countElement.textContent = String(numericCount);
    countElement.dataset.count = String(numericCount);

    if (isLiked) {
        button.dataset.liked = 'true';
        button.setAttribute('aria-pressed', 'true');
        button.classList.add('is-liked');
        button.style.color = '#ff4d6d';
        button.innerHTML = '<i class="fa fa-heart" aria-hidden="true"></i>';
        button.disabled = true;
        return;
    }

    button.dataset.liked = 'false';
    button.setAttribute('aria-pressed', 'false');
    button.classList.remove('is-liked');
    button.style.color = '#fff';
    button.innerHTML = '<i class="fa fa-heart-o" aria-hidden="true"></i>';
    button.disabled = false;
}

function formatItalianDate(dateValue) {
    if (!dateValue) {
        return '';
    }

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return String(dateValue);
    }

    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsedDate);
}

function renderCommentsSheet(detailScreen, comments, mediaCode) {
    const existingBackdrop = detailScreen.querySelector('.detail-comments-backdrop');
    const existingSheet = detailScreen.querySelector('.detail-comments-sheet');

    if (existingBackdrop) {
        existingBackdrop.remove();
    }

    if (existingSheet) {
        existingSheet.remove();
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'detail-comments-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const sheet = document.createElement('div');
    sheet.className = 'detail-comments-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Lista commenti');

    const safeComments = Array.isArray(comments) ? comments : [];
    const listMarkup = safeComments.length > 0
        ? safeComments.map((comment) => {
            const userName = comment && comment.user ? String(comment.user) : 'Utente';
            const text = comment && comment.text ? String(comment.text) : '';
            const createdAt = formatItalianDate(comment && comment.createdAt ? comment.createdAt : '');
            return `
                <div class="detail-comments-item">
                    <div class="detail-comments-item__header">
                        <span class="detail-comments-item__user">${userName}</span>
                        <span class="detail-comments-item__date">${createdAt}</span>
                    </div>
                    <p class="detail-comments-item__text">${text}</p>
                </div>
            `;
        }).join('')
        : '<div class="detail-comments-empty">Nessun commento ancora.</div>';

    sheet.innerHTML = `
        <div class="detail-comments-sheet__handle"></div>
        <div class="detail-comments-sheet__header">
            <h3>Commenti</h3>
            <button type="button" class="detail-comments-sheet__close" aria-label="Chiudi commenti">
                <i class="fa fa-times" aria-hidden="true"></i>
            </button>
        </div>
        <div class="detail-comments-sheet__list">${listMarkup}</div>
    `;

    detailScreen.appendChild(backdrop);
    detailScreen.appendChild(sheet);

    const closeButton = sheet.querySelector('.detail-comments-sheet__close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            backdrop.classList.remove('is-visible');
            sheet.classList.remove('is-open');
            setTimeout(() => {
                backdrop.remove();
                sheet.remove();
            }, 220);
        });
    }

    backdrop.addEventListener('click', () => {
        closeButton && closeButton.click();
    });

    requestAnimationFrame(() => {
        backdrop.classList.add('is-visible');
        sheet.classList.add('is-open');
    });

    return sheet;
}

function showDetailScreen(mediaItem, mediaIndex) {
    const detailScreen = document.getElementById('detail-screen');
    if (!detailScreen || !mediaItem) {
        return;
    }

    hideAllPanels();
    sessionStorage.setItem('lastActivePanel', 'detail');
    saveDetailScreenState(mediaItem, mediaIndex);
    detailScreen.style.display = 'block';

    const resolvedIndex = Number.isInteger(mediaIndex)
        ? mediaIndex
        : getDetailMediaIndexByItem(mediaItem);
    detailScreen.dataset.mediaIndex = String(resolvedIndex);

    const isVideo = mediaItem.mimeType && mediaItem.mimeType.startsWith('video/');
    const sourceUrl = getMediaDetailSource(mediaItem);

    const mediaMarkup = isVideo
        ? `<video src="${sourceUrl}" controls playsinline autoplay muted></video>`
        : `<img src="${sourceUrl}" alt="Dettaglio media" />`;

    const uploaderName = mediaItem.user || 'Utente';
    const mediaCode = getMediaCode(mediaItem);
    const initialLikeCount = getLikeCountByCode(mediaCode) || Number(mediaItem.likeCount || mediaItem.likes || 0) || 0;
    const initialCommentCount = getCommentCountByCode(mediaCode) || Number(mediaItem.commentCount || mediaItem.comments || 0) || 0;
    const alreadyLikedByUser = isMediaLikedByCurrentUser(mediaItem);

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'detail-media-wrapper is-transitioning';
    mediaWrapper.innerHTML = mediaMarkup;

    detailScreen.innerHTML = `
        <div class="detail-header">
            <div class="detail-user">
                <img src="img/profilo.jpg" alt="Profilo utente" class="detail-user-avatar" />
                <span class="detail-user-name">${uploaderName}</span>
            </div>
            <button type="button" class="detail-close" onclick="showGridPanel()" aria-label="Chiudi dettaglio">
                <i class="fa fa-times" aria-hidden="true"></i>
            </button>
        </div>
    `;
    detailScreen.appendChild(mediaWrapper);
    detailScreen.insertAdjacentHTML('beforeend', `
        <div class="detail-actions" aria-label="Azioni media">
            <div class="detail-action-group">
                <button type="button" class="detail-action detail-action--like" data-code="${mediaCode || ''}" data-liked="${mediaItem.isLiked || mediaItem.liked ? 'true' : 'false'}" aria-label="Mi piace" aria-pressed="${mediaItem.isLiked || mediaItem.liked ? 'true' : 'false'}">
                    <i class="fa ${mediaItem.isLiked || mediaItem.liked ? 'fa-heart' : 'fa-heart-o'}" aria-hidden="true"></i>
                </button>
                <span class="detail-action-count" data-count="${initialLikeCount}">${initialLikeCount}</span>
            </div>
            <div class="detail-action-group">
                <button type="button" class="detail-action detail-action--comment" aria-label="Commenti">
                    <i class="fa fa-comment-o" aria-hidden="true"></i>
                </button>
                <span class="detail-action-count detail-action-count--comments" data-count="${initialCommentCount}">${initialCommentCount}</span>
            </div>
        </div>
        <div class="detail-comment-composer" aria-label="Aggiungi commento">
            <textarea class="detail-comment-input" maxlength="200" rows="1" placeholder="Aggiungi un commento..." aria-label="Scrivi un commento"></textarea>
            <button type="button" class="detail-comment-submit" aria-label="Invia commento">
                <i class="fa fa-paper-plane" aria-hidden="true"></i>
            </button>
        </div>
    `);

    const likeButton = detailScreen.querySelector('.detail-action--like');
    const likeCountElement = detailScreen.querySelector('.detail-action--like').nextElementSibling;
    const commentButton = detailScreen.querySelector('.detail-action--comment');
    const commentCountElement = detailScreen.querySelector('.detail-action-count--comments');
    const commentInput = detailScreen.querySelector('.detail-comment-input');
    const commentSubmitButton = detailScreen.querySelector('.detail-comment-submit');

    if (commentButton && mediaCode) {
        commentButton.addEventListener('click', async function() {
            try {
                const cachedComments = getCachedCommentsByCode(mediaCode);
                if (Array.isArray(cachedComments)) {
                    console.debug('[api] usa cache commenti per codice', mediaCode, 'numero commenti:', cachedComments.length);
                    renderCommentsSheet(detailScreen, cachedComments, mediaCode);
                    return;
                }

                console.debug('[api] richiesta backend commenti per codice', mediaCode);
                const comments = await getCommentsByCodice(mediaCode);
                setCachedCommentsByCode(mediaCode, comments);
                renderCommentsSheet(detailScreen, comments, mediaCode);
            } catch (error) {
                console.error('Errore nel recupero dei commenti:', error);
                renderCommentsSheet(detailScreen, [], mediaCode);
                showMessage('Impossibile caricare i commenti al momento.');
            }
        });
    }

    if (likeButton && likeCountElement) {
        const isLikedState = alreadyLikedByUser || Boolean(mediaItem.isLiked || mediaItem.liked);
        applyLikeVisualState(likeButton, likeCountElement, isLikedState, initialLikeCount);

        likeButton.addEventListener('click', async function() {
            if (likeButton.dataset.liked === 'true' || !mediaCode) {
                return;
            }

            const user = localStorage.getItem('userName') || 'guest';
            likeButton.disabled = true;

            try {
                await addLike(mediaCode, user);
                saveLikedMediaForCurrentUser(mediaCode);

                const currentCount = getLikeCountByCode(mediaCode);
                const nextCount = currentCount + 1;

                mediaItem.likeCount = nextCount;
                mediaItem.likes = nextCount;
                mediaItem.isLiked = true;
                mediaItem.liked = true;

                likeCache[String(mediaCode)] = nextCount;
                saveLikeCacheToStorage();
                refreshSlideshowFromGrid();

                applyLikeVisualState(likeButton, likeCountElement, true, nextCount);
            } catch (error) {
                console.error('Errore nell\'aggiunta del like:', error);
                showMessage('Impossibile aggiungere il like al momento.');
                likeButton.disabled = false;
            }
        });
    }

    if (commentInput && commentSubmitButton && commentCountElement && mediaCode) {
        commentInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                commentSubmitButton.click();
            }
        });

        commentSubmitButton.addEventListener('click', async function() {
            const commentText = commentInput.value.trim();
            if (!commentText) {
                commentInput.focus();
                showMessage('Scrivi un commento prima di inviare.');
                return;
            }

            if (commentText.length > 200) {
                showMessage('Il commento può contenere al massimo 200 caratteri.');
                commentInput.focus();
                return;
            }

            const user = localStorage.getItem('userName') || 'guest';
            commentSubmitButton.disabled = true;

            try {
                await addComment(mediaCode, user, commentText);

                const currentCount = getCommentCountByCode(mediaCode);
                const nextCount = currentCount + 1;

                clearCommentListCacheForCode(mediaCode);

                mediaItem.commentCount = nextCount;
                mediaItem.comments = nextCount;
                commentCache[String(mediaCode)] = nextCount;
                sessionStorage.setItem(COMMENT_SUMMARY_STORAGE_KEY, JSON.stringify(commentCache));

                commentCountElement.textContent = String(nextCount);
                commentCountElement.dataset.count = String(nextCount);
                commentInput.value = '';
                commentInput.focus();
            } catch (error) {
                console.error('Errore nell\'aggiunta del commento:', error);
                showMessage('Impossibile aggiungere il commento al momento.');
            } finally {
                commentSubmitButton.disabled = false;
            }
        });
    }

    requestAnimationFrame(function() {
        mediaWrapper.classList.remove('is-transitioning');
    });

    bindDetailSwipeNavigation(detailScreen);
}

function showUploadPanel() {
    hideAllPanels();
    sessionStorage.setItem('lastActivePanel', 'upload');
    document.getElementById('upload-screen').style.display = 'block';
    renderSelectedFilesGrid();
}

function hideAllPanels() {
    // Evita accumulo observer/sentinel al cambio pannello.
    detachGridInfiniteScroll();

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('grid-screen').style.display = 'none';
    document.getElementById('upload-screen').style.display = 'none';
    document.getElementById('detail-screen').style.display = 'none';
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
            throw error;
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

