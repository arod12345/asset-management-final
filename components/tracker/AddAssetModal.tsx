// components/tracker/AddAssetModal.tsx
"use client";
import React, { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { Briefcase, Search, X, Check, ChevronDown, ImageIcon, MapPin, UserPlus } from "lucide-react";
import Image from "next/image";
import userImgPlaceholder from "../../public/next.svg"; // Corrected path to access from public directory
import { useOrganization, useOrganizationList, useUser } from "@clerk/nextjs";

// Define a simple type for organization members fetched from Clerk
interface OrgMember {
  id: string; // This will be clerkUserId
  identifier: string; // email or username
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  role: string;
}

interface AddAssetModalProps {
  onClose: () => void;
  onAssetAdded: () => void; // Callback to refresh asset list
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ onClose, onAssetAdded }) => {
  const { organization } = useOrganization(); // For current org ID
  const { user } = useUser(); // For current user, if needed

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [assetImageFile, setAssetImageFile] = useState<File | null>(null);
  const [assetImagePreview, setAssetImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState("Active"); // Default status

  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [selectedAssigneeClerkId, setSelectedAssigneeClerkId] = useState<string | null>(null);
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
            id: mem.publicUserData.userId!, // Clerk User ID
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

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!model.trim()) newErrors.model = "Model is required.";
    if (!serialNumber.trim()) newErrors.serialNumber = "Serial number is required.";
    if (!assetImageFile) newErrors.profileImage = "Asset image is required."; // Changed to profileImage for consistency with previous error key
    if (!description.trim()) newErrors.description = "Description is required.";
    if (latitude && isNaN(parseFloat(latitude))) newErrors.latitude = "Invalid latitude.";
    if (longitude && isNaN(parseFloat(longitude))) newErrors.longitude = "Invalid longitude.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateStep1()) {
      setStep(2); // Assuming step 2 is for assignment or confirmation
                   // For this structure, we might combine it if assignment is optional on create
    }
  };
  
  const handleFormSubmit = async () => {
    if (!validateStep1()) return; // Re-validate before submission

    if (!organization) {
        setFormError("No active organization selected.");
        return;
    }
    setIsLoading(true);
    setFormError(null);

    let imageBase64: string | undefined = undefined;
    if (assetImageFile) {
      try {
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(assetImageFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      } catch (error) {
        console.error("Error converting image to base64:", error);
        setFormError("Failed to process image. Please try again.");
        setIsLoading(false);
        return;
      }
    }

    const assetData = {
      title,
      model,
      serialNumber,
      description,
      status,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      imageBase64, // Include the base64 string here
      assignedToClerkUserId: selectedAssigneeClerkId,
      clerkOrganizationId: organization.id, // This comes from useOrganization()
    };

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData),
        credentials: 'include', // Add this to include auth cookies
      });

      if (!response.ok) {
        const errorText = `Failed to create asset (${response.status})`;
        console.error(errorText);
        throw new Error(errorText);
      }
      onAssetAdded(); // Callback to refresh parent component's asset list
      onClose(); // Close modal on success
    } catch (error: any) {
      setFormError(error.message || "An unexpected error occurred.");
      console.error("Asset creation error:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAssetImageFile(file);
      setAssetImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({...prev, profileImage: false}));
    }
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setAssetImageFile(file);
      setAssetImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({...prev, profileImage: false}));
    }
  };
  
  const filteredMembers = orgMembers.filter(member =>
    `${member.firstName || ''} ${member.lastName || ''} ${member.identifier}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const selectedAssigneeDetails = selectedAssigneeClerkId
    ? orgMembers.find(m => m.id === selectedAssigneeClerkId)
    : null;


  // In a real app, step 2 would be distinct or part of a different flow (e.g., "Assign Asset" button on table row)
  // For this modal, we'll assume assignment is done in Step 1 or directly on submit.
  // The original two-step process was more for a different kind of invitation flow.
  // We simplify by putting assignment directly in the asset creation form.

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

        {/* Simplified to one step for asset creation */}
        <>
          <div className="flex justify-center mb-4">
            <div className="bg-[#e4f7ec] p-3 rounded-full">
              <Briefcase size={22} className="text-[#34BC68]" />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-center mb-1">Record New Asset</h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            Fill in the details for the new asset.
          </p>

          {formError && <p className="text-sm text-red-500 text-center mb-3">{formError}</p>}

          <div className="space-y-3">
            <div>
              <label className="text-sm text-black font-medium">Title <span className="text-red-500">*</span></label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: false })); }} placeholder="e.g., Laptop, Office Desk"
                className={`w-full border ${errors.title ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
              {errors.title && typeof errors.title === 'string' && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div className="flex space-x-4">
              <div className="w-1/2">
                <label className="text-sm font-medium text-black">Model <span className="text-red-500">*</span></label>
                <input value={model} onChange={(e) => { setModel(e.target.value); setErrors(prev => ({ ...prev, model: false })); }} placeholder="e.g., MacBook Pro 16 M3"
                  className={`w-full border ${errors.model ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
                 {errors.model && typeof errors.model === 'string' && <p className="text-xs text-red-500 mt-1">{errors.model}</p>}
              </div>
              <div className="w-1/2">
                <label className="text-sm font-medium text-black">Serial Number <span className="text-red-500">*</span></label>
                <input value={serialNumber} onChange={(e) => { setSerialNumber(e.target.value); setErrors(prev => ({ ...prev, serialNumber: false })); }} placeholder="e.g., C02XXXXXXG8WP"
                  className={`w-full border ${errors.serialNumber ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
                {errors.serialNumber && typeof errors.serialNumber === 'string' && <p className="text-xs text-red-500 mt-1">{errors.serialNumber}</p>}
              </div>
            </div>
            
            {/* Asset Image */}
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                <label className="text-sm font-medium text-black mb-2 sm:mb-0">Asset Image <span className="text-red-500">*</span></label>
                <div className="flex items-center space-x-3 sm:space-x-5 w-full sm:w-auto">
                  <div onClick={() => fileInputRef.current?.click()} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full border border-gray-300 cursor-pointer">
                    {assetImagePreview ? (
                      <Image src={assetImagePreview} alt="Preview" width={48} height={48} className="rounded-full object-cover" />
                    ) : ( <ImageIcon size={20} className="text-gray-500" /> )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop}
                    className={`flex-grow border border-dashed ${errors.profileImage ? "border-red-400" : "border-gray-300"} rounded-md p-2 cursor-pointer hover:border-[#6941C6] text-sm text-gray-500`}>
                    <p className="leading-snug text-center sm:text-left">
                      <span className="text-[#6941C6] font-medium">Click to upload</span> or drag and drop
                    </p>
                  </div>
                </div>
              </div>
              {errors.profileImage && typeof errors.profileImage === 'string' && (
                <p className="text-sm text-red-500 mt-1 text-right sm:text-left sm:ml-[calc(3rem+1.25rem)]">{errors.profileImage}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-black">Description <span className="text-red-500">*</span></label>
              <textarea value={description} onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: false })); }} placeholder="Detailed description of the asset"
                className={`w-full border ${errors.description ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none min-h-[80px]`} />
              {errors.description && typeof errors.description === 'string' && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>

            <div className="flex space-x-4">
              <div className="w-1/2">
                <label className="text-sm font-medium text-black flex items-center">
                  <MapPin size={14} className="mr-1 text-gray-500" /> Latitude
                </label>
                <input type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g., 34.0522"
                  className={`w-full border ${errors.latitude ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
                {errors.latitude && typeof errors.latitude === 'string' && <p className="text-xs text-red-500 mt-1">{errors.latitude}</p>}
              </div>
              <div className="w-1/2">
                <label className="text-sm font-medium text-black flex items-center">
                  <MapPin size={14} className="mr-1 text-gray-500" /> Longitude
                </label>
                <input type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g., -118.2437"
                  className={`w-full border ${errors.longitude ? "border-red-400" : "border-gray-300"} rounded-md py-2 px-3 text-sm outline-none`} />
                {errors.longitude && typeof errors.longitude === 'string' && <p className="text-xs text-red-500 mt-1">{errors.longitude}</p>}
              </div>
            </div>
            
            <div>
                <label className="text-sm font-medium text-black">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </div>

            {/* Assign User */}
            <div className="relative">
              <label className="text-sm text-black font-medium flex items-center">
                <UserPlus size={14} className="mr-1 text-gray-500" /> Assign to Member (Optional)
              </label>
              <div
                className={`w-full border border-gray-300 rounded-md py-2 px-3 text-sm flex justify-between items-center cursor-pointer`}
                onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
              >
                <span>
                  {selectedAssigneeDetails ? `${selectedAssigneeDetails.firstName || ''} ${selectedAssigneeDetails.lastName || ''} (${selectedAssigneeDetails.identifier})` : "Select member"}
                </span>
                <ChevronDown size={16} className="text-gray-500" />
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
                      <Image
                        src={member.imageUrl || userImgPlaceholder}
                        alt={member.identifier}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-sm">{member.firstName || ''} {member.lastName || ''} ({member.identifier}) - {member.role}</span>
                    </div>
                  ))}
                  {filteredMembers.length === 0 && <p className="text-sm text-gray-500 p-3">No members found.</p>}
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
              {isLoading ? "Saving..." : "Save Asset"}
            </button>
          </div>
        </>
      </div>
    </div>
  );
};

export default AddAssetModal;