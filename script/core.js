// Codice Backend (Google Apps Script - main.gs):
function processForm(e) {
  var folder = DriveApp.getFolderById("INSERISCI_QUI_ID_CARTELLA");
  var blob = Utilities.newBlob(Utilities.base64Decode(e.fileContent), e.mimeType, e.fileName);
  folder.createFile(blob);
}