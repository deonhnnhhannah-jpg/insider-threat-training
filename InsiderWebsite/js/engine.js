let currentScene = "intro";
let securityHealth = 100;
let totalCorrect = 0;
let totalIncorrect = 0;
let hotspotMistakes = 0;
let phishingClicked = false;
let visitedScenes = new Set();

let isTyping = false;
let typingInterval = null;
let gameOverTriggered = false;
let gameEndedByFailure = false;

let gameMode = null; // "single" or "multi"
let isHost = false;
let roomCode = null;
let localPlayerRole = null;
let multiplayerStatusText = "";
let partnerConnected = false;
let partnerRole = null;
let localLockedChoiceIndex = null;
let partnerLockedChoiceIndex = null;
let multiplayerRoundResolved = false;
let sceneAdvancePending = false;
const multiplayerBridge = window.insiderMultiplayer || null;

// Main elements
const bg = document.getElementById("bg");
const leftChar = document.getElementById("leftChar");
const rightChar = document.getElementById("rightChar");
const nameEl = document.getElementById("name");
const roleEl = document.getElementById("role");
const textEl = document.getElementById("text");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const scoreFill = document.getElementById("scoreFill");
const dialogueBox = document.getElementById("dialogueBox");
const roleHintEl = document.getElementById("roleHint");
const multiplayerHud = document.getElementById("multiplayerHud");
const multiplayerRoomEl = document.getElementById("multiplayerRoom");
const multiplayerRoleEl = document.getElementById("multiplayerRole");
const multiplayerStatusEl = document.getElementById("multiplayerStatus");

const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const resultContinue = document.getElementById("resultContinue");

const gameOverOverlay = document.getElementById("gameOverOverlay");
const restartBtn = document.getElementById("restartBtn");

const summaryOverlay = document.getElementById("summaryOverlay");
const summaryRestart = document.getElementById("summaryRestart");

// Mode menu
const modeMenu = document.getElementById("modeMenu");
const singlePlayerBtn = document.getElementById("singlePlayerBtn");
const multiPlayerBtn = document.getElementById("multiPlayerBtn");
const multiplayerOptions = document.getElementById("multiplayerOptions");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeInput = document.getElementById("roomCodeInput");

function updateHealthBar() {
  scoreFill.style.width = `${securityHealth}%`;
}

function formatPlayerRole(role) {
  if (role === "employee") return "Employee";
  if (role === "security") return "Security Lead";
  return "Unassigned";
}

function updateMultiplayerHud() {
  if (!multiplayerHud) return;

  if (gameMode !== "multi") {
    multiplayerHud.classList.add("hidden");
    return;
  }

  multiplayerHud.classList.remove("hidden");
  multiplayerRoomEl.textContent = `Room: ${roomCode || "Pending"}`;
  multiplayerRoleEl.textContent = `Role: ${formatPlayerRole(localPlayerRole)}`;
  multiplayerStatusEl.textContent =
    multiplayerStatusText ||
    (partnerConnected
      ? "Partner connected."
      : "Waiting for partner. This local prototype syncs between tabs on the same browser.");
}

function setMultiplayerStatus(message) {
  multiplayerStatusText = message;
  updateMultiplayerHud();
}

function getRoleHint(scene) {
  if (gameMode !== "multi" || !scene || !scene.roleHints || !localPlayerRole) {
    return "";
  }

  return scene.roleHints[localPlayerRole] || "";
}

function renderRoleHint(scene) {
  if (!roleHintEl) return;

  const hint = getRoleHint(scene);
  if (!hint) {
    roleHintEl.classList.add("hidden");
    roleHintEl.textContent = "";
    return;
  }

  roleHintEl.textContent = `${formatPlayerRole(localPlayerRole)} brief: ${hint}`;
  roleHintEl.classList.remove("hidden");
}

function resetMultiplayerRoundState() {
  localLockedChoiceIndex = null;
  partnerLockedChoiceIndex = null;
  multiplayerRoundResolved = false;
  sceneAdvancePending = false;
}

function hasScoredChoices(scene) {
  return Boolean(scene && (scene.choices || []).some(choice => typeof choice.effect !== "undefined"));
}

