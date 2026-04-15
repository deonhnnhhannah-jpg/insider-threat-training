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
let localPlayerName = "Player";
let multiplayerStatusText = "";
let partnerConnected = false;
let partnerRole = null;
let partnerName = "Waiting for partner";
let localReady = false;
let partnerReady = false;
let localLockedChoiceIndex = null;
let partnerLockedChoiceIndex = null;
let multiplayerRoundResolved = false;
let sceneAdvancePending = false;
let partnerHeartbeatTimeout = null;
let joinPending = false;
let joinTimeoutId = null;
let multiplayerSessionStarted = false;
const multiplayerBridge = window.insiderMultiplayer || null;
let playerPerformance = {
  host: { correct: 0, incorrect: 0, hotspots: 0 },
  guest: { correct: 0, incorrect: 0, hotspots: 0 }
};
let pendingMultiplayerMode = "training";
let activeExperience = "training";
let duelState = null;
let duelPanelDevice = null;
let duelTargetDevice = null;
let duelPoseSyncInterval = null;
let lastBroadcastDuelPose = null;
let partnerDuelPose = null;
let duelForcedPoseAppliedFor = null;
let duelPhysicalTimerInterval = null;
let duelShiftTimerInterval = null;
let mobileDevice = false;

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
const localPlayerCard = document.getElementById("localPlayerCard");
const partnerPlayerCard = document.getElementById("partnerPlayerCard");
const multiplayerReadyBtn = document.getElementById("multiplayerReadyBtn");

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
const playerNameInput = document.getElementById("playerNameInput");
const duelModeBtn = document.getElementById("duelModeBtn");
const modeDescription = document.getElementById("modeDescription");
const multiplayerOptionsLabel = document.getElementById("multiplayerOptionsLabel");
const duelArena = document.getElementById("duelArena");
const duelWorld = document.getElementById("duelWorld");
const duelInteractionPrompt = document.getElementById("duelInteractionPrompt");
const duelRoundLabel = document.getElementById("duelRoundLabel");
const duelRoleLabel = document.getElementById("duelRoleLabel");
const duelStatusTextEl = document.getElementById("duelStatusText");
const officeSignal = document.getElementById("officeSignal");
const hackerSignal = document.getElementById("hackerSignal");
const officeIntegrity = document.getElementById("officeIntegrity");
const hackerIntegrity = document.getElementById("hackerIntegrity");
const duelDeviceViewport = document.getElementById("duelDeviceViewport");
const duelActionTitle = document.getElementById("duelActionTitle");
const duelActionSubtitle = document.getElementById("duelActionSubtitle");
const duelChoices = document.getElementById("duelChoices");
const duelDeviceName = document.getElementById("duelDeviceName");
const duelClosePanelBtn = document.getElementById("duelClosePanelBtn");
const mobileDuelControls = document.getElementById("mobileDuelControls");

