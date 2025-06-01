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
} from "lucide-react";
import Image from "next/image";
import userImg from "../../public/next.svg"; // Updated import

interface User {
  name: string;
  email: string;
  id: string;
  role: string;
  type: "Full time" | "Part time" | "Contractor";
  status: "Active" | "Inactive" | "Invited";
  team: string;
  statusColor: "green" | "red" | "yellow";
  avatar: string;
}


const EmployeeTable: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6; // Adjust as needed
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);


  const users: User[] = [
    { name: "Ali Jouro", email: "ali.jouro@example.com", id: "#12FC4V56979", role: "Product Manager", type: "Full time", status: "Active", team: "Marketing", statusColor: "green", avatar: userImg },
    { name: "Sofia Lin", email: "sofia.lin@example.com", id: "#88FCV1234", role: "UX Designer", type: "Full time", status: "Active", team: "Design", statusColor: "green", avatar: userImg },
    { name: "Liam Ben", email: "liam.ben@example.com", id: "#19KD8210", role: "Backend Developer", type: "Part time", status: "Inactive", team: "Engineering", statusColor: "red", avatar: userImg },
    { name: "Emily Rose", email: "emily.rose@example.com", id: "#45AC2000", role: "HR Officer", type: "Full time", status: "Active", team: "HR", statusColor: "green", avatar: userImg },
    { name: "James Wu", email: "james.wu@example.com", id: "#93VU1029", role: "Frontend Developer", type: "Contractor", status: "Invited", team: "Engineering", statusColor: "yellow", avatar: userImg },
    { name: "Hana Yuki", email: "hana.yuki@example.com", id: "#54FR9210", role: "QA Engineer", type: "Full time", status: "Active", team: "Quality", statusColor: "green", avatar: userImg },
    { name: "Marcus Li", email: "marcus.li@example.com", id: "#29FE9183", role: "Accountant", type: "Full time", status: "Inactive", team: "Finance", statusColor: "red", avatar: userImg },
    { name: "Rachel Zed", email: "rachel.zed@example.com", id: "#61XY8201", role: "Data Scientist", type: "Part time", status: "Active", team: "Data", statusColor: "green", avatar: userImg },
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
  
  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.role} ${user.id} ${user.team}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );
  
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
  
  const getStatusStyles = (statusColor: "green" | "red" | "yellow") => {
    switch (statusColor) {
      case "green": return "bg-green-100 text-green-700";
      case "red": return "bg-red-100 text-red-700";
      case "yellow": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };
   const getStatusDotStyles = (statusColor: "green" | "red" | "yellow") => {
    switch (statusColor) {
      case "green": return "bg-green-500";
      case "red": return "bg-red-500";
      case "yellow": return "bg-yellow-500";
      default: return "bg-gray-500";
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
            placeholder="Search employees by name, role, ID..."
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
        <table className="w-full text-left text-sm min-w-[800px]"> {/* Increased min-width */}
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
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Teams</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {currentData.map((user, index) => (
              <tr key={user.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3">
                   <input 
                    type="checkbox" 
                    className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    checked={selectedItems.includes(user.id)}
                    onChange={() => handleSelectItem(user.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10">
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="w-full h-full rounded-full object-cover"
                      />
                      {user.status === "Active" && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{user.name}</div>
                      <div className="text-gray-500 text-xs">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700">{user.id}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{user.role}</div>
                  <div className="text-xs text-gray-500">{user.type}</div>
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${getStatusStyles(user.statusColor)}`}>
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${getStatusDotStyles(user.statusColor)}`} />
                    {user.status}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700">{user.team}</span>
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
                      <a href="#" className="block px-3 py-1.5 hover:bg-gray-100 text-gray-700">Edit Employee</a>
                      <a href="#" className="block px-3 py-1.5 hover:bg-gray-100 text-red-600">Deactivate</a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {currentData.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">
                  No employees found.
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