function updateChoiceStates() {
  document.querySelectorAll(".choice").forEach((choiceEl, index) => {
    choiceEl.classList.toggle("locked", index === localLockedChoiceIndex);

    if (gameMode !== "multi") return;

    if (localLockedChoiceIndex !== null || multiplayerRoundResolved) {
      choiceEl.classList.add("disabled");
    }
  });
}

function setWaitingForPartnerStatus() {
  if (gameMode !== "multi") return;

  if (!partnerConnected) {
    setMultiplayerStatus("Waiting for partner to connect to this room.");
    return;
  }

  if (localLockedChoiceIndex !== null && partnerLockedChoiceIndex === null) {
    setMultiplayerStatus("Choice locked. Waiting for your partner to decide.");
    return;
  }

  if (localLockedChoiceIndex === null && partnerLockedChoiceIndex !== null) {
    setMultiplayerStatus("Your partner locked in. Make your decision.");
    return;
  }

  setMultiplayerStatus("Both players are reviewing the scene.");
}

function getPlayerLabel(role, isLocalPlayer) {
  const label = formatPlayerRole(role);
  return isLocalPlayer ? `You (${label})` : `Partner (${label})`;
}

function buildMultiplayerResultText(scene, result) {
  const localChoiceIndex = isHost ? result.hostChoiceIndex : result.guestChoiceIndex;
  const partnerChoiceIndex = isHost ? result.guestChoiceIndex : result.hostChoiceIndex;
  const localChoice = scene.choices[localChoiceIndex];
  const partnerChoice = scene.choices[partnerChoiceIndex];
  const chosenChoice = scene.choices[result.chosenChoiceIndex];

  return [
    `${getPlayerLabel(localPlayerRole, true)} chose: ${localChoice ? localChoice.text : "No choice"}`,
    `${getPlayerLabel(partnerRole, false)} chose: ${partnerChoice ? partnerChoice.text : "No choice"}`,
    result.summary,
    chosenChoice && chosenChoice.feedback ? chosenChoice.feedback : result.feedback || ""
  ].filter(Boolean).join("\n\n");
}

function getMultiplayerSnapshot() {
  return {
    currentScene,
    securityHealth,
    totalCorrect,
    totalIncorrect,
    hotspotMistakes,
    phishingClicked,
    gameEndedByFailure
  };
}

function applyMultiplayerSnapshot(snapshot) {
  if (!snapshot) return;

  currentScene = snapshot.currentScene || currentScene;
  securityHealth = snapshot.securityHealth;
  totalCorrect = snapshot.totalCorrect;
  totalIncorrect = snapshot.totalIncorrect;
  hotspotMistakes = snapshot.hotspotMistakes;
  phishingClicked = snapshot.phishingClicked;
  gameEndedByFailure = snapshot.gameEndedByFailure;
  updateHealthBar();
}

function broadcastMultiplayer(type, payload) {
  if (gameMode !== "multi" || !multiplayerBridge) return;
  multiplayerBridge.send(type, payload);
}

function resolveMultiplayerChoices(scene, hostChoiceIndex, guestChoiceIndex) {
  const hostChoice = scene.choices[hostChoiceIndex];
  const guestChoice = scene.choices[guestChoiceIndex];
  const hostSafe = (hostChoice.effect || 0) > 0;
  const guestSafe = (guestChoice.effect || 0) > 0;

  if (hostSafe && guestSafe) {
    return {
      chosenChoiceIndex: hostChoiceIndex,
      summary: "Both players identified the safer action.",
      hostChoiceIndex,
      guestChoiceIndex
    };
  }

  if (hostSafe && !guestSafe) {
    return {
      chosenChoiceIndex: hostChoiceIndex,
      summary: "Your team disagreed, but the safer action prevailed.",
      hostChoiceIndex,
      guestChoiceIndex
    };
  }

  if (!hostSafe && guestSafe) {
    return {
      chosenChoiceIndex: guestChoiceIndex,
      summary: "Your team disagreed, but the safer action prevailed.",
      hostChoiceIndex,
      guestChoiceIndex
    };
  }

  return {
    chosenChoiceIndex: hostChoiceIndex,
    summary: "Both players selected the risky action.",
    hostChoiceIndex,
    guestChoiceIndex
  };
}

function showMultiplayerChoiceResult(scene, result) {
  const chosenChoice = scene.choices[result.chosenChoiceIndex];
  const isCorrect = (chosenChoice.effect || 0) > 0;

  resultTitle.textContent = isCorrect ? "Team Decision" : "Team Risk Detected";
  resultTitle.className = isCorrect ? "correct" : "incorrect";
  resultText.textContent = buildMultiplayerResultText(scene, result);
  resultOverlay.style.display = "flex";

  flashScreen(isCorrect);
  playFeedbackSound(isCorrect);

  resultContinue.textContent = isHost ? "Continue" : "Waiting for host";
  resultContinue.onclick = () => {
    resultOverlay.style.display = "none";

    if (!isHost) {
      setMultiplayerStatus("Waiting for host to advance the next scene.");
      return;
    }

    if (securityHealth <= 0) {
      triggerGameOver();
      return;
    }

    if (chosenChoice.next === "summary") {
      showSummary();
      broadcastMultiplayer("show_summary", { snapshot: getMultiplayerSnapshot() });
      return;
    }

    if (chosenChoice.next) {
      broadcastMultiplayer("advance_scene", {
        nextScene: chosenChoice.next,
        snapshot: getMultiplayerSnapshot()
      });
      transitionToScene(chosenChoice.next);
    }
  };
}

function showMultiplayerHotspotResult(payload) {
  resultTitle.textContent = "Hotspot Triggered";
  resultTitle.className = "incorrect";
  resultText.textContent = payload.message;
  resultOverlay.style.display = "flex";

  flashScreen(false);
  playFeedbackSound(false);

  resultContinue.textContent = isHost ? "Continue" : "Waiting for host";
  resultContinue.onclick = () => {
    resultOverlay.style.display = "none";

    if (!isHost) {
      setMultiplayerStatus("Waiting for host to advance the next scene.");
      return;
    }

    if (securityHealth <= 0) {
      triggerGameOver();
      return;
    }

    if (payload.nextScene === "summary") {
      showSummary();
      broadcastMultiplayer("show_summary", { snapshot: getMultiplayerSnapshot() });
      return;
    }

    if (payload.nextScene) {
      broadcastMultiplayer("advance_scene", {
        nextScene: payload.nextScene,
        snapshot: getMultiplayerSnapshot()
      });
      transitionToScene(payload.nextScene);
    }
  };
}

function setupMultiplayerBridge() {
  if (!multiplayerBridge || gameMode !== "multi" || !roomCode || !localPlayerRole) return;

  multiplayerBridge.connect({
    roomCode,
    role: localPlayerRole,
    isHost,
    handlers: {
      presence: message => {
        partnerConnected = true;
        partnerRole = message.role || partnerRole;
        setWaitingForPartnerStatus();

        if (isHost) {
          broadcastMultiplayer("state_sync", {
            snapshot: getMultiplayerSnapshot(),
            nextScene: currentScene
          });
        }
      },
      request_sync: () => {
        if (!isHost) return;
        broadcastMultiplayer("state_sync", {
          snapshot: getMultiplayerSnapshot(),
          nextScene: currentScene
        });
      },
      state_sync: message => {
        if (isHost) return;
        partnerConnected = true;
        partnerRole = message.role || partnerRole;
        applyMultiplayerSnapshot(message.payload.snapshot);
        if (message.payload.nextScene && message.payload.nextScene !== currentScene) {
          loadScene(message.payload.nextScene);
        } else {
          setWaitingForPartnerStatus();
        }
      },
      choice_locked: message => {
        partnerConnected = true;
        partnerRole = message.role || partnerRole;
        partnerLockedChoiceIndex = message.payload.choiceIndex;
        setWaitingForPartnerStatus();

        if (!isHost || localLockedChoiceIndex === null || multiplayerRoundResolved) return;

        const scene = scenes[currentScene];
        if (!scene) return;

        const resolution = resolveMultiplayerChoices(
          scene,
          isHost ? localLockedChoiceIndex : partnerLockedChoiceIndex,
          isHost ? partnerLockedChoiceIndex : localLockedChoiceIndex
        );

        multiplayerRoundResolved = true;
        applyHealthChange(scene.choices[resolution.chosenChoiceIndex].effect || 0);

        if (securityHealth <= 0) return;

        const resultPayload = {
          ...resolution,
          snapshot: getMultiplayerSnapshot()
        };

        broadcastMultiplayer("round_resolved", resultPayload);
        showMultiplayerChoiceResult(scene, resultPayload);
      },
      round_resolved: message => {
        if (isHost) return;
        partnerConnected = true;
        partnerRole = message.role || partnerRole;
        multiplayerRoundResolved = true;
        localLockedChoiceIndex = message.payload.guestChoiceIndex;
        partnerLockedChoiceIndex = message.payload.hostChoiceIndex;
        applyMultiplayerSnapshot(message.payload.snapshot);
        showMultiplayerChoiceResult(scenes[currentScene], message.payload);
      },
      hotspot_triggered: message => {
        if (!isHost || multiplayerRoundResolved || sceneAdvancePending) return;

        const payload = message.payload;
        multiplayerRoundResolved = true;
        applyHealthChange(payload.penalty);
        if (securityHealth <= 0) return;
        const resultPayload = {
          message: payload.message,
          nextScene: payload.nextScene,
          snapshot: getMultiplayerSnapshot()
        };
        broadcastMultiplayer("hotspot_resolved", resultPayload);
        showMultiplayerHotspotResult(resultPayload);
      },
      hotspot_resolved: message => {
        if (isHost) return;
        multiplayerRoundResolved = true;
        applyMultiplayerSnapshot(message.payload.snapshot);
        showMultiplayerHotspotResult(message.payload);
      },
      game_over: message => {
        if (isHost) return;
        applyMultiplayerSnapshot(message.payload.snapshot);
        triggerGameOver();
      },
      advance_scene: message => {
        if (isHost) return;
        applyMultiplayerSnapshot(message.payload.snapshot || getMultiplayerSnapshot());
        loadScene(message.payload.nextScene);
      },
      show_summary: message => {
        if (isHost) return;
        applyMultiplayerSnapshot(message.payload.snapshot);
        showSummary();
      }
    }
  });
}

