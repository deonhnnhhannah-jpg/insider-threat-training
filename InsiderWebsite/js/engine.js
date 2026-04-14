// engine.js — FINAL STABLE VERSION

let totalIncorrect = 0;
let totalCorrect = 0;
let hotspotMistakes = 0;
let phishingClicked = false;

let currentScene = "intro";
let securityHealth = 100;
let visitedScenes = new Set();

let typingInterval = null;
let isTyping = false;

// hotspot flags
let fakeLinkUsed = false;
let usbHotspotUsed = false;
let chatHotspotUsed = false;
let dbHotspotUsed = false;

// overlays
const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const resultContinue = document.getElementById("resultContinue");

const gameOverOverlay = document.getElementById("gameOverOverlay");
const restartBtn = document.getElementById("restartBtn");

const summaryOverlay = document.getElementById("summaryOverlay");
const summaryRestart = document.getElementById("summaryRestart");

function updateHealthBar() {
  document.getElementById("scoreFill").style.width = securityHealth + "%";
}

function flashScreen(type) {
  const flash = document.createElement("div");
  flash.className = type === "correct" ? "flash-correct" : "flash-incorrect";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 300);
}

function playFeedbackSound(isCorrect) {
  const audio = new Audio(isCorrect ? "assets/sfx/correct.mp3" : "assets/sfx/wrong.mp3");
  audio.volume = 0.5;
  audio.play();
}

function showResultOverlay(isCorrect, explanation, nextSceneId) {
  resultTitle.textContent = isCorrect ? "CORRECT" : "INCORRECT";
  resultTitle.className = isCorrect ? "correct" : "incorrect";
  resultText.textContent = explanation;
  resultOverlay.style.display = "flex";

  flashScreen(isCorrect ? "correct" : "incorrect");
  playFeedbackSound(isCorrect);

  resultContinue.onclick = () => {
    resultOverlay.style.display = "none";
    loadScene(nextSceneId);
  };
}

function applyHealthChange(amount) {
  console.log("applyHealthChange fired:", {
    currentScene,
    amount,
    beforeHealth: securityHealth,
    totalCorrect,
    totalIncorrect,
    hotspotMistakes,
    phishingClicked
  });

  if (amount < 0) totalIncorrect++;
  if (amount > 0) totalCorrect++;

  securityHealth = Math.max(0, Math.min(100, securityHealth + amount));
  updateHealthBar();

  console.log("after applyHealthChange:", {
    securityHealth,
    totalCorrect,
    totalIncorrect
  });

  if (securityHealth <= 0 && currentScene !== "gameover") {
    isTyping = false;
    clearInterval(typingInterval);

    document.querySelectorAll(".choice").forEach(c => c.classList.add("disabled"));

    setTimeout(() => {
      gameOverOverlay.style.display = "flex";
      loadScene("gameover");
    }, 300);

    return;
  }
}

function typeText(fullText, isHtml) {
  const textEl = document.getElementById("text");
  textEl.innerHTML = "";
  let index = 0;
  isTyping = true;

  typingInterval = setInterval(() => {
    if (isHtml) {
      textEl.innerHTML = fullText.slice(0, index + 1);
    } else {
      textEl.textContent = fullText.slice(0, index + 1);
    }
    index++;
    if (index >= fullText.length) {
      clearInterval(typingInterval);
      isTyping = false;
      enableInteractiveElements();
    }
  }, 25);
}

function loadScene(id) {
  currentScene = id;
  const scene = SCENES[id];
  if (!scene) return;

  // ALWAYS hide summary when loading normal scenes
  summaryOverlay.style.display = "none";
  document.getElementById("dialogueBox").style.display = "block";

  const bg = document.getElementById("bg");
  bg.classList.add("fade-in");
  bg.src = scene.bg;
  setTimeout(() => bg.classList.remove("fade-in"), 600);

  const left = document.getElementById("leftChar");
  const right = document.getElementById("rightChar");

  left.classList.add("hidden");
  right.classList.add("hidden");

  if (scene.left) {
    left.src = scene.left;
    left.classList.remove("hidden");
    left.classList.add("slide-in-left");
  }
  if (scene.right) {
    right.src = scene.right;
    right.classList.remove("hidden");
    right.classList.add("slide-in-right");
  }

  document.getElementById("name").textContent = scene.speaker;
  document.getElementById("role").textContent = scene.role || "";

  clearInterval(typingInterval);
  isTyping = false;

  const textEl = document.getElementById("text");
  if (scene.html) {
    textEl.innerHTML = "";
    typeText(scene.text, true);
  } else {
    textEl.innerHTML = "";
    typeText(scene.text, false);
  }

  renderChoices(scene.choices);

  if (id === "summary") {
    showSummary();
  }
}

function renderChoices(choices) {
  const container = document.getElementById("choices");
  container.innerHTML = "";

  let choiceUsed = false;

  choices.forEach(choice => {
    const btn = document.createElement("div");
    btn.className = "choice";
    btn.textContent = choice.text;

    btn.onclick = () => {
      if (choiceUsed) return;
      choiceUsed = true;

      container.querySelectorAll(".choice").forEach(c => c.classList.add("disabled"));

      // Neutral choices
      if (choice.type === "neutral") {

        if (choice.next === "intro") {
          resetGameState();
          loadScene("intro");
          return;
        }

        if (choice.next === "summary") {
          loadScene("summary");
          return;
        }

        loadScene(choice.next);
        return;
      }

      // Graded choices
      const isCorrect = (choice.effect || 0) > 0;

      if (!visitedScenes.has(currentScene)) {
console.log("graded choice clicked:", {
  currentScene,
  text: choice.text,
  effect: choice.effect,
  visited: visitedScenes.has(currentScene)
});
        applyHealthChange(choice.effect);
      }

      visitedScenes.add(currentScene);

      showResultOverlay(isCorrect, choice.feedback || "", choice.next);
    };

    container.appendChild(btn);
  });
}

function enableInteractiveElements() {
  // PHISHING LINK
  const fakeLink = document.getElementById("fakeLink");
  if (fakeLink && !fakeLinkUsed) {
    fakeLink.onclick = () => {
      fakeLinkUsed = true;
      phishingClicked = true;
      hotspotMistakes++;
      applyHealthChange(-30);
      showResultOverlay(false,
        "This is a credential-harvesting link. Clicking it could compromise your account.",
        "phish2"
      );
    };
  }

  // USB HOTSPOT
  const usbHotspot = document.getElementById("usbHotspot");
  if (usbHotspot && !usbHotspotUsed) {
    usbHotspot.onclick = () => {
      console.log("hotspot clicked: fakeLink");
      usbHotspotUsed = true;
      hotspotMistakes++;
      applyHealthChange(-15);
      showResultOverlay(false,
        "Interacting with unknown USB devices is dangerous.",
        "usb2"
      );
    };
  }

  // CHAT HOTSPOT
  const chatHotspot = document.getElementById("chatHotspot");
  if (chatHotspot && !chatHotspotUsed) {
    chatHotspot.onclick = () => {
      console.log("hotspot clicked: fakeLink");
      chatHotspotUsed = true;
      hotspotMistakes++;
      applyHealthChange(-10);
      showResultOverlay(false,
        "Urgency + credential requests are classic social engineering signals.",
        "chat2"
      );
    };
  }

  // DATABASE HOTSPOT
  const dbHotspot = document.getElementById("dbHotspot");
  if (dbHotspot && !dbHotspotUsed) {
    dbHotspot.onclick = () => {
      console.log("hotspot clicked: fakeLink");
      dbHotspotUsed = true;
      hotspotMistakes++;
      applyHealthChange(-20);
      showResultOverlay(false,
        "A full database export contains sensitive data.",
        "exfil2"
      );
    };
  }
}

