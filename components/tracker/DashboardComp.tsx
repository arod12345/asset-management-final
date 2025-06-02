// components/tracker/DashboardComp.tsx
"use client";
import React, { useEffect, useState } from "react";
import { FileText, Users, Briefcase } from "lucide-react"; // Added import for icons
// ... other imports
import { useOrganization, useAuth, OrganizationSwitcher } from "@clerk/nextjs";

// Simplified asset type for dashboard cards
interface DashboardAssetSummary {
  totalAssets: number;
  activeAssets: number;
  inactiveAssets: number;
  // Potentially add assetsAssignedToMe for members
}

const DashboardComp: React.FC = () => {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userId, orgRole, isLoaded: authLoaded } = useAuth();
  const [assetSummary, setAssetSummary] = useState<DashboardAssetSummary | null>(null);
  const [teamMembersCount, setTeamMembersCount] = useState(0); // You can fetch actual team members

  // Pie chart data should be dynamic now
  const [pieChartData, setPieChartData] = useState([
    { name: "Active", value: 0 },
    { name: "Inactive", value: 0 },
  ]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!orgLoaded || !authLoaded || !organization) return;

      try {
        // Fetch asset summary (you might create a dedicated API endpoint for this summary)
        const response = await fetch(`/api/assets`, {
          credentials: 'include', // Add this to include auth cookies
        }); // This fetches all assets for the org if admin
        
        if (!response.ok) {
          const errorText = `Failed to fetch assets (${response.status})`;
          console.error(errorText);
          throw new Error(errorText);
        }
        
        const assets: Asset[] = await response.json(); // Assuming Asset type is defined

        let relevantAssets = assets;
        if (orgRole !== 'org:admin' && userId) {
            relevantAssets = assets.filter(a => a.assignedToClerkUserId === userId);
        }
        
        const active = relevantAssets.filter(a => a.status.toLowerCase() === 'active').length;
        const inactive = relevantAssets.length - active;
        
        setAssetSummary({
          totalAssets: relevantAssets.length,
          activeAssets: active,
          inactiveAssets: inactive,
        });
        setPieChartData([
          { name: "Active", value: active },
          { name: "Inactive", value: inactive },
        ]);

        // Fetch org members count
        const memberships = await organization.getMemberships();
        setTeamMembersCount(memberships.length);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, [organization, userId, orgRole, orgLoaded, authLoaded]);

  // ... rest of your component, using assetSummary and teamMembersCount
  // Update the cards:
  // { title: "Total Assets", value: assetSummary?.totalAssets || 0, ... }
  // { title: "Total Employees", value: teamMembersCount || 0, ... } (This is members in current org)
  // { title: "Active Assets", value: assetSummary?.activeAssets || 0, Icon: CheckCircle, ...}
  // { title: "Inactive Assets", value: assetSummary?.inactiveAssets || 0, Icon: XCircle, ...}


  if (!orgLoaded || !authLoaded) {
    return <div className="text-center py-10">Loading dashboard...</div>;
  }

  if (!organization) {
     return (
        <div className="text-center py-10 bg-white rounded-xl p-6 border border-dashed border-gray-300">
            <h2 className="text-lg font-semibold mb-2">Welcome to ExpenseScout!</h2>
            <p className="text-gray-600 mb-4">Please select or create an organization to view your dashboard.</p>
            <OrganizationSwitcher hidePersonal={true} />
        </div>
    );
  }
  
  const totalAssetsForPie = (pieChartData[0]?.value || 0) + (pieChartData[1]?.value || 0);


  return (
    <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {orgRole === 'org:admin' ? `${organization.name} Admin Dashboard` : `${organization.name} Member View`}
            </h1>
            <OrganizationSwitcher hidePersonal={true}/>
        </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {[
          { title: orgRole === 'org:admin' ? "Total Assets (Org)" : "My Assigned Assets", value: assetSummary?.totalAssets || 0, Icon: FileText, iconBg: "bg-green-100", iconColor: "text-green-600" },
          { title: "Active Assets", value: assetSummary?.activeAssets || 0, Icon: Users /* TODO: Change Icon */, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
          { title: "Inactive Assets", value: assetSummary?.inactiveAssets || 0, Icon: Briefcase /* TODO: Change Icon */, iconBg: "bg-purple-100", iconColor: "text-purple-600" },
        ].map(card => (
          // ... card rendering from your existing code, ensure 'value' is correctly sourced
           <div key={card.title} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-medium text-gray-500">{card.title}</h4>
                <div className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</div>
                {/* Add change logic if available */}
              </div>
              <div className={`p-2.5 rounded-full ${card.iconBg}`}>
                <card.Icon size={18} className={card.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

        {/* Pie Chart & Team Members sections from your existing DashboardComp, ensuring data is dynamic */}
        {/* For pie chart in DashboardComp: */}
        {/* <div className="text-2xl sm:text-3xl font-bold text-gray-800">{totalAssetsForPie}</div> */}

    </div>
  );
};

export default DashboardComp;