// נגן מוזיקת רקע - סרטון YouTube מוטמע (בלי להיראות, בלי ציר זמן), כפתור פליי/פאוז יחיד בלבד.
// סקריפט ה-API של יוטיוב נטען רק בלחיצה הראשונה על פליי, לא בטעינת הדף - כדי לא להאט טעינה מיותרת
// כשלא רוצים מוזיקה בכלל

// ברירת מחדל זהה למה שהיה קבוע בקוד עד עכשיו - זמינה למי שעוד לא בחרה קישור משלה ב"הגדרות"
const DEFAULT_MUSIC_VIDEO_ID = "sCwtp2lmUEU";

function getMusicVideoId() {
  const link = typeof getMusicLink === "function" ? getMusicLink() : "";
  const id = link ? extractYoutubeId(link) : null;
  return id || DEFAULT_MUSIC_VIDEO_ID;
}

let musicPlayer = null;
let musicPlayerReady = false;
let musicShouldPlayWhenReady = false;
let musicApiRequested = false;

function onYouTubeIframeAPIReady() {
  musicPlayer = new YT.Player("music-player-container", {
    height: "0",
    width: "0",
    videoId: getMusicVideoId(),
    playerVars: { playsinline: 1 },
    events: {
      onReady: () => {
        musicPlayerReady = true;
        if (musicShouldPlayWhenReady) musicPlayer.playVideo();
      }
    }
  });
}

// נקראת מ"הגדרות" אחרי שמירת קישור חדש - אם הנגן כבר פעיל בסשן הנוכחי, מחליפה את הסרטון מיד
function resetMusicPlayer() {
  if (musicPlayerReady && musicPlayer && musicPlayer.loadVideoById) {
    musicPlayer.loadVideoById(getMusicVideoId());
  }
}

function initMusicToggle() {
  const btn = document.getElementById("music-toggle");
  let isPlaying = false;

  btn.addEventListener("click", () => {
    if (isPlaying) {
      isPlaying = false;
      btn.textContent = "▶";
      if (musicPlayerReady) musicPlayer.pauseVideo();
      musicShouldPlayWhenReady = false;
      return;
    }
    isPlaying = true;
    btn.textContent = "⏸";
    musicShouldPlayWhenReady = true;
    if (musicPlayerReady) {
      musicPlayer.playVideo();
    } else if (!musicApiRequested) {
      musicApiRequested = true;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  });
}
