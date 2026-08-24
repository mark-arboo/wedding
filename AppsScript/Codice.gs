const FOLDER_ID = "1jBjNiCfKyVwBr_h6RQohuEtVCVQdAaN_"; 
const SPREADSHEET_ID = '1D6b4Sfz0A5v-nwqcwVqvU8EX0N5MFkTm3vX5ksxEEbM';

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : null;

  switch (action) {
    case 'getImageList':
      return getImageList(e);
    default:
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Azione GET non supportata"
      })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const action = e && e.parameter ? e.parameter.action : null;

  switch (action) {
    case 'uploadMedia':
      return uploadMedia(e);
    case 'checkUserName': 
      return checkUserName(e);
    default:
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Azione POST non supportata"
      })).setMimeType(ContentService.MimeType.TEXT);
  }
}

function checkUserName(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('user');
    const data = sheet.getDataRange().getValues();
    
    const request = JSON.parse(e.postData.contents);
  
    // Salta l'intestazione (riga 0)
    for (let i = 1; i < data.length; i++) {
      const user = data[i][0];
      const token = data[i][1];
    
      if (request.user === user && request.token === token) {
        
        return ContentService.createTextOutput(JSON.stringify({
          status: "success"
        })).setMimeType(ContentService.MimeType.TEXT); // NOTA: MimeType TEXT evita il blocco CORS pre-flight
      
      } else if (request.user === user && request.token !== token) {
        
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Nome già presente"
        })).setMimeType(ContentService.MimeType.TEXT);
      }
    }

    // Inserisce una nuova riga in fondo al foglio
    sheet.appendRow([ escapeHtml(request.user.trim()), request.token]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success"
    })).setMimeType(ContentService.MimeType.TEXT); // NOTA: MimeType TEXT evita il blocco CORS pre-flight

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.TEXT);
  } 

}

function uploadMedia(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    const bytes = Utilities.base64Decode(data.fileData);
    const blob = Utilities.newBlob(bytes, data.mimeType, data.fileName);
    
    const file = folder.createFile(blob);
    
    if (data.caption) {
      file.setDescription(data.caption);
    }
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: file.getId(),
      fileUrl: `https://lh3.googleusercontent.com/d/${file.getId()}`
    })).setMimeType(ContentService.MimeType.TEXT); // NOTA: MimeType TEXT evita il blocco CORS pre-flight

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.TEXT);
  }
}

function getImageList(e) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    const mediaList = [];

    while (files.hasNext()) {
      const file = files.next();
      mediaList.push({
        id: file.getId(),
        name: file.getName(),
        mimeType: file.getMimeType(),
        caption: file.getDescription() || "",
        created: file.getDateCreated(),
        src: `https://lh3.googleusercontent.com/d/${file.getId()}`
      });
    }

    mediaList.sort((a, b) => new Date(b.created) - new Date(a.created));

    const callback = e && e.parameter ? e.parameter.callback : null;
    if (callback) {
      return ContentService.createTextOutput(
        callback + '(' + JSON.stringify({ status: "success", data: mediaList }) + ')'
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: mediaList
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}



// Funzione di sicurezza per evitare attacchi XSS nei commenti
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/**
 * Funzione temporanea di bootstrap per forzare l'autorizzazione OAuth.
 * Eseguila una volta dall'editor di Apps Script, poi puoi cancellarla.
 */
function forzaAutorizzazioneOAuth() {
  // Tocca Google Sheets: accede a un file temporaneo o fittizio in memoria
  try {
    SpreadsheetApp.getActiveSpreadsheet();
    // Se non è legato a uno Sheet specifico, creiamo un log minimo di un file vuoto
    var tempSheet = SpreadsheetApp.create("Test_OAuth_Temporaneo");
    DriveApp.getFileById(tempSheet.getId()); // Tocca Google Drive usando l'ID dello sheet
    
    // Pulizia immediata: sposta il file di test nel cestino per non sporcare il Drive
    DriveApp.getFileById(tempSheet.getId()).setTrashed(true);
    
    Logger.log("Bootstrap completato con successo! Permessi Sheets e Drive concessi.");
  } catch (e) {
    Logger.log("Nota: " + e.message);
  }
}
