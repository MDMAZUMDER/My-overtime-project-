import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { AppSettings } from '../types/app';

export class NotificationService {
  static isSupported() {
    try {
      const isPluginAvailable = Capacitor.isPluginAvailable('LocalNotifications');
      
      // On web, we also need to check if the browser supports the Notification API
      if (Capacitor.getPlatform() === 'web') {
        return isPluginAvailable && 
               typeof window !== 'undefined' &&
               'Notification' in window && 
               !!window.Notification &&
               typeof window.Notification.requestPermission === 'function';
      }
      
      return isPluginAvailable;
    } catch {
      return false;
    }
  }

  static async requestPermissions() {
    if (!this.isSupported()) return false;
    try {
      // Check if we are in a browser and permission is already denied
      if (Capacitor.getPlatform() === 'web') {
        if (typeof window === 'undefined' || !window.Notification) return false;
        
        if (window.Notification.permission === 'denied') {
          return false;
        }
        
        // If already granted, return true
        if (window.Notification.permission === 'granted') {
          return true;
        }
      }
      
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    } catch (error: any) {
      const msg = (error?.message || String(error)).toLowerCase();
      // If the error is about support or permission, we don't need to log it as a critical error
      if (msg.includes('not supported') || msg.includes('denied') || msg.includes('unavailable') || msg.includes('not available')) {
        return false;
      }
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
            title: settings.reminderMessage || strings.notifications.reminderTitle,
            body: settings.reminderMessage ? strings.notifications.reminderTitle : strings.notifications.reminderMessage,
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
