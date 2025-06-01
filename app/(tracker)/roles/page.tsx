"use client";
import React, { useState } from "react";
// import RoleBox from "@/components/tracker/RoleBox";
// import RolePageHeader from "@/components/tracker/RolePageHeader";

export default function RolesPage() {
  const [activeTab, setActiveTab] = useState("All Roles");

  return (
    <div className="w-full">
      {/* <RolePageHeader activeTab={activeTab} setActiveTab={setActiveTab} /> */}
      <div className="mt-4">
        {/* {activeTab === "All Roles" && <RoleBox />} */}
        {activeTab === "Permissions" && (
          <div className="h-[300px] bg-white rounded-xl m-2 md:m-6 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
            Permissions section placeholder
          </div>
        )}
      </div>
    </div>
  );
}