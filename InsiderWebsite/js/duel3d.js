(function () {
  if (typeof window.THREE === "undefined") {
    window.insiderDuel3D = null;
    return;
  }

  class Duel3DManager {
    constructor() {
      this.container = null;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.animationFrame = null;
      this.keys = {};
      this.yaw = 0;
      this.pitch = 0;
      this.role = "office";
      this.playerRole = "office";
      this.interactables = [];
      this.activeTarget = null;
      this.partnerAvatar = null;
      this.partnerPose = null;
      this.partnerVisible = false;
      this.movementLocked = false;
      this.tagEnabled = false;
      this.canTagPartner = false;
      this.closetDoorPivot = null;
      this.closetDoorTarget = 0;
      this.closetDoorOpen = false;
      this.closetOccluder = null;
      this.closetBounds = null;
      this.blockClosetEntry = false;
      this.jumpVelocity = 0;
      this.onGround = true;
      this.baseEyeHeight = 1.72;
      this.closetEntryTriggered = false;
      this.callbacks = {};
      this.clock = new THREE.Clock();
      this.boundResize = () => this.resize();
      this.boundPointerDown = event => this.onPointerDown(event);
      this.boundPointerMove = event => this.onPointerMove(event);
      this.boundPointerLockChange = () => this.onPointerLockChange();
      this.boundKeyDown = event => this.onKeyDown(event);
      this.boundKeyUp = event => this.onKeyUp(event);
    }

    mount(container, options = {}) {
      if (!container) return;
      this.unmount();

      this.container = container;
      this.role = options.role || "office";
      this.playerRole = options.playerRole || this.role;
      this.callbacks = options.callbacks || {};
      this.keys = {};
      this.activeTarget = null;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.role === "hacker" ? 0x0b0710 : 0x09111d);
      this.scene.fog = new THREE.Fog(this.role === "hacker" ? 0x0b0710 : 0x09111d, 10, 34);

      this.camera = new THREE.PerspectiveCamera(74, 1, 0.1, 100);
      this.camera.rotation.order = "YXZ";
      this.camera.position.set(0, this.baseEyeHeight, 8.8);
      this.yaw = 0;
      this.pitch = -0.06;

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.shadowMap.enabled = false;
      this.renderer.setClearColor(this.role === "hacker" ? 0x0b0710 : 0x09111d, 1);

      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);

      this.buildEnvironment();
      this.resize();
      this.attachEvents();
      this.animate();
    }

    unmount() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }

      this.detachEvents();

      if (this.renderer) {
        this.renderer.dispose();
      }

      if (this.container) {
        this.container.innerHTML = "";
      }

      this.container = null;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.interactables = [];
      this.activeTarget = null;
      this.partnerAvatar = null;
      this.partnerPose = null;
      this.partnerVisible = false;
      this.movementLocked = false;
      this.tagEnabled = false;
      this.canTagPartner = false;
      this.closetDoorPivot = null;
      this.closetDoorTarget = 0;
      this.closetDoorOpen = false;
      this.closetOccluder = null;
      this.closetBounds = null;
      this.blockClosetEntry = false;
      this.jumpVelocity = 0;
      this.onGround = true;
      this.closetEntryTriggered = false;
      this.keys = {};
    }

    setRole(role) {
      if (!role || role === this.role || !this.container) return;
      this.mount(this.container, { role, playerRole: this.playerRole, callbacks: this.callbacks });
    }

    attachEvents() {
      if (!this.renderer) return;
      const canvas = this.renderer.domElement;
      canvas.addEventListener("pointerdown", this.boundPointerDown);
      window.addEventListener("pointermove", this.boundPointerMove);
      document.addEventListener("pointerlockchange", this.boundPointerLockChange);
      window.addEventListener("keydown", this.boundKeyDown);
      window.addEventListener("keyup", this.boundKeyUp);
      window.addEventListener("resize", this.boundResize);
    }

    detachEvents() {
      if (this.renderer) {
        this.renderer.domElement.removeEventListener("pointerdown", this.boundPointerDown);
      }
      window.removeEventListener("pointermove", this.boundPointerMove);
      document.removeEventListener("pointerlockchange", this.boundPointerLockChange);
      window.removeEventListener("keydown", this.boundKeyDown);
      window.removeEventListener("keyup", this.boundKeyUp);
      window.removeEventListener("resize", this.boundResize);
    }

    onPointerDown(event) {
      if (!this.container || event.button !== 0) return;
      if (this.renderer && document.pointerLockElement !== this.renderer.domElement) {
        this.renderer.domElement.requestPointerLock();
      }
    }

    onPointerMove(event) {
      if (!this.camera || !this.renderer || document.pointerLockElement !== this.renderer.domElement) return;
      this.yaw -= event.movementX * 0.0022;
      this.pitch -= event.movementY * 0.0018;
      this.pitch = Math.max(-1.05, Math.min(1.05, this.pitch));
    }

    onPointerLockChange() {
      if (typeof this.callbacks.onPointerLockChange === "function") {
        this.callbacks.onPointerLockChange(document.pointerLockElement === (this.renderer && this.renderer.domElement));
      }
    }

    releasePointerLock() {
      if (this.renderer && document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
    }

    onKeyDown(event) {
      this.keys[event.code] = true;

      if (event.code === "KeyE" && this.activeTarget) {
        event.preventDefault();
        if (typeof this.callbacks.onInteract === "function") {
          this.callbacks.onInteract(this.activeTarget.type);
        }
      }

      if (event.code === "KeyF" && this.tagEnabled && this.canTagPartner) {
        event.preventDefault();
        if (typeof this.callbacks.onTagAttempt === "function") {
          this.callbacks.onTagAttempt();
        }
      }

      if (event.code === "Space" && !this.movementLocked && this.onGround) {
        event.preventDefault();
        this.jumpVelocity = 4.9;
        this.onGround = false;
      }

      if (event.code === "Escape" && typeof this.callbacks.onEscape === "function") {
        this.callbacks.onEscape();
      }
    }

    onKeyUp(event) {
      this.keys[event.code] = false;
    }

    resize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth || 1;
      const height = this.container.clientHeight || 1;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }

    createMaterial(color, emissive = 0x000000, emissiveIntensity = 0) {
      return new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity,
        roughness: 0.72,
        metalness: 0.12
      });
    }

    addMesh(geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      this.scene.add(mesh);
      return mesh;
    }

    addRoomShell() {
      const floorMat = this.createMaterial(this.role === "hacker" ? 0x17121f : 0x243041);
      const floor = this.addMesh(new THREE.PlaneGeometry(28, 28), floorMat, 0, 0, 0, -Math.PI / 2);
      floor.receiveShadow = false;

      const ceilingMat = this.createMaterial(this.role === "hacker" ? 0x140e1a : 0x1f2a3a);
      this.addMesh(new THREE.PlaneGeometry(28, 28), ceilingMat, 0, 5.6, 0, Math.PI / 2);

      const wallMat = this.createMaterial(this.role === "hacker" ? 0x1b1323 : 0x2a3a4f);
      this.addMesh(new THREE.BoxGeometry(28, 6, 0.4), wallMat, 0, 3, -13.8);
      this.addMesh(new THREE.BoxGeometry(28, 6, 0.4), wallMat, 0, 3, 13.8);
      this.addMesh(new THREE.BoxGeometry(0.4, 6, 28), wallMat, -13.8, 3, 0);
      this.addMesh(new THREE.BoxGeometry(0.4, 6, 28), wallMat, 13.8, 3, 0);
    }

    addLights() {
      const ambient = new THREE.AmbientLight(this.role === "hacker" ? 0xb794f6 : 0xd8ecff, this.role === "hacker" ? 1.2 : 1.35);
      this.scene.add(ambient);

      const hemi = new THREE.HemisphereLight(
        this.role === "hacker" ? 0xff8ab4 : 0x9dd6ff,
        this.role === "hacker" ? 0x120914 : 0x14212f,
        1.25
      );
      hemi.position.set(0, 6, 0);
      this.scene.add(hemi);

      const lightPositions = [
        [-6, 4.8, -7],
        [6, 4.8, -7],
        [-6, 4.8, 7],
        [6, 4.8, 7]
      ];

      lightPositions.forEach(([x, y, z], index) => {
        const color = this.role === "hacker"
          ? (index % 2 === 0 ? 0xff4d8d : 0x8b5cf6)
          : (index % 2 === 0 ? 0x9dd6ff : 0xc7f0ff);
        const light = new THREE.PointLight(color, this.role === "hacker" ? 2.1 : 2.6, 16);
        light.position.set(x, y, z);
        this.scene.add(light);

        const bulb = this.addMesh(
          new THREE.SphereGeometry(0.16, 12, 12),
          this.createMaterial(0xffffff, color, 0.95),
          x,
          y,
          z
        );
        bulb.userData.decor = true;
      });
    }

    addDeskCluster(x, z, accentColor, primaryType, secondaryType, primaryLabel, secondaryLabel) {
      const topMat = this.createMaterial(this.role === "hacker" ? 0x2f2032 : 0x3b4d63);
      const legMat = this.createMaterial(this.role === "hacker" ? 0x1a111e : 0x243243);
      const deskTop = this.addMesh(new THREE.BoxGeometry(3.8, 0.22, 1.6), topMat, x, 1.05, z);
      deskTop.userData.decor = true;

      [-1.5, 1.5].forEach(dx => {
        [-0.55, 0.55].forEach(dz => {
          this.addMesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), legMat, x + dx, 0.5, z + dz);
        });
      });

      const screen = this.addMesh(
        new THREE.BoxGeometry(1.75, 1.04, 0.12),
        this.createMaterial(0x111827, accentColor, 1.05),
        x,
        1.92,
        z - 0.48
      );
      this.registerInteractable(screen, primaryType, primaryLabel);

      this.addMesh(new THREE.BoxGeometry(0.14, 0.52, 0.14), this.createMaterial(0x4b5563), x, 1.34, z - 0.42);

      const phone = this.addMesh(
        new THREE.BoxGeometry(0.36, 0.08, 0.7),
        this.createMaterial(0x111827, accentColor, 0.55),
        x + 1.05,
        1.14,
        z + 0.1,
        -0.62,
        0,
        0.28
      );
      this.registerInteractable(phone, secondaryType, secondaryLabel);

      const chair = this.addMesh(
        new THREE.BoxGeometry(1.08, 0.18, 1.0),
        this.createMaterial(this.role === "hacker" ? 0x211727 : 0x334155),
        x,
        0.58,
        z + 1.35
      );
      chair.userData.decor = true;
    }

    addPrinterZone() {
      const base = this.addMesh(
        new THREE.BoxGeometry(1.45, 1.1, 1.3),
        this.createMaterial(0x94a3b8),
        8.8,
        0.62,
        -6.6
      );
      base.userData.decor = true;

      const lid = this.addMesh(
        new THREE.BoxGeometry(1.3, 0.12, 1.18),
        this.createMaterial(0xe2e8f0, 0x60a5fa, 0.18),
        8.8,
        1.24,
        -6.6
      );
      this.registerInteractable(lid, "printer", "Press E to inspect the secure printer bay");
    }

    addAccessDoorZone() {
      const frameMat = this.createMaterial(0x475569);
      this.addMesh(new THREE.BoxGeometry(2.8, 4.4, 0.18), frameMat, -10.4, 2.2, -9.1);
      const panel = this.addMesh(
        new THREE.BoxGeometry(0.32, 0.54, 0.18),
        this.createMaterial(0x0f172a, 0x38bdf8, 0.72),
        -8.9,
        1.65,
        -8.7
      );
      this.registerInteractable(panel, "access-door", "Press E to inspect the badge access checkpoint");
    }

    addSecurityConsoleZone() {
      const console = this.addMesh(
        new THREE.BoxGeometry(1.4, 1.3, 0.26),
        this.createMaterial(0x111827, 0x22d3ee, 0.8),
        -8.6,
        1.8,
        4.2
      );
      this.registerInteractable(console, "security-console", "Press E to use the security kiosk");
    }

    addNetworkClosetZone() {
      const wallMat = this.createMaterial(0x0f172a, 0x38bdf8, 0.04);
      const frameMat = this.createMaterial(0x334155);
      const rackMat = this.createMaterial(0x1e293b, 0x22d3ee, 0.15);

      this.addMesh(new THREE.BoxGeometry(3.8, 3.2, 0.18), wallMat, 10.25, 1.6, 10.9);
      this.addMesh(new THREE.BoxGeometry(0.18, 3.2, 3.6), wallMat, 8.45, 1.6, 9.2);
      this.addMesh(new THREE.BoxGeometry(0.18, 3.2, 3.6), wallMat, 12.05, 1.6, 9.2);
      this.addMesh(new THREE.BoxGeometry(3.8, 0.18, 3.6), wallMat, 10.25, 3.15, 9.2);
      this.addMesh(new THREE.BoxGeometry(3.8, 0.05, 3.6), this.createMaterial(0x111827), 10.25, 0.03, 9.2);

      const rackLeft = this.addMesh(new THREE.BoxGeometry(0.72, 2.1, 0.72), rackMat, 10.9, 1.05, 9.8);
      const rackRight = this.addMesh(new THREE.BoxGeometry(0.72, 2.1, 0.72), rackMat, 10.9, 1.05, 8.5);
      rackLeft.userData.decor = true;
      rackRight.userData.decor = true;
      this.addMesh(new THREE.BoxGeometry(0.82, 0.22, 0.82), this.createMaterial(0x0f172a, 0x38bdf8, 0.65), 10.9, 2.05, 9.8);
      this.addMesh(new THREE.BoxGeometry(0.82, 0.22, 0.82), this.createMaterial(0x0f172a, 0x38bdf8, 0.65), 10.9, 2.05, 8.5);

      this.addMesh(new THREE.BoxGeometry(0.22, 2.9, 0.5), frameMat, 8.46, 1.45, 7.45);
      this.addMesh(new THREE.BoxGeometry(0.22, 2.9, 0.5), frameMat, 10.16, 1.45, 7.45);
      this.addMesh(new THREE.BoxGeometry(1.92, 0.24, 0.5), frameMat, 9.31, 2.78, 7.45);
      this.addMesh(new THREE.BoxGeometry(1.92, 0.18, 0.5), frameMat, 9.31, 0.11, 7.45);

      const pivot = new THREE.Group();
      pivot.position.set(8.46, 0, 7.45);
      this.scene.add(pivot);
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 2.72, 0.16),
        this.createMaterial(0x1f2937, 0x38bdf8, 0.12)
      );
      door.position.set(0.95, 1.36, 0);
      pivot.add(door);
      const occluder = new THREE.Mesh(
        new THREE.BoxGeometry(3.32, 3.04, 0.24),
        this.createMaterial(0x0b1220)
      );
      occluder.position.set(10.12, 1.52, 7.74);
      this.scene.add(occluder);
      this.closetDoorPivot = pivot;
      this.closetDoorTarget = 0;
      this.closetDoorOpen = false;
      this.closetOccluder = occluder;
      this.closetBounds = {
        minX: 8.6,
        maxX: 11.95,
        minZ: 7.55,
        maxZ: 10.85
      };
      this.registerInteractable(door, "network-closet", "Press E to use the network closet door");
    }

    addIntelWallZone() {
      const board = this.addMesh(
        new THREE.BoxGeometry(2.6, 1.8, 0.14),
        this.createMaterial(0x201320, 0xf43f5e, 0.42),
        9.1,
        2.2,
        3.8
      );
      this.registerInteractable(board, "intel-wall", "Press E to review your intel wall");
    }

    addMalwareBenchZone() {
      const bench = this.addMesh(
        new THREE.BoxGeometry(2.6, 0.2, 1.2),
        this.createMaterial(0x2b1f31),
        -7.9,
        1.1,
        -5.2
      );
      bench.userData.decor = true;
      const device = this.addMesh(
        new THREE.BoxGeometry(1.05, 0.56, 0.84),
        this.createMaterial(0x111827, 0xff4d8d, 0.7),
        -7.9,
        1.55,
        -5.2
      );
      this.registerInteractable(device, "malware-bench", "Press E to inspect the malware bench");
    }

    addUplinkZone() {
      const uplink = this.addMesh(
        new THREE.CylinderGeometry(0.75, 0.9, 1.7, 10),
        this.createMaterial(0x14131b, 0x8b5cf6, 0.68),
        7.8,
        0.95,
        -7.9
      );
      this.registerInteractable(uplink, "uplink", "Press E to access the command uplink");
    }

    addDecorStrips() {
      const accentColor = this.role === "hacker" ? 0xff4d8d : 0x38bdf8;
      const stripMat = this.createMaterial(0x0f172a, accentColor, 0.6);

      for (let i = -10; i <= 10; i += 4) {
        this.addMesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), stripMat, i, 3.8, -13.15);
      }

      const rug = this.addMesh(
        new THREE.PlaneGeometry(7.5, 5.4),
        this.createMaterial(this.role === "hacker" ? 0x1a1020 : 0x1b2a3f, accentColor, 0.08),
        0,
        0.01,
        3.2,
        -Math.PI / 2
      );
      rug.userData.decor = true;
    }

    buildPartnerAvatar() {
      const avatar = new THREE.Group();
      const accent = 0xff7ab6;
      const bodyMat = this.createMaterial(0xe2e8f0, accent, 0.24);
      bodyMat.transparent = true;
      bodyMat.opacity = 0.86;

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.84, 6, 12), bodyMat);
      body.position.y = 0.98;
      avatar.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), this.createMaterial(0xf8fafc, accent, 0.34));
      head.material.transparent = true;
      head.material.opacity = 0.92;
      head.position.y = 1.98;
      avatar.add(head);

      const aura = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.92, 2.5, 20, 1, true),
        new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide
        })
      );
      aura.position.y = 1.22;
      avatar.add(aura);

      avatar.visible = false;
      avatar.userData.bodyMaterial = bodyMat;
      avatar.userData.headMaterial = head.material;
      avatar.userData.auraMaterial = aura.material;
      this.scene.add(avatar);
      this.partnerAvatar = avatar;
    }

    buildEnvironment() {
      this.interactables = [];
      this.addRoomShell();
      this.addLights();
      this.addDecorStrips();

      if (this.role === "office") {
        this.addDeskCluster(0, -7.4, 0x38bdf8, "computer", "phone", "Press E to use your office computer", "Press E to check your work phone");
        this.addPrinterZone();
        this.addAccessDoorZone();
        this.addSecurityConsoleZone();
        this.addNetworkClosetZone();
      } else {
        this.addDeskCluster(0, -7.4, 0xff4d8d, "computer", "phone", "Press E to use your attack workstation", "Press E to use your burner phone");
        this.addIntelWallZone();
        this.addMalwareBenchZone();
        this.addUplinkZone();
      }

      this.buildPartnerAvatar();
    }

    registerInteractable(mesh, type, label) {
      if (!mesh.material.emissive) {
        mesh.material.emissive = new THREE.Color(0x000000);
      }
      mesh.userData.baseEmissiveIntensity = mesh.material.emissiveIntensity || 0;
      this.interactables.push({ mesh, type, label });
    }

    animate() {
      this.animationFrame = requestAnimationFrame(() => this.animate());
      if (!this.scene || !this.camera || !this.renderer) return;

      const delta = Math.min(this.clock.getDelta(), 0.033);
      this.updateMovement(delta);
      this.updateLook();
      this.updateClosetDoor(delta);
      this.updateClosetEntryState();
      this.updatePartnerAvatar(delta);
      this.updateInteractionTarget();
      this.renderer.render(this.scene, this.camera);
    }

    updateClosetDoor(delta) {
      if (!this.closetDoorPivot) return;
      const lerpAmount = Math.min(1, delta * 5.5);
      this.closetDoorPivot.rotation.y += (this.closetDoorTarget - this.closetDoorPivot.rotation.y) * lerpAmount;
    }

    updatePartnerAvatar(delta) {
      if (!this.partnerAvatar) return;
      if (!this.partnerVisible || !this.partnerPose || this.partnerPose.active === false) {
        this.partnerAvatar.visible = false;
        return;
      }

      this.partnerAvatar.visible = true;
      const targetX = Number(this.partnerPose.x) || 0;
      const targetY = Math.max(0, (Number(this.partnerPose.y) || this.baseEyeHeight) - this.baseEyeHeight);
      const targetZ = Number(this.partnerPose.z) || 0;
      const targetYaw = Number(this.partnerPose.yaw) || 0;
      const lerpAmount = Math.min(1, delta * 7.5);

      this.partnerAvatar.position.x += (targetX - this.partnerAvatar.position.x) * lerpAmount;
      this.partnerAvatar.position.y += (targetY - this.partnerAvatar.position.y) * lerpAmount;
      this.partnerAvatar.position.z += (targetZ - this.partnerAvatar.position.z) * lerpAmount;
      this.partnerAvatar.rotation.y += (targetYaw - this.partnerAvatar.rotation.y) * lerpAmount;
    }

    setPartnerPose(pose) {
      this.partnerPose = pose || null;
      this.updatePartnerAppearance();
      if (!pose && this.partnerAvatar) {
        this.partnerAvatar.visible = false;
      }
    }

    updatePartnerAppearance() {
      if (!this.partnerAvatar || !this.partnerPose) return;

      const isPartnerOffice = this.partnerPose.playerRole === "office";
      const accent = isPartnerOffice ? 0x7dd3fc : 0xff7ab6;
      const bodyMaterial = this.partnerAvatar.userData.bodyMaterial;
      const headMaterial = this.partnerAvatar.userData.headMaterial;
      const auraMaterial = this.partnerAvatar.userData.auraMaterial;

      if (bodyMaterial) {
        bodyMaterial.emissive.setHex(accent);
      }
      if (headMaterial) {
        headMaterial.emissive.setHex(accent);
      }
      if (auraMaterial) {
        auraMaterial.color.setHex(accent);
      }
    }

    setPartnerVisible(visible) {
      this.partnerVisible = Boolean(visible);
      if (!this.partnerVisible && this.partnerAvatar) {
        this.partnerAvatar.visible = false;
      }
    }

    setMovementLocked(locked) {
      this.movementLocked = Boolean(locked);
      if (this.movementLocked) {
        this.keys = {};
      }
    }

    setTagEnabled(enabled) {
      this.tagEnabled = Boolean(enabled);
      if (!this.tagEnabled) {
        this.canTagPartner = false;
      }
    }

    setPlayerPose(pose, snap = true) {
      if (!this.camera || !pose) return;
      if (typeof pose.x === "number") this.camera.position.x = pose.x;
      if (typeof pose.y === "number") this.camera.position.y = pose.y;
      if (typeof pose.z === "number") this.camera.position.z = pose.z;
      if (typeof pose.yaw === "number") this.yaw = pose.yaw;
      if (typeof pose.pitch === "number") this.pitch = pose.pitch;
      if (snap) {
        this.updateLook();
      }
    }

    setClosetDoorState(open) {
      this.closetDoorOpen = Boolean(open);
      this.closetDoorTarget = open ? -1.22 : 0;
      if (this.closetOccluder) {
        this.closetOccluder.visible = !this.closetDoorOpen;
      }
    }

    setClosetBlocked(blocked) {
      this.blockClosetEntry = Boolean(blocked);
    }

    getPose() {
      if (!this.camera) return null;
      return {
        x: Number(this.camera.position.x.toFixed(3)),
        y: Number(this.camera.position.y.toFixed(3)),
        z: Number(this.camera.position.z.toFixed(3)),
        yaw: Number(this.yaw.toFixed(4)),
        pitch: Number(this.pitch.toFixed(4)),
        role: this.role,
        playerRole: this.playerRole,
        active: true
      };
    }

    updateMovement(delta) {
      const moveSpeed = 4 * delta;
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 0.0001) {
        forward.set(0, 0, -1);
      } else {
        forward.normalize();
      }
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const next = this.camera.position.clone();

      if (!this.movementLocked) {
        if (this.keys.KeyW || this.keys.ArrowUp) next.addScaledVector(forward, moveSpeed);
        if (this.keys.KeyS || this.keys.ArrowDown) next.addScaledVector(forward, -moveSpeed);
        if (this.keys.KeyA || this.keys.ArrowLeft) next.addScaledVector(right, -moveSpeed);
        if (this.keys.KeyD || this.keys.ArrowRight) next.addScaledVector(right, moveSpeed);
      }

      if (this.closetBounds) {
        const isInsideNow = this.isInsideCloset(this.camera.position);
        const wouldBeInside = this.isInsideCloset(next);
        if (!isInsideNow && wouldBeInside && (!this.closetDoorOpen || this.blockClosetEntry)) {
          next.x = this.camera.position.x;
          next.z = this.camera.position.z;
        }
      }

      next.x = Math.max(-11.6, Math.min(11.6, next.x));
      next.z = Math.max(-11.8, Math.min(11.8, next.z));
      this.jumpVelocity -= 12.5 * delta;
      next.y = this.camera.position.y + this.jumpVelocity * delta;
      if (next.y <= this.baseEyeHeight) {
        next.y = this.baseEyeHeight;
        this.jumpVelocity = 0;
        this.onGround = true;
      }
      this.camera.position.copy(next);
    }

    updateLook() {
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }

    updateInteractionTarget() {
      if (!this.camera) return;

      let bestTarget = null;
      let bestDistance = Infinity;
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation).normalize();

      this.interactables.forEach(target => {
        const targetPosition = new THREE.Vector3();
        target.mesh.getWorldPosition(targetPosition);
        const toTarget = targetPosition.clone().sub(this.camera.position);
        const distance = toTarget.length();
        const dot = toTarget.clone().normalize().dot(forward);

        const highlighted = distance < 2.85 && dot > 0.8;
        target.mesh.material.emissiveIntensity = highlighted
          ? Math.max(1.2, target.mesh.userData.baseEmissiveIntensity + 0.5)
          : target.mesh.userData.baseEmissiveIntensity;

        if (highlighted && distance < bestDistance) {
          bestDistance = distance;
          bestTarget = target;
        }
      });

      if (bestTarget !== this.activeTarget) {
        this.activeTarget = bestTarget;
        if (typeof this.callbacks.onTargetChange === "function") {
          this.callbacks.onTargetChange(bestTarget ? { type: bestTarget.type, label: bestTarget.label } : null);
        }
      }

      this.updateTagState();
    }

    updateTagState() {
      if (!this.camera) return;

      let canTag = false;
      if (this.tagEnabled && this.partnerVisible && this.partnerPose && this.partnerPose.active !== false) {
        const dx = this.partnerAvatar.position.x - this.camera.position.x;
        const dz = this.partnerAvatar.position.z - this.camera.position.z;
        canTag = Math.hypot(dx, dz) < 1.65;
      }

      if (canTag !== this.canTagPartner) {
        this.canTagPartner = canTag;
        if (typeof this.callbacks.onTagOpportunityChange === "function") {
          this.callbacks.onTagOpportunityChange(canTag);
        }
      }
    }

    isInsideCloset(position) {
      if (!this.closetBounds || !position) return false;
      return position.x > this.closetBounds.minX &&
        position.x < this.closetBounds.maxX &&
        position.z > this.closetBounds.minZ &&
        position.z < this.closetBounds.maxZ;
    }

    updateClosetEntryState() {
      if (!this.camera || !this.closetBounds) return;
      const insideCloset = this.isInsideCloset(this.camera.position);

      if (insideCloset && this.closetDoorOpen && !this.closetEntryTriggered) {
        this.closetEntryTriggered = true;
        if (typeof this.callbacks.onClosetEntered === "function") {
          this.callbacks.onClosetEntered();
        }
        return;
      }

      if (!insideCloset || !this.closetDoorOpen) {
        this.closetEntryTriggered = false;
      }
    }
  }

  window.insiderDuel3D = new Duel3DManager();
})();
