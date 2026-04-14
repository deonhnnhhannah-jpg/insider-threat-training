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
      this.handlers = {};
      this.mode = "local";
    }

    setSession({ roomCode, role, isHost, handlers }) {
      this.roomCode = roomCode;
      this.role = role;
      this.isHost = isHost;
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
    disconnect() {}
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
      this.send("request_sync", {});
    }

    disconnect() {
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
        isHost: this.isHost
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
        .on("broadcast", { event: "request_sync" }, payload => {
          this.dispatch(this.normalizeMessage("request_sync", payload.payload));
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
        .subscribe(async status => {
          if (status !== "SUBSCRIBED") return;

          await this.channel.track({
            playerId: this.playerId,
            role: this.role,
            isHost: this.isHost,
            roomCode: this.roomCode,
            onlineAt: new Date().toISOString()
          });

          this.send("presence", { role: this.role, isHost: this.isHost });
          this.send("request_sync", {});
        });
    }

    disconnect() {
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
        isHost: payload.isHost
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
          isHost: this.isHost
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
