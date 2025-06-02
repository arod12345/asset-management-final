"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs'; 
import Image from 'next/image'; 
import Link from 'next/link';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MapPin,
  UserCircle,
  Tag,
  Barcode,
  FileText,
  CalendarDays,
  AlertTriangle,
  Info,
  Building,
  ImageIcon // <-- Added ImageIcon here
} from 'lucide-react';
import EditAssetModal from '@/components/tracker/EditAssetModal';

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

interface DetailRowProps {
  label: string;
  value?: string | number | null | React.ReactNode;
  className?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, className = '' }) => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-start py-3 ${className}`}>
      <p className="text-sm text-gray-500 dark:text-gray-400 w-full sm:w-1/3 lg:w-1/4 font-medium pr-4 mb-1 sm:mb-0">{label}</p>
      <div className="text-sm text-gray-800 dark:text-gray-200 w-full sm:w-2/3 lg:w-3/4">
        {typeof value === 'string' || typeof value === 'number' ? <p>{value}</p> : value}
      </div>
    </div>
  );
};

interface InfoCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, icon: Icon, children }) => (
  <div className="bg-white dark:bg-slate-800 border-md rounded-lg p-4 mb-6">
    <div className="flex items-center text-gray-700 dark:text-gray-300 mb-3">
      <Icon size={18} className="mr-2 text-primary dark:text-sky-400" />
      <h3 className="text-md font-semibold">{title}</h3>
    </div>
    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
      {children}
    </div>
  </div>
);

export default function AssetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.assetId as string;
  
  const { orgId, orgRole, userId: currentUserId } = useAuth();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchAssetDetails = useCallback(async () => {
    if (!assetId) {
      setError("Asset ID is missing.");
      setIsLoading(false);
      return;
    }
    if (!orgId) { 
      setIsLoading(true); 
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}`, {credentials: 'include'});
      if (!response.ok) {
        if (response.status === 404) throw new Error('Asset not found or you do not have permission to view it.');
        const errorData = await response.json().catch(() => ({message: `Error fetching asset details (${response.status})`}));
        throw new Error(errorData.message);
      }
      const data: Asset = await response.json();
      setAsset(data);
    } catch (err: any) {
      setError(err.message);
      setAsset(null);
    } finally {
      setIsLoading(false);
    }
  }, [assetId, orgId]);

  useEffect(() => {
    if (assetId && orgId) {
        fetchAssetDetails();
    }
  }, [assetId, orgId, fetchAssetDetails]);

  const handleDeleteAsset = async () => {
    if (!asset) return;
    if (!confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to delete asset (${response.status} ${response.statusText})` }));
        throw new Error(errorData.message);
      }
      alert("Asset deleted successfully.");
      router.push('/assets');
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(`Error deleting asset: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const canManageAsset = orgRole === 'org:admin';

  if (isLoading && !error) return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-150px)] p-4 bg-gray-50 dark:bg-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary dark:border-sky-400"></div>
      <p className="mt-5 text-md font-semibold text-gray-600 dark:text-gray-300">Loading Asset Details...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-150px)] p-4 text-center bg-gray-50 dark:bg-slate-900">
      <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
      <h2 className="mt-3 text-xl font-bold text-red-600 dark:text-red-500">An Error Occurred</h2>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 max-w-md">{error}</p>
      <Link href="/assets" className="mt-6 inline-flex items-center px-5 py-2.5 text-xs font-semibold text-white bg-primary dark:bg-sky-600 rounded-md border-sm hover:bg-primary/90 dark:hover:bg-sky-500 transition-colors">
        <ArrowLeft size={16} className="mr-1.5" /> Back to Assets
      </Link>
    </div>
  );
  
  if (!asset) return (
     <div className="flex flex-col justify-center items-center min-h-[calc(100vh-150px)] p-4 text-center bg-gray-50 dark:bg-slate-900">
      <Info className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
      <h2 className="mt-3 text-xl font-bold text-gray-700 dark:text-gray-200">Asset Not Found</h2>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">This asset may not exist or you might not have permission to view it.</p>
      <Link href="/assets" className="mt-6 inline-flex items-center px-5 py-2.5 text-xs font-semibold text-white bg-primary dark:bg-sky-600 rounded-md border-sm hover:bg-primary/90 dark:hover:bg-sky-500 transition-colors">
        <ArrowLeft size={16} className="mr-1.5" /> Back to Assets
      </Link>
    </div>
  );

  const statusTextClass = asset.status.toLowerCase() === 'active' ? 'text-green-600 dark:text-green-400' :
                        asset.status.toLowerCase() === 'in repair' ? 'text-yellow-600 dark:text-yellow-400' :
                        asset.status.toLowerCase() === 'decommissioned' ? 'text-red-600 dark:text-red-500' :
                        'text-gray-700 dark:text-gray-300';

  return (
    <div className="min-h-screen dark:bg-slate-900 ">
      {/* Header Bar */} 
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pb-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center text-xs font-medium text-primary dark:text-sky-400 hover:text-primary/80 dark:hover:text-sky-300 transition-colors mb-2 sm:mb-0"
            >
              <ArrowLeft size={16} className="mr-1.5" /> Back to Assets
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{asset.title}</h1>
          </div>
          {canManageAsset && (
            <div className="flex items-center space-x-2 self-start sm:self-center">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center px-3.5 py-2 text-xs font-medium text-white bg-[#34bc68] dark:bg-blue-500 rounded-md border-sm hover:bg-[#299a5d] dark:hover:bg-blue-600 transition-colors"
              >
                <Edit2 size={14} className="mr-1.5 " /> Edit
              </button>
              <button
                onClick={handleDeleteAsset}
                className="flex items-center px-3.5 py-2 text-xs text-red-600 font-medium bg-transparent border border-gray-300 dark:bg-red-500 rounded-md border-sm hover:bg-red-700 hover:text-white dark:hover:bg-red-600 transition-colors"
              >
                <Trash2 size={14} className="mr-1.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout: Content + Sidebar */} 
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Area (Details List) */} 
        <div className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-slate-800 border-md rounded-lg p-5 md:p-6">
          <div className="space-y-2 divide-y divide-gray-100 dark:divide-slate-700/50">
            
            {/* Section: General Information */} 
            <div className="pt-2">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Asset Information</h2>
              {/* <DetailRow label="Description" value={asset.description} /> */}
              <DetailRow label="Model" value={asset.model} />
              <DetailRow label="Serial Number" value={asset.serialNumber} />
              <DetailRow label="Status" value={<span className={`font-semibold ${statusTextClass}`}>{asset.status}</span>} />
              <DetailRow label="Organization ID" value={asset.clerkOrganizationId} />
            </div>

            {/* Section: Timestamps */} 
            <div className="pt-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 mt-2">Record Timestamps</h2>
              <DetailRow label="Created On" value={new Date(asset.createdAt).toLocaleString()} />
              <DetailRow label="Last Updated" value={new Date(asset.updatedAt).toLocaleString()} />
            </div>

            {/* Section: Description (if long, could be its own section) */} 
            {asset.description && asset.description.length > 150 && (
                <div className="pt-4">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 mt-2">Detailed Description</h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {asset.description}
                    </p>
                </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */} 
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          {/* Asset Image Card */} 
          <InfoCard title="Asset Image" icon={ImageIcon}>
            {asset.imageUrl ? (
              <a href={asset.imageUrl} target="_blank" rel="noopener noreferrer" className="block group">
                <Image
                  src={asset.imageUrl}
                  alt={asset.title}
                  width={300} // Adjust width as needed for sidebar
                  height={300} // Adjust height as needed for sidebar
                  className="rounded-md object-cover w-full aspect-square border-sm group-hover:border-md transition-border duration-300"
                  priority={false} // Usually not priority for sidebar images
                />
              </a>
            ) : (
              <div className="w-full aspect-square bg-gray-100 dark:bg-slate-700 rounded-md flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                <ImageIcon size={48} />
                <span className="mt-2 text-xs">No Image Available</span>
              </div>
            )}
          </InfoCard>

          {asset.assignedTo && (
            <InfoCard title="Assigned To" icon={UserCircle}>
              <p className="font-semibold">{asset.assignedTo.firstName || asset.assignedTo.email?.split('@')[0]} {asset.assignedTo.lastName || ''}</p>
              {asset.assignedTo.email && <p className="text-xs">{asset.assignedTo.email}</p>}
            </InfoCard>
          )}
          {!asset.assignedTo && (
            <InfoCard title="Assigned To" icon={UserCircle}>
              <p className="italic">Unassigned</p>
            </InfoCard>
          )}

          {(asset.latitude && asset.longitude) && (
            <InfoCard title="Location" icon={MapPin}>
              <p>{asset.latitude}, {asset.longitude}</p>
              <a 
                href={`https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-xs mt-1 inline-block"
              >
                View on Google Maps
              </a>
            </InfoCard>
          )}
        </div>
      </div>

      {isEditModalOpen && asset && (
        <EditAssetModal
          asset={asset}
          onClose={() => setIsEditModalOpen(false)}
          onAssetUpdated={() => {
            setIsEditModalOpen(false);
            fetchAssetDetails();
          }}
        />
      )}
    </div>
  );
}