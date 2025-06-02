"use client";
import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import AddAssetModal from "./AddAssetModal";

interface AssetPageHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAssetAdded: () => void; // Callback after an asset is successfully added
}

const AssetPageHeader: React.FC<AssetPageHeaderProps> = ({ activeTab, setActiveTab, onAssetAdded }) => {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const tabs = ["All Assets", "Not Active"]; // Example, can be dynamic

  // This component doesn't need its own refreshTrigger,
  // it calls onAssetAdded which is managed by the parent page (AssetsPage)

  return (
    <div className="w-full px-4 md:px-6 lg:px-10 relative">
      {isAddAssetOpen && <AddAssetModal 
        onClose={() => setIsAddAssetOpen(false)} 
        onAssetAdded={() => {
          onAssetAdded(); // Call parent's handler
          setIsAddAssetOpen(false); // Close modal after asset is added
        }} 
      />}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-6 pb-4 space-y-3 md:space-y-0">
        <div className="flex items-center space-x-3 md:space-x-4">
          <h2 className="text-xl md:text-2xl font-semibold text-black dark:text-white">Assets</h2>
          {/* Dynamic count can be added here if available via props or state */}
          {/* <div className="bg-gray-100 dark:bg-gray-700 text-green-600 dark:text-green-400 text-xs md:text-sm px-2 py-1 rounded-md font-medium">
            {/* Count * /}
          </div> */}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <button
            onClick={() => setIsAddAssetOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-[#34BC68] text-white rounded-md text-sm font-medium hover:bg-green-700 w-full sm:w-auto"
          >
            <PlusCircle size={16} className="mr-2" />
            New Asset
          </button>
        </div>
      </div>

      <div className="flex space-x-4 md:space-x-6 pt-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-medium pb-2.5 whitespace-nowrap ${
              activeTab === tab
                ? "text-[#34BC68] dark:text-green-400 border-b-2 border-[#34BC68] dark:border-green-400"
                : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AssetPageHeader;