const SLIDESHOW_INTERVAL = 5000; // Intervallo di 5 secondi per lo slideshow
const SLIDESHOW_NUM_IMAGES = 4; // Numero massimo di immagini da mostrare nello slideshow
const GRID_PAGE_SIZE = 6;
const FEED_PAGE_SIZE = 6;
const gridFeedState = {
    media: [],
    renderedCount: 0,
    observer: null,
    sentinel: null,
    isAppending: false
};
const feedState = {
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
const DETAIL_RETURN_PANEL_KEY = 'detailReturnPanel';
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
const USER_PROFILE_IMAGE_STORAGE_KEY = 'userProfileImage';
const PROFILE_CROP_OUTPUT_SIZE = 1024;

const profileCropState = {
    file: null,
    objectUrl: '',
    imageElement: null,
    stageElement: null,
    zoom: 1,
    minZoom: 1,
    maxZoom: 3,
    baseScale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    activePointers: new Map(),
    dragPointerId: null,
    pinchStartDistance: 0,
    pinchStartZoom: 1,
    pinchStartOffsetX: 0,
    pinchStartOffsetY: 0,
    isUploading: false
};



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

    showGridPanel(true);
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
    bindProfileUploadControls();

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
        showGridPanel(true);
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
                showGridPanel(true);
                break;
            case 'feed':
                showFeedPanel(true);
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
            case 'guestbook':
                showGuestbookPanel();
                break;
            case 'profile':
                showProfilePanel();
                break;
            default:
                showLoginPanel();
                break;
        }
    } else {
        showLoginPanel();
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderGuestbookMessages(messages) {
    const list = document.getElementById('guestbook-list');
    if (!list) {
        return;
    }

    const safeMessages = Array.isArray(messages) ? messages : [];

    if (safeMessages.length === 0) {
        list.innerHTML = '<div class="guestbook-empty">Nessun messaggio ancora. Sii il primo a lasciare un augurio.</div>';
        return;
    }

    list.innerHTML = safeMessages.map(function(entry) {
        const user = entry && entry.user ? escapeHtml(entry.user) : 'Ospite';
        const message = entry && entry.message ? escapeHtml(entry.message) : '';
        const createdAt = entry && entry.createdAt ? formatItalianDate(entry.createdAt) : 'Ora';
        const profileImageUrl = entry && typeof entry.profileImageUrl === 'string' && entry.profileImageUrl.trim()
            ? escapeHtml(entry.profileImageUrl.trim())
            : 'img/profilo.jpg';

        return `
            <article class="guestbook-message">
                <div class="guestbook-message__avatar-wrap">
                    <img src="${profileImageUrl}" alt="Profilo utente" class="guestbook-message__avatar" />
                </div>
                <div class="guestbook-message__body">
                    <div class="guestbook-message__header">
                        <span class="guestbook-message__user">${user}</span>
                        <span class="guestbook-message__date">${createdAt}</span>
                    </div>
                    <p class="guestbook-message__text">${message}</p>
                </div>
            </article>
        `;
    }).join('');
}

function updateGuestbookComposerAvatar() {
    const avatarElement = document.getElementById('guestbook-composer-avatar');

    if (!avatarElement) {
        return;
    }

    const profileImageUrl = getUserProfileImage();
    avatarElement.src = profileImageUrl || 'img/profilo.jpg';
}

async function loadGuestbookMessages() {
    try {
        const messages = await readGuestbookMessages();
        renderGuestbookMessages(messages);
    } catch (error) {
        console.error('Errore nel recupero dei messaggi del guestbook:', error);
        renderGuestbookMessages([]);
        showMessage(error && error.message ? error.message : 'Impossibile caricare i messaggi del guestbook.');
    }
}

async function submitGuestbookMessage() {
    const input = document.getElementById('guestbook-input');
    const submitButton = document.getElementById('guestbook-submit');

    if (!input || !submitButton) {
        return;
    }

    const message = input.value.trim();
    const user = localStorage.getItem('userName') || 'Guest';

    if (!message) {
        input.focus();
        showMessage('Scrivi un messaggio prima di inviare.');
        return;
    }

    submitButton.disabled = true;
    submitButton.classList.add('is-loading');

    try {
        await sendGuestbookMessage(user, message);
        input.value = '';
        await loadGuestbookMessages();
    } catch (error) {
        console.error('Errore nell\'invio del messaggio guestbook:', error);
        showMessage(error && error.message ? error.message : 'Impossibile inviare il messaggio.');
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('is-loading');
    }
}

function showGuestbookPanel() {
    const guestbookScreen = document.getElementById('guestbook-screen');
    if (!guestbookScreen) {
        return;
    }

    hideAllPanels();
    sessionStorage.setItem('lastActivePanel', 'guestbook');
    guestbookScreen.style.display = 'block';
    toggleTabBar(true);
    updateTabSelection('guestbook');
    updateGuestbookComposerAvatar();

    const submitButton = document.getElementById('guestbook-submit');
    if (submitButton) {
        submitButton.onclick = submitGuestbookMessage;
    }

    const input = document.getElementById('guestbook-input');
    if (input) {
        input.onkeydown = function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitGuestbookMessage();
            }
        };
    }

    loadGuestbookMessages();
}

function showGridView() {
    showGridPanel();
    updateTabSelection('grid');
}

function showFeedView() {
    showFeedPanel();
    updateTabSelection('feed');
}

function showGuestbookView() {
    showGuestbookPanel();
    updateTabSelection('guestbook');
}

function showProfileView() {
    showProfilePanel();
}

function updateTabSelection(activeTab) {
    const gridButton = document.getElementById('gridViewBtn');
    const feedButton = document.getElementById('feedViewBtn');
    const guestbookButton = document.getElementById('guestbookViewBtn');
    const profileButton = document.getElementById('profileViewBtn');

    if (gridButton) {
        gridButton.classList.toggle('active', activeTab === 'grid');
    }

    if (feedButton) {
        feedButton.classList.toggle('active', activeTab === 'feed');
    }

    if (guestbookButton) {
        guestbookButton.classList.toggle('active', activeTab === 'guestbook');
    }

    if (profileButton) {
        profileButton.classList.toggle('active', activeTab === 'profile');
    }
}

function getDetailReturnPanel() {
    const savedPanel = sessionStorage.getItem(DETAIL_RETURN_PANEL_KEY);
    return savedPanel === 'feed' || savedPanel === 'grid' || savedPanel === 'guestbook' || savedPanel === 'profile' ? savedPanel : 'grid';
}

function closeDetailScreen() {
    const returnPanel = getDetailReturnPanel();

    if (returnPanel === 'feed') {
        showFeedPanel();
        return;
    }

    if (returnPanel === 'guestbook') {
        showGuestbookPanel();
        return;
    }

    if (returnPanel === 'profile') {
        showProfilePanel();
        return;
    }

    showGridPanel();
}

function showPanelByName(panelName, forceReload = false) {
    if (panelName === 'feed') {
        return showFeedPanel(forceReload);
    }

    if (panelName === 'guestbook') {
        return showGuestbookPanel();
    }

    if (panelName === 'login') {
        return showLoginPanel();
    }

    if (panelName === 'profile') {
        return showProfilePanel();
    }

    if (panelName === 'grid') {
        return showGridPanel(forceReload);
    }

    return showGridPanel(forceReload);
}

function toggleTabBar(isVisible) {
    const tabbar = document.querySelector('.tabbar');
    if (!tabbar) {
        return;
    }

    tabbar.style.display = isVisible ? 'flex' : 'none';
}