function detectMobileDevice() {
  return Boolean(
    window.matchMedia("(max-width: 900px)").matches &&
    (window.matchMedia("(pointer: coarse)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ""))
  );
}

function applyMobileMode() {
  mobileDevice = detectMobileDevice();
  document.body.classList.toggle("is-mobile-device", mobileDevice);
  if (mobileDuelControls) {
    mobileDuelControls.classList.toggle("hidden", !(mobileDevice && activeExperience === "duel"));
  }
  if (window.insiderDuel3D && typeof window.insiderDuel3D.setTouchMode === "function") {
    window.insiderDuel3D.setTouchMode(mobileDevice);
  }
}

function updateHealthBar() {
  scoreFill.style.width = `${securityHealth}%`;
}

function formatPlayerRole(role) {
  if (role === "employee") return "Employee";
  if (role === "security") return "Security Lead";
  if (role === "office") return "Office Operator";
  if (role === "hacker") return "Intrusion Operator";
  return "Unassigned";
}

function createDuelState() {
  return ensureDuelStateDefaults({
    round: 1,
    officePressure: 0,
    officeScore: 0,
    hackerScore: 0,
    officeIntegrity: 3,
    hackerCover: 3,
    maxIntegrity: 3,
    selectedAttackId: null,
    lockedAttackId: null,
    availableAttackIds: [],
    officeDecisionId: null,
    resolved: false,
    finished: false,
    breachCountdownEndsAt: null,
    breachEscalated: false,
    intruderTagged: false,
    closetDoorOpen: false,
    closetOccupied: false,
    networkDisabled: false,
    winner: null,
    outcome: "",
    history: []
  });
}

function clearDuelPoseSync() {
  if (duelPoseSyncInterval) {
    clearInterval(duelPoseSyncInterval);
    duelPoseSyncInterval = null;
  }
  lastBroadcastDuelPose = null;
}

function clearDuelPhysicalTimer() {
  if (duelPhysicalTimerInterval) {
    clearInterval(duelPhysicalTimerInterval);
    duelPhysicalTimerInterval = null;
  }
}

function clearDuelShiftTimer() {
  if (duelShiftTimerInterval) {
    clearInterval(duelShiftTimerInterval);
    duelShiftTimerInterval = null;
  }
}

function createOfficeDailyTasks() {
  return [
    {
      id: "finance-reconcile",
      device: "computer",
      title: "Reconcile vendor approvals",
      description: "Close out the pending vendor approval queue before finance escalates it."
    },
    {
      id: "callback-queue",
      device: "phone",
      title: "Return urgent support callbacks",
      description: "Clear the internal callback queue without trusting the wrong caller."
    },
    {
      id: "print-release",
      device: "printer",
      title: "Release confidential print batch",
      description: "Pick up the secure print run tied to the afternoon legal packet."
    },
    {
      id: "access-audit",
      device: "security-console",
      title: "Review after-hours access log",
      description: "Sign off on the late-floor access audit before the evening shift closes."
    }
  ].map(task => ({ ...task, completed: false }));
}

function ensureDuelStateDefaults(state) {
  const nextState = state || {};
  if (!Array.isArray(nextState.officeTasks) || !nextState.officeTasks.length) {
    nextState.officeTasks = createOfficeDailyTasks();
  } else {
    const defaults = createOfficeDailyTasks();
    nextState.officeTasks = defaults.map(defaultTask => {
      const existing = nextState.officeTasks.find(task => task.id === defaultTask.id) || {};
      return {
        ...defaultTask,
        ...existing,
        completed: Boolean(existing.completed)
      };
    });
  }

  if (typeof nextState.shiftStartAt !== "number") {
    nextState.shiftStartAt = null;
  }
  if (typeof nextState.shiftDurationMs !== "number") {
    nextState.shiftDurationMs = 4 * 60 * 1000;
  }
  if (typeof nextState.closetDoorOpen !== "boolean") {
    nextState.closetDoorOpen = false;
  }
  if (typeof nextState.closetOccupied !== "boolean") {
    nextState.closetOccupied = false;
  }
  if (typeof nextState.networkDisabled !== "boolean") {
    nextState.networkDisabled = false;
  }

  return nextState;
}

function getShiftProgress(state = duelState) {
  if (!state) return 0;
  if (!state.shiftStartAt) return 0;
  const duration = Math.max(1, state.shiftDurationMs || 1);
  return Math.max(0, Math.min(1, (Date.now() - (state.shiftStartAt || Date.now())) / duration));
}

function formatShiftClock(state = duelState) {
  if (!state) return "2:00 PM";
  const startMinutes = 14 * 60;
  const endMinutes = 20 * 60;
  const currentMinutes = Math.round(startMinutes + (endMinutes - startMinutes) * getShiftProgress(state));
  const hours24 = Math.floor(currentMinutes / 60);
  const minutes = currentMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function getCompletedOfficeTaskCount(state = duelState) {
  if (!state || !Array.isArray(state.officeTasks)) return 0;
  return state.officeTasks.filter(task => task.completed).length;
}

function getPendingOfficeTask(state = duelState) {
  if (!state || !Array.isArray(state.officeTasks)) return null;
  return state.officeTasks.find(task => !task.completed) || null;
}

function completeOfficeTask(taskId) {
  if (!duelState || duelState.finished) return;
  const task = Array.isArray(duelState.officeTasks)
    ? duelState.officeTasks.find(entry => entry.id === taskId)
    : null;
  if (!task || task.completed) return;

  if (!isHost) {
    broadcastMultiplayer("duel_task_complete", { taskId });
    return;
  }

  task.completed = true;
  duelState.officeScore += 1;
  saveDuelProgress();
  renderDuelArena();
  broadcastDuelState();
}

function startDuelShiftTimer() {
  clearDuelShiftTimer();
  if (gameMode !== "duel" || !duelState || duelState.finished) return;

  duelShiftTimerInterval = setInterval(() => {
    if (gameMode !== "duel" || !duelState) {
      clearDuelShiftTimer();
      return;
    }

    if (isHost && partnerConnected && !duelState.shiftStartAt) {
      duelState.shiftStartAt = Date.now();
      saveDuelProgress();
      broadcastDuelState();
    }

    if (isHost && !duelState.finished && duelState.shiftStartAt && getShiftProgress(duelState) >= 1) {
      finishDuelMatch(
        "office",
        `8:00 PM. The office held the floor until the end of the shift and completed ${getCompletedOfficeTaskCount(duelState)} of ${duelState.officeTasks.length} daily tasks without giving the attacker a decisive break.`
      );
      return;
    }

    renderDuelArena();
  }, 1000);
}

function getDuelScenarioAvatarAnchor(scenario, role) {
  if (!scenario) return null;

  if (getDuelScenarioDevices(scenario).officeDevice === "access-door") {
    if (role === "hacker") {
      return { x: -10.2, z: -8.6, yaw: 0.72, active: true };
    }
    return { x: -7.8, z: -6.8, yaw: -2.25, active: true };
  }

  if (role === "hacker") {
    return { x: 7.4, z: -7.4, yaw: 2.75, active: true };
  }

  return { x: 0.6, z: -5.4, yaw: Math.PI, active: true };
}

function isPhysicalEntryScenario(scenario) {
  return Boolean(scenario && getDuelScenarioDevices(scenario).officeDevice === "access-door");
}

function isPhysicalBreachCountdownActive() {
  return Boolean(
    duelState &&
    duelState.breachCountdownEndsAt &&
    !duelState.breachEscalated &&
    !duelState.resolved &&
    !duelState.finished
  );
}

function getPhysicalBreachRemainingMs() {
  if (!isPhysicalBreachCountdownActive()) return 0;
  return Math.max(0, duelState.breachCountdownEndsAt - Date.now());
}

function shouldUsePhysicalInfiltrationView() {
  const scenario = getDuelSelectedScenario();
  return Boolean(
    localPlayerRole === "hacker" &&
    duelState &&
    duelState.selectedAttackId &&
    !duelState.resolved &&
    isPhysicalEntryScenario(scenario)
  );
}

function shouldLockHackerMovementForPhysicalBreach() {
  return shouldUsePhysicalInfiltrationView() && Boolean(duelState && !duelState.breachEscalated);
}

function getDuelVisualRole() {
  if (shouldUsePhysicalInfiltrationView()) {
    return "office";
  }
  return localPlayerRole === "hacker" ? "hacker" : "office";
}

function getProjectedPartnerDuelPose() {
  if (gameMode !== "duel" || !partnerConnected) return null;

  const scenario = getDuelSelectedScenario();
  if (!isPhysicalEntryScenario(scenario)) {
    return null;
  }

  if (partnerDuelPose && partnerDuelPose.active !== false) {
    if (duelState && duelState.breachEscalated) {
      return partnerDuelPose;
    }
    if (localPlayerRole === "office") {
      return { ...partnerDuelPose, x: -10.2, z: -8.6, yaw: 0.72, active: true };
    }
    if (localPlayerRole === "hacker") {
      return { ...partnerDuelPose, x: -7.8, z: -6.8, yaw: -2.25, active: true };
    }
    return partnerDuelPose;
  }

  if (duelState && duelState.breachEscalated) {
    return null;
  }

  const partnerSceneRole = localPlayerRole === "office" ? "hacker" : "office";
  return getDuelScenarioAvatarAnchor(scenario, partnerSceneRole);
}

function updateDuelPartnerAvatar() {
  if (!window.insiderDuel3D || typeof window.insiderDuel3D.setPartnerPose !== "function") return;
  const pose = getProjectedPartnerDuelPose();
  if (typeof window.insiderDuel3D.setPartnerVisible === "function") {
    window.insiderDuel3D.setPartnerVisible(Boolean(pose));
  }
  window.insiderDuel3D.setPartnerPose(pose);
}

function maybeBroadcastDuelPose() {
  if (gameMode !== "duel" || !multiplayerBridge || !roomCode || !localPlayerRole || !window.insiderDuel3D) return;
  if (typeof window.insiderDuel3D.getPose !== "function") return;

  const pose = window.insiderDuel3D.getPose();
  if (!pose) return;

  if (
    lastBroadcastDuelPose &&
    Math.abs(lastBroadcastDuelPose.x - pose.x) < 0.015 &&
    Math.abs(lastBroadcastDuelPose.z - pose.z) < 0.015 &&
    Math.abs(lastBroadcastDuelPose.yaw - pose.yaw) < 0.015
  ) {
    return;
  }

  lastBroadcastDuelPose = pose;
  broadcastMultiplayer("duel_pose", { pose });
}

function startDuelPoseSync() {
  clearDuelPoseSync();
  duelPoseSyncInterval = setInterval(() => {
    maybeBroadcastDuelPose();
  }, 80);
}

function startPhysicalBreachCountdown() {
  clearDuelPhysicalTimer();
  if (!isHost || !isPhysicalEntryScenario(getDuelSelectedScenario())) return;

  duelPhysicalTimerInterval = setInterval(() => {
    if (!duelState || duelState.finished || duelState.resolved) {
      clearDuelPhysicalTimer();
      return;
    }

    if (!isPhysicalBreachCountdownActive()) {
      clearDuelPhysicalTimer();
      return;
    }

    if (getPhysicalBreachRemainingMs() > 0) {
      renderDuelArena();
      return;
    }

    duelState.breachCountdownEndsAt = null;
    duelState.breachEscalated = true;
    duelPanelDevice = null;
    saveDuelProgress();
    renderDuelArena();
    broadcastDuelState();
    clearDuelPhysicalTimer();
  }, 250);
}

function cancelPhysicalBreachCountdown() {
  if (!duelState) return;
  duelState.breachCountdownEndsAt = null;
  duelState.breachEscalated = false;
  clearDuelPhysicalTimer();
}

function resolveTaggedIntruder() {
  if (!duelState || duelState.finished || !duelState.breachEscalated) return;

  duelState.intruderTagged = true;
  duelState.resolved = true;
  duelState.officeScore += 2;
  duelState.hackerCover = Math.max(0, duelState.hackerCover - 2);
  saveDuelProgress();
  broadcastDuelState();

  if (duelState.hackerCover <= 0) {
    finishDuelMatch("office", "Security tagged the intruder before they could disable the floor network. The operation is burned.");
    return;
  }

  const message = `You tagged the intruder before they reached the network closet.\n\nAttacker cover dropped. ${getDuelIntegrityLabel(duelState.hackerCover, duelState.maxIntegrity, "Attacker chances left")}`;
  broadcastDuelRoundOverlay("Intruder Tagged", "correct", message);
  continueDuelAfterOverlay(message, "Waiting for the office host to load the next attack.");
}

function completeNetworkClosetSabotage() {
  if (!isHost || !duelState || duelState.finished || !duelState.breachEscalated) return;

  duelState.closetDoorOpen = false;
  duelState.closetOccupied = true;
  duelState.networkDisabled = true;
  duelState.resolved = true;
  duelState.hackerScore += 2;
  duelPanelDevice = null;
  saveDuelProgress();
  renderDuelArena();
  broadcastDuelState();

  setTimeout(() => {
    finishDuelMatch("hacker", "The intruder slipped into the network closet and disabled the office network from inside.");
  }, 1400);
}

function attemptNetworkClosetEntry() {
  if (!duelState || duelState.finished || !duelState.breachEscalated || duelState.closetOccupied) return;
  if (localPlayerRole !== "hacker") return;

  if (isHost) {
    completeNetworkClosetSabotage();
    return;
  }

  broadcastMultiplayer("duel_closet_enter", {});
}

function toggleNetworkClosetDoor(forceOpen) {
  if (!duelState || duelState.finished) return;
  if (duelState.closetOccupied && localPlayerRole !== "hacker") return;

  const nextOpen = typeof forceOpen === "boolean"
    ? forceOpen
    : !duelState.closetDoorOpen;

  if (isHost) {
    duelState.closetDoorOpen = nextOpen;
    saveDuelProgress();
    renderDuelArena();
    broadcastDuelState();
    return;
  }

  broadcastMultiplayer("duel_closet_toggle", { open: nextOpen });
}

function getDuelFailureDamage(outcome, fallback = 1) {
  return Math.max(1, Number(outcome && outcome.damage) || fallback);
}

function getDuelIntegrityLabel(value, maxValue, label) {
  const remaining = Math.max(0, value);
  const total = Math.max(1, maxValue || remaining || 1);
  const filled = "●".repeat(remaining);
  const empty = "○".repeat(Math.max(0, total - remaining));
  return `${label}: ${filled}${empty} (${remaining}/${total})`;
}

function getDuelScenarioById(id) {
  return (window.duelScenarioDeck || duelScenarioDeck || []).find(scenario => scenario.id === id) || null;
}

function getDuelRoleBrief(role) {
  const briefs = window.duelRoleBriefs || duelRoleBriefs || {};
  return briefs[role] || {
    title: formatPlayerRole(role),
    status: "",
    clue: ""
  };
}

function getDefaultDuelScenarioDevices(scenario) {
  if (!scenario) {
    return { attackerDevice: "computer", officeDevice: "computer" };
  }

  const phoneIds = new Set(["chat-vpn", "voice-support"]);
  const printerIds = new Set(["printer-release"]);
  const accessIds = new Set(["badge-tailgate"]);
  const securityIds = new Set(["fake-update"]);
  const intelIds = new Set(["meeting-invite"]);
  const malwareIds = new Set(["fake-update", "shared-drive"]);
  const uplinkIds = new Set(["badge-tailgate"]);

  if (phoneIds.has(scenario.id)) {
    return { attackerDevice: "phone", officeDevice: "phone" };
  }

  if (printerIds.has(scenario.id)) {
    return { attackerDevice: "computer", officeDevice: "printer" };
  }

  if (accessIds.has(scenario.id)) {
    return { attackerDevice: "uplink", officeDevice: "access-door" };
  }

  if (securityIds.has(scenario.id)) {
    return { attackerDevice: malwareIds.has(scenario.id) ? "malware-bench" : "computer", officeDevice: "security-console" };
  }

  if (intelIds.has(scenario.id)) {
    return { attackerDevice: "intel-wall", officeDevice: "computer" };
  }

  if (uplinkIds.has(scenario.id)) {
    return { attackerDevice: "uplink", officeDevice: "computer" };
  }

  if (malwareIds.has(scenario.id)) {
    return { attackerDevice: "malware-bench", officeDevice: "computer" };
  }

  return { attackerDevice: "computer", officeDevice: "computer" };
}

function getDuelScenarioDevices(scenario) {
  const defaults = getDefaultDuelScenarioDevices(scenario);
  return {
    attackerDevice: scenario && scenario.attackerDevice ? scenario.attackerDevice : defaults.attackerDevice,
    officeDevice: scenario && scenario.officeDevice ? scenario.officeDevice : defaults.officeDevice
  };
}

function getDuelDeviceLabel(device) {
  if (device === "phone") {
    return localPlayerRole === "hacker" ? "Burner Phone" : "Work Phone";
  }
  if (device === "printer") {
    return "Secure Printer Bay";
  }
  if (device === "security-console") {
    return "Security Kiosk";
  }
  if (device === "access-door") {
    return "Badge Access Door";
  }
  if (device === "intel-wall") {
    return "Intel Wall";
  }
  if (device === "malware-bench") {
    return "Malware Bench";
  }
  if (device === "uplink") {
    return "Command Uplink";
  }
  if (device === "network-closet") {
    return "Network Closet";
  }

  return localPlayerRole === "hacker" ? "Attack Workstation" : "Office Workstation";
}

function getDuelStationInfo(device) {
  const officeInfo = {
    computer: {
      title: "Office workstation session",
      subtitle: "Inbox, calendar, shared drives, and remote sessions all land here.",
      body: "Use this station for email lures, shared-folder bait, fake updates, and most executive workflow pressure.",
      clue: "Anything that asks you to click, open, sign in, or install should feel suspicious until verified."
    },
    phone: {
      title: "Work phone notifications",
      subtitle: "Chat pings, support callbacks, and QR follow-ups hit this device.",
      body: "This is where mobile prompts and urgent messages arrive when the attacker wants you reacting away from your desk browser.",
      clue: "Attackers love phones because people trust quick mobile prompts more than desktop warnings."
    },
    printer: {
      title: "Secure print release bay",
      subtitle: "Badge release, QR prompts, and unattended jobs show up here.",
      body: "The printer station lets you inspect secure-print instructions and spot physical workflow tampering.",
      clue: "If the instructions on the device do not match the posted process, treat it like a planted lure."
    },
    "security-console": {
      title: "Security kiosk",
      subtitle: "Recent alerts, reports, and policy reminders.",
      body: "This station is for situational awareness. It reinforces which procedures are approved and which panic prompts should be ignored.",
      clue: "A good defender survives longer by checking policy and context before touching a suspicious request."
    },
    "network-closet": {
      title: "Network closet",
      subtitle: "A locked service room with the floor switch stack and power distribution.",
      body: "This closet stays sealed during normal operations. If an intruder slips inside, the office network can be taken offline in seconds.",
      clue: "Only cleared facilities or network staff should ever be inside this room."
    },
    "access-door": {
      title: "Badge access checkpoint",
      subtitle: "Visitor rules and after-hours access logs.",
      body: "Physical pretexts hit here. This station gives you a reason to think about tailgating, badges, escorts, and access boundaries.",
      clue: "Helpful instincts are good, but secure spaces require verification before kindness."
    }
  };

  const hackerInfo = {
    computer: {
      title: "Attack workstation",
      subtitle: "Launch believable email, file-share, and browser-based pretexts.",
      body: "Most campaign actions originate here. Use it to prepare workflow lures that feel like normal corporate tasks.",
      clue: "The best attacks do not feel evil. They feel routine."
    },
    phone: {
      title: "Burner phone",
      subtitle: "Voice social engineering, chat impersonation, and QR follow-through.",
      body: "This station is for pressure tactics that work better through a voice call or mobile interruption than a desktop lure.",
      clue: "People answer faster when a phone makes the urgency feel personal."
    },
    "intel-wall": {
      title: "Intel wall",
      subtitle: "Target patterns, habits, and believable personas.",
      body: "Use this wall to understand how to frame your next pretext. It is an immersion station for campaign planning.",
      clue: "Strong pretexts borrow the language and timing of real work."
    },
    "malware-bench": {
      title: "Malware bench",
      subtitle: "Payload notes, staging ideas, and delivery reminders.",
      body: "This bench is where the attacker side thinks about what happens after a click, install, or remote session lands.",
      clue: "A delivery method is only useful if it matches the target’s daily behavior."
    },
    uplink: {
      title: "Command uplink",
      subtitle: "Room status, operation pace, and escalation view.",
      body: "This station keeps the operation moving and reminds you how much cover you have left before the office burns your campaign.",
      clue: "Escalate too fast and the defender gets cautious. Escalate too slowly and you lose momentum."
    },
    "network-closet": {
      title: "Network closet breach",
      subtitle: "The server racks are inside. Slip in and cut the office network before security closes on you.",
      body: "The moment you get through this door, the office loses direct access. You win by reaching the closet before the defender can tag you.",
      clue: "A believable breach only matters if it gets you within sprinting distance of the closet."
    }
  };

  const source = localPlayerRole === "hacker" ? hackerInfo : officeInfo;
  return source[device] || source.computer;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDuelDisplayNames() {
  const fallbackOffice = "Office Operator";
  const fallbackHacker = "Intrusion Operator";
  return {
    officeName: localPlayerRole === "office"
      ? localPlayerName
      : (partnerConnected ? partnerName : fallbackOffice),
    hackerName: localPlayerRole === "hacker"
      ? localPlayerName
      : (partnerConnected ? partnerName : fallbackHacker)
  };
}

function isOfficePerspective() {
  return localPlayerRole !== "hacker";
}

function getDuelAppName(device, scenario) {
  if (device === "phone") {
    return scenario && scenario.id === "voice-support" ? "Voice Bridge" : "Secure Chat";
  }
  if (device === "printer") {
    return "Print Release";
  }
  if (device === "access-door") {
    return "Vestibule Camera";
  }
  if (device === "security-console") {
    return "Security Console";
  }
  if (device === "intel-wall") {
    return "Campaign Intel";
  }
  if (device === "malware-bench") {
    return "Payload Bench";
  }
  if (device === "uplink") {
    return "Target Uplink";
  }
  if (device === "network-closet") {
    return "Network Closet";
  }
  if (scenario && scenario.id === "meeting-invite") {
    return "Calendar + Mail";
  }
  if (scenario && scenario.id === "shared-drive") {
    return "Shared Drive";
  }
  return "Corporate Mail";
}

function getDuelSidebarItems(device) {
  const officeItems = {
    computer: ["Inbox", "Calendar", "Drive", "Approvals"],
    phone: ["Messages", "Calls", "Authenticator", "Alerts"],
    printer: ["Queue", "Release", "Badge", "Maintenance"],
    "access-door": ["Live Feed", "Visitors", "Badge Log", "Escort Policy"],
    "security-console": ["Incidents", "Policy", "Endpoints", "Reports"],
    "network-closet": ["Closet", "Switches", "Power", "Lockdown"]
  };
  const hackerItems = {
    computer: ["Campaigns", "Spoof Mail", "Attachments", "Sessions"],
    phone: ["SMS", "Calls", "Contacts", "Pressure"],
    "intel-wall": ["Habits", "Pretexts", "Timing", "Targets"],
    "malware-bench": ["Payloads", "Stagers", "Delivery", "Obfuscation"],
    uplink: ["Live Feed", "Door Lure", "Signal", "Fallback"],
    "network-closet": ["Closet", "Route", "Kill", "Exit"]
  };

  const source = localPlayerRole === "hacker" ? hackerItems : officeItems;
  return source[device] || source.computer;
}

function getDuelSignalSummary(device, scenario) {
  if (!scenario) {
    return localPlayerRole === "hacker"
      ? "No lure is active. Build pressure from the room and pick your angle."
      : "No active lure yet. Normal workflow is visible from this station.";
  }

  if (device === "access-door") {
    return "Door camera is live. A person is requesting physical access right now.";
  }
  if (device === "phone") {
    return scenario.id === "voice-support"
      ? "An active voice pretext is live on the line."
      : "A social-engineering message chain is active on mobile.";
  }
  if (device === "printer") {
    return "A physical workflow lure is attached to the printer bay.";
  }
  if (device === "uplink") {
    return "The live building-access pretext is being staged from this console.";
  }
  if (device === "security-console" && duelState && duelState.breachEscalated) {
    return "The intruder is inside. Tag them fast before they reach the network closet.";
  }
  if (device === "network-closet" && duelState && duelState.breachEscalated) {
    return localPlayerRole === "hacker"
      ? "The network closet door is ahead. Get inside before security closes the distance."
      : "The network closet is the intruder's goal. If they get inside first, the floor can go dark instantly.";
  }
  return "The current round is flowing through this device.";
}

function buildDuelPeopleMarkup() {
  const { officeName, hackerName } = getDuelDisplayNames();
  return `
    <div class="duel-people-row">
      <div class="duel-persona-card">
        <div class="duel-avatar office"></div>
        <div>
          <strong>${escapeHtml(officeName)}</strong>
          <span>Office floor</span>
        </div>
      </div>
      <div class="duel-persona-card">
        <div class="duel-avatar hacker"></div>
        <div>
          <strong>${escapeHtml(hackerName)}</strong>
          <span>Dark operations room</span>
        </div>
      </div>
    </div>
  `;
}

function buildDuelScenarioArtifactMarkup(device, scenario, stationInfo) {
  const { officeName, hackerName } = getDuelDisplayNames();
  const showOfficeHints = !isOfficePerspective();
  if (!scenario) {
    return `
      <div class="duel-feed-card">
        <div class="duel-feed-heading">Station overview</div>
        <p>${escapeHtml(stationInfo.body)}</p>
      </div>
      ${showOfficeHints ? `<div class="duel-clue-banner">${escapeHtml(stationInfo.clue)}</div>` : ""}
      ${buildDuelPeopleMarkup()}
    `;
  }

  if (device === "access-door") {
    return `
      <div class="duel-monitor-grid">
        <div class="duel-camera-feed">
          <div class="duel-feed-heading">Live vestibule feed</div>
          <div class="duel-camera-stage">
            <div class="duel-silhouette"></div>
            <div class="duel-camera-caption">${escapeHtml(hackerName)} is visible outside the secure door.</div>
          </div>
        </div>
        <div class="duel-feed-card">
          <div class="duel-feed-heading">Visitor claim</div>
          <p>${escapeHtml(scenario.officeBody)}</p>
          <div class="duel-badge-state">Badge reader status: no valid access token presented</div>
          ${showOfficeHints ? `<div class="duel-clue-banner">${escapeHtml(scenario.officeClue)}</div>` : ""}
        </div>
      </div>
    `;
  }

  if (device === "uplink") {
    return `
      <div class="duel-monitor-grid">
        <div class="duel-feed-card">
          <div class="duel-feed-heading">Live target feed</div>
          <p>${escapeHtml(officeName)} is still inside the office. This round is routed through ${escapeHtml(getDuelDeviceLabel(getDuelScenarioDevices(scenario).officeDevice))}.</p>
          <div class="duel-badge-state">Target status: watching workflow, not yet compromised</div>
        </div>
        <div class="duel-feed-card">
          <div class="duel-feed-heading">Pretext in motion</div>
          <p>${escapeHtml(scenario.attackDescription)}</p>
          <div class="duel-clue-banner">${escapeHtml(scenario.attackerClue)}</div>
        </div>
      </div>
    `;
  }

  if (device === "phone") {
    return `
      <div class="duel-thread">
        <div class="duel-thread-header">${localPlayerRole === "hacker" ? "Social channel composer" : "Mobile alert thread"}</div>
        <div class="duel-message ${localPlayerRole === "hacker" ? "outbound" : "inbound"}">
          <strong>${escapeHtml(localPlayerRole === "hacker" ? hackerName : scenario.officeTitle)}</strong>
          <p>${escapeHtml(localPlayerRole === "hacker" ? scenario.attackDescription : scenario.officeBody)}</p>
        </div>
        <div class="duel-message ${localPlayerRole === "hacker" ? "inbound" : "outbound"}">
          <strong>${escapeHtml(localPlayerRole === "hacker" ? officeName : "Your response")}</strong>
          <p>${escapeHtml(localPlayerRole === "hacker" ? "The office user will decide whether to trust the message or call it out." : "You need to decide whether this contact fits normal company workflow." )}</p>
        </div>
      </div>
    `;
  }

  if (device === "printer") {
    return `
      <div class="duel-feed-card">
        <div class="duel-feed-heading">Printer release screen</div>
        <p>${escapeHtml(scenario.officeBody)}</p>
        <div class="duel-data-table">
          <span>Queue</span><strong>Executive payroll / awaiting auth</strong>
          <span>Release method</span><strong>QR prompt posted over badge instructions</strong>
          <span>Observed issue</span><strong>${escapeHtml(showOfficeHints ? scenario.officeClue : "Release prompt does not fully match the normal posted process.")}</strong>
        </div>
      </div>
    `;
  }

  const title = localPlayerRole === "hacker" ? scenario.attackTitle : scenario.officeTitle;
  const body = localPlayerRole === "hacker" ? scenario.attackDescription : scenario.officeBody;
  const clue = localPlayerRole === "hacker" ? scenario.attackerClue : "";

  return `
    <div class="duel-mail-layout">
      <div class="duel-mail-list">
        <div class="duel-mail-item active">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(localPlayerRole === "hacker" ? "Armed for delivery" : "Unread, urgent")}</span>
        </div>
        <div class="duel-mail-item">
          <strong>${escapeHtml(localPlayerRole === "hacker" ? "Quarterly planning thread" : "Routine calendar note")}</strong>
          <span>${escapeHtml(localPlayerRole === "hacker" ? "Background noise for believable traffic" : "Looks normal")}</span>
        </div>
        <div class="duel-mail-item">
          <strong>${escapeHtml(localPlayerRole === "hacker" ? "Shared drive lure staging" : "Expense receipt reminder")}</strong>
          <span>${escapeHtml(localPlayerRole === "hacker" ? "Dormant fallback" : "Low priority")}</span>
        </div>
      </div>
      <div class="duel-mail-preview">
        <div class="duel-feed-heading">${escapeHtml(title)}</div>
        <p>${escapeHtml(body)}</p>
        ${clue ? `<div class="duel-clue-banner">${escapeHtml(clue)}</div>` : ""}
        ${buildDuelPeopleMarkup()}
      </div>
    </div>
  `;
}

function renderDuelDeviceViewport() {
  if (!duelDeviceViewport) return;

  const stationInfo = duelPanelDevice ? getDuelStationInfo(duelPanelDevice) : null;
  const scenario = getDuelSelectedScenario();
  const activeScenario = duelPanelDevice && scenario && duelPanelDevice === getDuelRequiredDevice() ? scenario : null;
  const appName = getDuelAppName(duelPanelDevice, activeScenario || scenario);
  const sidebarItems = getDuelSidebarItems(duelPanelDevice || "computer");
  const summary = duelPanelDevice
    ? getDuelSignalSummary(duelPanelDevice, activeScenario || scenario)
    : "Walk up to a station and press E to use it.";

  if (!duelPanelDevice || !stationInfo) {
    duelDeviceViewport.innerHTML = `
      <div class="duel-window idle">
        <div class="duel-window-bar">
          <span class="duel-window-dots"><i></i><i></i><i></i></span>
          <span class="duel-window-label">No station connected</span>
        </div>
        <div class="duel-screen-empty">
          <h3>Walk up to a device</h3>
          <p>Use pointer lock to look around, move through the room with WASD, and press E when you reach the station you want to use.</p>
        </div>
      </div>
    `;
    return;
  }

  duelDeviceViewport.innerHTML = `
    <div class="duel-window">
      <div class="duel-window-bar">
        <span class="duel-window-dots"><i></i><i></i><i></i></span>
        <span class="duel-window-label">${escapeHtml(getDuelDeviceLabel(duelPanelDevice))} · ${escapeHtml(appName)}</span>
        <span class="duel-window-mode">${escapeHtml(localPlayerRole === "hacker" ? "Intrusion session" : "Corporate session")}</span>
      </div>
      <div class="duel-window-body">
        <aside class="duel-sidebar">
          ${sidebarItems.map((item, index) => `
            <div class="duel-sidebar-item ${index === 0 ? "active" : ""}">
              <span class="duel-app-chip">${index + 1}</span>
              <span>${escapeHtml(item)}</span>
            </div>
          `).join("")}
        </aside>
        <div class="duel-screen-main">
          <div class="duel-screen-topline">
            <strong>${escapeHtml(stationInfo.title)}</strong>
            <span>${escapeHtml(summary)}</span>
          </div>
          ${buildDuelScenarioArtifactMarkup(duelPanelDevice, activeScenario, stationInfo)}
        </div>
      </div>
    </div>
  `;
}

function loadStoredPlayerName() {
  return localStorage.getItem("insiderPlayerName") || "Player";
}

function createEmptyPerformance() {
  return {
    host: { correct: 0, incorrect: 0, hotspots: 0 },
    guest: { correct: 0, incorrect: 0, hotspots: 0 }
  };
}

function getLocalPerformanceKey() {
  return isHost ? "host" : "guest";
}

function getPartnerPerformanceKey() {
  return isHost ? "guest" : "host";
}

function recordPlayerChoice(key, choice) {
  if (!playerPerformance[key] || !choice) return;

  if ((choice.effect || 0) > 0) {
    playerPerformance[key].correct += 1;
  } else if ((choice.effect || 0) < 0) {
    playerPerformance[key].incorrect += 1;
  }
}

function recordPlayerHotspot(key) {
  if (!playerPerformance[key]) return;
  playerPerformance[key].hotspots += 1;
}

function savePlayerPreferences() {
  localStorage.setItem("insiderPlayerName", localPlayerName);
  const rememberedRoomCode = roomCode || (roomCodeInput ? roomCodeInput.value.trim().toUpperCase() : "");
  localStorage.setItem("insiderLastRoomCode", rememberedRoomCode);
}

function clearJoinTimeout() {
  if (joinTimeoutId) {
    clearTimeout(joinTimeoutId);
    joinTimeoutId = null;
  }
}

function startMultiplayerSession(sceneName) {
  if (!multiplayerSessionStarted) {
    multiplayerSessionStarted = true;
    modeMenu.style.display = "none";

    if (typeof startBackgroundMusic === "function") {
      startBackgroundMusic();
    }
  }

  applyMobileMode();
  updateHealthBar();
  updateMultiplayerHud();
  loadScene(sceneName);
}

function updateModeMenuCopy() {
  if (!modeDescription || !multiplayerOptionsLabel) return;

  if (pendingMultiplayerMode === "duel") {
    modeDescription.textContent = "Prototype mode: one player runs the office terminal while the other stages believable attacks until someone fails.";
    multiplayerOptionsLabel.textContent = "Create a duel room or join one with a code.";
  } else {
    modeDescription.textContent = "Pick a classic training run or test the new endless office-vs-hacker prototype.";
    multiplayerOptionsLabel.textContent = "Create a room or join one with a code.";
  }
}

function setExperienceVisibility(experience) {
  activeExperience = experience;

  const showDuel = experience === "duel";
  if (duelArena) {
    duelArena.classList.toggle("hidden", !showDuel);
  }

  if (dialogueBox) {
    dialogueBox.style.display = showDuel ? "none" : "block";
  }

  if (leftChar) leftChar.classList.toggle("hidden", showDuel);
  if (rightChar) rightChar.classList.toggle("hidden", showDuel);
}

function getEnteredPlayerName() {
  const value = playerNameInput ? playerNameInput.value.trim() : "";
  return value || loadStoredPlayerName();
}

function saveMultiplayerProgress() {
  if (gameMode !== "multi" || !roomCode) return;

  localStorage.setItem(`insiderRoomState:${roomCode}`, JSON.stringify({
    snapshot: getMultiplayerSnapshot(),
    localPlayerRole,
    localPlayerName,
    localReady,
    isHost,
    savedAt: Date.now()
  }));
}

function loadSavedMultiplayerProgress(savedRoomCode, expectedRole) {
  try {
    const raw = localStorage.getItem(`insiderRoomState:${savedRoomCode}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed.localPlayerRole !== expectedRole) return null;
    return parsed;
  } catch (error) {
    console.error("Failed to restore multiplayer progress:", error);
    return null;
  }

  applyMobileMode();
}

function saveDuelProgress() {
  if (gameMode !== "duel" || !roomCode || !duelState) return;

  localStorage.setItem(`insiderDuelState:${roomCode}`, JSON.stringify({
    duelState,
    localPlayerRole,
    localPlayerName,
    isHost,
    savedAt: Date.now()
  }));
}

function loadSavedDuelProgress(savedRoomCode, expectedRole) {
  try {
    const raw = localStorage.getItem(`insiderDuelState:${savedRoomCode}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed.localPlayerRole !== expectedRole) return null;
    return parsed;
  } catch (error) {
    console.error("Failed to restore duel progress:", error);
    return null;
  }
}

function setDuelStatus(message) {
  if (duelStatusTextEl) {
    duelStatusTextEl.textContent = message || "";
  }
  multiplayerStatusText = message || "";
  updateMultiplayerHud();
}

function getRandomDuelAttackIds() {
  const deck = [...(window.duelScenarioDeck || duelScenarioDeck || [])];
  const grouped = new Map();
  const picked = [];
  const maxChoices = Math.min(5, deck.length);

  deck.forEach(scenario => {
    const device = getDuelScenarioDevices(scenario).attackerDevice;
    if (!grouped.has(device)) {
      grouped.set(device, []);
    }
    grouped.get(device).push(scenario);
  });

  const deviceBuckets = Array.from(grouped.values()).sort(() => Math.random() - 0.5);
  deviceBuckets.forEach(bucket => {
    if (picked.length >= maxChoices || !bucket.length) return;
    const choice = bucket[Math.floor(Math.random() * bucket.length)];
    picked.push(choice.id);
  });

  const remaining = deck.filter(scenario => !picked.includes(scenario.id));
  while (remaining.length && picked.length < maxChoices) {
    const index = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(index, 1)[0].id);
  }

  return picked;
}

function buildDuelStatePayload() {
  return {
    duelState,
    roomState: getMultiplayerRoomState()
  };
}

function setDuelInteractionPrompt(text) {
  if (!duelInteractionPrompt) return;
  duelInteractionPrompt.textContent = text || "Move with WASD, jump with Space, click to lock your mouse, and press E near your gear.";
}

function closeDuelDevicePanel() {
  duelPanelDevice = null;
  if (duelArena) {
    duelArena.classList.remove("device-open");
  }
  renderDuelArena();
}

function openDuelDevicePanel(device) {
  if (window.insiderDuel3D && typeof window.insiderDuel3D.releasePointerLock === "function") {
    window.insiderDuel3D.releasePointerLock();
  }
  duelPanelDevice = device;
  if (duelArena) {
    duelArena.classList.add("device-open");
  }
  renderDuelArena();
}

function getDuelRequiredDevice() {
  const scenario = getDuelSelectedScenario();
  const devices = getDuelScenarioDevices(scenario);
  return localPlayerRole === "hacker" ? devices.attackerDevice : devices.officeDevice;
}

function getDuelPromptTargetDevice() {
  if (localPlayerRole === "office" && (!duelState || !duelState.selectedAttackId) && !isPhysicalBreachCountdownActive()) {
    const pendingTask = getPendingOfficeTask();
    if (pendingTask) {
      return pendingTask.device;
    }
  }
  return getDuelRequiredDevice();
}

function shouldAutoOpenDuelDeviceForLocalPlayer() {
  return localPlayerRole === "hacker" && !(duelState && duelState.breachEscalated);
}

function setupDuel3DWorld() {
  if (!duelWorld || !window.insiderDuel3D) return;

  const manager = window.insiderDuel3D;
  const targetRole = getDuelVisualRole();

  if (manager.container !== duelWorld) {
    manager.mount(duelWorld, {
      role: targetRole,
      playerRole: localPlayerRole,
      touchMode: mobileDevice,
      callbacks: {
        onTargetChange: target => {
          duelTargetDevice = target ? target.type : null;
          if (!target) {
            const requiredDevice = getDuelPromptTargetDevice();
            setDuelInteractionPrompt(`Click the scene to lock your mouse. Move with WASD. Press E when you reach your ${getDuelDeviceLabel(requiredDevice)}.`);
            return;
          }
          if (target.type === "network-closet") {
            if (duelState && duelState.closetOccupied && localPlayerRole === "office") {
              setDuelInteractionPrompt("The network closet is sealed from inside.");
              return;
            }
            if (duelState && duelState.closetDoorOpen) {
              setDuelInteractionPrompt(localPlayerRole === "hacker" && duelState.breachEscalated
                ? "Door open. Move into the network closet or press E to close it."
                : "Press E to close the network closet door.");
              return;
            }
            setDuelInteractionPrompt("Press E to open the network closet door.");
            return;
          }
          setDuelInteractionPrompt(target.label);
        },
        onInteract: device => {
          if (device === "network-closet") {
            if (localPlayerRole === "office" && duelState && duelState.closetOccupied) {
              setDuelInteractionPrompt("The intruder sealed the network closet from inside. Tag them before they slip past you next time.");
              return;
            }
            toggleNetworkClosetDoor();
            return;
          }
          openDuelDevicePanel(device);
        },
        onEscape: () => {
          closeDuelDevicePanel();
        },
        onPointerLockChange: locked => {
          if (!locked && !duelPanelDevice) {
            const requiredDevice = getDuelPromptTargetDevice();
            setDuelInteractionPrompt(`Click the scene to lock your mouse. Move with WASD. Press E near your ${getDuelDeviceLabel(requiredDevice)}.`);
          }
        },
        onTagOpportunityChange: canTag => {
          if (duelState && duelState.breachEscalated && localPlayerRole === "office" && canTag) {
            setDuelInteractionPrompt("Intruder in reach. Press F to tag.");
          } else if (duelState && duelState.breachEscalated && localPlayerRole === "office" && !duelTargetDevice) {
            setDuelInteractionPrompt("Find the intruder and press F when you are close enough to tag.");
          }
        },
        onTagAttempt: () => {
          if (duelState && duelState.breachEscalated && localPlayerRole === "office") {
            resolveTaggedIntruder();
          }
        },
        onClosetEntered: () => {
          if (duelState && duelState.breachEscalated && localPlayerRole === "hacker" && duelState.closetDoorOpen && !duelState.closetOccupied) {
            attemptNetworkClosetEntry();
          }
        }
      }
    });
  } else {
    manager.setRole(targetRole);
    manager.playerRole = localPlayerRole;
    if (typeof manager.setTouchMode === "function") {
      manager.setTouchMode(mobileDevice);
    }
  }

  if (typeof manager.setMovementLocked === "function") {
    manager.setMovementLocked(shouldLockHackerMovementForPhysicalBreach());
  }
  if (typeof manager.setTagEnabled === "function") {
    manager.setTagEnabled(Boolean(localPlayerRole === "office" && duelState && duelState.breachEscalated));
  }
  if (typeof manager.setClosetDoorState === "function") {
    const closetDoorOpen = Boolean(duelState && duelState.closetDoorOpen);
    manager.setClosetDoorState(closetDoorOpen);
  }
  if (typeof manager.setClosetBlocked === "function") {
    manager.setClosetBlocked(Boolean(duelState && duelState.closetOccupied && localPlayerRole === "office"));
  }
  const selectedScenario = getDuelSelectedScenario();
  if (!shouldUsePhysicalInfiltrationView()) {
    duelForcedPoseAppliedFor = null;
  }
  if (
    shouldUsePhysicalInfiltrationView() &&
    selectedScenario &&
    duelForcedPoseAppliedFor !== selectedScenario.id &&
    typeof manager.setPlayerPose === "function"
  ) {
    manager.setPlayerPose({ x: -10.5, y: 1.72, z: -10.4, yaw: 0.92, pitch: -0.02 }, true);
    duelForcedPoseAppliedFor = selectedScenario.id;
  }

  updateDuelPartnerAvatar();
}

function setupDuelParallax() {
  return;
}

function broadcastDuelState() {
  if (gameMode !== "duel" || !isHost || !duelState) return;
  broadcastMultiplayer("duel_state", buildDuelStatePayload());
}

function syncDuelState(payload) {
  if (!payload || !payload.duelState) return;

  duelState = ensureDuelStateDefaults(payload.duelState);
  if (duelState.selectedAttackId && shouldAutoOpenDuelDeviceForLocalPlayer()) {
    duelPanelDevice = getDuelRequiredDevice();
  } else if (!shouldAutoOpenDuelDeviceForLocalPlayer()) {
    duelPanelDevice = null;
  }
  applyMultiplayerRoomState(payload.roomState);
  saveDuelProgress();
  renderDuelArena();
}

function startDuelRound() {
  if (!duelState) {
    duelState = createDuelState();
  }

  ensureDuelStateDefaults(duelState);

  duelPanelDevice = null;
  duelForcedPoseAppliedFor = null;
  duelState.selectedAttackId = null;
  duelState.lockedAttackId = null;
  duelState.officeDecisionId = null;
  duelState.resolved = false;
  duelState.outcome = "";
  duelState.breachCountdownEndsAt = null;
  duelState.breachEscalated = false;
  duelState.intruderTagged = false;
  duelState.closetDoorOpen = false;
  duelState.closetOccupied = false;
  duelState.networkDisabled = false;
  duelState.shiftStartAt = partnerConnected ? (duelState.shiftStartAt || Date.now()) : null;
  duelState.availableAttackIds = getRandomDuelAttackIds();

  if (!duelState.availableAttackIds.length) {
    duelState.finished = true;
    duelState.winner = "office";
    duelState.outcome = "The office survived every attack in the prototype deck.";
  }

  saveDuelProgress();
  renderDuelArena();
  broadcastDuelState();
}

function getDuelSelectedScenario() {
  return duelState ? getDuelScenarioById(duelState.selectedAttackId) : null;
}

function getDuelLocalLockedChoiceId() {
  if (!duelState) return null;
  return localPlayerRole === "hacker" ? duelState.lockedAttackId : duelState.officeDecisionId;
}

function isDuelLocalTurn() {
  if (!duelState || duelState.finished) return false;
  if (localPlayerRole === "hacker") {
    return !duelState.selectedAttackId && !duelState.lockedAttackId;
  }
  if (localPlayerRole === "office") {
    return Boolean(duelState.selectedAttackId) && !duelState.officeDecisionId;
  }
  return false;
}

function finishDuelMatch(winner, outcome) {
  if (!duelState) return;

  clearDuelShiftTimer();
  duelState.finished = true;
  duelState.winner = winner;
  duelState.outcome = outcome;
  saveDuelProgress();
  renderDuelArena();
  if (isHost) {
    broadcastMultiplayer("duel_match_end", buildDuelStatePayload());
  }

  resultTitle.textContent = winner === localPlayerRole ? "You Win" : "You Lose";
  resultTitle.className = winner === localPlayerRole ? "correct" : "incorrect";
  resultText.textContent = outcome;
  resultOverlay.style.display = "flex";
  resultContinue.textContent = "Return to menu";
  resultContinue.onclick = () => {
    resultOverlay.style.display = "none";
    resetGameState();
    modeMenu.style.display = "flex";
  };
}

function continueDuelAfterOverlay(message, waitingMessage) {
  resultTitle.textContent = "Round Continues";
  resultTitle.className = "correct";
  resultText.textContent = message;
  resultOverlay.style.display = "flex";
  resultContinue.textContent = isHost ? "Next attack" : "Waiting for host";
  resultContinue.onclick = () => {
    resultOverlay.style.display = "none";
    duelPanelDevice = null;
    renderDuelArena();

    if (!isHost) {
      setDuelStatus(waitingMessage || "Waiting for the office host to load the next attack.");
      return;
    }

    duelState.round += 1;
    startDuelRound();
  };
}

function broadcastDuelRoundOverlay(title, tone, message) {
  broadcastMultiplayer("duel_round_result", {
    title,
    tone,
    summary: message,
    duelState
  });
}

function resolveDuelDefense(defenseId) {
  if (!duelState || duelState.finished) return;

  const scenario = getDuelSelectedScenario();
  if (!scenario) return;

  const outcome = scenario.outcomes.find(option => option.id === defenseId);
  if (!outcome) return;

  cancelPhysicalBreachCountdown();
  duelState.officeDecisionId = defenseId;
  duelState.resolved = true;
  duelState.history.push({
    round: duelState.round,
    attackId: scenario.id,
    defenseId,
    result: outcome.result
  });

  if (outcome.result === "office_fail") {
    const damage = getDuelFailureDamage(outcome);
    duelState.hackerScore += damage;
    duelState.officeIntegrity = Math.max(0, duelState.officeIntegrity - damage);
    saveDuelProgress();
    broadcastDuelState();
    if (duelState.officeIntegrity <= 0) {
      finishDuelMatch("hacker", `${outcome.summary}\n\nThe office side is out of recovery chances.`);
      return;
    }

    const message = `${outcome.summary}\n\nOffice stability dropped. ${getDuelIntegrityLabel(duelState.officeIntegrity, duelState.maxIntegrity, "Office chances left")}`;
    broadcastDuelRoundOverlay("Office Hit", "incorrect", message);
    continueDuelAfterOverlay(
      message,
      "Waiting for the office host to recover and load the next threat."
    );
    return;
  }

  if (outcome.result === "hacker_fail") {
    const damage = getDuelFailureDamage(outcome);
    duelState.officeScore += damage;
    duelState.hackerCover = Math.max(0, duelState.hackerCover - damage);
    saveDuelProgress();
    broadcastDuelState();
    if (duelState.hackerCover <= 0) {
      finishDuelMatch("office", `${outcome.summary}\n\nThe attacker has no cover left and the operation is burned.`);
      return;
    }

    const message = `${outcome.summary}\n\nAttacker cover dropped. ${getDuelIntegrityLabel(duelState.hackerCover, duelState.maxIntegrity, "Attacker chances left")}`;
    broadcastDuelRoundOverlay("Attacker Exposed", "correct", message);
    continueDuelAfterOverlay(
      message,
      "Waiting for the office host to load the next attack."
    );
    return;
  }

  duelState.officePressure += 1;
  duelState.officeScore += 1;
  saveDuelProgress();
  const message = `${outcome.summary}\n\nThe duel continues.\n\n${getDuelIntegrityLabel(duelState.officeIntegrity, duelState.maxIntegrity, "Office chances")} | ${getDuelIntegrityLabel(duelState.hackerCover, duelState.maxIntegrity, "Attacker chances")}`;
  broadcastDuelRoundOverlay("Round Continues", "correct", message);
  continueDuelAfterOverlay(
    message,
    "Waiting for the office host to load the next attack."
  );
}

function selectDuelAttack(attackId) {
  if (!duelState || duelState.finished || localPlayerRole !== "hacker") return;
  if (duelState.selectedAttackId || duelState.lockedAttackId) return;

  duelState.lockedAttackId = attackId;
  saveDuelProgress();
  renderDuelArena();
  broadcastMultiplayer("duel_attack_selected", {
    attackId
  });
}

function revealDuelAttack(attackId) {
  if (!duelState || duelState.finished) return;
  if (!duelState.availableAttackIds.includes(attackId)) return;

  duelState.selectedAttackId = attackId;
  duelState.lockedAttackId = attackId;
  duelState.resolved = false;
  duelState.officeDecisionId = null;
  duelState.breachEscalated = false;
  duelState.intruderTagged = false;
  duelState.closetDoorOpen = false;
  duelState.closetOccupied = false;
  duelState.networkDisabled = false;
  duelState.breachCountdownEndsAt = isPhysicalEntryScenario(getDuelScenarioById(attackId)) ? Date.now() + 14000 : null;
  duelForcedPoseAppliedFor = null;
  duelPanelDevice = shouldAutoOpenDuelDeviceForLocalPlayer() ? getDuelRequiredDevice() : null;
  saveDuelProgress();
  renderDuelArena();
  broadcastDuelState();
  startPhysicalBreachCountdown();
}

function renderDuelChoices() {
  if (!duelChoices || !duelState) return;

  duelChoices.innerHTML = "";
  const selectedScenario = getDuelSelectedScenario();
  const selectedDevices = getDuelScenarioDevices(selectedScenario);
  const requiredDevice = localPlayerRole === "hacker" ? selectedDevices.attackerDevice : selectedDevices.officeDevice;
  const stationInfo = duelPanelDevice ? getDuelStationInfo(duelPanelDevice) : null;
  const pendingTask = getPendingOfficeTask();

  if (duelDeviceName) {
    duelDeviceName.textContent = duelPanelDevice ? getDuelDeviceLabel(duelPanelDevice) : "Device offline";
  }

  if (duelPanelDevice && stationInfo) {
    duelActionTitle.textContent = stationInfo.title;
    duelActionSubtitle.textContent = stationInfo.subtitle;
  }

  if (duelState.finished) {
    duelActionTitle.textContent = "Match complete";
    duelActionSubtitle.textContent = duelState.outcome || "Return to the menu to run another duel.";
    renderDuelDeviceViewport();
    return;
  }

  if (!duelPanelDevice) {
    if (shouldUsePhysicalInfiltrationView() && !(duelState && duelState.breachEscalated)) {
      duelActionTitle.textContent = duelState && duelState.breachEscalated ? "Inside the corporate floor" : "Holding at the secure door";
      duelActionSubtitle.textContent = duelState && duelState.breachEscalated
        ? "You made it past the checkpoint. Reach the network closet before security tags you."
        : "Your physical pretext is live. Hold your position until the checkpoint is answered or the timer runs out.";
      renderDuelDeviceViewport();
      return;
    }

    duelActionTitle.textContent = localPlayerRole === "hacker" ? "Walk to your gear" : "Work the shift";
    duelActionSubtitle.textContent = localPlayerRole === "hacker"
      ? "Use WASD to move, click to lock your mouse, and press E near your attack workstation or burner phone."
      : pendingTask
      ? `Use WASD to move, click to lock your mouse, and press E near your ${getDuelDeviceLabel(pendingTask.device)} to finish "${pendingTask.title}" before the shift ends.`
      : "All daily tasks are complete. Keep moving and survive until 8:00 PM.";
    renderDuelDeviceViewport();
    return;
  }

  if (localPlayerRole === "hacker") {
    if (duelState.breachEscalated) {
      duelActionTitle.textContent = "Physical breach in progress";
      duelActionSubtitle.textContent = duelPanelDevice === "network-closet"
        ? "You reached the network closet. The sabotage is happening inside the room now."
        : "Run for the network closet before security can get close enough to tag you.";

      if (duelPanelDevice === "network-closet") {
        const hint = document.createElement("div");
        hint.className = "duel-choice disabled";
        hint.innerHTML = "Closet breach complete<small>The network cut is underway from inside the locked room.</small>";
        duelChoices.appendChild(hint);
      }

      renderDuelDeviceViewport();
      return;
    }

    duelActionTitle.textContent = "Choose your next social-engineering play";
    duelActionSubtitle.textContent = duelState.selectedAttackId
      ? `The office terminal is reacting to your chosen pretext. Burn ${duelState.officeIntegrity} remaining recovery chances.`
      : `Pick one believable attack. The office side has ${duelState.officeIntegrity} recovery chances left.`;

    duelState.availableAttackIds.forEach(attackId => {
      const scenario = getDuelScenarioById(attackId);
      if (!scenario) return;
      const scenarioDevices = getDuelScenarioDevices(scenario);
      if (scenarioDevices.attackerDevice !== duelPanelDevice) return;

      const button = document.createElement("button");
      button.className = "duel-choice";
      if (duelState.lockedAttackId === attackId) {
        button.classList.add("locked");
      }
      if (!isDuelLocalTurn()) {
        button.classList.add("disabled");
      }
      button.innerHTML = `${scenario.attackTitle}<small>${scenario.attackDescription}</small>`;
      button.addEventListener("click", () => selectDuelAttack(attackId));
      duelChoices.appendChild(button);
    });

    if (!duelChoices.children.length) {
      duelActionSubtitle.textContent = duelPanelDevice === "phone"
        ? "No phone-based plays are armed in this round. Check the attack workstation instead."
        : "No workstation attacks are armed in this round. Try the burner phone instead.";
    }
    renderDuelDeviceViewport();
    return;
  }

  const scenario = selectedScenario;

  if (duelState.breachEscalated) {
    duelActionTitle.textContent = "Intruder loose on the floor";
    duelActionSubtitle.textContent = duelPanelDevice === "network-closet" && duelState.closetOccupied
      ? "The intruder sealed themselves in the network closet. You are locked out of the room."
      : duelPanelDevice === "security-console"
      ? "Use the kiosk feed to help locate the intruder, then close distance and press F to tag them physically."
      : "The intruder is inside. Hunt them down and press F when you are close enough to tag.";

    renderDuelDeviceViewport();
    return;
  }

  duelActionTitle.textContent = scenario
    ? "Respond from the office workstation"
    : pendingTask
    ? "Daily task in progress"
    : "Hold the floor until 8:00 PM";
  duelActionSubtitle.textContent = scenario
    ? `You can survive several mistakes now, but every miss costs stability. Burn through ${duelState.hackerCover} attacker cover to win.`
    : pendingTask
    ? `Complete "${pendingTask.title}" on the ${getDuelDeviceLabel(pendingTask.device)} while staying alert for attacker pressure.`
    : "All listed tasks are complete. Stay sharp and let the shift clock run out safely.";

  if (!scenario) {
    if (pendingTask) {
      if (duelPanelDevice === pendingTask.device) {
        const button = document.createElement("button");
        button.className = "duel-choice";
        button.innerHTML = `${pendingTask.title}<small>${pendingTask.description}</small>`;
        button.addEventListener("click", () => completeOfficeTask(pendingTask.id));
        duelChoices.appendChild(button);
      } else {
        const hint = document.createElement("div");
        hint.className = "duel-choice disabled";
        hint.innerHTML = `Next daily task<small>Go to the ${escapeHtml(getDuelDeviceLabel(pendingTask.device))} to ${escapeHtml(pendingTask.title.toLowerCase())}.</small>`;
        duelChoices.appendChild(hint);
      }
    } else {
      const hint = document.createElement("div");
      hint.className = "duel-choice disabled";
      hint.innerHTML = "Daily work complete<small>Stay safe and hold out until 8:00 PM.</small>";
      duelChoices.appendChild(hint);
    }
    renderDuelDeviceViewport();
    return;
  }
  if (duelPanelDevice !== requiredDevice) {
    duelActionSubtitle.textContent = requiredDevice === "phone"
      ? "This lure is hitting your phone workflow. Use your work phone to respond."
      : `This lure is on your ${getDuelDeviceLabel(requiredDevice)} workflow. Use that station to respond.`;
    renderDuelDeviceViewport();
    return;
  }

  scenario.outcomes.forEach(outcome => {
    const button = document.createElement("button");
    button.className = "duel-choice";
    if (duelState.officeDecisionId === outcome.id) {
      button.classList.add("locked");
    }
    if (!isDuelLocalTurn()) {
      button.classList.add("disabled");
    }
    button.innerHTML = `${outcome.text}<small>${outcome.summary}</small>`;
    button.addEventListener("click", () => resolveDuelDefense(outcome.id));
    duelChoices.appendChild(button);
  });

  if (pendingTask) {
    const hint = document.createElement("div");
    hint.className = "duel-choice disabled";
    hint.innerHTML = `Daily task waiting<small>${escapeHtml(pendingTask.title)} is still waiting on the ${escapeHtml(getDuelDeviceLabel(pendingTask.device))} once this lure is resolved.</small>`;
    duelChoices.appendChild(hint);
  }

  renderDuelDeviceViewport();
}

function renderDuelArena() {
  if (!duelArena) return;

  if (duelState) {
    ensureDuelStateDefaults(duelState);
  }

  if (shouldUsePhysicalInfiltrationView() && !(duelState && duelState.breachEscalated)) {
    duelPanelDevice = null;
  }

  setExperienceVisibility("duel");
  setupDuel3DWorld();
  updateDuelPartnerAvatar();
  updateMultiplayerHud();

  if (bg) bg.removeAttribute("src");
  if (duelArena) {
    duelArena.classList.toggle("device-open", Boolean(duelPanelDevice));
  }

  const brief = getDuelRoleBrief(localPlayerRole);
  const scenario = getDuelSelectedScenario();
  const requiredDevice = getDuelPromptTargetDevice();
  const pendingTask = getPendingOfficeTask();
  const completedTasks = getCompletedOfficeTaskCount();
  const totalTasks = duelState && Array.isArray(duelState.officeTasks) ? duelState.officeTasks.length : 0;

  if (duelRoundLabel) {
    duelRoundLabel.textContent = `${formatShiftClock()} · Round ${duelState ? duelState.round : 1}`;
  }
  if (duelRoleLabel) {
    duelRoleLabel.textContent = `${brief.title} | ${brief.status}`;
  }

  if (officeSignal) {
    officeSignal.textContent = scenario
      ? `Office feed: ${getDuelDeviceLabel(getDuelScenarioDevices(scenario).officeDevice)}`
      : pendingTask
      ? `Task: ${pendingTask.title} @ ${getDuelDeviceLabel(pendingTask.device)}`
      : "Office workflow complete";
  }
  if (hackerSignal) {
    hackerSignal.textContent = duelState && duelState.lockedAttackId
      ? `Attack staged via ${getDuelDeviceLabel(getDuelScenarioDevices(scenario).attackerDevice)}`
      : `Daily tasks ${completedTasks}/${totalTasks} complete`;
  }

  if (officeIntegrity && duelState) {
    officeIntegrity.textContent = getDuelIntegrityLabel(duelState.officeIntegrity, duelState.maxIntegrity, "Office stability");
  }
  if (hackerIntegrity && duelState) {
    hackerIntegrity.textContent = getDuelIntegrityLabel(duelState.hackerCover, duelState.maxIntegrity, "Attacker cover");
  }

  if (duelState && duelState.finished) {
    setDuelStatus(duelState.outcome || "Match finished.");
  } else if (duelState && duelState.breachEscalated) {
    setDuelStatus(localPlayerRole === "hacker"
      ? "You are inside the office. Reach the network closet before security tags you."
      : "An intruder is on the floor. Find them and tag them before the network closet is breached.");
  } else if (localPlayerRole === "hacker" && isPhysicalBreachCountdownActive()) {
    setDuelStatus(`Door pressure live. ${Math.ceil(getPhysicalBreachRemainingMs() / 1000)}s before the breach window opens.`);
  } else if (localPlayerRole === "hacker") {
    setDuelStatus(duelState && duelState.selectedAttackId
      ? `Your lure is live on the office side. ${duelState.hackerCover} cover left.`
      : partnerConnected
      ? `Pick an attack to open the round. ${duelState ? duelState.hackerCover : 0} cover left. The shift ends at 8:00 PM.`
      : "Waiting for the office opponent to join before the shift clock starts.");
  } else {
    setDuelStatus(duelState && duelState.selectedAttackId
      ? `A live lure reached your workstation. ${duelState.officeIntegrity} recovery chances left.`
      : !partnerConnected
      ? "Waiting for an attacker to join before the shift clock starts."
      : pendingTask
      ? `Shift clock is running. Next task: ${pendingTask.title}. ${duelState ? duelState.officeIntegrity : 0} recovery chances left.`
      : `Daily work is complete. Hold the floor until 8:00 PM with ${duelState ? duelState.officeIntegrity : 0} recovery chances left.`);
  }

  if (!duelPanelDevice) {
    setDuelInteractionPrompt(`Move with WASD. Click to lock your mouse. Press E near your ${getDuelDeviceLabel(requiredDevice)}.`);
  }

  renderDuelChoices();

  if (window.insiderDuel3D && typeof window.insiderDuel3D.resize === "function") {
    requestAnimationFrame(() => {
      if (window.insiderDuel3D && typeof window.insiderDuel3D.resize === "function") {
        window.insiderDuel3D.resize();
      }
    });
  }
}

function startDuelSession() {
  if (!multiplayerSessionStarted) {
    multiplayerSessionStarted = true;
    modeMenu.style.display = "none";
    if (typeof startBackgroundMusic === "function") {
      startBackgroundMusic();
    }
  }

  duelPanelDevice = null;
  applyMobileMode();
  updateHealthBar();
  updateMultiplayerHud();
  startDuelPoseSync();
  startDuelShiftTimer();
  if (isHost && isPhysicalEntryScenario(getDuelSelectedScenario()) && isPhysicalBreachCountdownActive()) {
    startPhysicalBreachCountdown();
  }
  renderDuelArena();
}

function setPartnerDisconnected(message = "Your partner disconnected. You can keep playing solo until they return.") {
  partnerConnected = false;
  partnerReady = false;
  partnerName = "Waiting for partner";
  partnerRole = partnerRole || (gameMode === "duel" ? "hacker" : "security");
  partnerLockedChoiceIndex = null;
  partnerDuelPose = null;

  if (partnerHeartbeatTimeout) {
    clearTimeout(partnerHeartbeatTimeout);
    partnerHeartbeatTimeout = null;
  }

  if (gameMode === "multi" || gameMode === "duel") {
    if (gameMode === "duel") {
      setDuelStatus(message);
      renderDuelArena();
    } else {
      setMultiplayerStatus(message);
      refreshCurrentSceneChoices();
    }
    updateMultiplayerHud();
  }
}

function refreshPartnerHeartbeat() {
  if (partnerHeartbeatTimeout) {
    clearTimeout(partnerHeartbeatTimeout);
  }

  partnerHeartbeatTimeout = setTimeout(() => {
    setPartnerDisconnected();
  }, 12000);
}

function setPartnerConnectedState(message = "") {
  partnerConnected = true;
  refreshPartnerHeartbeat();
  if (message) {
    if (gameMode === "duel") {
      setDuelStatus(message);
    } else {
      setMultiplayerStatus(message);
    }
  } else {
    updateMultiplayerHud();
  }
  if (gameMode === "duel") {
    renderDuelArena();
  } else {
    refreshCurrentSceneChoices();
  }
}

function markPartnerSeen() {
  partnerConnected = true;
  refreshPartnerHeartbeat();
  updateMultiplayerHud();
  if (gameMode === "duel") {
    updateDuelPartnerAvatar();
    renderDuelArena();
  }
}

function isCoopActive() {
  return gameMode === "multi" && partnerConnected && localReady && partnerReady;
}

function updatePlayerCards() {
  if (localPlayerCard) {
    localPlayerCard.textContent = `${localPlayerName} (${formatPlayerRole(localPlayerRole)}) - ${localReady ? "Ready" : "Not ready"}`;
    localPlayerCard.className = `player-card ${localReady ? "ready" : "waiting"}`;
  }

  if (partnerPlayerCard) {
    const label = partnerConnected
      ? `${partnerName} (${formatPlayerRole(partnerRole)}) - ${partnerReady ? "Ready" : "Not ready"}`
      : "Partner slot open";
    partnerPlayerCard.textContent = label;
    partnerPlayerCard.className = `player-card ${partnerConnected && partnerReady ? "ready" : "waiting"}`;
  }

  if (multiplayerReadyBtn) {
    multiplayerReadyBtn.textContent = localReady ? "Set Not Ready" : "Ready";
  }
}

function refreshCurrentSceneChoices() {
  if (gameMode === "duel") {
    renderDuelArena();
    return;
  }

  if (isTyping) return;

  const scene = scenes[currentScene];
  if (!scene) return;

  renderChoices(scene);
}

function updateMultiplayerHud() {
  if (!multiplayerHud) return;

  if (gameMode !== "multi" && gameMode !== "duel") {
    multiplayerHud.classList.add("hidden");
    return;
  }

  multiplayerHud.classList.remove("hidden");
  multiplayerRoomEl.textContent = `Room: ${roomCode || "Pending"}`;
  multiplayerRoleEl.textContent = `Role: ${formatPlayerRole(localPlayerRole)}`;
  updatePlayerCards();
  multiplayerStatusEl.textContent =
    multiplayerStatusText ||
    (partnerConnected
      ? (gameMode === "duel"
          ? "Asymmetric duel is live."
          : (isCoopActive() ? "Co-op is live." : "Partner connected. Ready up when you want to collaborate."))
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

function getRiskyChoiceIndex(scene) {
  if (!scene || !scene.choices) return -1;
  return scene.choices.findIndex(choice => (choice.effect || 0) < 0);
}

function auditSceneChoices() {
  Object.entries(scenes).forEach(([sceneName, scene]) => {
    if (!scene || !scene.choices || !scene.choices.length) return;

    const scoredChoices = scene.choices.filter(choice => typeof choice.effect !== "undefined");
    if (!scoredChoices.length) return;

    const hasCorrectChoice = scoredChoices.some(choice => (choice.effect || 0) > 0);
    if (!hasCorrectChoice) {
      console.warn(`Scene "${sceneName}" has scored choices but no positive/correct option.`);
    }
  });
}

function updateChoiceStates() {
  document.querySelectorAll(".choice").forEach((choiceEl, index) => {
    choiceEl.classList.toggle("locked", index === localLockedChoiceIndex);

    if (gameMode !== "multi") return;

    if (localLockedChoiceIndex !== null || multiplayerRoundResolved) {
      choiceEl.classList.add("disabled");
    }
  });

  if (gameMode === "multi") {
    setHotspotsLocked(localLockedChoiceIndex !== null || multiplayerRoundResolved);
  }
}

function setHotspotsLocked(locked) {
  textEl
    .querySelectorAll(".fake-link, .usb-hotspot, .chat-hotspot, .db-hotspot")
    .forEach(el => {
      el.classList.toggle("hotspot-locked", locked);
      if (locked) {
        el.setAttribute("aria-disabled", "true");
      } else {
        el.removeAttribute("aria-disabled");
      }
    });
}

function setWaitingForPartnerStatus() {
  if (gameMode !== "multi") return;

  if (!partnerConnected) {
    setMultiplayerStatus("No partner connected. You can keep playing solo until someone joins.");
    return;
  }

  if (!localReady) {
    setMultiplayerStatus("Click Ready when you want to join co-op decisions.");
    return;
  }

  if (!partnerReady) {
    setMultiplayerStatus("Partner connected, but not ready. You can keep moving solo.");
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

function resolveMultiplayerRound(scene, hostChoiceIndex, guestChoiceIndex) {
  if (!scene || multiplayerRoundResolved) return;

  const resolution = resolveMultiplayerChoices(scene, hostChoiceIndex, guestChoiceIndex);
  recordPlayerChoice("host", scene.choices[hostChoiceIndex]);
  recordPlayerChoice("guest", scene.choices[guestChoiceIndex]);
  multiplayerRoundResolved = true;
  applyHealthChange(scene.choices[resolution.chosenChoiceIndex].effect || 0);

  if (securityHealth <= 0) return;

  const resultPayload = {
    ...resolution,
    sceneName: currentScene,
    snapshot: getMultiplayerSnapshot()
  };

  broadcastMultiplayer("round_resolved", resultPayload);
  showMultiplayerChoiceResult(scene, resultPayload);
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
    gameEndedByFailure,
    playerPerformance
  };
}

function getMultiplayerRoomState() {
  return {
    hostName: isHost ? localPlayerName : partnerName,
    guestName: isHost ? partnerName : localPlayerName,
    hostReady: isHost ? localReady : partnerReady,
    guestReady: isHost ? partnerReady : localReady
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
  playerPerformance = snapshot.playerPerformance || createEmptyPerformance();
  updateHealthBar();
  saveMultiplayerProgress();
}

function applyMultiplayerRoomState(roomState) {
  if (!roomState) return;

  if (isHost) {
    partnerName = roomState.guestName || partnerName;
    partnerReady = Boolean(roomState.guestReady);
  } else {
    partnerName = roomState.hostName || partnerName;
    partnerReady = Boolean(roomState.hostReady);
    localReady = Boolean(roomState.guestReady);
  }

  updateMultiplayerHud();
}

function broadcastMultiplayer(type, payload) {
  if ((gameMode !== "multi" && gameMode !== "duel") || !multiplayerBridge) return;
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
      broadcastMultiplayer("show_summary", {
        snapshot: getMultiplayerSnapshot(),
        roomState: getMultiplayerRoomState()
      });
      return;
    }

    if (chosenChoice.next) {
      broadcastMultiplayer("advance_scene", {
        nextScene: chosenChoice.next,
        snapshot: getMultiplayerSnapshot(),
        roomState: getMultiplayerRoomState()
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
      broadcastMultiplayer("show_summary", {
        snapshot: getMultiplayerSnapshot(),
        roomState: getMultiplayerRoomState()
      });
      return;
    }

    if (payload.nextScene) {
      broadcastMultiplayer("advance_scene", {
        nextScene: payload.nextScene,
        snapshot: getMultiplayerSnapshot(),
        roomState: getMultiplayerRoomState()
      });
      transitionToScene(payload.nextScene);
    }
  };
}

function toggleReadyState() {
  if (gameMode !== "multi" && gameMode !== "duel") return;

  localReady = !localReady;
  if (!localReady) {
    localLockedChoiceIndex = null;
  }
  updateMultiplayerHud();
  refreshCurrentSceneChoices();
  if (gameMode === "duel") {
    saveDuelProgress();
  } else {
    saveMultiplayerProgress();
  }
  broadcastMultiplayer("ready_state", {
    ready: localReady
  });
  if (gameMode === "duel") {
    renderDuelArena();
  } else {
    setWaitingForPartnerStatus();
  }
}

function setupMultiplayerBridge() {
  if (!multiplayerBridge || (gameMode !== "multi" && gameMode !== "duel") || !roomCode || !localPlayerRole) return;

  multiplayerBridge.connect({
    roomCode,
    role: localPlayerRole,
    isHost,
    name: localPlayerName,
    ready: localReady,
    handlers: {
      presence: message => {
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        setPartnerConnectedState();
        if (gameMode === "duel") {
          if (isHost && !duelState) {
            duelState = createDuelState();
            startDuelRound();
          }
          renderDuelArena();
        } else {
          setWaitingForPartnerStatus();
        }

        if (isHost) {
          if (gameMode === "duel") {
            broadcastMultiplayer("duel_state", buildDuelStatePayload());
          } else {
            broadcastMultiplayer("state_sync", {
              snapshot: getMultiplayerSnapshot(),
              roomState: getMultiplayerRoomState(),
              nextScene: currentScene
            });
          }
        }
      },
      heartbeat: message => {
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        markPartnerSeen();
      },
      leave: () => {
        setPartnerDisconnected();
      },
      request_sync: () => {
        if (!isHost) return;
        if (gameMode === "duel") {
          broadcastMultiplayer("duel_state", buildDuelStatePayload());
        } else {
          broadcastMultiplayer("state_sync", {
            snapshot: getMultiplayerSnapshot(),
            roomState: getMultiplayerRoomState(),
            nextScene: currentScene
          });
        }
      },
      ready_state: message => {
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        partnerReady = Boolean(message.payload.ready);
        setPartnerConnectedState();
        if (gameMode === "duel") {
          renderDuelArena();
        } else {
          setWaitingForPartnerStatus();
          refreshCurrentSceneChoices();
        }
      },
      state_sync: message => {
        if (gameMode === "duel") return;
        if (isHost) return;
        clearJoinTimeout();
        joinPending = false;
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        setPartnerConnectedState();
        applyMultiplayerSnapshot(message.payload.snapshot);
        applyMultiplayerRoomState(message.payload.roomState);
        startMultiplayerSession(message.payload.nextScene || currentScene || "intro");
        setWaitingForPartnerStatus();
      },
      duel_state: message => {
        if (gameMode !== "duel") return;
        if (isHost) return;
        clearJoinTimeout();
        joinPending = false;
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        setPartnerConnectedState();
        applyMultiplayerRoomState(message.payload.roomState);
        duelState = message.payload.duelState || createDuelState();
        resultOverlay.style.display = "none";
        startDuelSession();
      },
      duel_attack_selected: message => {
        if (gameMode !== "duel" || !isHost) return;
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        setPartnerConnectedState();
        revealDuelAttack(message.payload.attackId);
      },
      duel_round_result: message => {
        if (gameMode !== "duel" || isHost) return;
        duelState = message.payload.duelState || duelState;
        saveDuelProgress();
        renderDuelArena();
        resultTitle.textContent = message.payload.title || "Round Continues";
        resultTitle.className = message.payload.tone || "correct";
        resultText.textContent = message.payload.summary;
        resultOverlay.style.display = "flex";
        resultContinue.textContent = "Waiting for host";
        resultContinue.onclick = () => {
          resultOverlay.style.display = "none";
          duelPanelDevice = null;
          renderDuelArena();
          setDuelStatus("Waiting for the office host to load the next attack.");
        };
      },
      duel_pose: message => {
        if (gameMode !== "duel") return;
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        partnerConnected = true;
        refreshPartnerHeartbeat();
        updateMultiplayerHud();
        partnerDuelPose = message.payload && message.payload.pose ? message.payload.pose : null;
        updateDuelPartnerAvatar();
      },
      duel_closet_enter: message => {
        if (gameMode !== "duel" || !isHost) return;
        completeNetworkClosetSabotage();
      },
      duel_closet_toggle: message => {
        if (gameMode !== "duel" || !isHost) return;
        toggleNetworkClosetDoor(Boolean(message.payload && message.payload.open));
      },
      duel_task_complete: message => {
        if (gameMode !== "duel" || !isHost) return;
        if (!message.payload || !message.payload.taskId) return;
        completeOfficeTask(message.payload.taskId);
      },
      duel_match_end: message => {
        if (gameMode !== "duel" || isHost) return;
        clearJoinTimeout();
        joinPending = false;
        syncDuelState(message.payload);
        finishDuelMatch(message.payload.duelState.winner, message.payload.duelState.outcome);
      },
      choice_locked: message => {
        if (gameMode !== "multi") return;
        if (message.payload.sceneName !== currentScene) return;
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        setPartnerConnectedState();
        partnerLockedChoiceIndex = message.payload.choiceIndex;
        setWaitingForPartnerStatus();

        if (!isHost || localLockedChoiceIndex === null || multiplayerRoundResolved) return;

        const scene = scenes[currentScene];
        if (!scene) return;

        resolveMultiplayerRound(
          scene,
          isHost ? localLockedChoiceIndex : partnerLockedChoiceIndex,
          isHost ? partnerLockedChoiceIndex : localLockedChoiceIndex
        );
      },
      round_resolved: message => {
        if (gameMode !== "multi") return;
        if (isHost) return;
        if (message.payload.sceneName && message.payload.sceneName !== currentScene) return;
        partnerName = message.name || partnerName;
        partnerRole = message.role || partnerRole;
        setPartnerConnectedState();
        multiplayerRoundResolved = true;
        localLockedChoiceIndex = message.payload.guestChoiceIndex;
        partnerLockedChoiceIndex = message.payload.hostChoiceIndex;
        applyMultiplayerSnapshot(message.payload.snapshot);
        showMultiplayerChoiceResult(scenes[currentScene], message.payload);
      },
      hotspot_triggered: message => {
        if (gameMode !== "multi") return;
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
        if (gameMode !== "multi") return;
        if (isHost) return;
        setPartnerConnectedState();
        multiplayerRoundResolved = true;
        applyMultiplayerSnapshot(message.payload.snapshot);
        showMultiplayerHotspotResult(message.payload);
      },
      game_over: message => {
        if (gameMode !== "multi") return;
        if (isHost) return;
        applyMultiplayerSnapshot(message.payload.snapshot);
        applyMultiplayerRoomState(message.payload.roomState);
        triggerGameOver();
      },
      advance_scene: message => {
        if (gameMode !== "multi") return;
        if (isHost) return;
        applyMultiplayerSnapshot(message.payload.snapshot || getMultiplayerSnapshot());
        applyMultiplayerRoomState(message.payload.roomState);
        loadScene(message.payload.nextScene);
      },
      show_summary: message => {
        if (gameMode !== "multi") return;
        if (isHost) return;
        applyMultiplayerSnapshot(message.payload.snapshot);
        applyMultiplayerRoomState(message.payload.roomState);
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
    broadcastMultiplayer("game_over", {
      snapshot: getMultiplayerSnapshot(),
      roomState: getMultiplayerRoomState()
    });
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
  activeExperience = "training";
  gameMode = null;
  isHost = false;
  roomCode = null;
  securityHealth = 100;
  totalCorrect = 0;
  totalIncorrect = 0;
  hotspotMistakes = 0;
  phishingClicked = false;
  visitedScenes.clear();
  gameOverTriggered = false;
  gameEndedByFailure = false;
  playerPerformance = createEmptyPerformance();
  localPlayerRole = null;
  localPlayerName = loadStoredPlayerName();
  multiplayerStatusText = "";
  partnerConnected = false;
  partnerRole = null;
  partnerName = "Waiting for partner";
  localReady = false;
  partnerReady = false;
  resetMultiplayerRoundState();
  joinPending = false;
  clearJoinTimeout();
  multiplayerSessionStarted = false;
  pendingMultiplayerMode = "training";
  duelState = null;
  duelPanelDevice = null;
  duelTargetDevice = null;
  partnerDuelPose = null;
  duelForcedPoseAppliedFor = null;
  clearDuelPoseSync();
  clearDuelPhysicalTimer();
  clearDuelShiftTimer();

  clearInterval(typingInterval);
  isTyping = false;

  feedbackEl.style.display = "none";
  resultOverlay.style.display = "none";
  gameOverOverlay.style.display = "none";
  summaryOverlay.style.display = "none";

  dialogueBox.style.display = "block";
  dialogueBox.classList.remove("scene-fade-out");
  setExperienceVisibility("training");
  choicesEl.innerHTML = "";
  textEl.innerHTML = "";
  nameEl.textContent = "";
  roleEl.textContent = "";
  roleHintEl.textContent = "";
  roleHintEl.classList.add("hidden");
  multiplayerHud.classList.add("hidden");
  updatePlayerCards();
  if (multiplayerBridge) {
    multiplayerBridge.disconnect();
  }
  if (window.insiderDuel3D) {
    if (typeof window.insiderDuel3D.setPartnerPose === "function") {
      window.insiderDuel3D.setPartnerPose(null);
    }
    window.insiderDuel3D.unmount();
  }
  if (partnerHeartbeatTimeout) {
    clearTimeout(partnerHeartbeatTimeout);
    partnerHeartbeatTimeout = null;
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
  if (playerNameInput) {
    playerNameInput.value = localPlayerName;
  }
  setDuelInteractionPrompt("");
  updateModeMenuCopy();
  applyMobileMode();
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
  saveMultiplayerProgress();

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
      if (gameMode === "multi" && isHost) {
        broadcastMultiplayer("show_summary", {
          snapshot: getMultiplayerSnapshot(),
          roomState: getMultiplayerRoomState()
        });
      }
      showSummary();
      return;
    }

    if (choice.next) {
      choicesEl.innerHTML = "";
      if (gameMode === "multi" && isHost) {
        broadcastMultiplayer("advance_scene", {
          nextScene: choice.next,
          snapshot: getMultiplayerSnapshot(),
          roomState: getMultiplayerRoomState()
        });
      }
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
      if (gameMode === "multi" && isHost) {
        broadcastMultiplayer("show_summary", {
          snapshot: getMultiplayerSnapshot(),
          roomState: getMultiplayerRoomState()
        });
      }
      showSummary();
      return;
    }

    if (nextScene) {
      choicesEl.innerHTML = "";
      if (gameMode === "multi" && isHost) {
        broadcastMultiplayer("advance_scene", {
          nextScene,
          snapshot: getMultiplayerSnapshot(),
          roomState: getMultiplayerRoomState()
        });
      }
      transitionToScene(nextScene);
    }
  };
}

function attachHotspots(scene) {
  const fakeLinks = textEl.querySelectorAll(".fake-link");
  const usbHotspots = textEl.querySelectorAll(".usb-hotspot");
  const chatHotspots = textEl.querySelectorAll(".chat-hotspot");
  const dbHotspots = textEl.querySelectorAll(".db-hotspot");

  setHotspotsLocked(false);

  const handleHotspot = (message, penalty, nextScene) => {
    if (textEl.querySelector(".hotspot-locked")) return;

    if (gameMode === "multi") {
      const riskyChoiceIndex = getRiskyChoiceIndex(scene);

      if (!partnerConnected) {
        setHotspotsLocked(true);
        recordPlayerHotspot(getLocalPerformanceKey());
        recordPlayerChoice(getLocalPerformanceKey(), scene.choices[riskyChoiceIndex]);
        applyHealthChange(penalty);
        showHotspotResult(message, nextScene);
        return;
      }

      if (!localReady && !isHost) {
        setMultiplayerStatus("Click Ready to join co-op actions. Until then, you are spectating.");
        return;
      }

      if (!isCoopActive()) {
        if (!isHost) {
          setMultiplayerStatus("The host is continuing solo until both players are ready.");
          return;
        }

        setHotspotsLocked(true);
        recordPlayerHotspot(getLocalPerformanceKey());
        recordPlayerChoice(getLocalPerformanceKey(), scene.choices[riskyChoiceIndex]);
        applyHealthChange(penalty);
        showHotspotResult(message, nextScene);
        return;
      }

      if (multiplayerRoundResolved || sceneAdvancePending) return;
      if (riskyChoiceIndex < 0) return;

      setHotspotsLocked(true);
      recordPlayerHotspot(getLocalPerformanceKey());
      localLockedChoiceIndex = riskyChoiceIndex;
      updateChoiceStates();
      setWaitingForPartnerStatus();
      broadcastMultiplayer("choice_locked", {
        sceneName: currentScene,
        choiceIndex: riskyChoiceIndex,
        source: "hotspot"
      });

      if (isHost && partnerLockedChoiceIndex !== null) {
        resolveMultiplayerRound(scene, localLockedChoiceIndex, partnerLockedChoiceIndex);
      }
      return;
    }

    setHotspotsLocked(true);
    recordPlayerHotspot(getLocalPerformanceKey());
    recordPlayerChoice(getLocalPerformanceKey(), scene.choices[getRiskyChoiceIndex(scene)]);
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
  const coopScene = scoredScene && isCoopActive();
  const hostControlledNeutralScene = gameMode === "multi" && !scoredScene && !isHost;
  const guestSpectatingScoredScene = gameMode === "multi" && scoredScene && !isHost && !localReady;

  scene.choices.forEach(choice => {
    const btn = document.createElement("div");
    btn.className = "choice";
    btn.textContent = choice.text;

    if (hostControlledNeutralScene || guestSpectatingScoredScene) {
      btn.classList.add("disabled");
    }

    btn.addEventListener("click", () => {
      if (btn.classList.contains("disabled") || isTyping) return;

      if (gameMode === "multi" && coopScene) {
        if (localLockedChoiceIndex !== null || multiplayerRoundResolved) return;

        localLockedChoiceIndex = scene.choices.indexOf(choice);
        updateChoiceStates();
        setWaitingForPartnerStatus();
        broadcastMultiplayer("choice_locked", {
          sceneName: currentScene,
          choiceIndex: localLockedChoiceIndex
        });

        if (isHost && partnerLockedChoiceIndex !== null) {
          resolveMultiplayerRound(scene, localLockedChoiceIndex, partnerLockedChoiceIndex);
        }
        return;
      }

      if (hostControlledNeutralScene || guestSpectatingScoredScene) return;

      document.querySelectorAll(".choice").forEach(c => c.classList.add("disabled"));
      hideFeedback();

      const hasEffect = typeof choice.effect !== "undefined";

      if (hasEffect) {
        recordPlayerChoice(getLocalPerformanceKey(), choice);
        applyHealthChange(choice.effect || 0);
      }

      if (securityHealth <= 0) return;

      if (choice.next === "summary") {
        if (hasEffect) {
          showChoiceResult(choice);
        } else {
          if (gameMode === "multi" && isHost) {
            broadcastMultiplayer("show_summary", {
              snapshot: getMultiplayerSnapshot(),
              roomState: getMultiplayerRoomState()
            });
          }
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
  } else if (guestSpectatingScoredScene) {
    setMultiplayerStatus("Click Ready to join co-op decision making. Until then, you are spectating.");
  } else if (coopScene) {
    setWaitingForPartnerStatus();
  } else if (scoredScene && gameMode === "multi") {
    setMultiplayerStatus(partnerConnected ? "Solo fallback is active until both players are ready." : "Solo mode is active until a partner joins.");
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
  saveMultiplayerProgress();
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

  const individualSummaryEl = document.getElementById("individualSummary");
  if (gameMode === "multi") {
    const localKey = getLocalPerformanceKey();
    const partnerKey = getPartnerPerformanceKey();
    const localStats = playerPerformance[localKey] || { correct: 0, incorrect: 0, hotspots: 0 };
    const partnerStats = playerPerformance[partnerKey] || { correct: 0, incorrect: 0, hotspots: 0 };

    document.getElementById("summaryLocalPlayer").textContent =
      `${localPlayerName} (${formatPlayerRole(localPlayerRole)})`;
    document.getElementById("summaryLocalCorrect").textContent =
      `Correct calls: ${localStats.correct}`;
    document.getElementById("summaryLocalIncorrect").textContent =
      `Risky calls: ${localStats.incorrect}`;
    document.getElementById("summaryLocalHotspots").textContent =
      `Hotspot triggers: ${localStats.hotspots}`;

    document.getElementById("summaryPartnerPlayer").textContent =
      `${partnerName} (${formatPlayerRole(partnerRole)})`;
    document.getElementById("summaryPartnerCorrect").textContent =
      `Correct calls: ${partnerStats.correct}`;
    document.getElementById("summaryPartnerIncorrect").textContent =
      `Risky calls: ${partnerStats.incorrect}`;
    document.getElementById("summaryPartnerHotspots").textContent =
      `Hotspot triggers: ${partnerStats.hotspots}`;

    individualSummaryEl.classList.remove("hidden");
  } else {
    individualSummaryEl.classList.add("hidden");
  }
}

function startSinglePlayer() {
  activeExperience = "training";
  gameMode = "single";
  isHost = false;
  roomCode = null;
  localPlayerRole = null;
  localPlayerName = getEnteredPlayerName();
  multiplayerStatusText = "";
  partnerConnected = false;
  partnerRole = null;
  partnerName = "Waiting for partner";
  localReady = false;
  partnerReady = false;
  savePlayerPreferences();
  multiplayerSessionStarted = false;

  startMultiplayerSession("intro");
}

function startMultiplayerAsHost() {
  activeExperience = "training";
  gameMode = "multi";
  isHost = true;
  roomCode = generateRoomCode();
  localPlayerRole = "employee";
  localPlayerName = getEnteredPlayerName();
  partnerConnected = false;
  partnerRole = "security";
  partnerName = "Waiting for partner";
  localReady = true;
  partnerReady = false;
  savePlayerPreferences();
  joinPending = false;
  clearJoinTimeout();
  setupMultiplayerBridge();
  setMultiplayerStatus(
    multiplayerBridge && multiplayerBridge.mode === "supabase"
      ? "You are hosting. Share the room code so a remote Security Lead can join."
      : "You are hosting. Share the room code and open the same site in another tab or browser profile to test local sync."
  );

  alert("Room created! Share this code: " + roomCode);

  startMultiplayerSession("intro");
}

function joinMultiplayerRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();

  if (!code) {
    alert("Please enter a room code.");
    return;
  }

  gameMode = "multi";
  activeExperience = "training";
  isHost = false;
  roomCode = code;
  localPlayerRole = "security";
  localPlayerName = getEnteredPlayerName();
  partnerConnected = false;
  partnerRole = "employee";
  partnerName = "Waiting for host";
  localReady = true;
  partnerReady = true;

  const savedProgress = loadSavedMultiplayerProgress(code, "security");
  if (savedProgress) {
    localPlayerName = savedProgress.localPlayerName || localPlayerName;
    applyMultiplayerSnapshot(savedProgress.snapshot);
  }

  savePlayerPreferences();
  joinPending = true;
  clearJoinTimeout();
  multiplayerSessionStarted = false;
  setupMultiplayerBridge();
  setMultiplayerStatus(
    multiplayerBridge && multiplayerBridge.mode === "supabase"
      ? "You joined as Security Lead. Waiting for the host to sync the room."
      : "You joined as Security Lead. Waiting for the host tab to sync the room."
  );
  updateMultiplayerHud();

  joinTimeoutId = setTimeout(() => {
    if (!joinPending) return;

    if (multiplayerBridge) {
      multiplayerBridge.disconnect();
    }

    resetGameState();
    modeMenu.style.display = "flex";
    alert("Room not found or host did not respond. Check the room code and make sure the host is already in the room.");
  }, 4000);
}

function startDuelAsHost() {
  activeExperience = "duel";
  gameMode = "duel";
  isHost = true;
  roomCode = generateRoomCode();
  localPlayerRole = "office";
  localPlayerName = getEnteredPlayerName();
  partnerConnected = false;
  partnerRole = "hacker";
  partnerName = "Waiting for intruder";
  localReady = true;
  partnerReady = false;
  duelState = createDuelState();
  ensureDuelStateDefaults(duelState);
  savePlayerPreferences();
  saveDuelProgress();
  joinPending = false;
  clearJoinTimeout();
  setupMultiplayerBridge();
  setDuelStatus(
    multiplayerBridge && multiplayerBridge.mode === "supabase"
      ? "You are hosting the office side. Share the room code so an attacker can join remotely."
      : "You are hosting the office side. Share the room code and open the same site elsewhere to test the attacker role."
  );

  alert("Duel room created! Share this code: " + roomCode);
  startDuelRound();
  startDuelSession();
}

function joinDuelRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();

  if (!code) {
    alert("Please enter a room code.");
    return;
  }

  activeExperience = "duel";
  gameMode = "duel";
  isHost = false;
  roomCode = code;
  localPlayerRole = "hacker";
  localPlayerName = getEnteredPlayerName();
  partnerConnected = false;
  partnerRole = "office";
  partnerName = "Waiting for host";
  localReady = true;
  partnerReady = true;

  const savedProgress = loadSavedDuelProgress(code, "hacker");
  if (savedProgress) {
    localPlayerName = savedProgress.localPlayerName || localPlayerName;
    duelState = ensureDuelStateDefaults(savedProgress.duelState || createDuelState());
  } else {
    duelState = createDuelState();
  }

  savePlayerPreferences();
  saveDuelProgress();
  joinPending = true;
  clearJoinTimeout();
  multiplayerSessionStarted = false;
  setupMultiplayerBridge();
  setDuelStatus(
    multiplayerBridge && multiplayerBridge.mode === "supabase"
      ? "You joined as the intrusion operator. Waiting for the office host to sync the duel."
      : "You joined as the intrusion operator. Waiting for the office host tab to sync the duel."
  );
  updateMultiplayerHud();

  joinTimeoutId = setTimeout(() => {
    if (!joinPending) return;

    if (multiplayerBridge) {
      multiplayerBridge.disconnect();
    }

    resetGameState();
    modeMenu.style.display = "flex";
    alert("Duel room not found or office host did not respond. Check the code and make sure the host is already inside the duel.");
  }, 4000);
}

function setupMobileDuelControls() {
  if (!mobileDuelControls) return;

  const handleMovePress = (button, pressed) => {
    const key = button.dataset.key;
    if (!key || !window.insiderDuel3D || typeof window.insiderDuel3D.setVirtualKey !== "function") return;
    window.insiderDuel3D.setVirtualKey(key, pressed);
    button.classList.toggle("active", pressed);
  };

  mobileDuelControls.querySelectorAll(".mobile-control.move").forEach(button => {
    const start = event => {
      event.preventDefault();
      handleMovePress(button, true);
    };
    const end = event => {
      event.preventDefault();
      handleMovePress(button, false);
    };
    button.addEventListener("touchstart", start, { passive: false });
    button.addEventListener("touchend", end, { passive: false });
    button.addEventListener("touchcancel", end, { passive: false });
    button.addEventListener("mousedown", start);
    button.addEventListener("mouseup", end);
    button.addEventListener("mouseleave", end);
  });

  mobileDuelControls.querySelectorAll(".mobile-control.action").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      if (!window.insiderDuel3D) return;
      const action = button.dataset.action;
      if (action === "jump" && typeof window.insiderDuel3D.triggerJump === "function") {
        window.insiderDuel3D.triggerJump();
      } else if (action === "interact" && typeof window.insiderDuel3D.triggerInteract === "function") {
        window.insiderDuel3D.triggerInteract();
      } else if (action === "tag" && typeof window.insiderDuel3D.triggerTag === "function") {
        window.insiderDuel3D.triggerTag();
      }
    });
  });
}

if (singlePlayerBtn) {
  singlePlayerBtn.addEventListener("click", startSinglePlayer);
}

if (multiPlayerBtn) {
  multiPlayerBtn.addEventListener("click", () => {
    pendingMultiplayerMode = "training";
    updateModeMenuCopy();
    multiplayerOptions.classList.remove("hidden");
  });
}

if (duelModeBtn) {
  duelModeBtn.addEventListener("click", () => {
    pendingMultiplayerMode = "duel";
    updateModeMenuCopy();
    multiplayerOptions.classList.remove("hidden");
  });
}

if (createRoomBtn) {
  createRoomBtn.addEventListener("click", () => {
    if (pendingMultiplayerMode === "duel") {
      startDuelAsHost();
      return;
    }

    startMultiplayerAsHost();
  });
}

if (joinRoomBtn) {
  joinRoomBtn.addEventListener("click", () => {
    if (pendingMultiplayerMode === "duel") {
      joinDuelRoom();
      return;
    }

    joinMultiplayerRoom();
  });
}

if (multiplayerReadyBtn) {
  multiplayerReadyBtn.addEventListener("click", toggleReadyState);
}

if (duelClosePanelBtn) {
  duelClosePanelBtn.addEventListener("click", closeDuelDevicePanel);
}

if (playerNameInput) {
  playerNameInput.addEventListener("input", () => {
    localPlayerName = getEnteredPlayerName();
    savePlayerPreferences();
    updatePlayerCards();
  });
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
  auditSceneChoices();
  setupMobileDuelControls();
  localPlayerName = loadStoredPlayerName();
  if (playerNameInput) {
    playerNameInput.value = localPlayerName;
  }
  if (roomCodeInput) {
    roomCodeInput.value = localStorage.getItem("insiderLastRoomCode") || "";
  }
  updatePlayerCards();
  updateHealthBar();
  dialogueBox.style.display = "block";

  if (modeMenu) {
    modeMenu.style.display = "flex";
  }
  updateModeMenuCopy();
  applyMobileMode();
};

window.addEventListener("resize", applyMobileMode);

