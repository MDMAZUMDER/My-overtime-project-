import { LocalNotifications } from '@capacitor/local-notifications';
import { AppSettings } from '../types/app';

export class NotificationService {
  static async requestPermissions() {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  }

  static async scheduleReminder(settings: AppSettings['notifications'], strings: any) {
    // Cancel existing notifications first
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    if (!settings.enabled) return;

    const [hours, minutes] = settings.time.split(':').map(Number);

    await LocalNotifications.schedule({
      notifications: [
        {
          title: strings.notifications.reminderTitle,
          body: strings.notifications.reminderMessage,
          id: 1,
          schedule: {
            on: {
              hour: hours,
              minute: minutes,
            },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: 'default',
          actionTypeId: 'OPEN_APP',
          extra: null,
        },
      ],
    });
  }

  static async cancelAll() {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  }
}
