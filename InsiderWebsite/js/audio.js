let bgMusic = null;
let resultSound = null;

function playSound(name, volume = 1) {
  const audio = new Audio(`assets/sfx/${name}.mp3`);
  audio.volume = volume;
  audio.play().catch(err => {
    console.error(`Failed to play sound: ${name}.mp3`, err);
  });
  return audio;
}

function startBackgroundMusic() {
  if (bgMusic) return;

  bgMusic = new Audio("assets/sfx/bgm.mp3");
  bgMusic.loop = true;
  bgMusic.volume = 0.25;

  bgMusic.play().catch(err => {
    console.error("Failed to start background music:", err);
  });
}

function stopBackgroundMusic() {
  if (!bgMusic) return;
  bgMusic.pause();
  bgMusic.currentTime = 0;
}

function pauseBackgroundMusic() {
  if (!bgMusic) return;
  bgMusic.pause();
}

function resumeBackgroundMusic() {
  if (!bgMusic) return;
  bgMusic.play().catch(err => {
    console.error("Failed to resume background music:", err);
  });
}

function playResultSound(name) {
  if (resultSound) {
    resultSound.pause();
    resultSound.currentTime = 0;
  }

  resultSound = new Audio(`assets/sfx/${name}.mp3`);
  resultSound.volume = 0.5;

  resultSound.play().catch(err => {
    console.error(`Failed to play result sound: ${name}.mp3`, err);
  });
}