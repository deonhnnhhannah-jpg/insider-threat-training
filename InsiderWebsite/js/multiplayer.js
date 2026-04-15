(function () {
  function createId() {
    return `player-${Math.random().toString(36).slice(2, 10)}`;
  }

  class BaseBridge {
    constructor() {
      this.playerId = sessionStorage.getItem("insiderPlayerId") || createId();
      sessionStorage.setItem("insiderPlayerId", this.playerId);
      this.roomCode = null;
      this.role = null;
      this.isHost = false;
      this.name = "Player";
      this.ready = false;
      this.handlers = {};
      this.mode = "local";
      this.heartbeatInterval = null;
      this.unloadHandler = null;
    }

    setSession({ roomCode, role, isHost, name, ready, handlers }) {
      this.roomCode = roomCode;
      this.role = role;
      this.isHost = isHost;
      this.name = name || "Player";
      this.ready = Boolean(ready);
      this.handlers = handlers || {};
    }

    dispatch(message) {
      if (!message || message.playerId === this.playerId) return;
      if (message.roomCode !== this.roomCode) return;

      const handler = this.handlers[message.type];
      if (typeof handler === "function") {
        handler(message);
      }
    }

    send() {}
    connect() {}
    disconnect() {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.unloadHandler) {
        window.removeEventListener("beforeunload", this.unloadHandler);
        this.unloadHandler = null;
      }
    }

    startPresenceLoop() {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      this.heartbeatInterval = setInterval(() => {
        this.send("heartbeat", {});
      }, 5000);

      this.unloadHandler = () => {
        this.send("leave", {});
      };

      window.addEventListener("beforeunload", this.unloadHandler);
    }
  }

  class LocalMultiplayerBridge extends BaseBridge {
    constructor() {
      super();
      this.channel = null;
      this.mode = "local";
    }

    connect(options) {
      this.disconnect();
      this.setSession(options);

      this.channel = new BroadcastChannel(`insider-room-${this.roomCode}`);
      this.channel.onmessage = event => this.dispatch(event.data);

      this.send("presence", { role: this.role, isHost: this.isHost });
      this.send("ready_state", { ready: this.ready });
      this.send("request_sync", {});
      this.startPresenceLoop();
    }

    disconnect() {
      this.send("leave", {});
      super.disconnect();
      if (this.channel) {
        this.channel.close();
        this.channel = null;
      }
    }

    send(type, payload) {
      if (!this.channel) return;

      this.channel.postMessage({
        type,
        payload,
        roomCode: this.roomCode,
        playerId: this.playerId,
        role: this.role,
        isHost: this.isHost,
        name: this.name
      });
    }
  }

  class SupabaseMultiplayerBridge extends BaseBridge {
    constructor(config) {
      super();
      this.mode = "supabase";
      this.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      this.channel = null;
      this.presenceKey = this.playerId;
    }

    connect(options) {
      this.disconnect();
      this.setSession(options);

      this.channel = this.client.channel(`insider-room-${this.roomCode}`, {
        config: {
          broadcast: { self: false },
          presence: { key: this.presenceKey }
        }
      });

      this.channel
        .on("broadcast", { event: "presence" }, payload => {
          this.dispatch(this.normalizeMessage("presence", payload.payload));
        })
        .on("broadcast", { event: "heartbeat" }, payload => {
          this.dispatch(this.normalizeMessage("heartbeat", payload.payload));
        })
        .on("broadcast", { event: "leave" }, payload => {
          this.dispatch(this.normalizeMessage("leave", payload.payload));
        })
        .on("broadcast", { event: "request_sync" }, payload => {
          this.dispatch(this.normalizeMessage("request_sync", payload.payload));
        })
        .on("broadcast", { event: "ready_state" }, payload => {
          this.dispatch(this.normalizeMessage("ready_state", payload.payload));
        })
        .on("broadcast", { event: "state_sync" }, payload => {
          this.dispatch(this.normalizeMessage("state_sync", payload.payload));
        })
        .on("broadcast", { event: "choice_locked" }, payload => {
          this.dispatch(this.normalizeMessage("choice_locked", payload.payload));
        })
        .on("broadcast", { event: "round_resolved" }, payload => {
          this.dispatch(this.normalizeMessage("round_resolved", payload.payload));
        })
        .on("broadcast", { event: "hotspot_triggered" }, payload => {
          this.dispatch(this.normalizeMessage("hotspot_triggered", payload.payload));
        })
        .on("broadcast", { event: "hotspot_resolved" }, payload => {
          this.dispatch(this.normalizeMessage("hotspot_resolved", payload.payload));
        })
        .on("broadcast", { event: "game_over" }, payload => {
          this.dispatch(this.normalizeMessage("game_over", payload.payload));
        })
        .on("broadcast", { event: "advance_scene" }, payload => {
          this.dispatch(this.normalizeMessage("advance_scene", payload.payload));
        })
        .on("broadcast", { event: "show_summary" }, payload => {
          this.dispatch(this.normalizeMessage("show_summary", payload.payload));
        })
        .on("broadcast", { event: "duel_state" }, payload => {
          this.dispatch(this.normalizeMessage("duel_state", payload.payload));
        })
        .on("broadcast", { event: "duel_attack_selected" }, payload => {
          this.dispatch(this.normalizeMessage("duel_attack_selected", payload.payload));
        })
        .on("broadcast", { event: "duel_round_result" }, payload => {
          this.dispatch(this.normalizeMessage("duel_round_result", payload.payload));
        })
        .on("broadcast", { event: "duel_pose" }, payload => {
          this.dispatch(this.normalizeMessage("duel_pose", payload.payload));
        })
        .on("broadcast", { event: "duel_closet_enter" }, payload => {
          this.dispatch(this.normalizeMessage("duel_closet_enter", payload.payload));
        })
        .on("broadcast", { event: "duel_closet_toggle" }, payload => {
          this.dispatch(this.normalizeMessage("duel_closet_toggle", payload.payload));
        })
        .on("broadcast", { event: "duel_task_complete" }, payload => {
          this.dispatch(this.normalizeMessage("duel_task_complete", payload.payload));
        })
        .on("broadcast", { event: "duel_match_end" }, payload => {
          this.dispatch(this.normalizeMessage("duel_match_end", payload.payload));
        })
        .subscribe(async status => {
          if (status !== "SUBSCRIBED") return;

          await this.channel.track({
            playerId: this.playerId,
            role: this.role,
            isHost: this.isHost,
            name: this.name,
            roomCode: this.roomCode,
            onlineAt: new Date().toISOString()
          });

          this.send("presence", { role: this.role, isHost: this.isHost });
          this.send("ready_state", { ready: this.ready });
          this.send("request_sync", {});
          this.startPresenceLoop();
        });
    }

    disconnect() {
      this.send("leave", {});
      super.disconnect();
      if (this.channel) {
        this.client.removeChannel(this.channel);
        this.channel = null;
      }
    }

    normalizeMessage(type, payload) {
      return {
        type,
        payload,
        roomCode: payload.roomCode,
        playerId: payload.playerId,
        role: payload.role,
        isHost: payload.isHost,
        name: payload.name
      };
    }

    send(type, payload) {
      if (!this.channel) return;

      this.channel.send({
        type: "broadcast",
        event: type,
        payload: {
          ...payload,
          roomCode: this.roomCode,
          playerId: this.playerId,
          role: this.role,
          isHost: this.isHost,
          name: this.name
        }
      });
    }
  }

  function getConfig() {
    return window.INSIDER_CONFIG || {};
  }

  function hasSupabaseConfig(config) {
    return Boolean(
      config &&
      typeof window.supabase !== "undefined" &&
      config.supabaseUrl &&
      config.supabaseAnonKey
    );
  }

  const config = getConfig();
  window.insiderMultiplayer = hasSupabaseConfig(config)
    ? new SupabaseMultiplayerBridge(config)
    : new LocalMultiplayerBridge();
})();