function transitionToScene(nextScene, delay = 120) {
  if (!nextScene) return;

  dialogueBox.classList.add("scene-fade-out");

  setTimeout(() => {
    loadScene(nextScene);
  }, delay);
}

function triggerGameOver() {
  if (gameOverTriggered) return;

  gameOverTriggered = true;
  gameEndedByFailure = true;
  clearInterval(typingInterval);
  isTyping = false;

  document.querySelectorAll(".choice").forEach(c => c.classList.add("disabled"));
  resultOverlay.style.display = "none";
  summaryOverlay.style.display = "none";
  dialogueBox.style.display = "none";

  if (gameMode === "multi" && isHost) {
    broadcastMultiplayer("game_over", { snapshot: getMultiplayerSnapshot() });
  }

  setTimeout(() => {
    gameOverOverlay.style.display = "flex";
  }, 250);
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function resetGameState() {
  currentScene = "intro";
  securityHealth = 100;
  totalCorrect = 0;
  totalIncorrect = 0;
  hotspotMistakes = 0;
  phishingClicked = false;
  visitedScenes.clear();
  gameOverTriggered = false;
  gameEndedByFailure = false;
  localPlayerRole = null;
  multiplayerStatusText = "";
  partnerConnected = false;
  partnerRole = null;
  resetMultiplayerRoundState();

  clearInterval(typingInterval);
  isTyping = false;

  feedbackEl.style.display = "none";
  resultOverlay.style.display = "none";
  gameOverOverlay.style.display = "none";
  summaryOverlay.style.display = "none";

  dialogueBox.style.display = "block";
  dialogueBox.classList.remove("scene-fade-out");
  choicesEl.innerHTML = "";
  textEl.innerHTML = "";
  nameEl.textContent = "";
  roleEl.textContent = "";
  roleHintEl.textContent = "";
  roleHintEl.classList.add("hidden");
  multiplayerHud.classList.add("hidden");
  if (multiplayerBridge) {
    multiplayerBridge.disconnect();
  }

  if (typeof resultSound !== "undefined" && resultSound) {
    resultSound.pause();
    resultSound.currentTime = 0;
  }

  if (typeof stopBackgroundMusic === "function") {
    stopBackgroundMusic();
  }

  if (typeof bgMusic !== "undefined") {
    bgMusic = null;
  }

  updateHealthBar();
  updateMultiplayerHud();
}

function typeText(text, callback) {
  clearInterval(typingInterval);
  isTyping = true;
  textEl.textContent = "";

  let i = 0;
  typingInterval = setInterval(() => {
    textEl.textContent = text.slice(0, i);
    i++;

    if (i > text.length) {
      clearInterval(typingInterval);
      isTyping = false;
      if (callback) callback();
    }
  }, 18);
}

function typeHtmlText(html, callback) {
  clearInterval(typingInterval);
  isTyping = true;
  textEl.innerHTML = "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const sourceRoot = doc.body.firstChild;

  function cloneNodeShallow(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode("");
    }

    const clone = document.createElement(node.tagName.toLowerCase());
    Array.from(node.attributes).forEach(attr => {
      clone.setAttribute(attr.name, attr.value);
    });
    return clone;
  }

  const pending = [];

  function prepare(sourceNode, targetParent) {
    Array.from(sourceNode.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const targetText = document.createTextNode("");
        targetParent.appendChild(targetText);

        const text = child.textContent || "";
        for (const char of text) {
          pending.push(() => {
            targetText.textContent += char;
          });
        }
        return;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        const targetEl = cloneNodeShallow(child);
        targetParent.appendChild(targetEl);
        prepare(child, targetEl);
      }
    });
  }

  prepare(sourceRoot, textEl);

  if (!pending.length) {
    isTyping = false;
    if (callback) callback();
    return;
  }

  let i = 0;
  typingInterval = setInterval(() => {
    pending[i]();
    i++;

    if (i >= pending.length) {
      clearInterval(typingInterval);
      isTyping = false;
      if (callback) callback();
    }
  }, 18);
}

