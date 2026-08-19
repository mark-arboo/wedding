 // INCOLLA QUI L'URL DELL'APPLICAZIONE WEB DI GOOGLE APPS SCRIPT
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvpSF6iXQ41oYE6pZDsIKvQlK83vWYt8s7auqQIrKfofzsr7weOliFmLdLO-WD5oHY/exec";


// 1. Funzione per caricare le immagini/video da Google Drive
async function loadFeed(feedContainer) {
  // const feedContainer = document.getElementById(root);
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    const result = await response.json();

    if (result.status === "success") {
      
      return result.data;

       /*
      if (result.data.length === 0) {
          feedContainer.innerHTML = "<p style='text-align:center;'>Nessun elemento presente nella galleria.</p>";
          return;
      }

      result.data.forEach(item => {
        const postElement = document.createElement("div");
        postElement.className = "post";

        // Determina se è un'immagine o un video
        let mediaHtml = "";
        if (item.mimeType.startsWith("video/")) {
          mediaHtml = `<video src="${item.src}" controls playsinline></video>`;
        } else {
          mediaHtml = `<img src="${item.src}" alt="Post Media" loading="lazy" />`;
        }

        const formattedDate = new Date(item.created).toLocaleDateString("it-IT", {
          day: 'numeric', month: 'short', year: 'numeric'
        });

        postElement.innerHTML = `
          <div class="post-header">Google Drive Media</div>
          <div class="post-media">${mediaHtml}</div>
          ${item.caption ? `<div class="post-caption"><strong>Drive User</strong> ${item.caption}</div>` : ''}
          <div class="post-time">${formattedDate}</div>
        `;

        feedContainer.appendChild(postElement);
      });
      */

    } else {
      throw new Error("Errore nel caricamento della galleria.")
      //feedContainer.innerHTML = "<p style='text-align:center; color:red;'>Errore nel caricamento della galleria.</p>";
    }
  } catch (err) {
    console.error(err);
    throw new Error("Impossibile connettersi a Google Drive.");
    //feedContainer.innerHTML = "<p style='text-align:center; color:red;'>Impossibile connettersi a Google Drive.</p>";
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

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.json();

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