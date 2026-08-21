# WEDDING WEB APP

## Cartella condivisa su google drive:

  https://drive.google.com/drive/folders/1jBjNiCfKyVwBr_h6RQohuEtVCVQdAaN_


## Info Script App

  ID implementazione:
  AKfycbzvpSF6iXQ41oYE6pZDsIKvQlK83vWYt8s7auqQIrKfofzsr7weOliFmLdLO-WD5oHY


  Applicazione web:
  https://script.google.com/macros/s/AKfycbzvpSF6iXQ41oYE6pZDsIKvQlK83vWYt8s7auqQIrKfofzsr7weOliFmLdLO-WD5oHY/exec


  Link applicazione:
  https://mark-arboo.github.io/wedding/index.html






    <!-- Form di Upload -->
    <div class="upload-card">
      <h3>Nuovo Post</h3>
      <input type="file" id="fileInput" accept="image/*,video/*" />
      <textarea id="captionInput" placeholder="Scrivi una descrizione..."></textarea>
      <button id="uploadBtn" onclick="uploadMedia()">Condividi</button>
      <div id="uploadStatus" style="font-size: 12px; text-align: center;"></div>
    </div>

    <!-- Feed della Galleria -->
    <div class="feed" id="feed">
      <div class="loading-spinner">Caricamento galleria...</div>
    </div>
	
	
	
	    data.forEach(item => {
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


    });