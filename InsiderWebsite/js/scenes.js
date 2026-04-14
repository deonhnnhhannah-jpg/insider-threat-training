// scenes.js

const scenes = {

  intro: {
    bg: "assets/bg/office.png",
    left: "assets/characters/trainer.png",
    right: "",
    speaker: "Security Trainer",
    role: "Corporate Security",
    text: "Welcome to Insider Threat Story Mode. Your decisions shape the company’s security health.",
    html: false,
    choices: [
      { text: "Begin training", next: "tailgate1", type: "neutral" }
    ]
  },

  // ---------------- TAILGATING ----------------
  tailgate1: {
    bg: "assets/bg/lobby.png",
    left: "assets/characters/you.png",
    right: "assets/characters/stranger.png",
    speaker: "Stranger",
    role: "Unknown visitor",
    text: "Hey! Can you hold the door? I forgot my badge.",
    html: false,
    roleHints: {
      employee: "They sound confident and in a hurry, which can pressure you into bypassing procedure.",
      security: "No badge, no escort, and no visitor check-in means access should be denied."
    },
    choices: [
      {
        text: "Let them in.",
        effect: -25,
        feedback:
          "This is a classic tailgating attack. You cannot verify their identity, yet you’re granting them your level of access.",
        next: "tailgate2"
      },
      {
        text: "Politely refuse and direct them to reception.",
        effect: +10,
        feedback:
          "Correct. Directing them to reception ensures their identity is verified and their visit is logged.",
        next: "tailgate2"
      }
    ]
  },

  tailgate2: {
    bg: "assets/bg/security.png",
    left: "assets/characters/security.png",
    right: "",
    speaker: "Security Officer",
    role: "Physical Security",
    text: "Tailgating is one of the most common ways attackers bypass physical access controls.",
    html: false,
    choices: [
      { text: "Continue", next: "phish1", type: "neutral" }
    ]
  },

  // ---------------- PHISHING ----------------
  phish1: {
    bg: "assets/bg/email.png",
    left: "assets/characters/you.png",
    right: "assets/characters/email.png",
    speaker: "Email",
    role: "Suspicious sender",
    text: "URGENT: Your account will be disabled today.<br><br><span id='fakeLink' class='fake-link'>Click here to keep access.</span>",
    hotspotNext: "usb1",
    html: true,
    roleHints: {
      employee: "The urgency is designed to make you react before you verify the sender.",
      security: "Account reset requests should come through approved IT channels, not panic-inducing email links."
    },
    choices: [
      {
        text: "Report the email using the company’s phishing process.",
        effect: +15,
        feedback:
          "Correct. Reporting gives security visibility so they can block similar messages and warn others.",
        next: "phish2"
      }
    ]
  },

  phish2: {
    bg: "assets/bg/office.png",
    left: "assets/characters/trainer.png",
    right: "",
    speaker: "Security Trainer",
    role: "Corporate Security",
    text: "Compromised accounts are insider threats: attackers act as if they were legitimate employees.",
    html: false,
    choices: [
      { text: "Continue", next: "usb1", type: "neutral" }
    ]
  },

  // ---------------- USB DROP ----------------
  usb1: {
    bg: "assets/bg/parkinglot.png",
    left: "assets/characters/you.png",
    right: "assets/characters/usb.png",
    speaker: "System",
    role: "Found device",
    text: "You find a USB drive in the parking lot labeled “Employee Salaries”.<br><br><span id='usbHotspot' class='usb-hotspot'>Inspect the USB drive closely.</span>",
    html: true,
    hotspotNext: "chat1",
    roleHints: {
      employee: "The label is meant to make the device look important enough to plug in immediately.",
      security: "Dropped media is a classic baiting tactic and should go straight to security handling."
    },
    choices: [
      {
        text: "Plug it into your work computer to see what’s inside.",
        effect: -30,
        feedback:
          "Attackers often drop infected USB drives hoping someone will plug them in.",
        next: "usb2"
      },
      {
        text: "Turn it in to IT security.",
        effect: +15,
        feedback:
          "Correct. IT can safely analyze the device without risking the network.",
        next: "usb2"
      }
    ]
  },

  usb2: {
    bg: "assets/bg/security.png",
    left: "assets/characters/security.png",
    right: "",
    speaker: "Security Officer",
    role: "IT Security",
    text: "Unknown devices should always be treated as potential threats and handled by security.",
    html: false,
    choices: [
      { text: "Continue", next: "chat1", type: "neutral" }
    ]
  },

  // ---------------- CHAT ----------------
  chat1: {
    bg: "assets/bg/office.png",
    left: "assets/characters/you.png",
    right: "assets/characters/chat.png",
    speaker: "Chat Message",
    role: "Unknown sender",
    text: "<span id='chatHotspot' class='chat-hotspot'>“Hey, can you send me the VPN password? I’m locked out and the boss needs this ASAP.”</span>",
    html: true,
    hotspotNext: "exfil1",
    roleHints: {
      employee: "The request sounds urgent and familiar, which is exactly why attackers use it.",
      security: "Passwords should never be shared in chat, even if the request looks internal."
    },
    choices: [
      {
        text: "Send the password to help them quickly.",
        effect: -25,
        feedback:
          "Never share passwords. Attackers often impersonate coworkers.",
        next: "chat2"
      },
      {
        text: "Verify their identity through a known channel.",
        effect: +10,
        feedback:
          "Correct. Verification prevents impersonation attacks.",
        next: "chat2"
      }
    ]
  },

  chat2: {
    bg: "assets/bg/office.png",
    left: "assets/characters/trainer.png",
    right: "",
    speaker: "Security Trainer",
    role: "Corporate Security",
    text: "Social engineering doesn’t just happen over email. Chat, phone, and in-person requests can all be abused.",
    html: false,
    choices: [
      { text: "Continue", next: "exfil1", type: "neutral" }
    ]
  },

  // ---------------- DATA EXFILTRATION ----------------
  exfil1: {
  bg: "assets/bg/darkoffice.png",
  left: "assets/characters/you.png",
  right: "assets/characters/manager.png",
  speaker: "Manager",
  role: "Project Lead",
  text: "We need to send the client the <span id='dbHotspot' class='db-hotspot'>full database export</span> tonight. Just email it to them.",
  html: true,
  hotspotNext: "exfil2",
  roleHints: {
    employee: "The manager is framing speed as the priority, which makes the risky option feel reasonable.",
    security: "A full database export should trigger data handling controls, encryption requirements, and approval checks."
  },
  choices: [
    {
      text: "Email the full database.",
      effect: -40,
      feedback: "Emailing a full database is extremely risky.",
      next: "exfil2"
    },
    {
      text: "Use approved secure channels.",
      effect: +20,
      feedback: "Correct. Sensitive data must be encrypted and controlled.",
      next: "exfil2"
    }
  ]
},

  exfil2: {
    bg: "assets/bg/office.png",
    left: "assets/characters/trainer.png",
    right: "",
    speaker: "Security Trainer",
    role: "Corporate Security",
    text: "Insider threats often come from rushed decisions, not just malicious intent. Your everyday choices matter.",
    html: false,
    choices: [
      { text: "Finish training", next: "summary", type: "neutral" }
    ]
  },

  // ---------------- SUMMARY ----------------
  summary: {
  bg: "assets/bg/office.png",
  left: "",
  right: "",
  speaker: "Training Summary",
  role: "Performance Review",
  html: false,
  text: "Review your results below.",
  choices: []
},

  // ---------------- GAME OVER ----------------
  gameover: {
    bg: "assets/bg/redalert.png",
    left: "",
    right: "",
    speaker: "System",
    role: "Security Breach",
    text: "Your decisions have resulted in a critical insider threat incident.",
    html: false,
    choices: [
      { text: "Restart training", next: "intro", type: "neutral" }
    ]
  }
};
