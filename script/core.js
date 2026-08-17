



document.addEventListener('DOMContentLoaded', function() {
    setupLoginScreen();
/*
    document.getElementById('enter-button').addEventListener('click', function() {
        showMenuPanel();
    });

    document.getElementById('contact-button').addEventListener('click', function() {
        showContactsPanel();
    });

    document.getElementById('language-button').addEventListener('click', function() {
        showLanguagePanel();
    });
*/
    // Inizializza l'app controllando se è primo caricamento o refresh
    initializeApp();
});

function setupLoginScreen() {
    const nameInput = document.getElementById('login-name');
    const submitButton = document.getElementById('login-submit');

    if (!nameInput || !submitButton) {
        return;
    }

    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
        nameInput.value = savedUserName;
    }

    const proceedToGrid = function() {
        const userName = nameInput.value.trim();

        if (!userName) {
            nameInput.classList.add('is-error');
            nameInput.focus();
            return;
        }

        nameInput.classList.remove('is-error');
        localStorage.setItem('userName', userName);
        showGridPanel();
    };

    submitButton.addEventListener('click', proceedToGrid);

    nameInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            proceedToGrid();
        }
    });

    nameInput.addEventListener('input', function() {
        if (nameInput.value.trim()) {
            nameInput.classList.remove('is-error');
        }
    });
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
            case 'feed':
                showFeedPanel();
                break;          
        }
    } else {
        showLoginPanel();
    }
}


function showGridPanel() {
    // Logica per mostrare il pannello del menu
    hideAllPanels();
    
    //loadFeed();

    sessionStorage.setItem('lastActivePanel', 'grid');
    document.getElementById('grid-screen').style.display = 'block';
}

function showLoginPanel() {
     // Logica per mostrare il pannello del menu
    hideAllPanels();

    sessionStorage.setItem('lastActivePanel', 'login');
    document.getElementById('login-screen').style.display = 'block';
}

function showFeedPanel() {
    // Logica per mostrare il pannello del menu
    hideAllPanels();

    sessionStorage.setItem('lastActivePanel', 'feed');
    document.getElementById('feed-screen').style.display = 'block';
}

function hideAllPanels() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('grid-screen').style.display = 'none';
    document.getElementById('feed-screen').style.display = 'none';
}


