/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AddEntry from "./pages/AddEntry";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

import Profile from "./pages/Profile";
import LanguageSettings from "./pages/settings/Language";
import NotificationSettings from "./pages/settings/Notifications";
import OvertimeSettings from "./pages/settings/Overtime";
import TimeFormatSettings from "./pages/settings/TimeFormat";
import SecuritySettings from "./pages/settings/Security";
import DataManagement from "./pages/settings/DataManagement";
import AppearanceSettings from "./pages/settings/Appearance";

export default function App() {
  return (
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
  );
}
