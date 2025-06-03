"use client";
import React, { useState } from "react";
import AssetTable from "@/components/tracker/AssetTable";
import AssetPageHeader from "@/components/tracker/AssetPageHeader";
import { useOrganization, OrganizationSwitcher } from "@clerk/nextjs";


export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("All Assets");
  const { organization } = useOrganization();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAssetModified = () => { // Renamed for clarity as it's used for add/edit/delete
    setRefreshKey(prevKey => prevKey + 1); 
  };


  return (
    <div className="w-full">
      {/* <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-md font-semibold text-gray-800 dark:text-gray-200">Current Organization: {organization?.name || "None"}</h2>
        <OrganizationSwitcher
            hidePersonal={true}
            // Setting a new org will trigger a re-render and AssetTable should re-fetch due to org change.
            // You could also add specific logic here if needed, e.g. afterSelectOrganizationUrl
            appearance={{
              elements: {
                organizationSwitcherTrigger: "text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700",
                organizationSwitcherPopoverCard: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                organizationSwitcherPopoverActionButton: "text-primary dark:text-primary-foreground",
                organizationPreviewTextContainer: "text-gray-700 dark:text-gray-300",
                organizationSwitcherPreviewButton: "text-gray-700 dark:text-gray-300"
              }
            }}
        />
      </div> */}

      <AssetPageHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAssetAdded={handleAssetModified} // Pass callback
      />
      <div className="mt-4">
        {activeTab === "All Assets" && <AssetTable refreshTrigger={refreshKey} />}
        {activeTab === "Not Active" && (
          <div className="h-[300px] bg-white dark:bg-gray-800 rounded-xl m-2 md:m-6 border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            Not Active assets section (filter AssetTable or make separate component showing 'Inactive' status)
          </div>
        )}
      </div>
    </div>
  );
}