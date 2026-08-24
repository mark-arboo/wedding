const SLIDESHOW_INTERVAL = 5000; // Intervallo di 5 secondi per lo slideshow
const SLIDESHOW_NUM_IMAGES = 6; // Numero massimo di immagini da mostrare nello slideshow
const GRID_PAGE_SIZE = 6;
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

const GRID_FEED_STATE_KEY = 'gridFeedState';
const SLIDESHOW_STATE_KEY = 'slideshowState';
const MAX_SELECTED_FILES = 4;

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
    initializeSlideshow(gridFeedState.sortedData);
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

    // Verifica se l'username è cambiato rispetto a quello salvato in localStorage
    const previousUserName = localStorage.getItem('userName');
    if (previousUserName && previousUserName !== userName) {
        // Se l'username è cambiato, rimuovi il token precedente
        localStorage.removeItem('userToken');
    }
    localStorage.setItem('userName', userName);

    let token = localStorage.getItem('userToken');
    if (!token) {
        token = generateToken(userName);
        localStorage.setItem('userToken', token);
    }

    setLoginLoading(true);
    submitButton.disabled = true;

    login(userName, token)
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
    return `${userName}-${timestamp}-${randomNum}`;
}

async function showGridPanel() {

    hideAllPanels();
    document.getElementById('grid-screen').style.display = 'block';

    ptrIndicator = document.getElementById('ptr-indicator');
    ptrText = document.getElementById('ptr-text');

    const feedContainer = document.getElementById('feed');

    if (tryRestoreGridPanelFromSession(feedContainer)) {
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
          feedContainer.innerHTML = "<p style='text-align:center;'>Nessun elemento presente nella galleria.</p>";
          return;
        }

        if (!Array.isArray(data) || !feedContainer) {
            sessionStorage.setItem('lastActivePanel', 'grid');
            return;
        }

        const sortedData = data.slice().sort(function(a, b) {
            return new Date(b.created).getTime() - new Date(a.created).getTime();
        });

        initializeSlideshow(sortedData);
        document.getElementById('slideshow-image').style.display = "block"; // Nasconde l'immagine dello slideshow durante l'aggiornamento

        gridFeedState.sortedData = sortedData;
        feedContainer.innerHTML = '';

        appendNextGridPage(feedContainer);
        setupGridInfiniteScroll(feedContainer);
        saveAppStatesToSession();
        
    } catch (error) {
        console.error('Errore in showGridPanel: ', error.message);
        resetSlideshow();
        resetGridPaginationState();
        showMessage(error.message || 'Impossibile caricare la galleria.');
        
        if (feedContainer) {
            feedContainer.innerHTML = "<p style='text-align:center; color:red;'>" + error.message + "</p>";
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

function createGalleryItemMarkup(item) {
    if (item.mimeType && item.mimeType.startsWith('video/')) {
        return `<div class="gallery-item"><video src="${item.src}" controls playsinline preload="metadata"></video></div>`;
    }

    return `<div class="gallery-item"><img src="${item.src}" alt="Foto matrimonio" loading="lazy" /></div>`;
}

function appendNextGridPage(feedContainer) {
    if (!feedContainer || gridFeedState.isAppending) {
        return;
    }

    const totalItems = gridFeedState.sortedData.length;
    if (gridFeedState.renderedCount >= totalItems) {
        if (gridFeedState.observer) {
            gridFeedState.observer.disconnect();
        }
        return;
    }

    gridFeedState.isAppending = true;

    const start = gridFeedState.renderedCount;
    const end = Math.min(start + GRID_PAGE_SIZE, totalItems);

    console.log(`Caricamento paginato attivato: elementi ${start + 1}-${end} di ${totalItems}`);
   
    const chunkHtml = gridFeedState.sortedData.slice(start, end).map(createGalleryItemMarkup).join('');
    feedContainer.insertAdjacentHTML('beforeend', chunkHtml);
    gridFeedState.renderedCount = end;
    saveGridFeedStateToSession();

    if (gridFeedState.renderedCount >= totalItems && gridFeedState.observer) {
        gridFeedState.observer.disconnect();
    }

    gridFeedState.isAppending = false;
}

function setupGridInfiniteScroll(feedContainer) {
    const totalItems = gridFeedState.sortedData.length;
    if (!feedContainer || totalItems <= GRID_PAGE_SIZE) {
        return;
    }

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


function showFeedPanel() {
    // Logica per mostrare il pannello del menu
    console.log("Entrato in showFeedPanel()");

    hideAllPanels();

    sessionStorage.setItem('lastActivePanel', 'feed');
    document.getElementById('feed-screen').style.display = 'block';
}

function showUploadPanel() {
    hideAllPanels();
    sessionStorage.setItem('lastActivePanel', 'upload');
    document.getElementById('upload-screen').style.display = 'block';
    renderSelectedFilesGrid();
}

function hideAllPanels() {

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
            localStorage.removeItem('userName');
            localStorage.removeItem('userToken');
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
    const mergedFiles = selectedFiles.concat(newFiles);

    if (mergedFiles.length > MAX_SELECTED_FILES) {
        showMessage("Puoi selezionare al massimo 4 file.");
    }

    selectedFiles = mergedFiles.slice(0, MAX_SELECTED_FILES);
    fileInput.value = '';

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
        grid.innerHTML = '<div class="upload-empty">Nessun file selezionato. Tocca "Aggiungi" per scegliere foto o video.</div>';
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

    const uploadSubmitButton = document.getElementById('upload-submitBtn');
    const originalLabel = uploadSubmitButton ? uploadSubmitButton.textContent : '';

    if (uploadSubmitButton) {
        uploadSubmitButton.disabled = true;
        uploadSubmitButton.textContent = 'Caricamento in corso...';
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
        if (uploadSubmitButton) {
            uploadSubmitButton.textContent = originalLabel || 'Carica file';
            uploadSubmitButton.disabled = selectedFiles.length === 0;
        }
    }
}