function showLoginPanel() {

    console.log("Entrato in showLoginPanel()");

    // Logica per mostrare il pannello del menu
    hideAllPanels();

    // Reset dello stato della Grid e dello Slideshow
    resetGridPaginationState();
    resetSlideshow();

    sessionStorage.setItem('lastActivePanel', 'login');
    toggleTabBar(false);
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

function getUserProfileImage() {
    return localStorage.getItem(USER_PROFILE_IMAGE_STORAGE_KEY) || '';
}

function saveUserProfileImage(imageUrl) {
    const normalizedImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';

    if (normalizedImageUrl) {
        localStorage.setItem(USER_PROFILE_IMAGE_STORAGE_KEY, normalizedImageUrl);
        return;
    }

    localStorage.removeItem(USER_PROFILE_IMAGE_STORAGE_KEY);
}

function getCurrentUserName() {
    return (localStorage.getItem('userName') || '').trim();
}

async function resolveProfilePanelData() {
    const savedProfileImageUrl = getUserProfileImage();
    const savedUserName = getCurrentUserName();

    if (savedProfileImageUrl) {
        return {
            userName: savedUserName || 'Utente',
            profileImageUrl: savedProfileImageUrl
        };
    }

    if (!savedUserName) {
        return {
            userName: 'Utente',
            profileImageUrl: ''
        };
    }

    try {
        const userData = await getUser(savedUserName);
        const resolvedUserName = userData && typeof userData.user === 'string' && userData.user.trim()
            ? userData.user.trim()
            : savedUserName;
        const profileImageUrl = userData && typeof userData.profileImageUrl === 'string'
            ? userData.profileImageUrl.trim()
            : '';

        if (profileImageUrl) {
            saveUserProfileImage(profileImageUrl);
        }

        return {
            userName: resolvedUserName || 'Utente',
            profileImageUrl: profileImageUrl || ''
        };
    } catch (error) {
        console.warn('Impossibile recuperare i dati del profilo dal server:', error);
        return {
            userName: savedUserName || 'Utente',
            profileImageUrl: ''
        };
    }
}

function renderProfilePanel(profileData) {
    const userNameElement = document.getElementById('profile-user-name');
    const avatarElement = document.getElementById('profile-avatar');
    const resolvedUserName = profileData && profileData.userName ? profileData.userName : getCurrentUserName() || 'Utente';
    const resolvedProfileImageUrl = profileData && profileData.profileImageUrl ? profileData.profileImageUrl : getUserProfileImage();

    if (userNameElement) {
        userNameElement.textContent = resolvedUserName;
    }

    if (avatarElement) {
        const nextImageUrl = resolvedProfileImageUrl || 'img/profilo.jpg';
        const replacementAvatar = avatarElement.cloneNode(false);

        replacementAvatar.removeAttribute('src');
        replacementAvatar.onerror = function() {
            this.onerror = null;
            this.src = 'img/profilo.jpg';
        };
        replacementAvatar.src = nextImageUrl;

        avatarElement.replaceWith(replacementAvatar);
    }
}

function bindProfileUploadControls() {
    const uploadButton = document.getElementById('profile-upload-button');
    const fileInput = document.getElementById('profile-image-input');
    const zoomInput = document.getElementById('profile-crop-zoom');
    const cropStage = document.getElementById('profile-crop-stage');
    const cropImage = document.getElementById('profile-crop-image');
    const confirmButton = document.getElementById('profile-crop-confirm');
    const cancelButton = document.getElementById('profile-crop-cancel');

    if (uploadButton) {
        uploadButton.onclick = openProfileImagePicker;
    }

    if (fileInput) {
        fileInput.onchange = handleProfileImageSelected;
    }

    if (zoomInput) {
        zoomInput.oninput = handleProfileCropZoomChange;
    }

    if (cropStage) {
        cropStage.onpointerdown = handleProfileCropPointerDown;
        cropStage.onpointermove = handleProfileCropPointerMove;
        cropStage.onpointerup = handleProfileCropPointerUp;
        cropStage.onpointercancel = handleProfileCropPointerUp;
    }

    if (confirmButton) {
        confirmButton.onclick = confirmProfileCropUpload;
    }

    if (cancelButton) {
        cancelButton.onclick = hideProfileCropModal;
    }
}

function openProfileImagePicker() {
    const fileInput = document.getElementById('profile-image-input');
    if (!fileInput) {
        return;
    }

    fileInput.value = '';
    fileInput.click();
}

function handleProfileImageSelected(event) {
    const file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) {
        return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
        showMessage("Seleziona solo un'immagine valida.");
        return;
    }

    showProfileCropModal(file);
}

function showProfileCropModal(file) {
    const modal = document.getElementById('profile-crop-modal');
    const cropImage = document.getElementById('profile-crop-image');
    const zoomInput = document.getElementById('profile-crop-zoom');

    if (!modal || !cropImage || !zoomInput) {
        return;
    }

    hideProfileCropModal();

    profileCropState.file = file;
    profileCropState.objectUrl = URL.createObjectURL(file);
    profileCropState.zoom = 1;
    profileCropState.minZoom = 1;
    profileCropState.maxZoom = 3;
    profileCropState.offsetX = 0;
    profileCropState.offsetY = 0;
    profileCropState.stageElement = document.getElementById('profile-crop-stage');
    profileCropState.imageElement = cropImage;
    profileCropState.isUploading = false;

    zoomInput.value = '1';
    setProfileCropLoading(false);

    cropImage.onload = function() {
        initializeProfileCropGeometry();
    };

    cropImage.src = profileCropState.objectUrl;

    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
}

function hideProfileCropModal() {
    const modal = document.getElementById('profile-crop-modal');
    const cropImage = document.getElementById('profile-crop-image');
    const fileInput = document.getElementById('profile-image-input');

    if (modal) {
        modal.classList.remove('is-visible');
        modal.setAttribute('aria-hidden', 'true');
    }

    if (cropImage) {
        cropImage.onload = null;
        cropImage.removeAttribute('src');
    }

    if (profileCropState.objectUrl) {
        URL.revokeObjectURL(profileCropState.objectUrl);
    }

    profileCropState.file = null;
    profileCropState.objectUrl = '';
    profileCropState.imageElement = null;
    profileCropState.stageElement = null;
    profileCropState.zoom = 1;
    profileCropState.minZoom = 1;
    profileCropState.maxZoom = 3;
    profileCropState.baseScale = 1;
    profileCropState.offsetX = 0;
    profileCropState.offsetY = 0;
    profileCropState.isDragging = false;
    profileCropState.isUploading = false;
    profileCropState.dragStartX = 0;
    profileCropState.dragStartY = 0;
    profileCropState.startOffsetX = 0;
    profileCropState.startOffsetY = 0;
    profileCropState.activePointers.clear();
    profileCropState.dragPointerId = null;
    profileCropState.pinchStartDistance = 0;
    profileCropState.pinchStartZoom = 1;
    profileCropState.pinchStartOffsetX = 0;
    profileCropState.pinchStartOffsetY = 0;

    setProfileCropLoading(false);

    if (fileInput) {
        fileInput.value = '';
    }
}

