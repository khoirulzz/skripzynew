"use client";

import { useEffect } from "react";

export default function PushNotificationListener() {
  useEffect(() => {
    const initPushNotifications = async () => {
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');

          // Request permission to use push notifications
          // iOS will prompt user and return if they granted permission or not
          // Android will just grant without prompting
          const result = await PushNotifications.requestPermissions();
          
          if (result.receive === 'granted') {
            // Register with Apple / Google to receive push via APNS/FCM
            PushNotifications.register();
          }

          // On success, we should be able to receive notifications
          PushNotifications.addListener('registration',
            (token) => {
              console.log('Push registration success, token: ' + token.value);
              // TODO: Send the token to your backend if you want to target specific users
            }
          );

          // Some issue with our setup and push will not work
          PushNotifications.addListener('registrationError',
            (error) => {
              console.error('Error on registration: ' + JSON.stringify(error));
            }
          );

          // Show us the notification payload if the app is open on our device
          PushNotifications.addListener('pushNotificationReceived',
            (notification) => {
              console.log('Push received: ' + JSON.stringify(notification));
            }
          );

          // Method called when tapping on a notification
          PushNotifications.addListener('pushNotificationActionPerformed',
            (notification) => {
              console.log('Push action performed: ' + JSON.stringify(notification));
            }
          );

        } catch (e) {
          console.error("Push Notifications init failed", e);
        }
      }
    };

    initPushNotifications();
  }, []);

  return null;
}
