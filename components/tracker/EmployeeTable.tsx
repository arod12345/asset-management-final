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
  Loader2, 
  AlertTriangle, 
} from "lucide-react";
import Image from "next/image";

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | undefined;
  imageUrl: string;
  lastSignInAt: string | null; 
  createdAt: string | null;  
}

const EmployeeTable: React.FC = () => {
  const [fetchedUsers, setFetchedUsers] = useState<ClerkUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6;
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/clerk-users');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        const data: ClerkUser[] = await response.json();
        setFetchedUsers(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
        console.error("Failed to fetch users:", err);
      }
      setIsLoading(false);
    };

    fetchUsers();
  }, []);

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
  
  const filteredUsers = fetchedUsers.filter((user) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const email = user.primaryEmail || '';
    const id = user.id || '';
    return `${fullName} ${email} ${id}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });
  
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  const currentData = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveMenuIndex(null); 
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="ml-2 text-gray-600">Loading employees...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-red-50 border border-red-200 rounded-md p-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="mt-2 text-red-700 font-semibold">Error loading employees</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl m-2 md:m-0 border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center bg-gray-50 px-3 py-2 rounded-md w-full max-w-md">
          <Search className="text-gray-400 mr-2" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            className="bg-transparent outline-none text-sm w-full text-gray-700 placeholder-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
            <tr>
              <th className="p-4 text-left w-10">
                <input 
                  type="checkbox" 
                  className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  onChange={handleSelectAll}
                  checked={selectedItems.length === currentData.length && currentData.length > 0}
                />
              </th>
              <th className="p-4 text-left">Employee</th>
              <th className="p-4 text-left">User ID (Clerk)</th>
              <th className="p-4 text-left">Last Sign In</th>
              <th className="p-4 text-left">Joined Date</th>
              <th className="p-4 text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
            {currentData.map((user, index) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    checked={selectedItems.includes(user.id)}
                    onChange={() => handleSelectItem(user.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <Image
                      src={user.imageUrl || '/default-avatar.png'} 
                      alt={`${user.firstName} ${user.lastName}`}
                      width={32}
                      height={32}
                      className="rounded-full mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        {user.firstName || ''} {user.lastName || ''}
                      </div>
                      <div className="text-xs text-gray-500">{user.primaryEmail || 'No email'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700">
                    {user.id}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-3">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
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
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {currentData.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                  No employees found matching your search.
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

export default EmployeeTable;