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
        text: "Click the link to keep your account active.",
        effect: -20,
        feedback:
          "Incorrect. Suspicious email links can lead to credential theft or malware delivery.",
        next: "phish2"
      },
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

const duelRoleBriefs = {
  office: {
    title: "Office Operator",
    status: "You are working from the corporate floor.",
    clue: "Treat every inbox item, chat request, download, and badge request like it could be real or staged."
  },
  hacker: {
    title: "Intrusion Operator",
    status: "You are staging believable pressure attacks from a covert workstation.",
    clue: "Pick attacks that feel routine. Loud attacks can be reported and burn your operation instantly."
  }
};

const duelScenarioDeck = [
  {
    id: "mail-reset",
    attackTitle: "Spoofed Password Reset",
    attackDescription: "Send a fake IT reset message that pushes the office player toward a cloned sign-in page.",
    attackerClue: "This works best when the defender is rushed and afraid of losing access.",
    officeTitle: "Inbox: Password reset required before 5:00 PM",
    officeBody: "A message marked HIGH PRIORITY says your corporate account will be disabled today unless you confirm your password through a link in the email.",
    officeClue: "The sender display name says IT Help Desk, but the reply-to address looks unfamiliar.",
    outcomes: [
      {
        id: "open-link",
        text: "Open the link and sign in immediately.",
        summary: "You entered your credentials into an attacker-controlled page.",
        result: "office_fail"
      },
      {
        id: "report-it",
        text: "Report the email and verify the request through the official help desk.",
        summary: "The security team flags the lure and starts tracing the sender.",
        result: "hacker_fail"
      },
      {
        id: "quarantine",
        text: "Leave it untouched until you can verify it in the morning.",
        summary: "You avoided the lure, but the attacker remains active.",
        result: "continue"
      }
    ]
  },
  {
    id: "chat-vpn",
    attackTitle: "Urgent VPN Chat Request",
    attackDescription: "Impersonate a coworker in chat and pressure the defender to share access information fast.",
    attackerClue: "Use urgency and authority. Make it feel like helping is the fastest path.",
    officeTitle: "Chat: Need the VPN password right now",
    officeBody: "A teammate avatar messages that they are locked out, the boss is waiting, and they need your VPN password immediately.",
    officeClue: "The message is urgent, but password sharing is never part of the normal workflow.",
    outcomes: [
      {
        id: "send-secret",
        text: "Send the password so the work can keep moving.",
        summary: "You handed over a secret to an impersonator.",
        result: "office_fail"
      },
      {
        id: "verify-user",
        text: "Call the coworker on a known number and offer to escalate through IT.",
        summary: "The request falls apart once direct verification starts.",
        result: "hacker_fail"
      },
      {
        id: "stall",
        text: "Reply that you cannot help until they file a support ticket.",
        summary: "The attacker loses momentum, but the campaign stays alive.",
        result: "continue"
      }
    ]
  },
  {
    id: "usb-drop",
    attackTitle: "Parking Lot USB Drop",
    attackDescription: "Leave a mislabeled USB drive where the office player will think it contains valuable internal data.",
    attackerClue: "Curiosity beats caution when the label looks both sensitive and useful.",
    officeTitle: "Desk find: USB labeled Executive Payroll",
    officeBody: "Someone brought you a found USB drive from the parking lot because it looks important and probably belongs to someone in leadership.",
    officeClue: "The label is attention-grabbing enough to be bait.",
    outcomes: [
      {
        id: "plug-in",
        text: "Plug it into your workstation to identify the owner.",
        summary: "The device executes malicious code as soon as it mounts.",
        result: "office_fail"
      },
      {
        id: "turn-in",
        text: "Hand it to IT security for controlled analysis.",
        summary: "Security isolates the device and now knows someone is actively planting media.",
        result: "hacker_fail"
      },
      {
        id: "leave-alone",
        text: "Bag it, label it, and leave it untouched for pickup.",
        summary: "You avoided compromise, but the attacker can try again another day.",
        result: "continue"
      }
    ]
  },
  {
    id: "invoice-attachment",
    attackTitle: "Finance Attachment Lure",
    attackDescription: "Deliver a fake invoice with a malware-laced attachment and a believable payment deadline.",
    attackerClue: "Targets often trust attachments that look like routine finance work.",
    officeTitle: "Invoice discrepancy needs review",
    officeBody: "Finance forwards an invoice marked overdue and asks you to open the attachment to confirm the vendor details before a payment cutoff.",
    officeClue: "The attachment type is unusual for a normal invoice workflow.",
    outcomes: [
      {
        id: "open-attachment",
        text: "Open the attachment so you can clear the issue quickly.",
        summary: "The attachment launches a payload under your account.",
        result: "office_fail"
      },
      {
        id: "call-finance",
        text: "Verify the request with finance and send the file to security review.",
        summary: "The fake invoice is traced before anyone can open it.",
        result: "hacker_fail"
      },
      {
        id: "delay-review",
        text: "Hold the message until the sender confirms through another channel.",
        summary: "You stay safe, but the attacker has not been exposed yet.",
        result: "continue"
      }
    ]
  },
  {
    id: "badge-tailgate",
    attackTitle: "After-hours Tailgate",
    attackDescription: "Approach the secure floor carrying company gear and frame the request like a normal internal handoff slowed down by a simple badge mistake.",
    attackerClue: "A fast-moving physical pretext feels normal when employees are trying to be helpful.",
    officeTitle: "Lobby: Employee says they left their badge at a temporary desk",
    officeBody: "Someone carrying a company laptop and a stack of printed meeting notes says they were moved to another floor for the evening, forgot their badge at the old desk, and only need two minutes upstairs before joining a late leadership call.",
    officeClue: "They sound rushed, familiar with the office, and not obviously out of place.",
    outcomes: [
      {
        id: "let-in",
        text: "Hold the door because the story and gear look legitimate enough.",
        summary: "The attacker got in by leaning on familiarity, urgency, and a believable internal explanation.",
        result: "office_fail"
      },
      {
        id: "escort-checkin",
        text: "Keep the door shut and verify their identity or escort before granting access.",
        summary: "The story falls apart once you require identity verification instead of judging by appearances.",
        result: "hacker_fail"
      },
      {
        id: "walk-away",
        text: "Tell them to wait while you look for someone else to handle it.",
        summary: "You did not let them through, but you also left the situation unresolved and unreported.",
        result: "continue"
      }
    ]
  },
  {
    id: "meeting-invite",
    attackTitle: "Calendar Invite Clone",
    attackDescription: "Send a fake executive meeting invite with a shared document link that asks for re-authentication.",
    attackerClue: "People trust calendar invites because they arrive inside a normal workflow.",
    officeTitle: "Calendar: Board prep meeting just moved",
    officeBody: "An updated calendar invite says the briefing deck changed locations and asks you to sign in again before the meeting starts in ten minutes.",
    officeClue: "The invite is urgent, but the new document host is not one your team normally uses.",
    outcomes: [
      {
        id: "open-deck-link",
        text: "Open the deck link and sign in again so you are not late.",
        summary: "The cloned login page captured your account session.",
        result: "office_fail"
      },
      {
        id: "check-calendar-owner",
        text: "Verify the organizer and confirm the update through the official calendar thread.",
        summary: "The fake invite is exposed before anyone can interact with it.",
        result: "hacker_fail"
      },
      {
        id: "skip-meeting-link",
        text: "Ignore the update until someone confirms the meeting changed.",
        summary: "You stayed safe, but the attacker is still in play.",
        result: "continue"
      }
    ]
  },
  {
    id: "printer-release",
    attackTitle: "Printer Pickup Pretext",
    attackDescription: "Trigger a fake secure-print notice that gets the defender to scan a spoofed QR code at the printer bay.",
    attackerClue: "Blending digital and physical workflow makes the lure feel official.",
    officeTitle: "Secure print job needs release",
    officeBody: "A printer message claims a sensitive document is waiting and asks you to scan the posted QR code to authenticate before it auto-deletes.",
    officeClue: "The QR code is taped over the normal badge reader instructions.",
    outcomes: [
      {
        id: "scan-qr",
        text: "Scan the QR code on your phone so the print job is not lost.",
        summary: "The QR page collects corporate credentials through a fake mobile sign-in.",
        result: "office_fail"
      },
      {
        id: "use-normal-release",
        text: "Ignore the QR code and use the approved print-release method.",
        summary: "The planted lure is neutralized and facilities security gets notified.",
        result: "hacker_fail"
      },
      {
        id: "walk-away-printer",
        text: "Leave the printer alone until support can inspect it.",
        summary: "You avoided the trap, but the attacker still has room to pivot.",
        result: "continue"
      }
    ]
  },
  {
    id: "fake-update",
    attackTitle: "Critical Software Update Popup",
    attackDescription: "Push a fake endpoint update prompt that installs malware if the defender rushes through it.",
    attackerClue: "A believable maintenance window can make dangerous prompts feel routine.",
    officeTitle: "System popup: security update required",
    officeBody: "A full-screen window says your endpoint is out of compliance and must install a security patch right now or lose network access.",
    officeClue: "The popup appears in the browser, not through the company device manager.",
    outcomes: [
      {
        id: "install-update",
        text: "Run the installer immediately so the machine stays compliant.",
        summary: "The fake updater drops a malicious remote access tool.",
        result: "office_fail"
      },
      {
        id: "verify-device-manager",
        text: "Check the request in the approved device management tool before touching it.",
        summary: "The attacker loses cover once the fake maintenance prompt is verified.",
        result: "hacker_fail"
      },
      {
        id: "delay-update",
        text: "Dismiss it and wait for the real IT notice.",
        summary: "You avoid compromise, but the attacker remains hidden in the background.",
        result: "continue"
      }
    ]
  },
  {
    id: "shared-drive",
    attackTitle: "Shared Drive Permission Bait",
    attackDescription: "Share a plausible project folder with a malicious shortcut inside and pressure the defender to open it fast.",
    attackerClue: "People trust shared folders when they look tied to an active deliverable.",
    officeTitle: "Shared folder: final assets for client delivery",
    officeBody: "A coworker shares a folder called FINAL_CLIENT_EXPORT and says the team needs you to open the launcher file inside before legal signs off.",
    officeClue: "The file has an unusual extension for a normal document review task.",
    outcomes: [
      {
        id: "open-launcher",
        text: "Open the launcher file so you can confirm the assets quickly.",
        summary: "The shortcut executes code from a compromised share.",
        result: "office_fail",
        damage: 2
      },
      {
        id: "inspect-share-owner",
        text: "Check the share owner and ask security to review the file type first.",
        summary: "The malicious share is cut off before it can spread laterally.",
        result: "hacker_fail"
      },
      {
        id: "preview-later",
        text: "Leave the folder untouched until the sender confirms over a trusted channel.",
        summary: "The attacker does not land the hit, but the campaign is still alive.",
        result: "continue"
      }
    ]
  },
  {
    id: "voice-support",
    attackTitle: "Remote Support Call",
    attackDescription: "Use a fake help desk callback to walk the defender into a remote session and privilege abuse.",
    attackerClue: "Voice calls feel more legitimate when they reference a real ticket number.",
    officeTitle: "Incoming call: help desk needs to finish your ticket",
    officeBody: "A caller says they are from internal support, references a real-looking ticket number, and asks you to open a remote session link so they can fix a login issue.",
    officeClue: "They sound informed, but they are asking you to break the normal support path.",
    outcomes: [
      {
        id: "grant-remote-access",
        text: "Open the remote session because they already know the ticket number.",
        summary: "You handed live workstation control to an attacker.",
        result: "office_fail",
        damage: 2
      },
      {
        id: "call-helpdesk-back",
        text: "End the call and ring the official help desk number yourself.",
        summary: "The attacker loses the social pretext the moment you switch to a trusted channel.",
        result: "hacker_fail"
      },
      {
        id: "ask-to-email",
        text: "Tell them to send the instructions by email and revisit it later.",
        summary: "You avoided the immediate trap, but the attacker still has a path to try again.",
        result: "continue"
      }
    ]
  },
  {
    id: "mfa-fatigue",
    attackerDevice: "phone",
    officeDevice: "phone",
    attackTitle: "MFA Fatigue Push",
    attackDescription: "Hammer the target with approval prompts, then follow with a reassuring text that frames one tap as a harmless sync fix.",
    attackerClue: "Fatigue works when the target thinks clearing the prompt is easier than investigating it.",
    officeTitle: "Authenticator storm: sign-in approval requests keep arriving",
    officeBody: "Your work phone lights up with repeated MFA prompts, then a message claims IT is resyncing your account and asks you to approve the next request so the noise stops.",
    officeClue: "You did not initiate a login, and real support should never ask you to approve a prompt you do not recognize.",
    outcomes: [
      {
        id: "approve-prompt",
        text: "Approve the next prompt so the sign-in loop stops.",
        summary: "You approved an attacker login after getting worn down by repeated prompts.",
        result: "office_fail",
        damage: 2
      },
      {
        id: "deny-and-report",
        text: "Deny the prompts, change your password, and report the activity.",
        summary: "The fatigue attempt is burned once identity checks and reporting kick in together.",
        result: "hacker_fail",
        damage: 2
      },
      {
        id: "silence-phone",
        text: "Silence the device for now and revisit it later.",
        summary: "You avoid the immediate trap, but the attacker keeps probing for another opening.",
        result: "continue"
      }
    ]
  },
  {
    id: "benefits-portal",
    attackerDevice: "computer",
    officeDevice: "computer",
    attackTitle: "Benefits Portal Re-Enrollment",
    attackDescription: "Send a plausible HR benefits reminder with a familiar logo and a cloned employee portal behind the button.",
    attackerClue: "HR-themed lures feel trustworthy because they arrive from systems employees rarely inspect closely.",
    officeTitle: "Benefits: action required before enrollment closes tonight",
    officeBody: "A benefits email says you must confirm dependents before midnight or your coverage could be interrupted, and the message links to an employee portal that looks nearly correct at a glance.",
    officeClue: "The page branding is close, but the URL and login flow do not fully match the real HR system.",
    outcomes: [
      {
        id: "sign-into-portal",
        text: "Sign in right away so your benefits are not affected.",
        summary: "The cloned portal captures your credentials and session cookie.",
        result: "office_fail"
      },
      {
        id: "open-known-portal",
        text: "Open the HR portal from your saved corporate bookmark and verify the notice there.",
        summary: "The lure collapses because you switched to a trusted path instead of the attacker link.",
        result: "hacker_fail"
      },
      {
        id: "forward-to-manager",
        text: "Forward the email to your manager and ask if it looks normal.",
        summary: "You delayed the hit, but the message is still circulating and the attacker keeps cover.",
        result: "continue"
      }
    ]
  },
  {
    id: "temp-badge-clone",
    attackerDevice: "uplink",
    officeDevice: "access-door",
    attackTitle: "Temporary Badge Clone",
    attackDescription: "Arrive at the secure door with a believable temporary badge, a laptop bag, and just enough internal language to sound expected.",
    attackerClue: "The strongest physical pretexts feel almost legitimate, not obviously suspicious.",
    officeTitle: "Door request: contractor says their temp badge should still work",
    officeBody: "A person on the vestibule camera shows a temporary badge sleeve with today's date, references a real floor renovation, and says their escort is already inside but not answering their phone.",
    officeClue: "The badge looks polished enough that the problem is not obvious at a glance.",
    outcomes: [
      {
        id: "buzz-them-in",
        text: "Buzz them through because the temporary badge and work story look legitimate.",
        summary: "The attacker turns a nearly-convincing temporary credential into real access.",
        result: "office_fail",
        damage: 2
      },
      {
        id: "verify-with-security",
        text: "Keep the door closed and verify the escort and visitor record before granting access.",
        summary: "The physical pretext burns out once you force it through real access checks.",
        result: "hacker_fail",
        damage: 2
      },
      {
        id: "talk-through-door",
        text: "Ask them to wait while you sort it out later.",
        summary: "You delayed the entry, but the attempted breach remains active and unreported.",
        result: "continue"
      }
    ]
  },
  {
    id: "e-sign-redirect",
    attackerDevice: "computer",
    officeDevice: "computer",
    attackTitle: "Executive Signature Redirect",
    attackDescription: "Clone a familiar e-signature workflow and hide the malicious click behind a real project subject line.",
    attackerClue: "People lower their guard when the request appears to continue a legitimate approval chain.",
    officeTitle: "Signature request: vendor amendment needs approval today",
    officeBody: "An e-sign message references a real vendor project and asks you to open the agreement through a new review portal because the normal one is reportedly under maintenance.",
    officeClue: "The project details are real, but the delivery path is new and the urgency is doing a lot of work.",
    outcomes: [
      {
        id: "open-new-portal",
        text: "Use the new review portal so the contract does not stall.",
        summary: "The fake approval portal steals your session and opens the next stage of the campaign.",
        result: "office_fail"
      },
      {
        id: "confirm-in-existing-thread",
        text: "Reply in the original project thread and confirm the request through the usual signature system.",
        summary: "The attacker loses the advantage once the workflow is pulled back into a trusted thread.",
        result: "hacker_fail"
      },
      {
        id: "download-and-read",
        text: "Download the agreement to read it first without clicking anything else.",
        summary: "You slowed the attack down, but the suspicious request has not been formally contained.",
        result: "continue"
      }
    ]
  },
  {
    id: "courier-dropoff",
    attackerDevice: "uplink",
    officeDevice: "access-door",
    attackTitle: "Courier Drop-Off Rush",
    attackDescription: "Use a fake courier pretext to get someone to override physical procedure for a supposedly urgent internal delivery.",
    attackerClue: "Delivery pretexts work because employees hate being the person who blocks an important package.",
    officeTitle: "Lobby camera: courier says legal needs a signed package immediately",
    officeBody: "A person in delivery gear says they have a sealed legal packet that cannot be left unattended, uses a real executive name, and insists reception told them the floor contact would meet them directly because the loading desk is closed.",
    officeClue: "The details sound specific enough to be true, which is what makes the shortcut tempting.",
    outcomes: [
      {
        id: "open-for-courier",
        text: "Open the door and sort out the paperwork once the package is inside.",
        summary: "The attacker gets a physical foothold by packaging the shortcut as a professional favor.",
        result: "office_fail"
      },
      {
        id: "redirect-to-dock",
        text: "Keep the door shut and redirect them to the approved delivery and reception process.",
        summary: "The courier pretext fails because you force it into the real building workflow.",
        result: "hacker_fail"
      },
      {
        id: "call-reception-later",
        text: "Tell them to wait while you try to reach someone else.",
        summary: "You stalled the handoff, but the contact is still hanging at the door without a formal escalation.",
        result: "continue"
      }
    ]
  },
  {
    id: "floor-audit-cover",
    attackerDevice: "uplink",
    officeDevice: "access-door",
    attackTitle: "After-Hours Floor Audit Cover",
    attackDescription: "Approach the secure floor posing as a legitimate after-hours auditor with a maintenance checklist and a believable internal purpose.",
    attackerClue: "The cover story works only if it sounds inconvenient to verify, not impossible to verify.",
    officeTitle: "Vestibule camera: auditor says facilities scheduled a late compliance check",
    officeBody: "A confident visitor says they are here for a short compliance walkthrough tied to a real building project, references a renovation your team has heard about, and says the escort is already upstairs with facilities while they were told to come straight to the secured floor.",
    officeClue: "It sounds organized enough that second-guessing it feels socially awkward.",
    outcomes: [
      {
        id: "allow-audit-entry",
        text: "Let them in because the story is detailed and lines up with a real project.",
        summary: "The attacker gets access by wrapping the breach in enough real context to feel inconvenient to challenge.",
        result: "office_fail",
        damage: 2
      },
      {
        id: "call-listed-escort",
        text: "Keep the door closed and verify the escort, work order, and visitor approval before doing anything else.",
        summary: "The pretext breaks as soon as you force it through the real approval chain.",
        result: "hacker_fail",
        damage: 2
      },
      {
        id: "send-to-reception-desk",
        text: "Send them back to reception for now and deal with it later.",
        summary: "You avoided immediate access, but the suspicious approach was not documented or escalated.",
        result: "continue"
      }
    ]
  },
  {
    id: "intel-badge-clone",
    attackerDevice: "intel-wall",
    officeDevice: "computer",
    attackTitle: "Badge Directory Clone",
    attackDescription: "Use collected org-chart details to send a targeted directory update that nudges the office user into exposing access roster information.",
    attackerClue: "Recon-driven attacks feel safer because the names, projects, and timing all line up with real work.",
    officeTitle: "Internal directory request: confirm after-hours access roster",
    officeBody: "A message referencing a real facilities upgrade asks you to review a link and confirm who should keep late-floor access while badge permissions are being migrated overnight.",
    officeClue: "The project is real, but the request is asking for access-sensitive information through a new workflow you do not recognize.",
    outcomes: [
      {
        id: "submit-access-roster",
        text: "Open the roster tool and confirm everyone with late-floor access.",
        summary: "You handed the attacker a high-value map of who can get into sensitive areas and when.",
        result: "office_fail"
      },
      {
        id: "verify-with-facilities",
        text: "Confirm the migration with facilities through the existing project channel before sharing anything.",
        summary: "The recon-heavy lure fails once you verify the workflow through the real owners.",
        result: "hacker_fail"
      },
      {
        id: "ignore-directory-request",
        text: "Ignore it for now until someone follows up again tomorrow.",
        summary: "You avoid the immediate leak, but the attacker keeps both cover and context.",
        result: "continue"
      }
    ]
  },
  {
    id: "bench-signed-driver",
    attackerDevice: "malware-bench",
    officeDevice: "security-console",
    attackTitle: "Signed Driver Panic",
    attackDescription: "Push a fake endpoint warning that claims a signed driver must be approved manually from the security console before business systems fail.",
    attackerClue: "The trick is making the request feel like security work instead of suspicious work.",
    officeTitle: "Security console alert: manual trust approval required",
    officeBody: "Your kiosk shows a red warning that a device-control driver needs emergency approval before encrypted shares go offline, and the panel offers a one-click trust action.",
    officeClue: "The warning feels official, but it is trying to rush a privileged action without the normal change-control context.",
    outcomes: [
      {
        id: "approve-driver",
        text: "Approve the driver so the outage does not spread.",
        summary: "The attacker gets privileged execution by disguising malware approval as urgent security work.",
        result: "office_fail",
        damage: 2
      },
      {
        id: "check-change-ticket",
        text: "Look for the change ticket and endpoint owner before approving anything.",
        summary: "The fake emergency dies the moment you require the real admin trail behind it.",
        result: "hacker_fail",
        damage: 2
      },
      {
        id: "dismiss-warning",
        text: "Dismiss the alert and hope the real team handles it.",
        summary: "You avoided the malicious approval, but you also left a suspicious alert unexplained.",
        result: "continue"
      }
    ]
  }
];
