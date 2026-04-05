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

const _stateSubscribers = new Set<(state: HubConnectionStatus) => void>();

hub.onclose(() => _stateSubscribers.forEach(cb => cb('disconnected')));
hub.onreconnecting(() => _stateSubscribers.forEach(cb => cb('reconnecting')));
hub.onreconnected(() => _stateSubscribers.forEach(cb => cb('connected')));

export function onHubStateChange(cb: (state: HubConnectionStatus) => void): void {
  _stateSubscribers.add(cb);
}

export function offHubStateChange(cb: (state: HubConnectionStatus) => void): void {
  _stateSubscribers.delete(cb);
}

export { hub };
