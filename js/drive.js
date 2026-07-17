// חיבור לגוגל דרייב האישי של המשתמשת - שמירה/שחזור של קובץ הגיבוי ישירות בענן שלה.
// אין כאן שום שרת של האתר עצמו - הדפדפן מדבר ישירות מול גוגל, עם טוקן שהמשתמשת מאשרת בעצמה
// דרך חלון ההתחברות הרגיל של גוגל. ה-scope הוא drive.file בלבד, כלומר לאתר יש גישה רק
// לקובץ שהוא עצמו יצר בדרייב - לא לשאר הקבצים של המשתמשת.

const DRIVE_CLIENT_ID = "713797775933-mkrb9mdfjh9830nss9cqlgpcnn48j8ug.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_BACKUP_FILENAME = "יומן-עדיה-גיבוי-דרייב.json";

let driveTokenClient = null;
let driveAccessToken = null;

function driveIsLibraryReady() {
  return typeof google !== "undefined" && google.accounts && google.accounts.oauth2;
}

function driveEnsureTokenClient() {
  if (driveTokenClient) return driveTokenClient;
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: DRIVE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: () => {}
  });
  return driveTokenClient;
}

function driveRequestToken(promptMode) {
  return new Promise((resolve, reject) => {
    if (!driveIsLibraryReady()) {
      reject(new Error("שירות ההתחברות של גוגל לא נטען. בדקי חיבור לאינטרנט ונסי שוב."));
      return;
    }
    const client = driveEnsureTokenClient();
    client.callback = (resp) => {
      if (resp.error) {
        reject(new Error("ההתחברות לגוגל בוטלה או נכשלה."));
        return;
      }
      driveAccessToken = resp.access_token;
      resolve(driveAccessToken);
    };
    client.requestAccessToken({ prompt: promptMode });
  });
}

async function driveEnsureToken() {
  if (!driveAccessToken) await driveRequestToken("consent");
  return driveAccessToken;
}

async function driveFindBackupFileId() {
  const query = `name='${DRIVE_BACKUP_FILENAME}' and trashed=false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${driveAccessToken}` } }
  );
  if (!res.ok) throw new Error("חיפוש הקובץ בדרייב נכשל.");
  const data = await res.json();
  return data.files && data.files.length ? data.files[0].id : null;
}

async function driveSaveBackup() {
  try {
    await driveEnsureToken();
    const payload = buildBackupPayload();
    const fileId = await driveFindBackupFileId();
    const metadata = { name: DRIVE_BACKUP_FILENAME, mimeType: "application/json" };
    const boundary = "yoman_backup_boundary";
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n--${boundary}--`;
    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
    const res = await fetch(url, {
      method: fileId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${driveAccessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    });
    if (!res.ok) throw new Error("השמירה לדרייב נכשלה.");
    alert("הגיבוי נשמר בהצלחה בגוגל דרייב שלך!");
  } catch (e) {
    alert("לא הצלחתי לשמור לדרייב: " + e.message);
  }
}

// העלאת PDF של סיכום ("שמירה" בסיכומים) לתיקייה ייעודית בדרייב - נוצרת אוטומטית בפעם הראשונה.
// כל סיכום נשמר תחת אותו קובץ תמיד (item.drivePdfFileId נשמר על הסיכום עצמו), כך שעדכון סיכום
// קיים מעדכן את אותו קובץ בדרייב במקום ליצור עותקים כפולים.
const DRIVE_SUMMARIES_FOLDER_NAME = "סיכומים - PDF";
const DRIVE_SUMMARIES_FOLDER_ID_KEY = "drive_summaries_folder_id_v1";
let driveSummariesFolderId = null;

async function driveEnsureSummariesFolderId() {
  if (driveSummariesFolderId) return driveSummariesFolderId;
  const cached = localStorage.getItem(DRIVE_SUMMARIES_FOLDER_ID_KEY);
  if (cached) {
    driveSummariesFolderId = cached;
    return cached;
  }
  const query = `name='${DRIVE_SUMMARIES_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${driveAccessToken}` } }
  );
  if (!res.ok) throw new Error("חיפוש תיקיית הסיכומים בדרייב נכשל.");
  const data = await res.json();
  if (data.files && data.files.length) {
    driveSummariesFolderId = data.files[0].id;
  } else {
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${driveAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: DRIVE_SUMMARIES_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" })
    });
    if (!createRes.ok) throw new Error("יצירת תיקיית הסיכומים בדרייב נכשלה.");
    const created = await createRes.json();
    driveSummariesFolderId = created.id;
  }
  localStorage.setItem(DRIVE_SUMMARIES_FOLDER_ID_KEY, driveSummariesFolderId);
  return driveSummariesFolderId;
}

async function driveUploadPdfBlob(fileId, folderId, filename, blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const metadata = fileId ? { name: filename } : { name: filename, mimeType: "application/pdf", parents: [folderId] };
  const boundary = "yoman_pdf_boundary";
  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const filePartHeader = `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;
  const body = new Blob([metaPart, filePartHeader, arrayBuffer, closing]);
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
  const res = await fetch(url, {
    method: fileId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${driveAccessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  if (!res.ok) throw new Error("העלאת ה-PDF לדרייב נכשלה.");
  const data = await res.json();
  return data.id;
}

// לא חוסמת את זרימת השמירה הרגילה בסיכומים - רצה ברקע, ורק מציגה שגיאה אם משהו נכשל
async function driveUploadSummaryPDF(item, onPersist) {
  let cleanup = null;
  try {
    await driveEnsureToken();
    const folderId = await driveEnsureSummariesFolderId();
    const printRoot = buildSummaryPrintRoot(item);
    cleanup = mountOffscreenForExport(printRoot);
    const blob = await exportElementToPDFBlob(printRoot, null);
    const filename = `${summaryPdfFilename(item)}.pdf`;
    const fileId = await driveUploadPdfBlob(item.drivePdfFileId || null, folderId, filename, blob);
    item.drivePdfFileId = fileId;
    if (onPersist) onPersist(item);
  } catch (e) {
    alert("שמירת ה-PDF של הסיכום בגוגל דרייב נכשלה: " + e.message);
  } finally {
    if (cleanup) cleanup();
  }
}

async function driveRestoreBackup() {
  try {
    await driveEnsureToken();
    const fileId = await driveFindBackupFileId();
    if (!fileId) {
      alert("לא נמצא קובץ גיבוי בדרייב שלך. צריך קודם ללחוץ על \"שמירה לדרייב\" לפחות פעם אחת.");
      return;
    }
    if (!confirm("שחזור מהדרייב יחליף את כל הנתונים הקיימים באתר. להמשיך?")) return;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${driveAccessToken}` }
    });
    if (!res.ok) throw new Error("קריאת הקובץ מהדרייב נכשלה.");
    const payload = await res.json();
    applyBackupPayload(payload);
    alert("השחזור מהדרייב הושלם בהצלחה! העמוד ייטען מחדש.");
    location.reload();
  } catch (e) {
    alert("לא הצלחתי לשחזר מהדרייב: " + e.message);
  }
}
