type TelemetryCallback = (data: any) => void;

const getWsUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  if (!baseUrl) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/telemetry`;
  }
  return baseUrl.replace(/^http/, 'ws') + '/ws/telemetry';
};

export const telemetryWebSocketService = {
  socket: null as WebSocket | null,
  listeners: [] as TelemetryCallback[],

  connect(url: string = getWsUrl()) {
    if (this.socket) return;
    this.socket = new WebSocket(url);
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach(cb => cb(data));
      } catch (e) {
        console.error('Error parsing telemetry WebSocket data', e);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      // Auto reconnect after 5s
      setTimeout(() => this.connect(url), 5000);
    };
  },

  subscribe(callback: TelemetryCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
};
