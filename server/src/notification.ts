import { MonitorConfig, NotificationConfig } from './config';

export interface NotificationData {
  title: string;
  body: string;
}

export class NotificationManager {
  constructor(private config: NotificationConfig) {}

  async sendStatusChangeNotification(
    monitor: MonitorConfig,
    isUp: boolean,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ): Promise<void> {
    // Skip notification if monitor is in the skip list
    if (this.config.skipNotificationIds?.includes(monitor.id)) {
      console.log(`Skipping notification for ${monitor.name} (${monitor.id} in skipNotificationIds)`);
      return;
    }

    const notification = this.formatStatusChangeNotification(
      monitor,
      isUp,
      timeIncidentStart,
      timeNow,
      reason
    );

    await this.sendNotification(notification);
  }

  private formatStatusChangeNotification(
    monitor: MonitorConfig,
    isUp: boolean,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ): NotificationData {
    const timeZone = this.config.timeZone || 'Etc/GMT';
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });

    const downtimeDuration = Math.round((timeNow - timeIncidentStart) / 60);
    const timeNowFormatted = dateFormatter.format(new Date(timeNow * 1000));
    const timeIncidentStartFormatted = dateFormatter.format(new Date(timeIncidentStart * 1000));

    if (isUp) {
      return {
        title: `✅ ${monitor.name} is up!`,
        body: `The service is up again after being down for ${downtimeDuration} minutes.`,
      };
    } else if (timeNow === timeIncidentStart) {
      return {
        title: `🔴 ${monitor.name} is currently down.`,
        body: `Service is unavailable at ${timeNowFormatted}. Issue: ${reason || 'unspecified'}`,
      };
    } else {
      return {
        title: `🔴 ${monitor.name} is still down.`,
        body: `Service is unavailable since ${timeIncidentStartFormatted} (${downtimeDuration} minutes). Issue: ${reason || 'unspecified'}`,
      };
    }
  }

  private async sendNotification(notification: NotificationData): Promise<void> {
    if (!this.config.appriseApiServer || !this.config.recipientUrl) {
      console.log('Apprise API server or recipient URL not set, skipping notification');
      return;
    }

    console.log(
      `Sending notification: ${notification.title} - ${notification.body} to ${this.config.recipientUrl} via ${this.config.appriseApiServer}`
    );

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.config.appriseApiServer, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: this.config.recipientUrl,
          title: notification.title,
          body: notification.body,
          type: 'warning',
          format: 'text',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const responseText = await response.text();
        console.log(`Error calling apprise server, code: ${response.status}, response: ${responseText}`);
      } else {
        console.log(`Notification sent successfully, code: ${response.status}`);
      }
    } catch (error) {
      console.log(`Error calling apprise server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default NotificationManager;