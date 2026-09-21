const API_URL = "http://localhost:8080/wedding-api";
const WEDDING_TOKEN = "20c8ad3f-0876-42bf-8e56-08f73c7413ea-f7d40330-028e-4399-83f0-4dbd834d3850-2ef4d8ce-3ec6-4279-9df7-3d93aee4b6fc";

// Effettua la login al sistema
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

// Funzione per caricare le immagini/video da Google Drive
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

// Restituisce i commenti associati a un codice specifico
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


// Funzione per inviare foto/video sull'object storage
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
            mimetype: file.type,
            size: file.size
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
            console.log("presigned-url del file " + file.name + ": " + result.data.url);
          } else {
            throw new Error(result.message || "Errore durante l'upload del file.");
          }

          // 2. Caricamento file sulla presigned url
          const uploadResponse = await fetch(result.data.url, {
            method: "PUT",
            headers: {
              "Content-Type": file.type
            },
            body: file
          });

          if (!uploadResponse.ok) {
            throw new Error("Errore durante il caricamento del file sull'object storage.");
          }

          console.log("File " + file.name + " caricato con successo sull'object storage.");

          // 3. Conferma file caricato al server
          const confirmPayload = {
            user: user,
            codice: result.data.codice
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

        // 4. Aggiungi uno sleep per dare il tempo al server di generare le immagini thumbnail
        await new Promise(resolve => setTimeout(resolve, 3000));

        return true;
  
  } catch (err) {
    console.error(err);
    throw new Error("Errore durante il caricamento dei media.");
  }
}

// Invia un messaggio al guestbook al server
async function sendGuestbookMessage(user, message) {
    try {
        if (!user) {
            throw new Error("Utente non valido.");
        }

        if (!message || !String(message).trim()) {
            throw new Error("Messaggio non valido.");
        }

        const payload = {
            user: user,
            message: message
        };

        const response = await fetch(`${API_URL}/api/v1/guestbook/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "wedding-token": WEDDING_TOKEN
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result && result.status === "SUCCESS_STATUS") {
            return true;
        }

        throw new Error(result && result.message ? result.message : "Errore durante l'invio del messaggio al guestbook.");
    } catch (err) {
        console.error(err);
        throw new Error(err && err.message ? err.message : "Errore durante l'invio del messaggio al guestbook.");
    }
}

// Legge i messaggi del guestbook dal server. L'oggetto di ritorno è un array di oggetti aventi i campi: user, message, createdAt.
async function readGuestbookMessages() {
    try {
        const response = await fetch(`${API_URL}/api/v1/guestbook/messages`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "wedding-token": WEDDING_TOKEN
            }
        });

        const result = await response.json();

        if (result && result.status === "SUCCESS_STATUS" && Array.isArray(result.data)) {
            return result.data;
        }

        throw new Error(result && result.message ? result.message : "Errore durante il recupero dei messaggi del guestbook.");
    } catch (err) {
        console.error(err);
        throw new Error(err && err.message ? err.message : "Errore durante il recupero dei messaggi del guestbook.");
    }
}


// API per la cancellazione logica di un media
async function cancelMedia(user, codice) {

    if (!user) {
        throw new Error("Utente non valido.");
    }

    if (!codice || !String(codice).trim()) {
        throw new Error("Codice non valido.");
    }

    const payload = {
        user: user,
        codice: codice
    };

    const response = await fetch(`${API_URL}/api/v1/media/cancel`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "wedding-token": WEDDING_TOKEN
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result && result.status === "SUCCESS_STATUS") {
        return true;
    }

    throw new Error(result && result.message ? result.message : "Errore durante la cancellazione del media.");

}


