"use client";
import React from "react";
import { ArrowDownRight, ArrowUpRight, FileText, Users, Briefcase, Settings as SettingsIcon, Edit3, Trash2 } from "lucide-react"; // Renamed Settings to SettingsIcon
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Image from "next/image";

const pieChartData = [
  { name: "Active", value: 190 },
  { name: "Inactive", value: 127 },
];

const COLORS = ["#34BC68", "#F2C94C"]; // Green for Active, Yellow for Inactive

const teamMembersData = [
  { id: 1, name: "Olivia Rhye", email: "olivia@example.com", role: "Admin", img: "/assets/kob.png" },
  { id: 2, name: "Phoenix Baker", email: "phoenix@example.com", role: "Member", img: "/assets/kob.png" },
  { id: 3, name: "Lana Steiner", email: "lana@example.com", role: "Member", img: "/assets/kob.png" },
];

const DashboardComp: React.FC = () => {
  const totalAssets = pieChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4 md:space-y-6"> {/* Container padding handled by parent page */}
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Welcome Back!</h1> {/* Assuming user name from Clerk will be in Topbar */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {[
          { title: "Total Assets", value: totalAssets, change: "+5.3%", changeType: "positive", Icon: FileText, iconBg: "bg-green-100", iconColor: "text-green-600" },
          { title: "Total Employees", value: 43, change: "-1.8%", changeType: "negative", Icon: Users, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
          { title: "No of Departments", value: 17, change: "+2.1%", changeType: "positive", Icon: Briefcase, iconBg: "bg-purple-100", iconColor: "text-purple-600" },
        ].map(card => (
          <div key={card.title} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-medium text-gray-500">{card.title}</h4>
                <div className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</div>
                <div className={`flex items-center text-xs mt-1.5 ${card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {card.changeType === 'positive' ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
                  {card.change} <span className="text-gray-400 ml-1">vs last year</span>
                </div>
              </div>
              <div className={`p-2.5 rounded-full ${card.iconBg}`}>
                <card.Icon size={18} className={card.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Asset Status Analysis</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">+5.3% Active Assets From Last Year</p>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start h-[260px] sm:h-[280px]">
          <div className="relative w-full md:w-3/5 h-[180px] sm:h-[220px] md:h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="85%"
                  fill="#8884d8"
                  paddingAngle={5}
                  cornerRadius={8}
                  dataKey="value"
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} Assets`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-2xl sm:text-3xl font-bold text-gray-800">{totalAssets}</div>
              <div className="text-xs sm:text-sm text-gray-500">Total Assets</div>
            </div>
          </div>

          <div className="hidden md:block w-px bg-gray-200 mx-4 sm:mx-6 h-auto self-stretch my-4 md:my-0"></div>

          <div className="mt-4 md:mt-0 md:ml-2 w-full md:w-2/5 space-y-3 sm:space-y-4 self-center">
            {pieChartData.map((item, index) => (
              <div key={index} className="flex items-center space-x-2.5">
                <div className="h-6 w-1 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-500">{item.name} Assets</div>
                  <div className="text-sm sm:text-base text-gray-800 font-medium">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Team Members</h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
          Manage your organization’s members and roles.
        </p>

        <div className="space-y-3">
        {teamMembersData.map((member) => (
          <div key={member.id} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg">
            <div className="flex items-center space-x-2.5">
              <Image
                src={member.img}
                alt={member.name}
                width={40}
                height={40}
                className="rounded-full object-cover w-9 h-9 sm:w-10 sm:h-10"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">{member.name}</div>
                <div className="text-xs text-gray-500">{member.email}</div>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
                 <select 
                    defaultValue={member.role}
                    className="border border-gray-300 text-xs rounded-md px-2 py-1 outline-none focus:border-blue-500 bg-white"
                    // Add onChange handler for actual functionality
                 >
                    <option value="Admin">Admin</option>
                    <option value="Member">Member</option>
                    <option value="Viewer">Viewer</option>
                 </select>
            </div>
          </div>
        ))}
        </div>
         <button className="mt-4 w-full text-sm text-green-600 font-medium py-2 rounded-lg hover:bg-green-50 transition-colors">
            View All Members
        </button>
      </div>
    </div>
    </div>
  );
};

export default DashboardComp;