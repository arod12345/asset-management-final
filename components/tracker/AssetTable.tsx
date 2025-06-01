// components/tracker/AssetTable.tsx
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Filter, List, LayoutGrid, Search, MoreVertical, ArrowLeft, ArrowRight, ExternalLink, Edit2, Trash2, MapPin, Image as ImageIcon } from "lucide-react";
import { useOrganization, useAuth } from "@clerk/nextjs"; // useAuth for orgRole
import Image from "next/image"; // If you use Next Image for asset pictures
import placeholderAssetImg from "../../public/next.svg"; // Placeholder

// Define a more detailed Asset type matching your Prisma model and API response
interface Asset {
  id: string;
  title: string;
  model: string;
  serialNumber: string;
  imageUrl?: string | null;
  description: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  clerkOrganizationId: string;
  assignedToClerkUserId?: string | null;
  createdAt: string; // Dates will be strings from JSON
  updatedAt: string;
  assignedTo?: { // Nested object for assignee details
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    clerkUserId: string;
  } | null;
}

interface AssetTableProps {
  // Prop to trigger refresh, e.g., after adding an asset
  refreshTrigger: number; 
}


const AssetTable: React.FC<AssetTableProps> = ({ refreshTrigger }) => {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { orgRole, isLoaded: authLoaded } = useAuth(); // Get current user's role in the org

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [activeMenuAssetId, setActiveMenuAssetId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // TODO: Implement Edit Modal State
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!orgLoaded || !authLoaded || !organization) {
      // console.log("Waiting for organization or auth to load...");
      if (orgLoaded && authLoaded && !organization) {
         setIsLoading(false); // Not part of any org, or no org selected
         setAssets([]);
      }
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets`, {
        credentials: 'include', // Add this to include auth cookies
      });
      
      if (!response.ok) {
        const errorText = `Failed to fetch assets (${response.status})`;
        console.error(errorText);
        throw new Error(errorText);
      }
      
      const data: Asset[] = await response.json();
      setAssets(data);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      setAssets([]); // Clear assets on error
    } finally {
      setIsLoading(false);
    }
  }, [organization, orgLoaded, authLoaded, refreshTrigger]); // Add refreshTrigger

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveMenuAssetId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(currentData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };
  
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
        setActiveMenuAssetId(null); // Close menu
        const response = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete asset (${response.status})`);
        }
        fetchAssets(); // Refresh list
    } catch (err: any) {
        console.error("Delete error:", err);
        alert(`Error deleting asset: ${err.message}`);
    }
  };

  const handleEditAsset = (asset: Asset) => {
    // setEditingAsset(asset);
    // setIsEditModalOpen(true);
    setActiveMenuAssetId(null);
    alert(`Editing ${asset.title} - (Implement Edit Modal)`);
    // TODO: You'll need an EditAssetModal similar to AddAssetModal, pre-filled with asset data.
  };

  const filteredAssets = assets.filter((asset) =>
    `${asset.title} ${asset.model} ${asset.serialNumber} ${asset.status} ${asset.assignedTo?.firstName || ''} ${asset.assignedTo?.lastName || ''} ${asset.assignedTo?.email || ''}`
      .toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const currentData = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveMenuAssetId(null);
    }
  };

  if (!orgLoaded || !authLoaded) {
    return <div className="text-center py-10">Loading organization data...</div>;
  }

  if (!organization) {
    return <div className="text-center py-10 bg-white rounded-xl m-2 md:m-6 border border-dashed border-gray-300">Please select or create an organization to view assets.</div>;
  }
  
  if (isLoading) return <div className="text-center py-10">Loading assets...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;


  const canManageAssets = orgRole === 'org:admin'; // Admins can edit/delete

  return (
    <div className="px-4 md:px-6 lg:px-10 pt-3">
        {/* Search and Filter Bar - existing structure */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm">
          <div className="flex items-center w-full md:w-auto md:max-w-md bg-transparent py-1">
            <Search className="text-gray-400 mr-2.5" size={18} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search assets by title, model, serial, assignee..."
              className="text-sm outline-none placeholder-gray-500 bg-transparent w-full"/>
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <button className="flex items-center text-sm px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              <Filter size={15} className="mr-1.5" />Filter
            </button>
            {/* View toggle buttons could go here */}
          </div>
        </div>
      
      <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm min-w-[900px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 w-12">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  onChange={handleSelectAll} checked={selectedItems.length === currentData.length && currentData.length > 0} />
              </th>
              <th className="px-4 py-3">Asset (Title/Model)</th>
              <th className="px-4 py-3">Serial No.</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {currentData.map((asset) => (
            <tr key={asset.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    checked={selectedItems.includes(asset.id)} onChange={() => handleSelectItem(asset.id)} />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{asset.title}</div>
                  <div className="text-xs text-gray-500">{asset.model}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700">{asset.serialNumber}</span>
                </td>
                <td className="px-4 py-3">
                  {asset.imageUrl ? (
                    <a href={asset.imageUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
                      <Image src={asset.imageUrl} alt={asset.title} width={40} height={40} className="rounded object-cover"/>
                    </a>
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                      <ImageIcon size={20}/>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                      asset.status.toLowerCase() === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${
                        asset.status.toLowerCase() === "active" ? "bg-green-500" : "bg-yellow-500" }`}></span>
                    {asset.status}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {asset.assignedTo ? (
                    <div className="flex items-center space-x-2">
                        {asset.assignedTo.imageUrl && <Image src={asset.assignedTo.imageUrl} alt="assignee" width={24} height={24} className="rounded-full" />}
                        <div>
                            <div className="font-medium text-xs">
                                {asset.assignedTo.firstName || asset.assignedTo.email?.split('@')[0]} {asset.assignedTo.lastName}
                            </div>
                            <div className="text-gray-500 text-[11px]">{asset.assignedTo.email}</div>
                        </div>
                    </div>
                  ) : <span className="text-gray-400 text-xs italic">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-xs">
                    {asset.latitude && asset.longitude ? (
                        <a href={`https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 hover:underline flex items-center">
                            <MapPin size={12} className="mr-1"/> View Map
                        </a>
                    ) : <span className="text-gray-400 italic">N/A</span>}
                </td>
                <td className="px-4 py-3 text-right relative">
                  {canManageAssets && (
                    <button onClick={() => setActiveMenuAssetId(asset.id === activeMenuAssetId ? null : asset.id)}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100">
                      <MoreVertical size={18} />
                    </button>
                  )}
                  {activeMenuAssetId === asset.id && (
                    <div ref={dropdownRef} className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg text-xs z-20 py-1">
                      <button onClick={() => alert(`Viewing details for ${asset.title}`)} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 text-gray-700">View Details</button>
                      <button onClick={() => handleEditAsset(asset)} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 text-gray-700">Edit Asset</button>
                      <button onClick={() => handleDeleteAsset(asset.id)} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 text-red-600">Delete Asset</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
             {currentData.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-500">No assets found matching your criteria.</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination - existing structure */}
        {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-xs text-gray-600">
          {/* ... pagination buttons ... */}
        </div>
        )}
      </div>
      {/* {isEditModalOpen && editingAsset && (
        <EditAssetModal 
            asset={editingAsset} 
            onClose={() => setIsEditModalOpen(false)} 
            onAssetUpdated={fetchAssets}
        />
      )} */}
    </div>
  );
};

export default AssetTable;