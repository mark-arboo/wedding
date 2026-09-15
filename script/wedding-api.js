 // INCOLLA QUI L'URL DELL'APPLICAZIONE WEB DI GOOGLE APPS SCRIPT
//const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyyB0Jdr7KbBPgYwQiA4ta020vx2t0g7kUQ53CHUGwoBUQ-rz-EVv9dNk4nxVSglbvJ/exec";
const API_URL = "http://localhost:8080/wedding-api";
const WEDDING_TOKEN = "20c8ad3f-0876-42bf-8e56-08f73c7413ea-f7d40330-028e-4399-83f0-4dbd834d3850-2ef4d8ce-3ec6-4279-9df7-3d93aee4b6fc";

// 1. Effettua la login al sistema
async function glogin(user, token) {
  try {
        // verifica se username e token sono validi (puoi aggiungere la tua logica di autenticazione qui)
        if (!user || !token) {
            throw new Error("utente o token non validi.");
        }

        const payload = {
          user: user,
          token: token
        };
      
        const response = await fetch(`${API_URL}/api/v1/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "wedding-token": WEDDING_TOKEN
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result && result.status === "SUCCESS_STATUS") {
          return true; // Login riuscito
        } else {
          throw new Error(result.message || "Errore durante il login.");
        }

  } catch (err) {
    console.error(err);
    throw new Error("Errore durante il login.");
  }
}

// 1. Funzione per caricare le immagini/video da Google Drive
async function loadImages() {
  // const feedContainer = document.getElementById(root);
  try {
    const response = await fetch(`${API_URL}/api/v1/media/images`, {
      headers: {
        "wedding-token": WEDDING_TOKEN
      }
    });
    const result = await response.json();

    if (result && result.status === "SUCCESS_STATUS" && Array.isArray(result.data)) {
      return result.data;
    }

    throw new Error("Errore nel caricamento della galleria.");
   
  } catch (err) {
    console.error(err);
    throw new Error("Impossibile connettersi al server.");
  }
}

// Restituisce il conteggio di tutti i likes di tutte le immagini
async function getBulkLikes() {
  try {
    const response = await fetch(`${API_URL}/api/v1/like/bulk`, {
      headers: {
        "wedding-token": WEDDING_TOKEN
      }
    });
    const result = await response.json();

    if (result && result.status === "SUCCESS_STATUS" && Array.isArray(result.data)) {
        return result.data;
    } else {
        throw new Error(result.message || "Errore durante il recupero dei like.");
    }
  } catch (err) {
    console.error(err);
    throw new Error("Errore durante il recupero dei like.");
  }
}

// Aggiunge il like ad un'immagine
async function addLike(codice, user) {
  try {
    
    if (!codice) {
      throw new Error("Codice non valido.");
    }

    if (!user) {
      throw new Error("Utente non valido.");
    }

    const payload = {
      codice: codice,
      user: user
    };

    const response = await fetch(`${API_URL}/api/v1/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "wedding-token": WEDDING_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result && result.status === "SUCCESS_STATUS") {
      return true; // Like aggiunto con successo
    } else {
      throw new Error(result.message || "Errore durante l'aggiunta del like.");
    }

  } catch (err) {
    console.error(err);
    throw new Error("Errore durante l'aggiunta del like.");
  }
}

// Restituisce l'elenco dei like di un utente specifico
async function getUserLikes(user) {
  try {
    if (!user) {
      throw new Error("Utente non valido.");
    }

    const response = await fetch(`${API_URL}/api/v1/like/${encodeURIComponent(user)}`, {
      headers: {
        "wedding-token": WEDDING_TOKEN
      }
    });
    const result = await response.json();

    if (result && result.status === "SUCCESS_STATUS" && Array.isArray(result.data)) {
      // restituire un array dei soli codici delle immagini che l'utente ha messo like
      return result.data.map(item => String(item.codice));
    } else {
      throw new Error(result.message || "Errore durante il recupero dei like dell'utente.");
    }
  } catch (err) {
    console.error(err);
    throw new Error("Errore durante il recupero dei like dell'utente.");
  }
}


