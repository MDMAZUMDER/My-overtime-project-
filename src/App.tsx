/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AddEntry from "./pages/AddEntry";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import { FirebaseProvider } from "./components/FirebaseProvider";
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App as CapApp } from '@capacitor/app';

import LanguageSettings from "./pages/settings/Language";
import NotificationSettings from "./pages/settings/Notifications";
import OvertimeSettings from "./pages/settings/Overtime";
import TimeFormatSettings from "./pages/settings/TimeFormat";
import SecuritySettings from "./pages/settings/Security";
import DataManagement from "./pages/settings/DataManagement";
import AppearanceSettings from "./pages/settings/Appearance";

import { APP_VERSION } from "./constants/version";

export default function App() {
  useEffect(() => {
    // Notify Capgo that the app has successfully loaded
    // This prevents the app from rolling back to the previous version
    CapacitorUpdater.notifyAppReady();

    // Check for updates when the app is resumed or opened
    const handleAppStateChange = async (state: any) => {
      // ONLY run update logic if on a native platform (Android/iOS)
      const platform = Capacitor.getPlatform();
      if (state.isActive && (platform === 'android' || platform === 'ios')) {
        try {
          console.log("Checking for updates from Firebase Hosting...");
          
          // 1. Fetch version info from Firebase Hosting
          // Replace with your actual Firebase Hosting URL if different
          const HOSTING_URL = "https://my-overtime-app.web.app";
          const response = await fetch(`${HOSTING_URL}/version.json?t=${Date.now()}`);
          if (!response.ok) throw new Error("Failed to fetch version info");
          
          const remoteData = await response.json();
          const remoteVersion = remoteData.version;
          
          // 2. Get current version from package.json (or use a constant)
          // In a real app, you might use a plugin to get the native version
          // but for OTA we compare with the current JS bundle version
          const currentVersion = APP_VERSION; // Automatically synced from package.json
          
          console.log(`Current Version: ${currentVersion}, Remote Version: ${remoteVersion}`);
          
          if (remoteVersion !== currentVersion) {
            console.log("New update found! Downloading...");
            
            // 3. Download the bundle from Firebase Hosting
            const bundle = await CapacitorUpdater.download({
              url: remoteData.url,
              version: remoteVersion
            });
            
            console.log("Update downloaded. Applying...");
            
            // 4. Set the new bundle
            await CapacitorUpdater.set(bundle);
            
            // 5. Reload the app to apply changes
            CapacitorUpdater.reload();
          } else {
            console.log("App is up to date.");
          }
        } catch (e) {
          console.error("Manual update check failed", e);
        }
      }
    };

    const listener = CapApp.addListener('appStateChange', handleAppStateChange);
    
    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  return (
    <FirebaseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="add" element={<AddEntry />} />
            <Route path="edit/:id" element={<AddEntry />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings/language" element={<LanguageSettings />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="settings/overtime" element={<OvertimeSettings />} />
            <Route path="settings/time-format" element={<TimeFormatSettings />} />
            <Route path="settings/security" element={<SecuritySettings />} />
            <Route path="settings/data-management" element={<DataManagement />} />
            <Route path="settings/appearance" element={<AppearanceSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FirebaseProvider>
  );
}