function initializeProfileCropGeometry() {
    const stage = document.getElementById('profile-crop-stage');
    const cropImage = document.getElementById('profile-crop-image');
    const zoomInput = document.getElementById('profile-crop-zoom');

    if (!stage || !cropImage || !cropImage.naturalWidth || !cropImage.naturalHeight) {
        return;
    }

    profileCropState.stageElement = stage;
    profileCropState.imageElement = cropImage;
    profileCropState.baseScale = Math.max(stage.clientWidth / cropImage.naturalWidth, stage.clientHeight / cropImage.naturalHeight);
    profileCropState.zoom = 1;
    profileCropState.offsetX = 0;
    profileCropState.offsetY = 0;

    if (zoomInput) {
        zoomInput.min = String(profileCropState.minZoom);
        zoomInput.max = String(profileCropState.maxZoom);
        zoomInput.step = '0.01';
        zoomInput.value = '1';
    }

    updateProfileCropImagePosition();
}

function handleProfileCropZoomChange(event) {
    const nextZoom = Number(event && event.target ? event.target.value : profileCropState.zoom);

    if (!Number.isFinite(nextZoom)) {
        return;
    }

    profileCropState.zoom = clamp(nextZoom, profileCropState.minZoom, profileCropState.maxZoom);
    updateProfileCropImagePosition();
}

function handleProfileCropPointerDown(event) {
    if (!profileCropState.imageElement || !profileCropState.stageElement) {
        return;
    }

    event.preventDefault();
    profileCropState.activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY
    });

    if (event.currentTarget && typeof event.currentTarget.setPointerCapture === 'function') {
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Impossibile catturare il puntatore del crop:', error);
        }
    }

    if (profileCropState.activePointers.size === 1) {
        profileCropState.isDragging = true;
        profileCropState.dragPointerId = event.pointerId;
        profileCropState.dragStartX = event.clientX;
        profileCropState.dragStartY = event.clientY;
        profileCropState.startOffsetX = profileCropState.offsetX;
        profileCropState.startOffsetY = profileCropState.offsetY;
        profileCropState.pinchStartDistance = 0;
        return;
    }

    if (profileCropState.activePointers.size >= 2) {
        beginProfileCropPinch();
    }
}

function handleProfileCropPointerMove(event) {
    if (!profileCropState.activePointers.has(event.pointerId)) {
        return;
    }

    event.preventDefault();
    profileCropState.activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY
    });

    if (profileCropState.activePointers.size >= 2) {
        updateProfileCropPinch();
        return;
    }

    if (!profileCropState.isDragging || profileCropState.dragPointerId !== event.pointerId) {
        return;
    }

    const deltaX = event.clientX - profileCropState.dragStartX;
    const deltaY = event.clientY - profileCropState.dragStartY;

    profileCropState.offsetX = profileCropState.startOffsetX + deltaX;
    profileCropState.offsetY = profileCropState.startOffsetY + deltaY;
    updateProfileCropImagePosition();
}

function handleProfileCropPointerUp(event) {
    if (!profileCropState.activePointers.has(event.pointerId)) {
        return;
    }

    profileCropState.activePointers.delete(event.pointerId);

    if (event.currentTarget && typeof event.currentTarget.releasePointerCapture === 'function') {
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Impossibile rilasciare il puntatore del crop:', error);
        }
    }

    if (profileCropState.activePointers.size === 0) {
        profileCropState.isDragging = false;
        profileCropState.dragPointerId = null;
        profileCropState.pinchStartDistance = 0;
        return;
    }

    const firstPointer = Array.from(profileCropState.activePointers.entries())[0];
    profileCropState.isDragging = true;
    profileCropState.dragPointerId = firstPointer[0];
    profileCropState.dragStartX = firstPointer[1].x;
    profileCropState.dragStartY = firstPointer[1].y;
    profileCropState.startOffsetX = profileCropState.offsetX;
    profileCropState.startOffsetY = profileCropState.offsetY;
    profileCropState.pinchStartDistance = 0;
    profileCropState.pinchStartZoom = profileCropState.zoom;
    profileCropState.pinchStartOffsetX = profileCropState.offsetX;
    profileCropState.pinchStartOffsetY = profileCropState.offsetY;

    if (profileCropState.activePointers.size >= 2) {
        beginProfileCropPinch();
    }
}

function beginProfileCropPinch() {
    const points = Array.from(profileCropState.activePointers.values());

    if (points.length < 2 || !profileCropState.stageElement) {
        return;
    }

    profileCropState.isDragging = false;
    profileCropState.dragPointerId = null;
    profileCropState.pinchStartDistance = getDistanceBetweenPoints(points[0], points[1]);
    profileCropState.pinchStartZoom = profileCropState.zoom;
    profileCropState.pinchStartOffsetX = profileCropState.offsetX;
    profileCropState.pinchStartOffsetY = profileCropState.offsetY;
}

function updateProfileCropPinch() {
    const points = Array.from(profileCropState.activePointers.values());

    if (points.length < 2 || !profileCropState.stageElement) {
        return;
    }

    const currentDistance = getDistanceBetweenPoints(points[0], points[1]);

    if (!profileCropState.pinchStartDistance) {
        beginProfileCropPinch();
        return;
    }

    const stage = profileCropState.stageElement;
    const currentMidpoint = getMidpoint(points[0], points[1]);
    const stageCenterX = stage.clientWidth / 2;
    const stageCenterY = stage.clientHeight / 2;
    const ratio = currentDistance / profileCropState.pinchStartDistance;
    const nextZoom = clamp(profileCropState.pinchStartZoom * ratio, profileCropState.minZoom, profileCropState.maxZoom);
    const startScale = profileCropState.baseScale * profileCropState.pinchStartZoom;
    const nextScale = profileCropState.baseScale * nextZoom;

    if (startScale > 0) {
        const startCenterX = stageCenterX + profileCropState.pinchStartOffsetX;
        const startCenterY = stageCenterY + profileCropState.pinchStartOffsetY;
        const nextCenterX = currentMidpoint.x - ((nextScale / startScale) * (currentMidpoint.x - startCenterX));
        const nextCenterY = currentMidpoint.y - ((nextScale / startScale) * (currentMidpoint.y - startCenterY));

        profileCropState.offsetX = nextCenterX - stageCenterX;
        profileCropState.offsetY = nextCenterY - stageCenterY;
    }

    profileCropState.zoom = nextZoom;

    const zoomInput = document.getElementById('profile-crop-zoom');
    if (zoomInput) {
        zoomInput.value = String(nextZoom);
    }

    updateProfileCropImagePosition();
}

function getDistanceBetweenPoints(pointA, pointB) {
    const deltaX = pointB.x - pointA.x;
    const deltaY = pointB.y - pointA.y;
    return Math.hypot(deltaX, deltaY);
}

function getMidpoint(pointA, pointB) {
    return {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2
    };
}

function updateProfileCropImagePosition() {
    const stage = profileCropState.stageElement || document.getElementById('profile-crop-stage');
    const cropImage = profileCropState.imageElement || document.getElementById('profile-crop-image');

    if (!stage || !cropImage || !cropImage.naturalWidth || !cropImage.naturalHeight) {
        return;
    }

    const stageWidth = stage.clientWidth || 280;
    const stageHeight = stage.clientHeight || stageWidth;
    const displayScale = profileCropState.baseScale * profileCropState.zoom;
    const displayWidth = cropImage.naturalWidth * displayScale;
    const displayHeight = cropImage.naturalHeight * displayScale;
    const maxOffsetX = Math.max(0, (displayWidth - stageWidth) / 2);
    const maxOffsetY = Math.max(0, (displayHeight - stageHeight) / 2);

    profileCropState.offsetX = clamp(profileCropState.offsetX, -maxOffsetX, maxOffsetX);
    profileCropState.offsetY = clamp(profileCropState.offsetY, -maxOffsetY, maxOffsetY);

    cropImage.style.width = `${displayWidth}px`;
    cropImage.style.height = `${displayHeight}px`;
    cropImage.style.left = `${(stageWidth / 2) + profileCropState.offsetX}px`;
    cropImage.style.top = `${(stageHeight / 2) + profileCropState.offsetY}px`;
}

