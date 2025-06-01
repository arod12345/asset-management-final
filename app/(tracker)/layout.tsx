"use client"; // This layout itself uses client-side hooks for sidebar state

import React, { useState } from "react";
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/tracker/Sidebar"; // Adjusted path
import Topbar from "@/components/tracker/Topbar";   // Adjusted path

export default function TrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Determine active sidebar item based on pathname
  let activeItem = "Dashboard"; // Default
  if (pathname.includes("/employees")) activeItem = "Employees";
  else if (pathname.includes("/assets")) activeItem = "Assets";
  else if (pathname.includes("/roles")) activeItem = "Roles";
  else if (pathname.includes("/expense")) activeItem = "Expense";
  else if (pathname.includes("/income")) activeItem = "Income";
  else if (pathname.includes("/reports")) activeItem = "Reports";
  else if (pathname.includes("/settings")) activeItem = "Settings";
  // Add more conditions if needed for other sidebar items

  return (
    <div className="flex h-screen bg-white relative">
      {/* Sidebar for desktop */}
      <div className="hidden md:block md:w-[18%] lg:w-[15%] h-full">
        <Sidebar
          active={activeItem}
          onItemClick={() => {}} // Navigation handled by Link components in Sidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />
      </div>

      {/* Sidebar for mobile */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden"> {/* z-40 so it's below modals (z-50) */}
          <div className="flex h-full">
            <div className="w-64 bg-white h-full shadow-md">
              <Sidebar
                active={activeItem}
                onItemClick={() => setIsMobileSidebarOpen(false)} // Close on item click for mobile
                isMobileSidebarOpen={isMobileSidebarOpen}
                setIsMobileSidebarOpen={setIsMobileSidebarOpen}
              />
            </div>
            <div
              className="flex-1 bg-black/40"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}


      {/* Small gap and divider (only for desktop) */}
      <div className="hidden md:block md:w-[1%]"></div>
      <div className="hidden md:block w-[1px] h-full bg-[#e7e4e4]"></div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full h-full bg-white overflow-y-auto">
        <Topbar setIsMobileSidebarOpen={setIsMobileSidebarOpen} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}