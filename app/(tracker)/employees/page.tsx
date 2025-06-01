"use client";
import React, { useState } from "react";
import EmployeeTable from "@/components/tracker/EmployeeTable";
import EmployePageHeader from "@/components/tracker/EmployePageHeader"; // Note: typo in original filename "Employe"

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState("All Employees");

  return (
    <div className="w-full">
      <EmployePageHeader // Renamed for consistency if you prefer EmployeePageHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="mt-4">
        {activeTab === "All Employees" && <EmployeeTable />}
        {activeTab === "Teams" && (
          <div className="h-[300px] bg-white rounded-xl m-2 md:m-6 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
            Teams section placeholder
          </div>
        )}
        {activeTab === "Roles" && (
          <div className="h-[300px] bg-white rounded-xl m-2 md:m-6 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
            Roles section placeholder (Content from RoleBox could go here or separate page)
          </div>
        )}
      </div>
    </div>
  );
}