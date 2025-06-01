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
    ExternalLink, // Added for view img
  } from "lucide-react";

interface Asset {
  name: string;
  id: string;
  picture: string;
  status: "Active" | "Inactive";
  AssigneeTeam: string;
  statusColor: "green" | "red";
}

const AssetTable: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6; // Adjusted for better view
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);


  const assets: Asset[] = [
    {
      name: "Macbook Pro 16\"",
      id: "#12FC4V56979",
      picture: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800",
      status: "Active",
      AssigneeTeam: "Marketing",
      statusColor: "green",
    },
    {
      name: "Dell XPS 13",
      id: "#88FCV1234",
      picture: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800",
      status: "Inactive",
      AssigneeTeam: "Design",
      statusColor: "red",
    },
    {
      name: "iPhone 15 Pro",
      id: "#19KD8210",
      picture: "https://images.unsplash.com/photo-1695026049309-a055ad63f097?auto=format&fit=crop&w=800",
      status: "Active",
      AssigneeTeam: "Engineering",
      statusColor: "green",
    },
    {
      name: "Office Chair Ergo",
      id: "#45AC2000",
      picture: "https://images.unsplash.com/photo-1580480055273-228ff5382d6d?auto=format&fit=crop&w=800",
      status: "Inactive",
      AssigneeTeam: "HR",
      statusColor: "red",
    },
    {
      name: "Sony WH-1000XM5",
      id: "#93VU1029",
      picture: "https://images.unsplash.com/photo-1629039922688-7a0df9a4dc8c?auto=format&fit=crop&w=800",
      status: "Active",
      AssigneeTeam: "Engineering",
      statusColor: "green",
    },
    {
      name: "Samsung Monitor 27\"",
      id: "#54FR9210",
      picture: "https://images.unsplash.com/photo-1550745165-9bc0b252726c?auto=format&fit=crop&w=800",
      status: "Inactive",
      AssigneeTeam: "Quality",
      statusColor: "red",
    },
    {
      name: "Canon EOS R6",
      id: "#29FE9183",
      picture: "https://images.unsplash.com/photo-1613906090091-c667e53e15f0?auto=format&fit=crop&w=800",
      status: "Active",
      AssigneeTeam: "Marketing",
      statusColor: "green",
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveMenuIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(currentData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const filteredAssets = assets.filter((asset) =>
    `${asset.name} ${asset.id} ${asset.AssigneeTeam}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredAssets.length / usersPerPage);

  const currentData = filteredAssets.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveMenuIndex(null); // Close menu on page change
    }
  };

  return (
    <div className="px-4 md:px-6 lg:px-10 pt-3">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm">
        <div className="flex items-center w-full md:w-auto md:max-w-md bg-transparent py-1">
          <Search className="text-gray-400 mr-2.5" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by name, ID, or team..."
            className="text-sm outline-none placeholder-gray-500 bg-transparent w-full"
          />
        </div>
        <div className="flex items-center space-x-2 mt-2 md:mt-0">
          <button className="flex items-center text-sm px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
            <Filter size={15} className="mr-1.5" />
            Filter
          </button>
          <button className="p-2 rounded-md bg-gray-100 hover:bg-gray-200">
            <List size={18} className="text-gray-700" />
          </button>
          <button className="p-2 rounded-md bg-white border border-gray-300 hover:bg-gray-50">
            <LayoutGrid size={18} className="text-gray-700" />
          </button>
        </div>
      </div>
      
      <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm min-w-[700px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 w-12">
                <input 
                  type="checkbox" 
                  className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  onChange={handleSelectAll}
                  checked={selectedItems.length === currentData.length && currentData.length > 0}
                />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Asset ID</th>
              <th className="px-4 py-3">Picture</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignee Team</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {currentData.map((asset, index) => (
            <tr key={asset.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    checked={selectedItems.includes(asset.id)}
                    onChange={() => handleSelectItem(asset.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{asset.name}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700">{asset.id}</span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={asset.picture}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 font-medium text-xs hover:text-blue-700 hover:underline"
                  >
                    View Image
                    <ExternalLink size={12} className="ml-1" />
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div
                    className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                      asset.statusColor === "green" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${
                        asset.statusColor === "green" ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></span>
                    {asset.status}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">
                <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700">
                  {asset.AssigneeTeam}
                </span>
                </td>
                <td className="px-4 py-3 text-right relative">
                  <button 
                    onClick={() => setActiveMenuIndex(index === activeMenuIndex ? null : index)}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {activeMenuIndex === index && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg text-xs z-10 py-1"
                    >
                      <a href="#" className="block px-3 py-1.5 hover:bg-gray-100 text-gray-700">View Details</a>
                      <a href="#" className="block px-3 py-1.5 hover:bg-gray-100 text-gray-700">Edit Asset</a>
                      <a href="#" className="block px-3 py-1.5 hover:bg-gray-100 text-red-600">Delete</a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
             {currentData.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">
                  No assets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-xs text-gray-600">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            className="flex items-center px-2.5 py-1.5 border border-gray-300 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage === 1}
          >
            <ArrowLeft size={14} className="mr-1" />
            Previous
          </button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`px-2.5 py-1 rounded-md font-medium ${
                    currentPage === pageNumber ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100"
                }`}
                >
                {pageNumber}
                </button>
            ))}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            className="flex items-center px-2.5 py-1.5 border border-gray-300 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage === totalPages}
          >
            Next
            <ArrowRight size={14} className="ml-1" />
          </button>
        </div>
        )}
      </div>
    </div>
  );
};

export default AssetTable;