// Invia un commento associato a un'immagine
async function addComment(codice, user, text) {
  try {
        if (!codice) {
          throw new Error("Codice non valido.");
        }

        if (!user) {
          throw new Error("Utente non valido.");
        }

        if (!text) {
          throw new Error("Testo del commento non valido.");
        }

        const payload = {
          codice: codice,
          user: user,
          text: text
        };

        const response = await fetch(`${API_URL}/api/v1/comment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "wedding-token": WEDDING_TOKEN
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result && result.status === "SUCCESS_STATUS") {
          return true; // Commento aggiunto con successo
        } else {
          throw new Error(result.message || "Errore durante l'aggiunta del commento.");
        }

  } catch (err) {
    console.error(err);
    throw new Error("Errore durante l'aggiunta del commento.");
  }
}



// Restituisce il conteggio di tutti i commenti di tutte le immagini
async function getBulkComments() {
  try {
    const response = await fetch(`${API_URL}/api/v1/comment/bulk`, {
      headers: {
        "wedding-token": WEDDING_TOKEN
      }
    });
    const result = await response.json();

    if (result && result.status === "SUCCESS_STATUS" && Array.isArray(result.data)) {
        return result.data;
    } else {
        throw new Error(result.message || "Errore durante il recupero dei commenti.");
    }
  } catch (err) {
    console.error(err);
    throw new Error("Errore durante il recupero dei commenti.");
  }
}

async function getCommentsByCodice(codice) {
  try {
    if (!codice) {
      throw new Error("Codice non valido.");
    }

    const response = await fetch(`${API_URL}/api/v1/comment/${codice}`, {
      headers: {
        "wedding-token": WEDDING_TOKEN
      }
    });
    const result = await response.json();

    if (result && result.status === "SUCCESS_STATUS" && Array.isArray(result.data)) {
      return result.data;
    } else {
      throw new Error(result.message || "Errore durante il recupero dei commenti.");
    }

  } catch (err) {
    console.error(err);
    throw new Error("Errore durante il recupero dei commenti.");
  }


}






// 3. Funzione per inviare foto/video sull'object storage
async function uploadMedia(files, user) {
  try {
  
        if (!Array.isArray(files) || files.length === 0) {
          throw new Error("Nessun file selezionato per il caricamento.");
        }

        for (const file of files) {

          // 1. Richiesta pre-sign URL
          const payload = {
            user: user,
            fileName: file.name,
            mimetype: file.type
          };

          const response = await fetch(`${API_URL}/api/v1/media/upload-url`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "wedding-token": WEDDING_TOKEN
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result && result.status === "SUCCESS_STATUS" && result.data) {
            console.log("presigned-url del file " + file.name + ": " + result.data.presignedUrl);
          } else {
            throw new Error(result.message || "Errore durante l'upload del file.");
          }

          // 2. Caricamento file sulla presigned url
          await fetch(result.data.presignedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type
            },
            body: file
          });

          console.log("File " + file.name + " caricato con successo sull'object storage.");

          // 3. Conferma file caricato al server
          const confirmPayload = {
            user: user,
            codice: result.data.uuid
          };

          const confirmResponse = await fetch(`${API_URL}/api/v1/media/confirm-upload`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "wedding-token": WEDDING_TOKEN
            },
            body: JSON.stringify(confirmPayload)
          });

          const confirmResult = await confirmResponse.json();
          if (!confirmResult || confirmResult.status !== "SUCCESS_STATUS") {
            throw new Error((confirmResult && confirmResult.message) || "Errore durante la conferma dell'upload del file.");
          }
          console.log("File " + file.name + " confermato con successo al server.");

        }

        return true;
  
  } catch (err) {
    console.error(err);
    throw new Error("Errore durante il caricamento dei media.");
  }
}

