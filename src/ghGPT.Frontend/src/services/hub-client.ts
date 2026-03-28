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

export function onHubEvent(event: string, callback: (...args: unknown[]) => void): void {
  hub.on(event, callback);
}

export function offHubEvent(event: string, callback: (...args: unknown[]) => void): void {
  hub.off(event, callback);
}

export { hub };
