// נגן מוזיקת רקע - סרטון YouTube מוטמע (בלי להיראות, בלי ציר זמן), כפתור פליי/פאוז יחיד בלבד.
// סקריפט ה-API של יוטיוב נטען רק בלחיצה הראשונה על פליי, לא בטעינת הדף - כדי לא להאט טעינה מיותרת
// כשלא רוצים מוזיקה בכלל

const MUSIC_VIDEO_ID = "sCwtp2lmUEU";

let musicPlayer = null;
let musicPlayerReady = false;
let musicShouldPlayWhenReady = false;
let musicApiRequested = false;

function onYouTubeIframeAPIReady() {
  musicPlayer = new YT.Player("music-player-container", {
    height: "0",
    width: "0",
    videoId: MUSIC_VIDEO_ID,
    playerVars: { playsinline: 1 },
    events: {
      onReady: () => {
        musicPlayerReady = true;
        if (musicShouldPlayWhenReady) musicPlayer.playVideo();
      }
    }
  });
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
