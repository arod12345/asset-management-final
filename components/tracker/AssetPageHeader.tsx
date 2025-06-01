"use client";
import React, { useState } from "react";
import { PlusCircle, Upload } from "lucide-react";
import AddAssetModal from "./AddAssetModal"; // Updated import

interface AssetPageHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AssetPageHeader: React.FC<AssetPageHeaderProps> = ({ activeTab, setActiveTab }) => {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const tabs = ["All Assets", "Not Active"];

  const handleAssetAdded = () => {
    // Increment the refresh trigger to cause a re-render of child components
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-10 relative"> {/* Adjusted padding */}
      {isAddAssetOpen && <AddAssetModal 
        onClose={() => setIsAddAssetOpen(false)} 
        onAssetAdded={handleAssetAdded} 
      />}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-6 pb-4 space-y-3 md:space-y-0">
        <div className="flex items-center space-x-3 md:space-x-4">
          <h2 className="text-xl md:text-2xl font-semibold text-black">Assets</h2>
          <div className="bg-gray-100 text-green-600 text-xs md:text-sm px-2 py-1 rounded-md font-medium">
            100 {/* This should be dynamic */}
          </div>
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

      <div className="flex space-x-4 md:space-x-6 pt-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-medium pb-2.5 whitespace-nowrap ${
              activeTab === tab
                ? "text-[#34BC68] border-b-2 border-[#34BC68]"
                : "text-gray-600 hover:text-black"
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