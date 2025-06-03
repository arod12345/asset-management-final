"use client";
import React from "react";
import { Bell, Settings, Search, Menu } from "lucide-react";
import { UserButton, useUser, OrganizationSwitcher } from "@clerk/nextjs";

interface TopbarProps {
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
}

const Topbar: React.FC<TopbarProps> = ({ setIsMobileSidebarOpen }) => {
  const { user } = useUser();

  return (
    <div className="w-full bg-white sticky top-0 z-30"> {/* z-30 to be above content but below modals */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <Menu
            size={24}
            className="text-black cursor-pointer"
            onClick={() => setIsMobileSidebarOpen(true)}
          />
        </div>

        {/* Search input (hidden on mobile) */}
        <div className="hidden md:flex items-center bg-gray-50 px-3 py-2 rounded-md w-full max-w-md lg:max-w-lg">
          <Search className="text-gray-400 mr-2" size={18} />
          <input
            type="text"
            placeholder="Search anything here..."
            className="bg-transparent outline-none text-sm w-full text-gray-700 placeholder-gray-500"
          />
        </div>

        {/* Spacer to push icons to right if search is not taking full width or on mobile */}
        <div className="flex-1 md:hidden"></div>

        {/* Icons section */}
        <div className="flex items-center space-x-4 md:space-x-6">
          {/* <button className="text-gray-500 hover:text-gray-700">
            <Settings size={20} />
          </button> */}
          <button className="relative text-gray-500 hover:text-gray-700">
            <Bell size={20} />
            {/* Optional: Notification dot */}
            {/* <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" /> */}
          </button>

          {/* Clerk Organization Switcher */}
          <OrganizationSwitcher 
            afterCreateOrganizationUrl="/dashboard" 
            afterLeaveOrganizationUrl="/sign-in"
            afterSelectOrganizationUrl={(org) => `/dashboard?orgId=${org.id}`}
            appearance={{
              elements: {
                organizationPreviewTextContainer: "text-sm",
                organizationSwitcherTrigger: "text-sm p-2 border border-gray-300 rounded-md hover:bg-gray-50",
              }
            }}
          />

          {/* Clerk User Button */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
      {/* Bottom border line */}
      <div className="h-[1px] bg-gray-200 w-full"></div>
    </div>
  );
};

export default Topbar;