 // INCOLLA QUI L'URL DELL'APPLICAZIONE WEB DI GOOGLE APPS SCRIPT
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyyB0Jdr7KbBPgYwQiA4ta020vx2t0g7kUQ53CHUGwoBUQ-rz-EVv9dNk4nxVSglbvJ/exec";


// 1. Funzione per caricare le immagini/video da Google Drive
async function loadFeed() {
  // const feedContainer = document.getElementById(root);
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getImageList`);
    const result = await response.json();

    if (result && result.status === "success" && Array.isArray(result.data)) {
      return result.data;
    }

    throw new Error("Errore nel caricamento della galleria.");
   
  } catch (err) {
    console.error(err);
    throw new Error("Impossibile connettersi a Google Drive.");
  }
}

async function glogin(user, token) {

    // verifica se username e token sono validi (puoi aggiungere la tua logica di autenticazione qui)
    if (!user || !token) {
        throw new Error("utente o token non validi.");
    }

    const payload = {
      action: "checkUserName",
      user: user,
      token: token
    };
  
    const response = await fetch(`${APPS_SCRIPT_URL}?action=checkUserName`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result && result.status === "success") {
      return true; // Login riuscito
    } else {
      throw new Error(result.message || "Errore durante il login.");
    }


}

// 2. Funzione per inviare foto/video a Google Drive
async function uploadMedia(files, user) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Nessun file selezionato per il caricamento.");
  }

  for (const file of files) {
    // Converti il file in base64
    const base64Data = await convertFileToBase64(file);

    const payload = {
      action: "uploadMedia",
      fileName: file.name,
      mimeType: file.type,
      fileData: String(base64Data).split(",")[1], // Rimuovi il prefisso data:URL
      caption: user
    };

    const response = await fetch(`${APPS_SCRIPT_URL}?action=uploadMedia`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result || result.status !== "success") {
      throw new Error((result && result.message) || "Errore durante l'upload del file.");
    }
  }

  return true;
}

// Utility per convertire File -> Base64 String
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}