function showSummary() {
  document.getElementById("dialogueBox").style.display = "none";
  summaryOverlay.style.display = "flex";

  const totalAnswered = totalCorrect + totalIncorrect;
  const scorePercent =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

pauseBackgroundMusic();

if (scorePercent >= 75) {
  playResultSound("applause");
} else {
  playResultSound("sad");
}

  document.getElementById("summaryHealth").textContent =
    "Final Security Health: " + securityHealth + "%";

  document.getElementById("summaryCorrect").textContent =
    "Correct Decisions: " + totalCorrect;

  document.getElementById("summaryIncorrect").textContent =
    "Incorrect Decisions: " + totalIncorrect;

  document.getElementById("summaryHotspots").textContent =
    "Hotspot Mistakes: " + hotspotMistakes;

  document.getElementById("summaryPhishing").textContent =
    phishingClicked
      ? "You clicked a phishing link — attackers could have gained access."
      : "You avoided phishing traps — great job!";

  document.getElementById("summaryGrade").textContent =
    "Score: " + scorePercent + "%";

  let badge = "";
  if (totalAnswered === 0) {
    badge = "⚠️ No scored decisions were recorded.";
  } else if (scorePercent >= 90 && hotspotMistakes === 0 && !phishingClicked) {
    badge = "🏅 Gold Badge — Excellent awareness!";
  } else if (scorePercent >= 75) {
    badge = "🥈 Silver Badge — Strong performance!";
  } else if (scorePercent >= 60) {
    badge = "🥉 Bronze Badge — Needs improvement.";
  } else {
    badge = "🚩 Red Flag — High insider threat risk.";
  }

  document.getElementById("summaryBadge").textContent = badge;

  let advice = "";
  if (totalAnswered === 0) {
    advice = "No answers were recorded. This means the scoring logic did not fire during the run.";
  } else {
    if (phishingClicked) advice += "Be cautious with urgent emails requesting action. ";
    if (hotspotMistakes > 0) advice += "Hotspots indicate curiosity traps — attackers exploit these moments. ";
    if (totalIncorrect > 3) advice += "Review company security policies to strengthen your decision-making. ";
    if (advice === "") advice = "Outstanding work — you demonstrated strong security instincts!";
  }

  document.getElementById("summaryAdvice").textContent = advice;

  console.log("showSummary state:", {
    securityHealth,
    totalCorrect,
    totalIncorrect,
    hotspotMistakes,
    phishingClicked,
    totalAnswered,
    scorePercent
  });
}

function resetGameState() {

if (resultSound) {
  resultSound.pause();
  resultSound.currentTime = 0;
}

stopBackgroundMusic();
bgMusic = null;
startBackgroundMusic();

  securityHealth = 100;
  totalIncorrect = 0;
  totalCorrect = 0;
  hotspotMistakes = 0;
  phishingClicked = false;

  fakeLinkUsed = false;
  usbHotspotUsed = false;
  chatHotspotUsed = false;
  dbHotspotUsed = false;

  visitedScenes = new Set(); // <-- CRITICAL FIX

  updateHealthBar();
}

restartBtn.onclick = () => {
  resetGameState();
  gameOverOverlay.style.display = "none";
  loadScene("intro");
};

summaryRestart.onclick = () => {
  resetGameState();
  summaryOverlay.style.display = "none";
  loadScene("intro");
};

document.getElementById("dialogueBox").onclick = () => {
  if (isTyping) {
    clearInterval(typingInterval);
    const scene = SCENES[currentScene];
    document.getElementById("text").innerHTML = scene.text;
    isTyping = false;
    enableInteractiveElements();
  }
};

window.onload = () => {
  updateHealthBar();
  loadScene(currentScene);

 document.body.addEventListener("click", () => {
    startBackgroundMusic();
  }, { once: true });
};
