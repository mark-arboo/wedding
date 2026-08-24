 // INCOLLA QUI L'URL DELL'APPLICAZIONE WEB DI GOOGLE APPS SCRIPT
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyF651upTPqyYGoah0Z1_XgcQHdk-9WUqCOt9H0NSFzvVSBZLLiMacE_MFVhl_2AhY/exec";


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
async function uploadMedia() {
  const fileInput = document.getElementById("fileInput");
  const captionInput = document.getElementById("captionInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const statusDiv = document.getElementById("uploadStatus");

  const file = fileInput.files[0];
  if (!file) {
    alert("Seleziona un file (immagine o video) prima di caricare!");
    return;
  }

  // Blocco UI
  uploadBtn.disabled = true;
  statusDiv.style.color = "#000";
  statusDiv.innerText = "Caricamento in corso... In base alla dimensione del file potrebbe richiedere qualche secondo.";

  try {
    // Converti il file in base64
    const base64Data = await convertFileToBase64(file);

    const payload = {
      fileName: file.name,
      mimeType: file.type,
      fileData: base64Data.split(",")[1], // Rimuovi il prefisso data:URL
      caption: captionInput.value
    };

    const response = await fetch(`${APPS_SCRIPT_URL}?action=uploadMedia`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

      

    if (result.status === "success") {
      statusDiv.style.color = "green";
      statusDiv.innerText = "Caricato con successo!";
      
      // Reset form
      fileInput.value = "";
      captionInput.value = "";
      
      // Ricarica il feed per mostrare la nuova foto/video
      setTimeout(() => {
        statusDiv.innerText = "";
        loadFeed();
      }, 1500);

    } else {
      throw new Error(result.message);
    }

  } catch (err) {
    console.error(err);
    statusDiv.style.color = "red";
    statusDiv.innerText = "Errore durante l'upload. Riprova.";
  } finally {
    uploadBtn.disabled = false;
  }
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