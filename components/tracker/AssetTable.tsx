"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from 'next/link'; // Import Link
import { Filter, List, LayoutGrid, Search, MoreVertical, ArrowLeft, ArrowRight, ExternalLink, Edit2, Trash2, MapPin, Image as ImageIcon, Eye } from "lucide-react";
import { useOrganization, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import EditAssetModal from './EditAssetModal'; // Import EditAssetModal

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
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    clerkUserId: string;
  } | null;
}

interface AssetTableProps {
  refreshTrigger: number; 
}

const AssetTable: React.FC<AssetTableProps> = ({ refreshTrigger }) => {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { orgRole, isLoaded: authLoaded, userId: currentUserId } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [activeMenuAssetId, setActiveMenuAssetId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!orgLoaded || !authLoaded || !organization) {
      if (orgLoaded && authLoaded && !organization) {
         setIsLoading(false);
         setAssets([]);
      }
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets`, { credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch assets (${response.status} ${response.statusText})` }));
        throw new Error(errorData.message);
      }
      const data: Asset[] = await response.json();
      setAssets(data);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [organization, orgLoaded, authLoaded, refreshTrigger]);

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
    if (!confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
    try {
        setActiveMenuAssetId(null);
        const response = await fetch(`/api/assets/${assetId}`, { method: 'DELETE', credentials: 'include' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Failed to delete asset (${response.status} ${response.statusText})` }));
            throw new Error(errorData.message);
        }
        fetchAssets(); // Refresh list
        alert("Asset deleted successfully.");
    } catch (err: any) {
        console.error("Delete error:", err);
        alert(`Error deleting asset: ${err.message}`);
    }
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setIsEditModalOpen(true);
    setActiveMenuAssetId(null);
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
    return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading organization data...</div>;
  }
  if (!organization && orgLoaded) { // Added orgLoaded to prevent premature message
    return <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl m-2 md:m-6 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">Please select or create an organization to view assets.</div>;
  }
  if (isLoading) return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading assets...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;

  const canManageAssets = orgRole === 'org:admin';

  return (
    <div className="px-4 md:px-6 lg:px-10 pt-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl shadow-sm">
          <div className="flex items-center w-full md:w-auto md:max-w-md bg-transparent py-1">
            <Search className="text-gray-400 dark:text-gray-500 mr-2.5" size={18} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search assets..."
              className="text-sm outline-none placeholder-gray-500 dark:placeholder-gray-400 bg-transparent w-full text-gray-700 dark:text-gray-300"/>
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <button className="flex items-center text-sm px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
              <Filter size={15} className="mr-1.5" />Filter
            </button>
          </div>
        </div>
      
      <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm min-w-[900px]">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 w-12">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 bg-white dark:bg-gray-700"
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
          <tbody className="text-gray-700 dark:text-gray-300">
            {currentData.map((asset) => (
            <tr key={asset.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 bg-white dark:bg-gray-700"
                    checked={selectedItems.includes(asset.id)} onChange={() => handleSelectItem(asset.id)} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/assets/${asset.id}`} className="hover:underline">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{asset.title}</div>
                  </Link>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{asset.model}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300">{asset.serialNumber}</span>
                </td>
                <td className="px-4 py-3">
                  {asset.imageUrl ? (
                    <a href={asset.imageUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
                      <Image src={asset.imageUrl} alt={asset.title} width={40} height={40} className="rounded object-cover"/>
                    </a>
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <ImageIcon size={20}/>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                      asset.status.toLowerCase() === "active" ? "bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300" : 
                      asset.status.toLowerCase() === "inactive" ? "bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300" :
                      "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${
                        asset.status.toLowerCase() === "active" ? "bg-green-500 dark:bg-green-400" : 
                        asset.status.toLowerCase() === "inactive" ? "bg-yellow-500 dark:bg-yellow-400" : "bg-gray-500 dark:bg-gray-400" }`}></span>
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
                            <div className="text-gray-500 dark:text-gray-400 text-[11px]">{asset.assignedTo.email}</div>
                        </div>
                    </div>
                  ) : <span className="text-gray-400 dark:text-gray-500 text-xs italic">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-xs">
                    {asset.latitude && asset.longitude ? (
                        <a href={`https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                            <MapPin size={12} className="mr-1"/> View Map
                        </a>
                    ) : <span className="text-gray-400 dark:text-gray-500 italic">N/A</span>}
                </td>
                <td className="px-4 py-3 text-right relative">
                   {(canManageAssets || asset.assignedToClerkUserId === currentUserId) && ( // Admin or assigned user can interact
                    <button onClick={() => setActiveMenuAssetId(asset.id === activeMenuAssetId ? null : asset.id)}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                      <MoreVertical size={18} />
                    </button>
                   )}
                  {activeMenuAssetId === asset.id && (
                    <div ref={dropdownRef} className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg text-xs z-20 py-1">
                      <Link href={`/assets/${asset.id}`} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center">
                        <Eye size={14} className="mr-2"/> View Details
                      </Link>
                      {canManageAssets && ( // Only admins can edit/delete from table dropdown
                        <>
                          <button onClick={() => handleOpenEditModal(asset)} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center">
                            <Edit2 size={14} className="mr-2"/> Edit Asset
                          </button>
                          <button onClick={() => handleDeleteAsset(asset.id)} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center">
                            <Trash2 size={14} className="mr-2"/> Delete Asset
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
             {currentData.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-500 dark:text-gray-400">No assets found.</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
            <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ArrowLeft size={14} className="mr-1" /> Previous
            </button>
            <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                    <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-2.5 py-1 rounded-md font-medium ${
                            currentPage === pageNumber 
                                ? "bg-green-100 dark:bg-green-700/50 text-green-700 dark:text-green-200" 
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                    >
                        {pageNumber}
                    </button>
                ))}
            </div>
            <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next <ArrowRight size={14} className="ml-1" />
            </button>
        </div>
        )}
      </div>
      {isEditModalOpen && editingAsset && (
        <EditAssetModal 
            asset={editingAsset} 
            onClose={() => {setIsEditModalOpen(false); setEditingAsset(null);}} 
            onAssetUpdated={() => {
                setIsEditModalOpen(false); 
                setEditingAsset(null);
                fetchAssets(); // Re-fetch assets after update
            }}
        />
      )}
    </div>
  );
};

export default AssetTable;