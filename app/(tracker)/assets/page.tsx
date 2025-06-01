// app/(tracker)/assets/page.tsx
"use client";
import React, { useState } from "react";
import AssetTable from "@/components/tracker/AssetTable";
import AssetPageHeader from "@/components/tracker/AssetPageHeader";
import { useOrganization, OrganizationSwitcher } from "@clerk/nextjs";


export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("All Assets");
  const { organization } = useOrganization();
  const [refreshKey, setRefreshKey] = useState(0); // Key to trigger refresh

  const handleAssetAdded = () => {
    setRefreshKey(prevKey => prevKey + 1); // Increment key to trigger re-fetch in AssetTable
  };


  return (
    <div className="w-full">
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
        <h2 className="text-md font-semibold">Current Organization: {organization?.name || "None"}</h2>
        <OrganizationSwitcher
            hidePersonal={true}
            afterSelectOrganizationUrl={(org) => `/assets?orgId=${org.id}`} // Or simply let Clerk handle active org
        />
      </div>

      <AssetPageHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAssetAdded={handleAssetAdded} // Pass callback to header, which passes to modal
      />
      <div className="mt-4">
        {activeTab === "All Assets" && <AssetTable refreshTrigger={refreshKey} />}
        {activeTab === "Not Active" && (
          <div className="h-[300px] bg-white rounded-xl m-2 md:m-6 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
            Not Active assets section (filter AssetTable or make separate component)
          </div>
        )}
      </div>
    </div>
  );
}