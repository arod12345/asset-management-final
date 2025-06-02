"use client";
import React, { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { Briefcase, X, ImageIcon, MapPin, UserPlus, ChevronDown, Trash2 } from "lucide-react";
import Image from "next/image";
import userImgPlaceholder from "../../public/next.svg";
import { useOrganization, useUser } from "@clerk/nextjs";

// Re-use Asset type definition (ensure it's consistent or imported)
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
  assignedTo?: {
    clerkUserId: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    imageUrl?: string | null;
  } | null;
}

interface OrgMember {
  id: string;
  identifier: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  role: string;
}

interface EditAssetModalProps {
  asset: Asset;
  onClose: () => void;
  onAssetUpdated: () => void;
}

const EditAssetModal: React.FC<EditAssetModalProps> = ({ asset, onClose, onAssetUpdated }) => {
  const { organization } = useOrganization();
  const { user } = useUser();

  const [title, setTitle] = useState(asset.title);
  const [model, setModel] = useState(asset.model);
  const [serialNumber, setSerialNumber] = useState(asset.serialNumber);
  const [assetImageBase64, setAssetImageBase64] = useState<string | null>(null);
  const [assetImagePreview, setAssetImagePreview] = useState<string | null>(asset.imageUrl || null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [description, setDescription] = useState(asset.description);
  const [latitude, setLatitude] = useState(asset.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(asset.longitude?.toString() || "");
  const [status, setStatus] = useState(asset.status);

  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [selectedAssigneeClerkId, setSelectedAssigneeClerkId] = useState<string | null>(asset.assignedToClerkUserId || null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  
  const [errors, setErrors] = useState<{ [key: string]: string | boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchOrgMembers = async () => {
      if (organization) {
        try {
          const memberships = await organization.getMemberships();
          const members = memberships.data.map(mem => ({
            id: mem.publicUserData.userId!,
            identifier: mem.publicUserData.identifier,
            firstName: mem.publicUserData.firstName,
            lastName: mem.publicUserData.lastName,
            imageUrl: mem.publicUserData.imageUrl,
            role: mem.role,
          }));
          setOrgMembers(members);
        } catch (error) {
          console.error("Failed to fetch organization members:", error);
        }
      }
    };
    fetchOrgMembers();
  }, [organization]);


  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!model.trim()) newErrors.model = "Model is required.";
    if (!serialNumber.trim()) newErrors.serialNumber = "Serial number is required.";
    if (!description.trim()) newErrors.description = "Description is required.";
    if (latitude && isNaN(parseFloat(latitude))) newErrors.latitude = "Invalid latitude.";
    if (longitude && isNaN(parseFloat(longitude))) newErrors.longitude = "Invalid longitude.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) return;
    if (!organization) {
      setFormError("No active organization selected.");
      return;
    }
    setIsLoading(true);
    setFormError(null);

    const assetUpdateData: any = {
      title,
      model,
      serialNumber,
      description,
      status,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      assignedToClerkUserId: selectedAssigneeClerkId, // Will be null if unassigned
    };

    if (removeCurrentImage) {
      assetUpdateData.removeImage = true;
    } else if (assetImageBase64) { // Only send if new image is selected
      assetUpdateData.imageBase64 = assetImageBase64;
    }
    // If neither removeCurrentImage nor assetImageBase64 is set, imageUrl won't be touched by backend logic if not explicitly passed

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetUpdateData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to update asset (${response.status} ${response.statusText})` }));
        console.error(errorData.message);
        throw new Error(errorData.message);
      }
      onAssetUpdated();
      onClose();
    } catch (error: any) {
      setFormError(error.message || "An unexpected error occurred.");
      console.error("Asset update error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAssetImageBase64(reader.result as string);
      setAssetImagePreview(reader.result as string);
      setRemoveCurrentImage(false); // If a new image is chosen, don't also try to remove
      setErrors(prev => ({...prev, assetImage: false}));
    };
    reader.onerror = () => {
        setFormError("Failed to read file.");
        setErrors(prev => ({...prev, assetImage: "Failed to read file."}));
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setFormError("Image size should not exceed 2MB.");
        setErrors(prev => ({...prev, assetImage: "Image size should not exceed 2MB."}));
        return;
      }
      handleFileRead(file);
    }
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
       if (file.size > 2 * 1024 * 1024) {
        setFormError("Image size should not exceed 2MB.");
        setErrors(prev => ({...prev, assetImage: "Image size should not exceed 2MB."}));
        return;
      }
      handleFileRead(file);
    }
  };

  const handleRemoveImage = () => {
    setAssetImageBase64(null);
    setAssetImagePreview(null);
    setRemoveCurrentImage(true);
  };

  const filteredMembers = orgMembers.filter(member =>
    `${member.firstName || ''} ${member.lastName || ''} ${member.identifier}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const selectedAssigneeDetails = selectedAssigneeClerkId
    ? orgMembers.find(m => m.id === selectedAssigneeClerkId)
    : null;


  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white w-[600px] max-w-[95%] rounded-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black disabled:opacity-50"
          disabled={isLoading}
        >
          <X size={18} />
        </button>
        <div className="flex justify-center mb-4">
          <div className="bg-[#e4f7ec] p-3 rounded-full">
            <Briefcase size={22} className="text-[#34BC68]" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-center mb-1">Edit Asset</h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Update the details for the asset: {asset.title}.
        </p>
        {formError && <p className="text-sm text-red-500 text-center mb-3">{formError}</p>}
        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-sm text-black font-medium">Title <span className="text-red-500">*</span></label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: false })); }}
              className={`w-full border ${errors.title ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
            {errors.title && typeof errors.title === 'string' && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Model & Serial */}
          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="text-sm font-medium text-black">Model <span className="text-red-500">*</span></label>
              <input value={model} onChange={(e) => { setModel(e.target.value); setErrors(prev => ({ ...prev, model: false })); }}
                className={`w-full border ${errors.model ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
              {errors.model && typeof errors.model === 'string' && <p className="text-xs text-red-500 mt-1">{errors.model}</p>}
            </div>
            <div className="w-1/2">
              <label className="text-sm font-medium text-black">Serial Number <span className="text-red-500">*</span></label>
              <input value={serialNumber} onChange={(e) => { setSerialNumber(e.target.value); setErrors(prev => ({ ...prev, serialNumber: false })); }}
                className={`w-full border ${errors.serialNumber ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
              {errors.serialNumber && typeof errors.serialNumber === 'string' && <p className="text-xs text-red-500 mt-1">{errors.serialNumber}</p>}
            </div>
          </div>

          {/* Asset Image */}
          <div className="mb-4">
            <label className="text-sm font-medium text-black mb-2 block">Asset Image</label>
            <div className="flex items-center space-x-3 sm:space-x-5">
              <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-md border border-gray-300 cursor-pointer relative">
                {assetImagePreview ? (
                  <Image src={assetImagePreview} alt="Preview" layout="fill" className="rounded-md object-cover" />
                ) : (<ImageIcon size={24} className="text-gray-500" />)}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
              <div className="flex-grow space-y-2">
                <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop}
                  className={`border border-dashed ${errors.assetImage ? "border-red-400" : "border-gray-300"} rounded-md p-3 cursor-pointer hover:border-[#6941C6] text-sm text-gray-500 text-center`}>
                  <span className="text-[#6941C6] font-medium">Click to upload</span> or drag & drop (Max 2MB)
                  <p className="text-xs">Replace current image</p>
                </div>
                {asset.imageUrl && !removeCurrentImage && ( // Show remove button only if there's an existing image and it's not marked for removal yet
                    <button 
                        onClick={handleRemoveImage}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center"
                        disabled={isLoading}
                    >
                        <Trash2 size={14} className="mr-1" /> Remove Current Image
                    </button>
                )}
                 {removeCurrentImage && <p className="text-xs text-orange-600">Current image will be removed on save.</p>}
              </div>
            </div>
            {errors.assetImage && typeof errors.assetImage === 'string' && (
              <p className="text-sm text-red-500 mt-1">{errors.assetImage}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-black">Description <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: false })); }}
              className={`w-full border ${errors.description ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none min-h-[80px]`} />
            {errors.description && typeof errors.description === 'string' && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Latitude & Longitude */}
          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="text-sm font-medium text-black flex items-center"><MapPin size={14} className="mr-1 text-gray-500" /> Latitude</label>
              <input type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)}
                className={`w-full border ${errors.latitude ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
              {errors.latitude && typeof errors.latitude === 'string' && <p className="text-xs text-red-500 mt-1">{errors.latitude}</p>}
            </div>
            <div className="w-1/2">
              <label className="text-sm font-medium text-black flex items-center"><MapPin size={14} className="mr-1 text-gray-500" /> Longitude</label>
              <input type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)}
                className={`w-full border ${errors.longitude ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
              {errors.longitude && typeof errors.longitude === 'string' && <p className="text-xs text-red-500 mt-1">{errors.longitude}</p>}
            </div>
          </div>
          
          {/* Status */}
          <div>
            <label className="text-sm font-medium text-black">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              {/* Add more relevant statuses */}
              <option value="Maintenance">Maintenance</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          {/* Assign User */}
          <div className="relative">
            <label className="text-sm text-black font-medium flex items-center">
              <UserPlus size={14} className="mr-1 text-gray-500" /> Assign to Member
            </label>
             <div className="flex items-center space-x-2">
                <div
                    className={`flex-grow border border-gray-300 rounded-md py-2 px-3 text-sm flex justify-between items-center cursor-pointer`}
                    onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                >
                    <span>
                    {selectedAssigneeDetails ? `${selectedAssigneeDetails.firstName || ''} ${selectedAssigneeDetails.lastName || ''} (${selectedAssigneeDetails.identifier})` : "Select member or Unassign"}
                    </span>
                    <ChevronDown size={16} className="text-gray-500" />
                </div>
                {selectedAssigneeClerkId && (
                    <button onClick={() => {setSelectedAssigneeClerkId(null); setAssigneeDropdownOpen(false);}} className="p-2 text-red-500 hover:text-red-700">
                        <X size={16}/>
                    </button>
                )}
             </div>

            {assigneeDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border-b border-gray-200 text-sm outline-none"
                />
                 <div
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-500"
                    onClick={() => {
                        setSelectedAssigneeClerkId(null); // Explicitly set to null for unassigning
                        setAssigneeDropdownOpen(false);
                        setMemberSearchQuery("");
                    }}
                    >
                    <UserPlus size={16} className="text-gray-400"/> 
                    <span>Unassign</span>
                </div>
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedAssigneeClerkId(member.id);
                      setAssigneeDropdownOpen(false);
                      setMemberSearchQuery("");
                    }}
                  >
                    <Image src={member.imageUrl || userImgPlaceholder} alt={member.identifier} width={24} height={24} className="w-6 h-6 rounded-full object-cover" />
                    <span className="text-sm">{member.firstName || ''} {member.lastName || ''} ({member.identifier}) - {member.role}</span>
                  </div>
                ))}
                {filteredMembers.length === 0 && !memberSearchQuery && <p className="text-sm text-gray-500 p-3">No other members found.</p>}
                {filteredMembers.length === 0 && memberSearchQuery && <p className="text-sm text-gray-500 p-3">No members found matching search.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-8">
          <button onClick={onClose} disabled={isLoading}
            className="px-6 py-2 text-sm border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 disabled:opacity-50 w-full sm:w-auto">
            Cancel
          </button>
          <button onClick={handleFormSubmit} disabled={isLoading || !organization}
            className="px-6 py-2 text-sm rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:bg-gray-400 w-full sm:w-auto">
            {isLoading ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAssetModal;