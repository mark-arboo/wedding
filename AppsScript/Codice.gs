const FOLDER_ID = "1jBjNiCfKyVwBr_h6RQohuEtVCVQdAaN_"; 

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : null;

  switch (action || 'getImageList') {
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

  switch (action || 'uploadMedia') {
    case 'uploadMedia':
      return uploadMedia(e);
    default:
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Azione POST non supportata"
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