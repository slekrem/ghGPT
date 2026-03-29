import * as signalR from '@microsoft/signalr';

const hub = new signalR.HubConnectionBuilder()
  .withUrl('/hubs/repository')
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Warning)
  .build();

export async function startHub(): Promise<void> {
  if (hub.state === signalR.HubConnectionState.Disconnected) {
    await hub.start();
  }
}

export function onHubEvent<T = unknown>(event: string, callback: (arg: T) => void): void {
  hub.on(event, callback as (...args: unknown[]) => void);
}

export function offHubEvent<T = unknown>(event: string, callback: (arg: T) => void): void {
  hub.off(event, callback as (...args: unknown[]) => void);
}

export type HubConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export function getHubState(): HubConnectionStatus {
  switch (hub.state) {
    case signalR.HubConnectionState.Connected:
      return 'connected';
    case signalR.HubConnectionState.Reconnecting:
      return 'reconnecting';
    default:
      return 'disconnected';
  }
}

export function onHubStateChange(cb: (state: HubConnectionStatus) => void): void {
  hub.onclose(() => cb('disconnected'));
  hub.onreconnecting(() => cb('reconnecting'));
  hub.onreconnected(() => cb('connected'));
}

export { hub };