function setProfileCropLoading(isLoading) {
    const confirmButton = document.getElementById('profile-crop-confirm');
    const cancelButton = document.getElementById('profile-crop-cancel');

    profileCropState.isUploading = !!isLoading;

    if (confirmButton) {
        confirmButton.disabled = !!isLoading;
        confirmButton.textContent = isLoading ? 'Caricamento...' : 'Conferma e carica';
    }

    if (cancelButton) {
        cancelButton.disabled = !!isLoading;
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getProfileCropBlob() {
    const stage = document.getElementById('profile-crop-stage');
    const cropImage = document.getElementById('profile-crop-image');

    if (!stage || !cropImage || !cropImage.naturalWidth || !cropImage.naturalHeight) {
        return Promise.reject(new Error("Impossibile ritagliare l'immagine."));
    }

    const stageWidth = stage.clientWidth || 280;
    const stageHeight = stage.clientHeight || stageWidth;
    const displayScale = profileCropState.baseScale * profileCropState.zoom;
    const displayWidth = cropImage.naturalWidth * displayScale;
    const displayHeight = cropImage.naturalHeight * displayScale;
    const displayedLeft = (stageWidth / 2) + profileCropState.offsetX - (displayWidth / 2);
    const displayedTop = (stageHeight / 2) + profileCropState.offsetY - (displayHeight / 2);
    const sourceWidth = stageWidth / displayScale;
    const sourceHeight = stageHeight / displayScale;
    const sourceX = clamp(-displayedLeft / displayScale, 0, cropImage.naturalWidth - sourceWidth);
    const sourceY = clamp(-displayedTop / displayScale, 0, cropImage.naturalHeight - sourceHeight);

    const canvas = document.createElement('canvas');
    canvas.width = PROFILE_CROP_OUTPUT_SIZE;
    canvas.height = PROFILE_CROP_OUTPUT_SIZE;

    const context = canvas.getContext('2d');
    if (!context) {
        return Promise.reject(new Error('Impossibile preparare il ritaglio.'));
    }

    context.drawImage(
        cropImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        PROFILE_CROP_OUTPUT_SIZE,
        PROFILE_CROP_OUTPUT_SIZE
    );

    return new Promise(function(resolve, reject) {
        canvas.toBlob(function(blob) {
            if (!blob) {
                reject(new Error("Impossibile creare l'immagine ritagliata."));
                return;
            }

            resolve(blob);
        }, 'image/jpeg', 0.92);
    });
}

function extractProfileImageUrl(uploadResult) {
    if (!uploadResult) {
        return '';
    }

    if (typeof uploadResult === 'string') {
        return uploadResult.trim();
    }

    if (typeof uploadResult.url === 'string') {
        return uploadResult.url.trim();
    }

    if (typeof uploadResult.imageUrl === 'string') {
        return uploadResult.imageUrl.trim();
    }

    if (typeof uploadResult.profileImageUrl === 'string') {
        return uploadResult.profileImageUrl.trim();
    }

    return '';
}

async function confirmProfileCropUpload() {
    if (profileCropState.isUploading) {
        return;
    }

    const currentFile = profileCropState.file;
    const currentUserName = (localStorage.getItem('userName') || '').trim();

    if (!currentFile) {
        showMessage("Seleziona prima un'immagine.");
        return;
    }

    if (!currentUserName) {
        showMessage('Nome utente non valido.');
        return;
    }

    setProfileCropLoading(true);

    try {
        const croppedBlob = await getProfileCropBlob();
        const croppedFileName = currentFile.name.replace(/\.[^.]+$/, '') + '-profile.jpg';
        const croppedFile = new File([croppedBlob], croppedFileName, { type: 'image/jpeg' });
        const uploadResult = await uploadProfileMedia([croppedFile], currentUserName);
        const profileImageUrl = extractProfileImageUrl(uploadResult);

        if (!profileImageUrl) {
            throw new Error("La URL dell'immagine di profilo non è stata restituita dal server.");
        }

        saveUserProfileImage(profileImageUrl);
        renderProfilePanel();
        hideProfileCropModal();
        showMessage('Immagine profilo aggiornata con successo.');
    } catch (error) {
        console.error("Errore nel caricamento dell'immagine profilo:", error);
        showMessage(error && error.message ? error.message : "Impossibile caricare l'immagine di profilo.");
    } finally {
        setProfileCropLoading(false);
    }
}

async function showProfilePanel() {
    const profileScreen = document.getElementById('profile-screen');

    if (!profileScreen) {
        return;
    }

    hideAllPanels();
    sessionStorage.setItem('lastActivePanel', 'profile');
    profileScreen.style.display = 'block';
    toggleTabBar(true);
    updateTabSelection('profile');

    const profileData = await resolveProfilePanelData();
    renderProfilePanel(profileData);
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

    // Verifica che userName contenga solo lettere, numeri e qualche carattere speciale ammissibile nei nomi
    const validUserNamePattern = /^[a-zA-Z0-9 _.-]+$/;
    if (!validUserNamePattern.test(userName)) {
        nameInput.classList.add('is-error');
        nameInput.focus();
        showMessage("Il nome può contenere solo lettere, numeri, spazi, trattini e punti.");
        return;
    }


    nameInput.classList.remove('is-error');

    // Se l'username è lo stesso di quello salvato, procede direttamente con il login
    const savedUserName = localStorage.getItem('userName');

    if (savedUserName && savedUserName.toLowerCase() === userName.toLowerCase()) {
        showGridPanel(true);
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

let yesNoModalResolver = null;

function showYesNoModal(message, title) {
    const modal = document.getElementById('yesno-modal');
    const modalTitle = document.getElementById('yesno-modal-title');
    const modalText = document.getElementById('yesno-modal-text');
    const yesButton = document.getElementById('yesno-modal-yes');

    if (!modal || !modalTitle || !modalText) {
        return Promise.resolve(false);
    }

    if (yesNoModalResolver) {
        yesNoModalResolver(false);
        yesNoModalResolver = null;
    }

    modalTitle.textContent = title || 'Conferma';
    modalText.textContent = message || 'Vuoi continuare?';
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');

    if (yesButton) {
        yesButton.focus();
    }

    return new Promise(function(resolve) {
        yesNoModalResolver = resolve;
    });
}

function hideYesNoModal(confirmed) {
    const modal = document.getElementById('yesno-modal');

    if (modal) {
        modal.classList.remove('is-visible');
        modal.setAttribute('aria-hidden', 'true');
    }

    if (yesNoModalResolver) {
        yesNoModalResolver(Boolean(confirmed));
        yesNoModalResolver = null;
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

async function showGridPanel(forceReload = false) {

    hideAllPanels();
    document.getElementById('grid-screen').style.display = 'block';
    updateTabSelection('grid');
    toggleTabBar(true);

    ptrIndicator = document.getElementById('ptr-indicator');
    ptrText = document.getElementById('ptr-text');

    const feedContainer = document.getElementById('feed');

    if (forceReload) {
        resetGridPaginationState();
        resetSlideshow();
    }
    
    await ensureLikedMediaIdsForCurrentUser();

    if (!forceReload && tryRestoreGridPanelFromSession(feedContainer)) {
        sessionStorage.setItem('lastActivePanel', 'grid');
        updateTabSelection('grid');
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

async function showFeedPanel(forceReload = false) {
    hideAllPanels();
    document.getElementById('feed-screen').style.display = 'block';
    toggleTabBar(true);

    const feedContainer = document.getElementById('feed-list');

    await ensureLikedMediaIdsForCurrentUser();

    feedState.renderedCount = 0;
    feedState.isAppending = false;

    if (!forceReload && Array.isArray(gridFeedState.media) && gridFeedState.media.length > 0 && feedContainer) {
        try {
            const bulkLikeSummary = await getBulkLikes();
            syncLikeSummaryForMedia(gridFeedState.media, bulkLikeSummary);
        } catch (error) {
            console.warn('Impossibile caricare il riepilogo bulk dei like:', error);
        }

        try {
            const bulkCommentSummary = await getBulkComments();
            syncCommentSummaryForMedia(gridFeedState.media, bulkCommentSummary);
        } catch (error) {
            console.warn('Impossibile caricare il riepilogo bulk dei commenti:', error);
        }

        renderFeedPanelFromMedia(feedContainer);
        sessionStorage.setItem('lastActivePanel', 'feed');
        updateTabSelection('feed');
        return;
    }

    if (!forceReload) {
        const sessionStates = readAppStatesFromSession();
        if (sessionStates && applyStatesFromSession(sessionStates) && Array.isArray(gridFeedState.media) && gridFeedState.media.length > 0 && feedContainer) {
            try {
                const bulkLikeSummary = await getBulkLikes();
                syncLikeSummaryForMedia(gridFeedState.media, bulkLikeSummary);
            } catch (error) {
                console.warn('Impossibile caricare il riepilogo bulk dei like:', error);
            }

            try {
                const bulkCommentSummary = await getBulkComments();
                syncCommentSummaryForMedia(gridFeedState.media, bulkCommentSummary);
            } catch (error) {
                console.warn('Impossibile caricare il riepilogo bulk dei commenti:', error);
            }

            renderFeedPanelFromMedia(feedContainer);
            sessionStorage.setItem('lastActivePanel', 'feed');
            updateTabSelection('feed');
            return;
        }
    }

    console.log('Richiesta dati per il feed al server...');

    if (feedContainer) {
        feedContainer.innerHTML = "<div class='grid-loading'><span class='loading-spinner' aria-label='Caricamento in corso'></span></div>";
    }

    try {
        const data = await loadImages();

        if (!Array.isArray(data) || !feedContainer) {
            sessionStorage.setItem('lastActivePanel', 'feed');
            updateTabSelection('feed');
            return;
        }

        if (data.length === 0) {
            showMessage('Nessun elemento presente nella galleria.');
            feedContainer.innerHTML = "<p style='text-align:center;'></p>";
            sessionStorage.setItem('lastActivePanel', 'feed');
            updateTabSelection('feed');
            return;
        }

        const mediaItems = Array.isArray(data) ? data : [];

        try {
            const bulkLikeSummary = await getBulkLikes();
            syncLikeSummaryForMedia(mediaItems, bulkLikeSummary);
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
        gridFeedState.renderedCount = 0;
        renderFeedPanelFromMedia(feedContainer);
        saveAppStatesToSession();
    } catch (error) {
        console.error('Errore in showFeedPanel: ', error.message);
        showMessage(error.message || 'Impossibile caricare il feed.');

        if (feedContainer) {
            feedContainer.innerHTML = "<p style='text-align:center; color:red;'></p>";
        }
    }

    sessionStorage.setItem('lastActivePanel', 'feed');
    updateTabSelection('feed');
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

function removeMediaFromClientState(mediaItemOrCode) {
    const mediaCode = String(
        typeof mediaItemOrCode === 'string'
            ? mediaItemOrCode
            : getMediaCode(mediaItemOrCode)
    ).trim();

    if (!mediaCode) {
        return;
    }

    const deletedThumbnailUrl = typeof mediaItemOrCode === 'object' && mediaItemOrCode
        ? getThumbnailMediaImageUrl(mediaItemOrCode)
        : '';

    gridFeedState.media = Array.isArray(gridFeedState.media)
        ? gridFeedState.media.filter(function(item) {
            return String(getMediaCode(item)) !== mediaCode;
        })
        : [];

    gridFeedState.renderedCount = Math.min(gridFeedState.renderedCount, gridFeedState.media.length);

    if (deletedThumbnailUrl && Array.isArray(slideshowState.imageUrls)) {
        slideshowState.imageUrls = slideshowState.imageUrls.filter(function(url) {
            return String(url) !== deletedThumbnailUrl;
        });
    }

    if (slideshowState.currentIndex >= slideshowState.imageUrls.length) {
        slideshowState.currentIndex = slideshowState.imageUrls.length > 0 ? 0 : 0;
    }

    saveGridFeedStateToSession();
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

function createFeedItemMarkup(item, index) {
    const mediaUrl = getThumbnailMediaImageUrl(item) || 'img/no-image.jpg';
    const isVideo = item && item.mimeType && item.mimeType.startsWith('video/');
    const uploaderName = escapeHtml(getMediaUploaderName(item));
    const uploaderProfileImageUrl = escapeHtml(getMediaUploaderProfileImageUrl(item));
    const mediaCode = getMediaCode(item);
    const mediaUploadedAt = item.createdAt || item.uploadedAt || item.date || item.dataCaricamento || '';
    const mediaUploadedAtLabel = mediaUploadedAt ? formatItalianDate(mediaUploadedAt) : 'Data non disponibile';
    const safeMediaCode = escapeHtml(String(mediaCode || ''));
    const initialLikeCount = getLikeCountByCode(mediaCode) || Number(item.likeCount || item.likes || 0) || 0;
    const initialCommentCount = getCommentCountByCode(mediaCode) || Number(item.commentCount || item.comments || 0) || 0;
    const canManageMedia = canCurrentUserManageMedia();

    return `
        <article class="feed-card" data-media-index="${index}" data-media-code="${safeMediaCode}">
            <div class="feed-card__header">
                <div class="feed-card__user">
                    <img src="${uploaderProfileImageUrl}" alt="Profilo utente" class="feed-card__avatar" />
                    <div class="feed-card__user-meta">
                        <span class="feed-card__uploader">${uploaderName}</span>
                        <span class="feed-card__datetime">${mediaUploadedAtLabel}</span>
                    </div>
                </div>
            </div>
            <div class="feed-card__media">
                <img src="${mediaUrl}" alt="${uploaderName}" loading="lazy" />
                ${isVideo ? `
                    <div class="feed-video-overlay" aria-hidden="true">
                        <span class="feed-video-play"></span>
                    </div>
                ` : ''}
            </div>
            <div class="feed-card__footer">
                <div class="feed-card__actions" aria-label="Azioni media">
                    <div class="feed-action-group feed-action-group--like">
                        <button type="button" class="feed-action feed-action--like" data-feed-action="like" data-liked="${item.isLiked || item.liked ? 'true' : 'false'}" aria-label="Mi piace" aria-pressed="${item.isLiked || item.liked ? 'true' : 'false'}">
                            <i class="fa fa-heart-o" aria-hidden="true"></i>
                        </button>
                        <span class="feed-action-count feed-action-count--likes" data-count="${initialLikeCount}">${initialLikeCount}</span>
                    </div>
                    <div class="feed-action-group feed-action-group--comment">
                        <button type="button" class="feed-action feed-action--comment" data-feed-action="comment" aria-label="Commenti">
                            <i class="fa fa-comment-o" aria-hidden="true"></i>
                        </button>
                        <span class="feed-action-count feed-action-count--comments" data-count="${initialCommentCount}">${initialCommentCount}</span>
                    </div>
                    ${canManageMedia ? `
                        <button type="button" class="feed-action feed-action--download" data-feed-action="download" data-download-url="${escapeHtml(String(item.originalUrl || item.src || item.previewUrl || item.thumbnailUrl || ''))}" aria-label="Scarica media">
                            <i class="fa fa-download" aria-hidden="true"></i>
                        </button>
                        <button type="button" class="feed-action feed-action--delete" data-feed-action="delete" aria-label="Cancella media">
                            <i class="fa fa-trash-o" aria-hidden="true"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </article>
    `;
}

function bindFeedItemInteractions(feedContainer) {
    if (!feedContainer || feedContainer._feedInteractionsBound) {
        return;
    }

    feedContainer._feedInteractionsBound = true;

    feedContainer.addEventListener('click', async function(event) {
        const actionButton = event.target.closest('[data-feed-action]');

        if (actionButton && feedContainer.contains(actionButton)) {
            event.preventDefault();
            event.stopPropagation();

            const card = actionButton.closest('.feed-card');
            const mediaIndex = Number(card && card.dataset ? card.dataset.mediaIndex : NaN);
            const mediaItem = Number.isInteger(mediaIndex) ? gridFeedState.media[mediaIndex] : null;

            if (!mediaItem) {
                return;
            }

            const action = actionButton.dataset.feedAction;

            if (action === 'like') {
                if (actionButton.dataset.liked === 'true') {
                    return;
                }

                const likeCountElement = actionButton.nextElementSibling;
                const mediaCode = getMediaCode(mediaItem);
                const user = localStorage.getItem('userName') || 'guest';
                actionButton.disabled = true;

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

                    applyLikeVisualState(actionButton, likeCountElement, true, nextCount);
                } catch (error) {
                    console.error('Errore nell\'aggiunta del like dal feed:', error);
                    showMessage('Impossibile aggiungere il like al momento.');
                    actionButton.disabled = false;
                }

                return;
            }

            if (action === 'comment') {
                const feedScreen = document.getElementById('feed-screen');
                const commentCountElement = actionButton.nextElementSibling;
                await openCommentsSheetForMedia(feedScreen, mediaItem, commentCountElement);
                return;
            }

            if (action === 'download') {
                const downloadUrlValue = (actionButton.dataset.downloadUrl || '').trim();
                if (!downloadUrlValue) {
                    actionButton.disabled = true;
                    actionButton.title = 'Download non disponibile';
                    return;
                }

                const safeUrl = downloadUrlValue;
                const fileName = (mediaItem.name || safeUrl.split('/').pop() || `${mediaItem.mimeType && mediaItem.mimeType.startsWith('video/') ? 'video' : 'image'}-${Date.now()}`);
                const link = document.createElement('a');
                link.href = safeUrl;
                link.download = fileName;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                link.remove();
                return;
            }

            if (action === 'delete') {
                const currentUser = (localStorage.getItem('userName') || '').trim().toLowerCase();

                if (currentUser !== 'sposo' && currentUser !== 'sposa') {
                    showMessage('Utente non valido.');
                    return;
                }

                const confirmed = await showYesNoModal('Vuoi cancellare questo media? L\'operazione non si può annullare.', 'Conferma cancellazione');
                if (!confirmed) {
                    return;
                }

                actionButton.disabled = true;

                try {
                    await cancelMedia(currentUser, getMediaCode(mediaItem));
                    removeMediaFromClientState(mediaItem);
                    await showFeedPanel(true);
                    showMessage('Media cancellato con successo.');
                } catch (error) {
                    console.error('Errore nella cancellazione del media dal feed:', error);
                    showMessage(error && error.message ? error.message : 'Impossibile cancellare il media al momento.');
                    actionButton.disabled = false;
                }
            }

            return;
        }

        const card = event.target.closest('.feed-card');
        if (!card || !feedContainer.contains(card)) {
            return;
        }

        const mediaIndex = Number(card.dataset.mediaIndex);
        if (!Number.isInteger(mediaIndex)) {
            return;
        }

        const mediaItem = gridFeedState.media[mediaIndex];
        if (mediaItem) {
            showDetailScreen(mediaItem, mediaIndex);
        }
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

function resetFeedPaginationState() {
    detachFeedInfiniteScroll();
    feedState.renderedCount = 0;
    feedState.isAppending = false;
}

function detachFeedInfiniteScroll() {
    if (feedState.observer) {
        feedState.observer.disconnect();
        feedState.observer = null;
    }

    if (feedState.sentinel && feedState.sentinel.parentNode) {
        feedState.sentinel.parentNode.removeChild(feedState.sentinel);
    }

    feedState.sentinel = null;
}

function initializeFeedCardState(card, item) {
    if (!card || !item) {
        return;
    }

    const mediaCode = getMediaCode(item);
    const likeButton = card.querySelector('.feed-action--like');
    const likeCountElement = card.querySelector('.feed-action-count--likes');
    const commentCountElement = card.querySelector('.feed-action-count--comments');
    const downloadButton = card.querySelector('.feed-action--download');

    if (likeButton && likeCountElement) {
        const initialLikeCount = getLikeCountByCode(mediaCode) || Number(item.likeCount || item.likes || 0) || 0;
        const alreadyLikedByUser = isMediaLikedByCurrentUser(item);
        applyLikeVisualState(likeButton, likeCountElement, alreadyLikedByUser || Boolean(item.isLiked || item.liked), initialLikeCount);
    }

    if (commentCountElement) {
        const initialCommentCount = getCommentCountByCode(mediaCode) || Number(item.commentCount || item.comments || 0) || 0;
        commentCountElement.textContent = String(initialCommentCount);
        commentCountElement.dataset.count = String(initialCommentCount);
    }

    if (downloadButton) {
        const downloadUrlValue = (downloadButton.dataset.downloadUrl || '').trim();
        if (!downloadUrlValue) {
            downloadButton.disabled = true;
            downloadButton.title = 'Download non disponibile';
        }
    }

    card.setAttribute('data-feed-ready', '1');
}

function appendNextFeedPage(feedContainer) {
    if (!feedContainer || feedState.isAppending) {
        return;
    }

    const totalItems = Array.isArray(gridFeedState.media) ? gridFeedState.media.length : 0;
    if (feedState.renderedCount >= totalItems) {
        if (feedState.observer) {
            feedState.observer.disconnect();
            feedState.observer = null;
        }
        return;
    }

    feedState.isAppending = true;

    const start = feedState.renderedCount;
    const end = Math.min(start + FEED_PAGE_SIZE, totalItems);

    const chunkHtml = gridFeedState.media
        .slice(start, end)
        .map(function(item, index) {
            return createFeedItemMarkup(item, start + index);
        })
        .join('');

    feedContainer.insertAdjacentHTML('beforeend', chunkHtml);

    const newCards = feedContainer.querySelectorAll('.feed-card:not([data-feed-ready])');
    newCards.forEach(function(card) {
        const cardIndex = Number(card.dataset.mediaIndex);
        const item = Number.isInteger(cardIndex) ? gridFeedState.media[cardIndex] : null;
        if (item) {
            initializeFeedCardState(card, item);
        }
    });

    bindFeedItemInteractions(feedContainer);

    feedState.renderedCount = end;

    if (feedState.renderedCount >= totalItems && feedState.observer) {
        feedState.observer.disconnect();
        feedState.observer = null;
    }

    feedState.isAppending = false;
}

function setupFeedInfiniteScroll(feedContainer) {
    const totalItems = Array.isArray(gridFeedState.media) ? gridFeedState.media.length : 0;
    if (!feedContainer || totalItems <= FEED_PAGE_SIZE) {
        return;
    }

    detachFeedInfiniteScroll();

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

    feedState.sentinel = sentinel;
    feedState.observer = new IntersectionObserver(function(entries) {
        if (entries[0] && entries[0].isIntersecting) {
            appendNextFeedPage(feedContainer);
        }
    }, {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.01
    });

    feedState.observer.observe(sentinel);
}

function renderFeedPanelFromMedia(feedContainer) {
    if (!feedContainer) {
        return;
    }

    resetFeedPaginationState();
    feedContainer.innerHTML = '';
    appendNextFeedPage(feedContainer);
    setupFeedInfiniteScroll(feedContainer);
    window.scrollTo(0, 0);
    feedContainer.scrollTop = 0;
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

function getMediaUploaderName(mediaItem) {
    if (!mediaItem) {
        return 'Utente';
    }

    return mediaItem.user || mediaItem.username || mediaItem.uploader || mediaItem.owner || 'Utente';
}

function getMediaUploaderProfileImageUrl(mediaItem) {
    if (!mediaItem || typeof mediaItem.profileImageUrl !== 'string') {
        return 'img/profilo.jpg';
    }

    const profileImageUrl = mediaItem.profileImageUrl.trim();
    return profileImageUrl || 'img/profilo.jpg';
}

function canCurrentUserManageMedia() {
    const currentUserName = (localStorage.getItem('userName') || '').trim().toLowerCase();
    return currentUserName === 'sposo' || currentUserName === 'sposa';
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

function normalizeCommentsForCache(comments) {
    if (!Array.isArray(comments)) {
        return [];
    }

    return comments.map(function(comment) {
        return {
            user: comment && comment.user ? String(comment.user) : 'Utente',
            text: comment && comment.text ? String(comment.text) : '',
            createdAt: comment && comment.createdAt ? String(comment.createdAt) : '',
            profileImageUrl: comment && typeof comment.profileImageUrl === 'string' ? comment.profileImageUrl : ''
        };
    });
}

function setCachedCommentsByCode(mediaCode, comments) {
    const key = normalizeCommentCacheKey(mediaCode);
    if (!key) {
        return;
    }

    const normalizedComments = normalizeCommentsForCache(comments);
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
    button.style.color = '';
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

function buildCommentsListMarkup(comments) {
    const safeComments = Array.isArray(comments) ? comments : [];

    return safeComments.length > 0
        ? safeComments.map((comment) => {
            const userName = comment && comment.user ? String(comment.user) : 'Utente';
            const text = comment && comment.text ? String(comment.text) : '';
            const createdAt = formatItalianDate(comment && comment.createdAt ? comment.createdAt : '');
            const profileImageUrl = comment && typeof comment.profileImageUrl === 'string' && comment.profileImageUrl.trim()
                ? escapeHtml(comment.profileImageUrl.trim())
                : 'img/profilo.jpg';
            return `
                <div class="detail-comments-item">
                    <div class="detail-comments-item__header">
                        <div class="detail-comments-item__identity">
                            <img src="${profileImageUrl}" alt="Profilo utente" class="detail-comments-item__avatar" />
                            <span class="detail-comments-item__user">${userName}</span>
                        </div>
                        <span class="detail-comments-item__date">${createdAt}</span>
                    </div>
                    <p class="detail-comments-item__text">${text}</p>
                </div>
            `;
        }).join('')
        : '<div class="detail-comments-empty">Nessun commento ancora.</div>';
}

function updateCommentCountDisplay(countElement, nextCount) {
    if (!countElement) {
        return;
    }

    countElement.textContent = String(nextCount);
    countElement.dataset.count = String(nextCount);
}

function renderCommentsSheet(detailScreen, comments, mediaCode, options = {}) {
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

    const listMarkup = buildCommentsListMarkup(comments);

    sheet.innerHTML = `
        <div class="detail-comments-sheet__handle"></div>
        <div class="detail-comments-sheet__header">
            <h3>Commenti</h3>
            <button type="button" class="detail-comments-sheet__close" aria-label="Chiudi commenti">
                <i class="fa fa-times" aria-hidden="true"></i>
            </button>
        </div>
        <div class="detail-comments-sheet__list">${listMarkup}</div>
        <div class="detail-comments-sheet__composer" aria-label="Aggiungi commento">
            <textarea class="detail-comments-sheet__input" maxlength="200" rows="1" placeholder="Aggiungi un commento..." aria-label="Scrivi un commento"></textarea>
            <button type="button" class="detail-comments-sheet__submit" aria-label="Invia commento">
                <i class="fa fa-paper-plane" aria-hidden="true"></i>
            </button>
        </div>
    `;

    detailScreen.appendChild(backdrop);
    detailScreen.appendChild(sheet);

    const closeButton = sheet.querySelector('.detail-comments-sheet__close');
    const listElement = sheet.querySelector('.detail-comments-sheet__list');
    const commentInput = sheet.querySelector('.detail-comments-sheet__input');
    const commentSubmitButton = sheet.querySelector('.detail-comments-sheet__submit');
    const mediaItem = options.mediaItem || null;
    const commentCountElement = options.commentCountElement || null;

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

    if (commentInput && commentSubmitButton && mediaCode) {
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

                if (mediaItem) {
                    mediaItem.commentCount = nextCount;
                    mediaItem.comments = nextCount;
                }

                commentCache[String(mediaCode)] = nextCount;
                sessionStorage.setItem(COMMENT_SUMMARY_STORAGE_KEY, JSON.stringify(commentCache));
                updateCommentCountDisplay(commentCountElement, nextCount);

                const refreshedComments = await getCommentsByCodice(mediaCode);
                setCachedCommentsByCode(mediaCode, refreshedComments);

                if (listElement) {
                    listElement.innerHTML = buildCommentsListMarkup(refreshedComments);
                }

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

    requestAnimationFrame(() => {
        backdrop.classList.add('is-visible');
        sheet.classList.add('is-open');
    });

    return sheet;
}

async function openCommentsSheetForMedia(container, mediaItem, commentCountElement) {
    const mediaCode = getMediaCode(mediaItem);

    if (!container || !mediaCode) {
        return;
    }

    try {
        const cachedComments = getCachedCommentsByCode(mediaCode);
        const cachedCommentCount = Array.isArray(cachedComments) ? cachedComments.length : 0;
        const expectedCommentCount = getCommentCountByCode(mediaCode);

        if (Array.isArray(cachedComments) && cachedCommentCount === expectedCommentCount) {
            console.debug('[api] usa cache commenti per codice', mediaCode, 'numero commenti:', cachedComments.length);
            renderCommentsSheet(container, cachedComments, mediaCode, { mediaItem, commentCountElement });
            return;
        }

        if (Array.isArray(cachedComments)) {
            console.debug('[api] cache commenti non allineata per codice', mediaCode, 'cache:', cachedCommentCount, 'expected:', expectedCommentCount);
        }

        console.debug('[api] richiesta backend commenti per codice', mediaCode);
        const comments = await getCommentsByCodice(mediaCode);
        setCachedCommentsByCode(mediaCode, comments);
        renderCommentsSheet(container, comments, mediaCode, { mediaItem, commentCountElement });
    } catch (error) {
        console.error('Errore nel recupero dei commenti:', error);
        renderCommentsSheet(container, [], mediaCode, { mediaItem, commentCountElement });
        showMessage('Impossibile caricare i commenti al momento.');
    }
}

async function showDetailScreen(mediaItem, mediaIndex) {
    const detailScreen = document.getElementById('detail-screen');
    if (!detailScreen || !mediaItem) {
        return;
    }

    const mediaCollectionForCounts = Array.isArray(gridFeedState.media) && gridFeedState.media.length > 0
        ? gridFeedState.media
        : [mediaItem];

    try {
        const bulkLikeSummary = await getBulkLikes();
        syncLikeSummaryForMedia(mediaCollectionForCounts, bulkLikeSummary);
    } catch (error) {
        console.warn('Impossibile caricare il riepilogo bulk dei like:', error);
    }

    try {
        const bulkCommentSummary = await getBulkComments();
        syncCommentSummaryForMedia(mediaCollectionForCounts, bulkCommentSummary);
    } catch (error) {
        console.warn('Impossibile caricare il riepilogo bulk dei commenti:', error);
    }

    const returnPanel = sessionStorage.getItem('lastActivePanel') || 'grid';

    hideAllPanels();
    toggleTabBar(false);
    sessionStorage.setItem(DETAIL_RETURN_PANEL_KEY, returnPanel);
    sessionStorage.setItem('lastActivePanel', 'detail');
    saveDetailScreenState(mediaItem, mediaIndex);
    detailScreen.style.display = 'block';

    const resolvedIndex = Number.isInteger(mediaIndex)
        ? mediaIndex
        : getDetailMediaIndexByItem(mediaItem);
    detailScreen.dataset.mediaIndex = String(resolvedIndex);

    const isVideo = mediaItem.mimeType && mediaItem.mimeType.startsWith('video/');
    const sourceUrl = getMediaDetailSource(mediaItem);
    const downloadUrl = mediaItem.originalUrl || mediaItem.src || mediaItem.previewUrl || mediaItem.thumbnailUrl || sourceUrl || '';

    const mediaMarkup = isVideo
        ? `<video src="${sourceUrl}" controls playsinline autoplay muted></video>`
        : `<img src="${sourceUrl}" alt="Dettaglio media" />`;

    const uploaderName = getMediaUploaderName(mediaItem);
    const uploaderProfileImageUrl = getMediaUploaderProfileImageUrl(mediaItem) || 'img/profilo.jpg';
    const mediaCode = getMediaCode(mediaItem);
    const mediaUploadedAt = mediaItem.createdAt || mediaItem.uploadedAt || mediaItem.date || mediaItem.dataCaricamento || '';
    const mediaUploadedAtLabel = mediaUploadedAt ? formatItalianDate(mediaUploadedAt) : 'Data non disponibile';
    const initialLikeCount = getLikeCountByCode(mediaCode) || Number(mediaItem.likeCount || mediaItem.likes || 0) || 0;
    const initialCommentCount = getCommentCountByCode(mediaCode) || Number(mediaItem.commentCount || mediaItem.comments || 0) || 0;
    const alreadyLikedByUser = isMediaLikedByCurrentUser(mediaItem);
    const canManageMedia = canCurrentUserManageMedia();

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'detail-media-wrapper is-transitioning';
    mediaWrapper.innerHTML = mediaMarkup;

    detailScreen.innerHTML = `
        <div class="detail-header">
            <div class="detail-user">
                <img src="${uploaderProfileImageUrl}" alt="Profilo utente" class="detail-user-avatar" onerror="this.onerror=null;this.src='img/profilo.jpg';" />
                <div class="detail-user-meta">
                    <span class="detail-user-name">${uploaderName}</span>
                    <span class="detail-user-datetime">${mediaUploadedAtLabel}</span>
                </div>
            </div>
            <button type="button" class="detail-close" onclick="closeDetailScreen()" aria-label="Chiudi dettaglio">
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
            ${canManageMedia ? `
            <div class="detail-action-group">
                <button type="button" class="detail-action detail-action--download" data-download-url="${downloadUrl}" aria-label="Scarica media">
                    <i class="fa fa-download" aria-hidden="true"></i>
                </button>
            </div>
            <div class="detail-action-group">
                <button type="button" class="detail-action detail-action--cancel" aria-label="Cancella media">
                    <i class="fa fa-trash-o" aria-hidden="true"></i>
                </button>
            </div>
            ` : ''}
        </div>
        <div class="detail-navigation-hint" aria-hidden="true">Scorri in alto o in basso per il prossimo media</div>
    `);

    const likeButton = detailScreen.querySelector('.detail-action--like');
    const likeCountElement = detailScreen.querySelector('.detail-action--like').nextElementSibling;
    const commentButton = detailScreen.querySelector('.detail-action--comment');
    const commentCountElement = detailScreen.querySelector('.detail-action-count--comments');
    const downloadButton = detailScreen.querySelector('.detail-action--download');
    const cancelButton = detailScreen.querySelector('.detail-action--cancel');

    if (commentButton && mediaCode) {
        commentButton.addEventListener('click', async function() {
            await openCommentsSheetForMedia(detailScreen, mediaItem, commentCountElement);
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

    if (downloadButton) {
        const downloadUrlValue = (downloadButton.dataset.downloadUrl || '').trim();

        if (!downloadUrlValue) {
            downloadButton.disabled = true;
            downloadButton.title = 'Download non disponibile';
        } else {
            downloadButton.addEventListener('click', function() {
                const safeUrl = downloadUrlValue;
                const fileName = (mediaItem.name || safeUrl.split('/').pop() || `${isVideo ? 'video' : 'image'}-${Date.now()}`);
                const link = document.createElement('a');
                link.href = safeUrl;
                link.download = fileName;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                link.remove();
            });
        }
    }

    if (cancelButton && mediaCode) {
        cancelButton.addEventListener('click', async function() {
            const currentUser = (localStorage.getItem('userName') || '').trim().toLowerCase();

            if (currentUser !== 'sposo' && currentUser !== 'sposa') {
                showMessage('Utente non valido.');
                return;
            }

            const confirmed = await showYesNoModal('Vuoi cancellare questo media? L\'operazione non si può annullare.', 'Conferma cancellazione');
            if (!confirmed) {
                return;
            }

            cancelButton.disabled = true;

            try {
                await cancelMedia(currentUser, mediaCode);
                removeMediaFromClientState(mediaItem);
                sessionStorage.removeItem(DETAIL_STATE_KEY);
                await showPanelByName(getDetailReturnPanel(), true);
                showMessage('Media cancellato con successo.');
            } catch (error) {
                console.error('Errore nella cancellazione del media:', error);
                showMessage(error && error.message ? error.message : 'Impossibile cancellare il media al momento.');
                cancelButton.disabled = false;
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
    toggleTabBar(false);
    renderSelectedFilesGrid();
}

function hideAllPanels() {
    // Evita accumulo observer/sentinel al cambio pannello.
    detachGridInfiniteScroll();
    detachFeedInfiniteScroll();

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('grid-screen').style.display = 'none';
    document.getElementById('feed-screen').style.display = 'none';
    document.getElementById('upload-screen').style.display = 'none';
    document.getElementById('detail-screen').style.display = 'none';
    document.getElementById('guestbook-screen').style.display = 'none';
    document.getElementById('profile-screen').style.display = 'none';
}


function login(username, token) {
    console.log("Tentativo di login per utente:", username);
    
    return glogin(username, token)
        .then(() => {
            console.log("Login riuscito per utente:", username);
            showGridPanel(true);
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
        showMessage('Files caricati con successo.');

        // Reset dello stato della Grid e dello Slideshow
        resetGridPaginationState();
        resetSlideshow();
        
        showGridPanel(true);
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

