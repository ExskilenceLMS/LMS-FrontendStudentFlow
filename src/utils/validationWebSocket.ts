export class ValidationWebSocketClient {
    private jobId: string;
    private callbacks: any;
    private ws: WebSocket | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private pingIntervalMs: number = 1000;
    private isDisconnecting: boolean = false;

    constructor(jobId: string, callbacks: any) {
      this.jobId = jobId;
      this.callbacks = callbacks || {};
    }
  
    // ---------------------------------------------
    // Step 1: Connect to WebSocket
    // ---------------------------------------------
    connect(): void {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const apiBase = process.env.REACT_APP_API_BASE_URL
      const url = new URL(apiBase || '');
      const port = url.port || (protocol === 'wss:' ? '443' : '80');
      const wsUrl = `${protocol}//${host}:${port}/ws/validation/${this.jobId}`;
  
      try {
        this.ws = new WebSocket(wsUrl);
  
        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          if (this.callbacks.onOpen) {
            this.callbacks.onOpen();
          }
          // Start ping interval
          this.startPingInterval();
        };
  
        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            // Silently handle parse errors
          }
        };
  
        this.ws.onerror = (error: Event) => {
          if (this.callbacks.onError) {
            this.callbacks.onError(error);    
          }
        };
  
        this.ws.onclose = () => {
          // Stop ping interval
          this.stopPingInterval();
          if (this.callbacks.onClose) {
            this.callbacks.onClose();
          }
          
          // Attempt to reconnect if not intentionally closed and not disconnecting
          if (!this.isDisconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              // Check again before reconnecting (component might have unmounted)
              if (!this.isDisconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.connect();
              }
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        if (this.callbacks.onError) {
          this.callbacks.onError(error);
        }
      }
    }
  
    // ---------------------------------------------
    // Step 2: Handle incoming WebSocket message
    // ---------------------------------------------
    handleMessage(message: any) {
      const type = message.type;
      const payload = message.payload || message.data || {};
  
      switch (type) {
        case 'connection.established':
          if (this.callbacks.onConnected) {
            this.callbacks.onConnected(payload);
          }
          break;
  
        case 'validation.started':
          if (this.callbacks.onStarted) {
            this.callbacks.onStarted(payload);
          }
          break;
  
        case 'validation.progress':
          if (this.callbacks.onProgress) {
            this.callbacks.onProgress(payload.message || payload.progress || '', payload.percentage || 0);
          }
          break;
  
        case 'validation.stage':
          if (this.callbacks.onStage) {
            this.callbacks.onStage(payload.stage || '', payload.percentage || 0);
          }
          break;
  
        case 'validation.test':
          if (this.callbacks.onTest) {
            this.callbacks.onTest(payload.testName || payload.test || '', payload.state === 'passed' || payload.passed || false, payload.stage || '');
          }
          break;
  
        case 'validation.partial':
          if (this.callbacks.onPartial) {
            this.callbacks.onPartial(payload.results || payload);
          }
          break;
  
        case 'validation.completed':
          if (this.callbacks.onCompleted) {
            this.callbacks.onCompleted(payload.results || payload);
          }
          break;
  
        case 'validation.error':
          if (this.callbacks.onError) {
            this.callbacks.onError(new Error(payload.message || payload.error || 'Unknown error'));
          }
          break;
  
        case 'pong':
          // Heartbeat response
          break;
  
        default:
          // Unknown message type - silently ignore
          break;
      }
    }
  
    // ---------------------------------------------
    // Step 3: Send ping to keep connection alive
    // ---------------------------------------------
    ping(): void {
      // Only ping if not disconnecting and connection is open
      if (!this.isDisconnecting && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
        // Trigger ping animation callback if available
        if (this.callbacks.onPing) {
          this.callbacks.onPing();
        }
      }
    }
  
    // ---------------------------------------------
    // Step 3a: Start automatic ping interval
    // ---------------------------------------------
    startPingInterval(): void {
      this.stopPingInterval(); // Clear any existing interval
      this.pingInterval = setInterval(() => {
        this.ping();
      }, this.pingIntervalMs);
    }
  
    // ---------------------------------------------
    // Step 3b: Stop ping interval
    // ---------------------------------------------
    stopPingInterval(): void {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    }
  
    // ---------------------------------------------
    // Step 4: Close WebSocket connection
    // ---------------------------------------------
    disconnect(): void {
      this.isDisconnecting = true; // Set flag to prevent reconnection
      this.stopPingInterval(); // Stop ping interval
      if (this.ws) {
        try {
          // Close connection synchronously
          if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
          }
        } catch (e) {
          // Ignore errors during disconnect
        }
        this.ws = null;
      }
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent any pending reconnects
    }
  
    // ---------------------------------------------
    // Step 5: Check if WebSocket is connected
    // ---------------------------------------------
    isConnected(): boolean {
      return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
  }
  