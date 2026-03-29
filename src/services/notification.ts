import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { AppSettings } from '../types/app';

export class NotificationService {
  static isSupported() {
    return Capacitor.isPluginAvailable('LocalNotifications');
  }

  static async requestPermissions() {
    if (!this.isSupported()) return false;
    try {
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async scheduleReminder(settings: AppSettings['notifications'], strings: any) {
    if (!this.isSupported()) return;
    
    try {
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
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  static async cancelAll() {
    if (!this.isSupported()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }
}
