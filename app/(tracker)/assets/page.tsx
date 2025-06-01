"use client";
import React, { useState } from "react";
import AssetTable from "@/components/tracker/AssetTable";
import AssetPageHeader from "@/components/tracker/AssetPageHeader";

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("All Assets");

  return (
    <div className="w-full">
      <AssetPageHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {activeTab === "All Assets" && <AssetTable />}
        {activeTab === "Not Active" && (
          <div className="h-[300px] bg-white rounded-xl m-2 md:m-6 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
            Not Active section placeholder
          </div>
        )}
      </div>
    </div>
  );
}