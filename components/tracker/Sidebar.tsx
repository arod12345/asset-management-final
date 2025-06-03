"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CreditCard,
  DollarSign,
  Briefcase,
  ShieldCheck,
  Users,
  BarChart2,
  Settings,
  LogOut,
  X // For mobile close button
} from "lucide-react";
import { SignedOut, SignOutButton } from "@clerk/nextjs"; // For logout

interface NavItem {
  label: string;
  icon: JSX.Element;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
  // { label: "Expense", icon: <CreditCard size={20} />, href: "/expense" },
  // { label: "Income", icon: <DollarSign size={20} />, href: "/income" },
  { label: "Assets", icon: <Briefcase size={20} />, href: "/assets" },
  // { label: "Roles", icon: <ShieldCheck size={20} />, href: "/roles" },
  // { label: "Employees", icon: <Users size={20} />, href: "/employees" },
  { label: "Reports", icon: <BarChart2 size={20} />, href: "/reports" },
  { label: "Settings", icon: <Settings size={20} />, href: "/settings" },
];

interface SidebarProps {
  active: string;
  onItemClick: (label: string) => void; // Kept for potential direct state changes if needed, but Link handles nav
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  active,
  onItemClick,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        isMobileSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        // Only close if click is outside, Topbar's menu button handles opening
        // This effect is mainly for the overlay click on mobile
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

  return (
    <div ref={sidebarRef} className="h-full bg-white flex flex-col justify-between border-r border-gray-200 md:border-none">
      {/* Top Title & Mobile Close Button */}
      <div className="pt-8 md:pt-10 pb-8 md:pb-12 pl-6 md:pl-12 pr-4 flex justify-between items-center">
        <Link href="/dashboard" passHref>
          <h1 className="text-xl font-bold cursor-pointer">
            <span className="text-[#34bc68]">Expense</span>
            <span className="text-black">Scout</span>
          </h1>
        </Link>
        <button
          className="md:hidden text-gray-600 hover:text-black"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation Items */}
      <ul className="flex-1 space-y-1 pl-4 md:pl-8 pr-2">
        {navItems.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              passHref
              className={`flex items-center px-3 py-2.5 cursor-pointer relative group rounded-lg md:rounded-tr-2xl md:rounded-br-2xl md:rounded-l-none
                ${
                  active === item.label
                    ? "bg-[#34bc68] text-white" // Active style consistent
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              onClick={() => {
                onItemClick(item.label); // For potential state updates
                if (isMobileSidebarOpen) setIsMobileSidebarOpen(false); // Close mobile sidebar on nav
              }}
            >
              <span className="mr-3">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Logout */}
      <div className="py-6 pl-6 md:pl-10">
        <SignOutButton>
          <button className="flex items-center text-gray-700 hover:text-gray-900 cursor-pointer w-full px-3 py-2.5 rounded-lg hover:bg-gray-100">
            <LogOut size={20} className="mr-3" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </SignOutButton>
      </div>
    </div>
  );
};

export default Sidebar;