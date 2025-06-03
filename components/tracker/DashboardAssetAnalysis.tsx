"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Filter,
  List,
  LayoutGrid,
  Search,
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2, 
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs"; 

interface ApiAsset {
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
  assignedToDbUserId?: string | null;
  createdAt: string; 
  updatedAt: string; 
  assignedTo?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    clerkUserId?: string | null;
  } | null;
}

interface DisplayAsset {
  id: string; 
  name: string; 
  assetIdDisplay: string; 
  pictureUrl?: string | null;
  status: string;
  statusColor: "green" | "red" | "yellow" | "gray";
  assigneeTeam: string; 
}

interface StatusChartData {
  name: string;
  value: number;
}

const DashboardAssetAnalysis: React.FC = () => {
  const [assets, setAssets] = useState<DisplayAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const assetsPerPage = 5;
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { orgId } = useAuth(); 
  const [statusChartData, setStatusChartData] = useState<StatusChartData[]>([]);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!orgId) {
        setIsLoading(false); 
        setAssets([]); 
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/assets`, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to fetch assets: ${response.status} ${response.statusText}`);
        }
        const apiAssets: ApiAsset[] = await response.json();
        
        const displayAssets = apiAssets.map(asset => {
          let statusColor: DisplayAsset['statusColor'] = 'gray';
          switch (asset.status.toLowerCase()) {
            case 'active': statusColor = 'green'; break;
            case 'inactive': statusColor = 'red'; break;
            case 'maintenance': statusColor = 'yellow'; break;
            default: statusColor = 'gray';
          }

          let assigneeName = "Unassigned";
          if (asset.assignedTo) {
            assigneeName = `${asset.assignedTo.firstName || ''} ${asset.assignedTo.lastName || ''}`.trim();
            if (!assigneeName && asset.assignedTo.email) assigneeName = asset.assignedTo.email;
            if (!assigneeName && asset.assignedTo.clerkUserId) assigneeName = `User (${asset.assignedTo.clerkUserId.substring(0,5)}...)`;
            if (!assigneeName) assigneeName = "Assigned (No Name)";
          } else if (asset.assignedToClerkUserId) {
            assigneeName = `User ID: ${asset.assignedToClerkUserId.substring(0,8)}...`;
          }

          return {
            id: asset.id,
            name: asset.title,
            assetIdDisplay: asset.serialNumber,
            pictureUrl: asset.imageUrl,
            status: asset.status,
            statusColor: statusColor,
            assigneeTeam: assigneeName, 
          };
        });
        setAssets(displayAssets);

        // Process data for status distribution chart from API assets
        const statusCounts: { [key: string]: number } = {};
        apiAssets.forEach(asset => { 
          statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;
        });
        const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        setStatusChartData(chartData);

      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        console.error(err);
      }
      setIsLoading(false);
    };

    fetchAssets();
  }, [orgId]); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveMenuIndex(null);
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

  const filteredAssets = assets.filter((asset) =>
    `${asset.name} ${asset.assetIdDisplay} ${asset.assigneeTeam}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredAssets.length / assetsPerPage);
  const currentData = filteredAssets.slice((currentPage - 1) * assetsPerPage, currentPage * assetsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveMenuIndex(null);
    }
  };

  if (isLoading) {
    return (
      <div className="px-0 md:px-0 lg:px-0 flex items-center justify-center min-h-[300px] bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <Loader2 className="animate-spin text-gray-500" size={32} />
        <p className="ml-2 text-gray-500">Loading asset analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-0 md:px-0 lg:px-0 flex flex-col items-center justify-center min-h-[300px] bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm text-red-600">
        <AlertTriangle size={32} className="mb-2" />
        <p className="font-semibold">Error loading data</p>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="px-0 md:px-0 lg:px-0"> 
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="mb-4 sm:mb-5">
          <h3 className="text-lg font-semibold text-gray-900">Asset Analysis</h3>
          <p className="text-sm text-gray-500 mt-0.5">Manage your assets and track current usage status across teams.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white border border-gray-200 px-3 sm:px-4 py-2.5 rounded-lg mb-4">
          <div className="flex items-center w-full md:w-auto md:max-w-sm bg-transparent py-1">
            <Search className="text-gray-400 mr-2" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="text-xs sm:text-sm outline-none placeholder-gray-500 bg-transparent w-full"
            />
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <button className="flex items-center text-xs sm:text-sm px-2.5 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              <Filter size={14} className="mr-1" />
              Filter
            </button>
            <button className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200">
              <List size={16} className="text-gray-700" />
            </button>
            <button className="p-1.5 rounded-md bg-white border border-gray-300 hover:bg-gray-50">
              <LayoutGrid size={16} className="text-gray-700" />
            </button>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 sm:px-4 py-3 w-10 sm:w-12">
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    onChange={handleSelectAll}
                    checked={selectedItems.length === currentData.length && currentData.length > 0}
                    disabled={currentData.length === 0} 
                  />
                </th>
                <th className="px-3 sm:px-4 py-3">Name</th>
                <th className="px-3 sm:px-4 py-3">Asset ID</th>
                <th className="px-3 sm:px-4 py-3 hidden md:table-cell">Picture</th>
                <th className="px-3 sm:px-4 py-3">Status</th>
                <th className="px-3 sm:px-4 py-3 hidden lg:table-cell">Assignee</th>
                <th className="px-3 sm:px-4 py-3 w-10 sm:w-12"></th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-200">
              {currentData.map((asset, index) => (
              <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-3">
                    <input 
                      type="checkbox" 
                      className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      checked={selectedItems.includes(asset.id)}
                      onChange={() => handleSelectItem(asset.id)}
                    />
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="font-medium text-gray-800 text-xs sm:text-sm">{asset.name}</div>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">{asset.assetIdDisplay}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                    {asset.pictureUrl ? (
                      <a
                        href={asset.pictureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-500 font-medium text-xs hover:text-blue-600 hover:underline"
                      >
                        View
                        <ExternalLink size={10} className="ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No Image</span>
                    )}
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div
                      className={`inline-flex items-center text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${ 
                        asset.statusColor === 'green' ? 'bg-green-100 text-green-700' :
                        asset.statusColor === 'red'   ? 'bg-red-100 text-red-700' :
                        asset.statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1 ${ 
                          asset.statusColor === 'green' ? 'bg-green-500' :
                          asset.statusColor === 'red'   ? 'bg-red-500' :
                          asset.statusColor === 'yellow' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}
                      ></span>
                      {asset.status}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-medium hidden lg:table-cell">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">
                    {asset.assigneeTeam}
                  </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right relative">
                    <button 
                      onClick={() => setActiveMenuIndex(index === activeMenuIndex ? null : index)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenuIndex === index && (
                      <div
                        ref={dropdownRef}
                        className="absolute right-0 mt-1 w-28 bg-white border border-gray-200 rounded-md shadow-lg text-xs z-10 py-1"
                      >
                        <a href={`/assets/${asset.id}`} className="block px-2.5 py-1.5 hover:bg-gray-100 text-gray-700">Details</a>
                        <a href="#" className="block px-2.5 py-1.5 hover:bg-gray-100 text-red-600">Delete</a>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
               {currentData.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500 text-sm">
                    No assets found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
  
          {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-t border-gray-200 text-xs text-gray-600">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="flex items-center px-2 py-1 border border-gray-300 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === 1}
            >
              <ArrowLeft size={12} className="mr-1" />
              Prev
            </button>
             <span className="font-medium">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="flex items-center px-2 py-1 border border-gray-300 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === totalPages}
            >
              Next
              <ArrowRight size={12} className="ml-1" />
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardAssetAnalysis;