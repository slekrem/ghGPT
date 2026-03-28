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

export { hub };
