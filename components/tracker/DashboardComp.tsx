// components/tracker/DashboardComp.tsx
"use client";
import React, { useEffect, useState } from "react";
import { FileText, Users, Briefcase } from "lucide-react"; // Added import for icons
// ... other imports
import { useOrganization, useAuth, OrganizationSwitcher } from "@clerk/nextjs";
import AssetStatusPieChart from "@/components/dashboard/AssetStatusPieChart"; // Added import
import AssetModelDistributionChart from "@/components/dashboard/AssetModelDistributionChart"; // Added import

// Simplified asset type for dashboard cards
interface DashboardAssetSummary {
  totalAssets: number;
  activeAssets: number;
  inactiveAssets: number;
  // Potentially add assetsAssignedToMe for members
}

interface Asset {
  id: string;
  // ... other properties
  status: string;
  userId?: string | null;
  model?: string | null; // Ensure model is part of the Asset interface
  assignedToClerkUserId?: string | null; // Ensure this is part of your Asset type if used for filtering
}

// Interface for a team member (simplified from Clerk's OrganizationMembership)
interface TeamMember {
  id: string;
  role: string;
  publicUserData?: {
    userId: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string;
    identifier?: string; // Primary email or username
  };
}

const DashboardComp: React.FC = () => {
  //console.log('[DashboardComp] Component rendering...'); // Log component render
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userId, orgRole, isLoaded: authLoaded } = useAuth(); // orgRole can be null for personal accounts
  const [assetSummary, setAssetSummary] = useState<DashboardAssetSummary | null>(null);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [teamMembersList, setTeamMembersList] = useState<TeamMember[]>([]); // New state for member list
  const [isLoading, setIsLoading] = useState(true); // Start with true
  const [error, setError] = useState<string | null>(null);
  const [pieChartData, setPieChartData] = useState<{ name: string; value: number }[]>([]);
  const [modelChartData, setModelChartData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    //console.log('[DashboardComp] useEffect triggered. Deps:', { orgId: organization?.id, userId, orgRole, orgLoaded, authLoaded }); // Log useEffect trigger

    const fetchDashboardData = async () => {
      //console.log('[DashboardComp] fetchDashboardData called. AuthLoaded:', authLoaded, 'OrgLoaded:', orgLoaded, 'Org:', organization?.id); // Log auth/org loaded state
      if (!authLoaded) {
        //console.log('[DashboardComp] Exiting fetchDashboardData: auth not loaded yet.');
        return; // Wait for auth to load
      } // <<< Added missing closing brace here

      // If org context is still loading and we have an orgId, wait for it.
      // If no orgId (personal account), orgLoaded might remain false or org is null, proceed with userId.
      if (organization && !orgLoaded) {
        //console.log('[DashboardComp] Exiting fetchDashboardData: organization selected but not loaded yet.');
        return; 
      }

      //console.log('[DashboardComp] Proceeding with data fetch...');
      setIsLoading(true);
      setError(null);

      try {
        let apiUrl = "/api/assets";
        if (organization?.id) {
          apiUrl = `/api/assets?orgId=${organization.id}`;
        } else if (!userId) {
          // This case should ideally not be hit if authLoaded is true and we have a user
          // but as a safeguard:
          setIsLoading(false);
          setError("User not authenticated.");
          return;
        }
        // If only userId is available (personal account), API will use it from session

        const response = await fetch(apiUrl);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API request failed: ${response.status}`);
        }
        const data = await response.json();

        let relevantAssets = data;
        if (orgRole !== 'org:admin' && userId) {
            relevantAssets = data.filter(a => a.assignedToClerkUserId === userId);
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

        // Process data for model distribution chart
        if (data.length > 0) {
          const modelCounts: { [key: string]: number } = {};
          data.forEach((asset: Asset) => {
            const modelName = asset.model || 'Unknown Model';
            modelCounts[modelName] = (modelCounts[modelName] || 0) + 1;
          });
          const newModelChartData = Object.entries(modelCounts).map(([name, value]) => ({ name, value }));
          setModelChartData(newModelChartData);
        } else {
          setModelChartData([]);
          //console.log('[DashboardComp] No processed assets for model chart.');
        }

        //console.log('[DashboardComp] Attempting to fetch team members. Org ID:', organization?.id, 'Org Name:', organization?.name, 'Role:', orgRole);
        if (organization && typeof organization.getMemberships === 'function') {
          //console.log('[DashboardComp] organization object seems valid and has getMemberships method.');
          try {
            const memberships = await organization.getMemberships();
            //console.log('[DashboardComp] Raw memberships data:', memberships);
            //console.log('[DashboardComp] Type of memberships:', typeof memberships, 'Is Array:', Array.isArray(memberships));

            if (memberships && typeof memberships === 'object' && Array.isArray(memberships.data)) {
              setTeamMembersCount(memberships.data.length);
              setTeamMembersList(memberships.data as TeamMember[]); // Store the list of members
              //console.log('[DashboardComp] Successfully set teamMembersCount to (from data.length):', memberships.data.length);
            } else if (memberships && typeof memberships === 'object' && typeof memberships.total_count === 'number') {
              // Fallback to total_count if data array isn't as expected but total_count is present
              setTeamMembersCount(memberships.total_count);
              setTeamMembersList([]); // Clear list if we only have total_count and not the data array
              //console.log('[DashboardComp] Successfully set teamMembersCount to (from total_count):', memberships.total_count);
            } else {
              //console.error('[DashboardComp] memberships object does not have expected structure (data array or total_count). Setting teamMembersCount to 0.');
              setTeamMembersCount(0); // Fallback if structure is unexpected
              setTeamMembersList([]); // Clear list
            }
          } catch (e) {
            //console.error('[DashboardComp] Error calling organization.getMemberships() or processing its result:', e);
            setTeamMembersCount(0); // Fallback on error
            setTeamMembersList([]); // Clear list on error
          }
        } else {
          setTeamMembersCount(0); // Reset if no organization or getMemberships is not a function
          setTeamMembersList([]); // Clear list
          //console.log('[DashboardComp] No organization context, or organization.getMemberships is not a function. Org:', organization);
        }

        setIsLoading(false);
      } catch (error) {
        //console.error("Failed to fetch dashboard data:", error);
        setIsLoading(false);
        setError("Failed to fetch dashboard data.");
      }
    };

    fetchDashboardData();
  }, [organization, userId, orgRole, orgLoaded, authLoaded]);

  //console.log('[DashboardComp] Current state before return:', { isLoading, error, assetSummary, modelChartData, teamMembersCount, orgRole, orgId: organization?.id }); // Log state before render

  // Determine the title for the pie chart based on context
  const pieChartTitle = organization ? "Asset Status in My Organization" : "My Asset Status";

  if (isLoading) {
    return (
      <div className="text-center py-10">Loading dashboard...</div>
    );
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
  
  const noDataExists = !assetSummary || assetSummary.totalAssets === 0;
  const noModelData = !modelChartData || modelChartData.length === 0;

  //console.log('[DashboardComp] Render conditions:', { noDataExists, noModelData, orgRole, teamMembersCount, isOrgContext: !!organization }); // Log conditions for chart/team visibility

  return (
    <div className="space-y-4 md:space-y-6">
        {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {orgRole === 'org:admin' ? `${organization.name} Admin Dashboard` : `${organization.name} Member View`}
            </h1>
            <OrganizationSwitcher hidePersonal={true}/>
        </div> */}

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

      {/* Chart Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mt-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            {pieChartTitle}
          </h4>
          {(assetSummary?.activeAssets || 0) + (assetSummary?.inactiveAssets || 0) > 0 ? (
            <AssetStatusPieChart data={pieChartData} />
          ) : (
            <p className="text-center text-gray-500 py-8">No asset data to display.</p>
          )}
        </div>

        {/* Asset Model Distribution Chart Section */}
        {modelChartData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-sm font-medium text-gray-500 mb-3">Asset Distribution by Model</h4>
            <AssetModelDistributionChart data={modelChartData} />
          </div>
        )}
      </div>

      {/* Team Overview Card - For Admins */} 
      {organization && orgRole === 'org:admin' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Team Overview</h4>
          <p className="text-2xl font-semibold text-gray-900 mb-3">{teamMembersCount} Members</p>
          
          {teamMembersList.length > 0 ? (
            <ul className="space-y-3 max-h-60 overflow-y-auto">
              {teamMembersList.map((member) => (
                <li key={member.id || member.publicUserData?.userId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                  {member.publicUserData?.imageUrl && (
                    <img 
                      src={member.publicUserData.imageUrl} 
                      alt={`${member.publicUserData.firstName || ''} ${member.publicUserData.lastName || ''}`.trim() || member.publicUserData.identifier}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {`${member.publicUserData?.firstName || ''} ${member.publicUserData?.lastName || ''}`.trim() || member.publicUserData?.identifier}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {member.role.replace('org:', '')} 
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              {teamMembersCount > 0 ? 'Member details are not available.' : 'No members in this organization yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardComp;