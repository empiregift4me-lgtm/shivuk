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
