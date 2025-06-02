"use client";

import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { PageHeader } from "@/components/PageHeader"; // Assuming you have a PageHeader component

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <PageHeader title="Settings" description="Manage your application and account settings." />
      
      <div className="mt-8 grid gap-8 md:grid-cols-1 lg:grid-cols-3">
        {/* Column 1: General Settings (like Theme) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Appearance</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Select how Asset Scout looks to you. Select a single theme, or sync with your system.
                </p>
                <ThemeToggle />
              </div>
              {/* Other appearance settings can go here */}
            </div>
          </div>

          {/* Placeholder for Profile Settings */}
          <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Profile</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage your personal information. (Coming Soon)</p>
            {/* Profile form elements will go here */}
          </div>

          {/* Placeholder for Notification Settings */}
          <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Notifications</h2>
            <p className="text-gray-600 dark:text-gray-400">Configure your notification preferences. (Coming Soon)</p>
            {/* Notification toggles will go here */}
          </div>

        </div>

        {/* Column 2: Sidebar / Help (Optional) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Need Help?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Visit our help center or contact support if you have any questions.
            </p>
            {/* Links to help/support */}
          </div>
        </div>
      </div>
    </div>
  );
}