function flashScreen(isCorrect) {
  const flash = document.createElement("div");
  flash.className = isCorrect ? "flash-correct" : "flash-incorrect";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 300);
}

function playFeedbackSound(isCorrect) {
  const file = isCorrect ? "assets/sfx/correct.mp3" : "assets/sfx/wrong.mp3";
  const audio = new Audio();
  audio.src = file;
  audio.preload = "auto";
  audio.volume = 0.5;
  audio.play().catch(err => {
    console.error("Audio failed to play:", file, err);
  });
}

function showFeedback(message, isGood) {
  feedbackEl.textContent = message;
  feedbackEl.className = "";
  feedbackEl.classList.add(isGood ? "good" : "bad");
  feedbackEl.style.display = "block";
}

function hideFeedback() {
  feedbackEl.style.display = "none";
  feedbackEl.textContent = "";
  feedbackEl.className = "";
}

function applyHealthChange(amount) {
  if (amount < 0) totalIncorrect++;
  if (amount > 0) totalCorrect++;

  securityHealth = Math.max(0, Math.min(100, securityHealth + amount));
  updateHealthBar();

  if (securityHealth <= 0) {
    triggerGameOver();
  }
}

function getHotspotPenalty(scene, fallbackAmount) {
  const matchingChoice = (scene.choices || []).find(choice => (choice.effect || 0) < 0);
  return matchingChoice ? matchingChoice.effect : fallbackAmount;
}

function showChoiceResult(choice) {
  const isCorrect = (choice.effect || 0) > 0;

  resultTitle.textContent = isCorrect ? "Correct Choice" : "Incorrect Choice";
  resultTitle.className = isCorrect ? "correct" : "incorrect";
  resultText.textContent =
    choice.resultText ||
    choice.feedback ||
    (isCorrect
      ? "You made a safe security decision."
      : "This decision increased insider threat risk.");

  resultOverlay.style.display = "flex";

  flashScreen(isCorrect);
  playFeedbackSound(isCorrect);

  resultContinue.onclick = () => {
    resultOverlay.style.display = "none";

    if (securityHealth <= 0) {
      triggerGameOver();
      return;
    }

    if (choice.next === "summary") {
      showSummary();
      return;
    }

    if (choice.next) {
      choicesEl.innerHTML = "";
      transitionToScene(choice.next);
    }
  };
}

function showHotspotResult(message, nextScene = null) {
  resultTitle.textContent = "Incorrect Choice";
  resultTitle.className = "incorrect";
  resultText.textContent = message;

  resultOverlay.style.display = "flex";

  flashScreen(false);
  playFeedbackSound(false);

  resultContinue.onclick = () => {
    resultOverlay.style.display = "none";

    if (securityHealth <= 0) {
      triggerGameOver();
      return;
    }

    if (nextScene === "summary") {
      showSummary();
      return;
    }

    if (nextScene) {
      choicesEl.innerHTML = "";
      transitionToScene(nextScene);
    }
  };
}

function attachHotspots(scene) {
  const fakeLinks = textEl.querySelectorAll(".fake-link");
  const usbHotspots = textEl.querySelectorAll(".usb-hotspot");
  const chatHotspots = textEl.querySelectorAll(".chat-hotspot");
  const dbHotspots = textEl.querySelectorAll(".db-hotspot");

  const handleHotspot = (message, penalty, nextScene) => {
    if (gameMode === "multi") {
      if (!partnerConnected) {
        setMultiplayerStatus("Waiting for a partner before hotspot actions can resolve.");
        return;
      }

      if (multiplayerRoundResolved || sceneAdvancePending) return;

      multiplayerRoundResolved = true;

      if (isHost) {
        applyHealthChange(penalty);
        if (securityHealth <= 0) return;
        const payload = {
          message,
          penalty,
          nextScene,
          snapshot: getMultiplayerSnapshot()
        };
        broadcastMultiplayer("hotspot_resolved", payload);
        showMultiplayerHotspotResult(payload);
      } else {
        broadcastMultiplayer("hotspot_triggered", {
          message,
          penalty,
          nextScene
        });
        setMultiplayerStatus("Hotspot reported. Waiting for host resolution.");
      }
      return;
    }

    applyHealthChange(penalty);
    showHotspotResult(message, nextScene);
  };

  fakeLinks.forEach(el => {
    el.addEventListener("click", () => {
      phishingClicked = true;
      hotspotMistakes++;
      handleHotspot(
        "That link could be phishing. Suspicious links should be reported, not clicked.",
        getHotspotPenalty(scene, -20),
        scene.hotspotNext || null
      );
    });
  });

  usbHotspots.forEach(el => {
    el.addEventListener("click", () => {
      hotspotMistakes++;
      handleHotspot(
        "Unknown USB devices can carry malware. Never plug them in.",
        getHotspotPenalty(scene, -15),
        scene.hotspotNext || null
      );
    });
  });

  chatHotspots.forEach(el => {
    el.addEventListener("click", () => {
      hotspotMistakes++;
      handleHotspot(
        "Sharing internal information in casual chat can create insider threat exposure.",
        getHotspotPenalty(scene, -10),
        scene.hotspotNext || null
      );
    });
  });

  dbHotspots.forEach(el => {
    el.addEventListener("click", () => {
      hotspotMistakes++;
      handleHotspot(
        "Sensitive databases should only be accessed for approved work purposes.",
        getHotspotPenalty(scene, -15),
        scene.hotspotNext || null
      );
    });
  });
}

function renderChoices(scene) {
  choicesEl.innerHTML = "";

  if (!scene.choices || !scene.choices.length) return;

  const scoredScene = gameMode === "multi" && hasScoredChoices(scene);
  const hostControlledNeutralScene = gameMode === "multi" && !scoredScene && !isHost;

  scene.choices.forEach(choice => {
    const btn = document.createElement("div");
    btn.className = "choice";
    btn.textContent = choice.text;

    if (hostControlledNeutralScene) {
      btn.classList.add("disabled");
    }

    btn.addEventListener("click", () => {
      if (btn.classList.contains("disabled") || isTyping) return;

      if (gameMode === "multi" && scoredScene) {
        if (!partnerConnected) {
          setMultiplayerStatus("Waiting for a partner before choices can be locked.");
          return;
        }

        if (localLockedChoiceIndex !== null || multiplayerRoundResolved) return;

        localLockedChoiceIndex = scene.choices.indexOf(choice);
        updateChoiceStates();
        setWaitingForPartnerStatus();
        broadcastMultiplayer("choice_locked", {
          sceneName: currentScene,
          choiceIndex: localLockedChoiceIndex
        });

        if (isHost && partnerLockedChoiceIndex !== null) {
          const resolution = resolveMultiplayerChoices(
            scene,
            localLockedChoiceIndex,
            partnerLockedChoiceIndex
          );

          multiplayerRoundResolved = true;
          applyHealthChange(scene.choices[resolution.chosenChoiceIndex].effect || 0);

          if (securityHealth <= 0) return;

          const resultPayload = {
            ...resolution,
            snapshot: getMultiplayerSnapshot()
          };

          broadcastMultiplayer("round_resolved", resultPayload);
          showMultiplayerChoiceResult(scene, resultPayload);
        }
        return;
      }

      if (hostControlledNeutralScene) return;

      document.querySelectorAll(".choice").forEach(c => c.classList.add("disabled"));
      hideFeedback();

      const hasEffect = typeof choice.effect !== "undefined";

      if (hasEffect) {
        applyHealthChange(choice.effect || 0);
      }

      if (securityHealth <= 0) return;

      if (choice.next === "summary") {
        if (hasEffect) {
          showChoiceResult(choice);
        } else {
          showSummary();
        }
        return;
      }

      if (hasEffect) {
        showChoiceResult(choice);
      } else if (choice.next) {
        if (gameMode === "multi" && isHost) {
          broadcastMultiplayer("advance_scene", {
            nextScene: choice.next,
            snapshot: getMultiplayerSnapshot()
          });
        }
        transitionToScene(choice.next);
      }
    });

    choicesEl.appendChild(btn);
  });

  updateChoiceStates();

  if (hostControlledNeutralScene) {
    setMultiplayerStatus("Waiting for the host to advance.");
  } else if (scoredScene) {
    setWaitingForPartnerStatus();
  }
}

function loadPortrait(imgEl, src, sideClass) {
  imgEl.className = `portrait ${sideClass}`;
  if (!src) {
    imgEl.classList.add("hidden");
    imgEl.removeAttribute("src");
    return;
  }
  imgEl.src = src;
  imgEl.classList.remove("hidden");
}

function loadScene(sceneName) {
  if (sceneName === "summary") {
    showSummary();
    return;
  }

  const scene = scenes[sceneName];
  if (!scene) {
    console.error(`Scene "${sceneName}" not found.`);
    return;
  }

  currentScene = sceneName;
  visitedScenes.add(sceneName);
  resetMultiplayerRoundState();
  hideFeedback();
  resultOverlay.style.display = "none";
  summaryOverlay.style.display = "none";
  gameOverOverlay.style.display = "none";

  clearInterval(typingInterval);
  isTyping = false;

  dialogueBox.style.display = "block";
  dialogueBox.classList.remove("scene-fade-out");

  if (scene.bg) bg.src = scene.bg;

  loadPortrait(leftChar, scene.left, "slide-in-left");
  loadPortrait(rightChar, scene.right, "slide-in-right");

  nameEl.textContent = scene.speaker || "";
  roleEl.textContent = scene.role || "";
  renderRoleHint(scene);
  textEl.innerHTML = "";
  choicesEl.innerHTML = "";

  const finishSceneRender = () => {
    renderChoices(scene);
    if (scene.html) {
      attachHotspots(scene);
    }
    if (gameMode === "multi") {
      setWaitingForPartnerStatus();
    }
  };

  if (scene.html) {
    typeHtmlText(scene.text || "", finishSceneRender);
  } else {
    typeText(scene.text || "", finishSceneRender);
  }
}

