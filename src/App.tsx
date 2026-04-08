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
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App as CapApp } from '@capacitor/app';

import LanguageSettings from "./pages/settings/Language";
import NotificationSettings from "./pages/settings/Notifications";
import OvertimeSettings from "./pages/settings/Overtime";
import TimeFormatSettings from "./pages/settings/TimeFormat";
import SecuritySettings from "./pages/settings/Security";
import DataManagement from "./pages/settings/DataManagement";
import AppearanceSettings from "./pages/settings/Appearance";

export default function App() {
  useEffect(() => {
    // Notify Capgo that the app has successfully loaded
    // This prevents the app from rolling back to the previous version
    CapacitorUpdater.notifyAppReady();

    // Check for updates when the app is resumed or opened
    const handleAppStateChange = async (state: any) => {
      if (state.isActive) {
        try {
          // This will trigger the autoUpdate if configured in capacitor.config.ts
          // or you can manually check and download here
          console.log("Checking for updates...");
        } catch (e) {
          console.error("Update check failed", e);
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
