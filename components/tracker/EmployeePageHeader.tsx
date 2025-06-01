"use client";
import React, { useState } from "react";
import { PlusCircle, Upload } from "lucide-react";
import AddEmployeeModal from "./AddEmployeeModal"; // Updated import

interface EmployeePageHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const EmployeePageHeader: React.FC<EmployeePageHeaderProps> = ({ activeTab, setActiveTab }) => {
  const tabs = ["All Employees", "Teams", "Roles"]; // Roles tab might lead to Roles page or show roles here
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="w-full px-4 md:px-6 lg:px-10"> {/* Adjusted padding */}
      {showModal && <AddEmployeeModal onClose={() => setShowModal(false)} />}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-6 pb-4 space-y-3 md:space-y-0">
        <div className="flex items-center space-x-3 md:space-x-4">
          <h2 className="text-xl md:text-2xl font-semibold text-black">Employees</h2>
          <div className="bg-gray-100 text-green-600 text-xs md:text-sm px-2 py-1 rounded-md font-medium">
            100 {/* This should be dynamic */}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <button className="flex items-center justify-center px-4 py-2 border border-gray-300 text-black bg-white rounded-md text-sm font-medium hover:bg-gray-50 w-full sm:w-auto">
            <Upload size={16} className="mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center px-4 py-2 bg-[#34BC68] text-white rounded-md text-sm font-medium hover:bg-green-700 w-full sm:w-auto"
          >
            <PlusCircle size={16} className="mr-2" />
            New Employee
          </button>
        </div>
      </div>

      <div className="flex space-x-4 md:space-x-6 pt-2 border-b border-gray-200 overflow-x-auto">
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

export default EmployeePageHeader;