function showSummary() {
  resultOverlay.style.display = "none";
  gameOverOverlay.style.display = "none";
  dialogueBox.style.display = "none";
  summaryOverlay.style.display = "flex";

  const totalAnswered = totalCorrect + totalIncorrect;
  const scorePercent =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  if (typeof pauseBackgroundMusic === "function") {
    pauseBackgroundMusic();
  }

  if (typeof playResultSound === "function") {
    if (scorePercent >= 75 && !gameEndedByFailure && securityHealth > 0) {
      playResultSound("applause");
    } else {
      playResultSound("sad");
    }
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
      ? "You clicked a phishing link - attackers could have gained access."
      : "You avoided phishing traps - great job!";

  document.getElementById("summaryGrade").textContent =
    gameEndedByFailure || securityHealth <= 0
      ? "Score: 0% - Training failed"
      : "Score: " + scorePercent + "%";

  let badge = "";
  if (gameEndedByFailure || securityHealth <= 0) {
    badge = "Training Failed - Critical insider threat risk.";
  } else if (totalAnswered === 0) {
    badge = "No scored decisions were recorded.";
  } else if (scorePercent >= 90 && hotspotMistakes === 0 && !phishingClicked) {
    badge = "Gold Badge - Excellent awareness!";
  } else if (scorePercent >= 75) {
    badge = "Silver Badge - Strong performance!";
  } else if (scorePercent >= 60) {
    badge = "Bronze Badge - Needs improvement.";
  } else {
    badge = "Red Flag - High insider threat risk.";
  }

  document.getElementById("summaryBadge").textContent = badge;

  let advice = "";
  if (gameEndedByFailure || securityHealth <= 0) {
    advice = "Your security health reached zero, which means the organization experienced a preventable insider threat failure. Review the risky decisions from this run and replay the training before starting a new session.";
  } else if (totalAnswered === 0) {
    advice = "No answers were recorded. This means the scoring logic did not fire during the run.";
  } else {
    if (phishingClicked) advice += "Be cautious with urgent emails requesting action. ";
    if (hotspotMistakes > 0) advice += "Hotspots indicate curiosity traps - attackers exploit these moments. ";
    if (totalIncorrect > 3) advice += "Review company security policies to strengthen your decision-making. ";
    if (advice === "") advice = "Outstanding work - you demonstrated strong security instincts!";
  }
  document.getElementById("summaryAdvice").textContent = advice;
}

function startSinglePlayer() {
  gameMode = "single";
  isHost = false;
  roomCode = null;
  localPlayerRole = null;
  multiplayerStatusText = "";
  partnerConnected = false;
  partnerRole = null;
  modeMenu.style.display = "none";

  if (typeof startBackgroundMusic === "function") {
    startBackgroundMusic();
  }

  updateHealthBar();
  loadScene("intro");
}

function startMultiplayerAsHost() {
  gameMode = "multi";
  isHost = true;
  roomCode = generateRoomCode();
  localPlayerRole = "employee";
  partnerConnected = false;
  partnerRole = "security";
  setupMultiplayerBridge();
  setMultiplayerStatus(
    multiplayerBridge && multiplayerBridge.mode === "supabase"
      ? "You are hosting. Share the room code so a remote Security Lead can join."
      : "You are hosting. Share the room code and open the same site in another tab or browser profile to test local sync."
  );

  alert("Room created! Share this code: " + roomCode);

  modeMenu.style.display = "none";

  if (typeof startBackgroundMusic === "function") {
    startBackgroundMusic();
  }

  updateHealthBar();
  updateMultiplayerHud();
  loadScene("intro");
}

function joinMultiplayerRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();

  if (!code) {
    alert("Please enter a room code.");
    return;
  }

  gameMode = "multi";
  isHost = false;
  roomCode = code;
  localPlayerRole = "security";
  partnerConnected = false;
  partnerRole = "employee";
  setupMultiplayerBridge();
  setMultiplayerStatus(
    multiplayerBridge && multiplayerBridge.mode === "supabase"
      ? "You joined as Security Lead. Waiting for the host to sync the room."
      : "You joined as Security Lead. Waiting for the host tab to sync the room."
  );

  modeMenu.style.display = "none";

  if (typeof startBackgroundMusic === "function") {
    startBackgroundMusic();
  }

  updateHealthBar();
  updateMultiplayerHud();
  loadScene("intro");
}

if (singlePlayerBtn) {
  singlePlayerBtn.addEventListener("click", startSinglePlayer);
}

if (multiPlayerBtn) {
  multiPlayerBtn.addEventListener("click", () => {
    multiplayerOptions.classList.remove("hidden");
  });
}

if (createRoomBtn) {
  createRoomBtn.addEventListener("click", startMultiplayerAsHost);
}

if (joinRoomBtn) {
  joinRoomBtn.addEventListener("click", joinMultiplayerRoom);
}

if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    showSummary();
  });
}

if (summaryRestart) {
  summaryRestart.addEventListener("click", () => {
    resetGameState();
    modeMenu.style.display = "flex";
  });
}

window.onload = () => {
  updateHealthBar();
  dialogueBox.style.display = "block";

  if (modeMenu) {
    modeMenu.style.display = "flex";
  }
};

