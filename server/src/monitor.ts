import { MonitorConfig } from './config';
import { createConnection } from 'net';

export interface MonitorResult {
  ping: number;
  up: boolean;
  error: string;
}

export class MonitorChecker {
  async checkMonitor(monitor: MonitorConfig): Promise<MonitorResult> {
    const startTime = Date.now();
    
    try {
      if (monitor.method === 'TCP_PING') {
        return await this.checkTcpMonitor(monitor, startTime);
      } else {
        return await this.checkHttpMonitor(monitor, startTime);
      }
    } catch (error) {
      return {
        ping: 0,
        up: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async checkTcpMonitor(monitor: MonitorConfig, startTime: number): Promise<MonitorResult> {
    try {
      const [host, portStr] = monitor.target.split(':');
      const port = parseInt(portStr);
      
      if (!host || !port) {
        throw new Error('Invalid TCP target format. Expected host:port');
      }

      await this.tcpConnect(host, port, monitor.timeout || 10000);
      
      const ping = Date.now() - startTime;
      console.log(`${monitor.name} connected to ${monitor.target}`);
      
      return {
        ping,
        up: true,
        error: '',
      };
    } catch (error) {
      console.log(`${monitor.name} failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        ping: 0,
        up: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private tcpConnect(host: string, port: number, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port });
      
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);

      socket.on('connect', () => {
        clearTimeout(timer);
        socket.end();
        resolve();
      });

      socket.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private async checkHttpMonitor(monitor: MonitorConfig, startTime: number): Promise<MonitorResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), monitor.timeout || 10000);
      
      const response = await fetch(monitor.target, {
        method: monitor.method,
        headers: monitor.headers as Record<string, string>,
        body: monitor.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log(`${monitor.name} responded with ${response.status}`);
      
      const ping = Date.now() - startTime;
      
      // Check status code
      if (monitor.expectedCodes) {
        if (!monitor.expectedCodes.includes(response.status)) {
          console.log(`${monitor.name} expected ${monitor.expectedCodes}, got ${response.status}`);
          return {
            ping: 0,
            up: false,
            error: `Expected codes: ${JSON.stringify(monitor.expectedCodes)}, Got: ${response.status}`,
          };
        }
      } else {
        if (response.status < 200 || response.status > 299) {
          console.log(`${monitor.name} expected 2xx, got ${response.status}`);
          return {
            ping: 0,
            up: false,
            error: `Expected codes: 2xx, Got: ${response.status}`,
          };
        }
      }

      // Check response body keywords if specified
      if (monitor.responseKeyword || monitor.responseForbiddenKeyword) {
        const responseBody = await response.text();
        
        // Must contain responseKeyword
        if (monitor.responseKeyword && !responseBody.includes(monitor.responseKeyword)) {
          console.log(
            `${monitor.name} expected keyword ${monitor.responseKeyword}, not found in response (truncated to 100 chars): ${responseBody.slice(0, 100)}`
          );
          return {
            ping: 0,
            up: false,
            error: "HTTP response doesn't contain the configured keyword",
          };
        }
        
        // Must NOT contain responseForbiddenKeyword
        if (monitor.responseForbiddenKeyword && responseBody.includes(monitor.responseForbiddenKeyword)) {
          console.log(
            `${monitor.name} forbidden keyword ${monitor.responseForbiddenKeyword}, found in response (truncated to 100 chars): ${responseBody.slice(0, 100)}`
          );
          return {
            ping: 0,
            up: false,
            error: 'HTTP response contains the configured forbidden keyword',
          };
        }
      }
      
      return {
        ping,
        up: true,
        error: '',
      };
    } catch (error) {
      console.log(`${monitor.name} failed: ${error instanceof Error ? error.message : String(error)}`);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');
      
      return {
        ping: 0,
        up: false,
        error: isTimeout ? `Timeout after ${monitor.timeout || 10000}ms` : errorMessage,
      };
    }
  }
}

export default MonitorChecker;