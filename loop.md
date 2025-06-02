Okay, this is a significant update with several interconnected features! I'll break down the implementation for each of your requests. Due to the complexity and the need for external service configurations (Cloudinary, Gemini API), I'll provide the full code for parts that can be directly implemented and detailed instructions with placeholder logic for external integrations.

**Remember to install necessary packages:**
```bash
npm install cloudinary svix @clerk/clerk-sdk-node
# or
yarn add cloudinary svix @clerk/clerk-sdk-node
```
You already have `@clerk/clerk-sdk-node` and `svix` in your `package.json`, so `cloudinary` is the main new one here for direct use.

Here's a breakdown of the changes:

**1. Environment Variables (.env)**

Update your `.env` file to include Cloudinary and Gemini API keys:

```text
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cHVtcGVkLW1hbGFtdXRlLTE3LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_Jv1tC72LP65SNhxpudwJLwQkMsyjoixe54zxn3mQnN
CLERK_WEBHOOK_SIGNING_SECRET=whsec_3Gw11eMeFSM+nnCVM3KETw+wIe+BI+YR

# Database
DATABASE_URL="mongodb+srv://sisayabel681:8911@cluster0.kzhxrwa.mongodb.net/expense-asset-tracker?retryWrites=true&w=majority&appName=Cluster0"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name # If using client-side uploads (less secure for some methods)

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

**2. Cloudinary Integration**

We'll create a helper for Cloudinary and update the asset API routes.

**New File: `lib/cloudinary.ts`**
```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("CLOUDINARY environment variables are not fully set. Image uploads will fail.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadToCloudinary = (fileUri: string, folder: string, public_id?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(fileUri, {
      folder: folder,
      public_id: public_id, // Useful for overwriting images
      overwrite: true,
      invalidate: true,
    })
    .then((result) => {
      resolve(result);
    })
    .catch((error) => {
      console.error("Cloudinary Upload Error:", error);
      reject(error);
    });
  });
};

export const deleteFromCloudinary = (publicId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        console.error("Cloudinary Deletion Error:", error);
        reject(error);
      });
  });
};

// Function to extract public ID from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string | null => {
  if (!url || !url.includes('cloudinary.com')) return null;
  // Example URL: http://res.cloudinary.com/cloud_name/image/upload/v12345/folder/public_id.jpg
  // Need to extract "folder/public_id"
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1 || uploadIndex + 2 >= parts.length) return null; // Check if version is present
  
  let publicIdWithVersionAndFolder = parts.slice(uploadIndex + 2).join('/');
  // Remove extension like .jpg, .png etc.
  publicIdWithVersionAndFolder = publicIdWithVersionAndFolder.substring(0, publicIdWithVersionAndFolder.lastIndexOf('.'));

  return publicIdWithVersionAndFolder;
};

export default cloudinary;
```

**3. Asset Management (CRUD API Updates)**

We need to modify API routes to handle image uploads to Cloudinary. For this, the client will send a base64 encoded image.

**Modified File: `app/api/assets/route.ts`**
```typescript
// app/api/assets/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clerkNodeSDK from '@clerk/clerk-sdk-node';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { getUserById, createUser } from '@/lib/users';
import { uploadToCloudinary } from '@/lib/cloudinary'; // Import Cloudinary helper

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs'; // Ensure Node.js runtime for file operations if any

export async function POST(req: Request) {
  try {
    const { userId, orgId, orgRole } = await auth();
    const body = await req.json();
    const {
      title,
      model,
      serialNumber,
      imageBase64, // Expecting base64 string for new image
      description,
      status,
      latitude,
      longitude,
      assignedToClerkUserId,
    } = body;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (!orgId) {
      return new NextResponse('No active organization selected', { status: 400 });
    }
    if (orgRole !== 'org:admin') {
      return new NextResponse('Forbidden: Insufficient role', { status: 403 });
    }
    if (!title || !model || !serialNumber || !description) {
      return new NextResponse('Missing required asset fields', { status: 400 });
    }

    let imageUrl: string | undefined = undefined;
    if (imageBase64) {
      try {
        const uploadResult = await uploadToCloudinary(imageBase64, 'assets');
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload failed:', uploadError);
        return new NextResponse('Image upload failed', { status: 500 });
      }
    }

    let assignedToDbUserId: string | undefined = undefined;
    if (assignedToClerkUserId) {
      const { user: assignee } = await getUserById({ clerkUserId: assignedToClerkUserId });
      if (!assignee) {
        try {
          const clerkUser = await clerkNodeSDK.users.getUser(assignedToClerkUserId);
          if (clerkUser) {
            const newUser = {
              clerkUserId: assignedToClerkUserId,
              email: clerkUser.emailAddresses[0]?.emailAddress || "",
              firstName: clerkUser.firstName || "",
              lastName: clerkUser.lastName || "",
              imageUrl: clerkUser.imageUrl || ""
            };
            const { user: createdUser } = await createUser(newUser as any);
            if (createdUser) assignedToDbUserId = createdUser.id;
            else throw new Error("Failed to create assignee in local DB");
          } else {
             return new NextResponse(`Assignee user with Clerk ID ${assignedToClerkUserId} not found in Clerk.`, { status: 404 });
          }
        } catch (error) {
          console.error("Error fetching/creating assignee:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error creating assignee";
          return new NextResponse(errorMessage, { status: 500 });
        }
      } else {
        assignedToDbUserId = assignee.id;
      }
    }

    const asset = await prisma.asset.create({
      data: {
        title,
        model,
        serialNumber,
        imageUrl, // Store Cloudinary URL
        description,
        status: status || 'Active',
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        clerkOrganizationId: orgId,
        assignedToClerkUserId: assignedToClerkUserId || null,
        assignedToDbUserId: assignedToDbUserId || null,
      },
    });

    return NextResponse.json(asset, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('[ASSETS_POST]', error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && error.meta?.target === 'Asset_serialNumber_key') {
        return new NextResponse('Serial number already exists.', { status: 409 });
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(errorMessage, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId, orgId, orgRole } = await auth();

    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    if (!orgId) return new NextResponse('No active organization selected', { status: 400 });

    let assets;
    if (orgRole === 'org:admin') {
      assets = await prisma.asset.findMany({
        where: { clerkOrganizationId: orgId },
        include: { assignedTo: { select: { firstName: true, lastName: true, email: true, imageUrl: true, clerkUserId: true }} },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      assets = await prisma.asset.findMany({
        where: { clerkOrganizationId: orgId, assignedToClerkUserId: userId },
        include: { assignedTo: { select: { firstName: true, lastName: true, email: true, imageUrl: true, clerkUserId: true }} },
        orderBy: { createdAt: 'desc' },
      });
    }
    return NextResponse.json(assets, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('[ASSETS_GET]', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(errorMessage, { status: 500 });
  }
}
```

**Modified File: `app/api/assets/[assetId]/route.ts`**
```typescript
// app/api/assets/[assetId]/route.ts
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // For Prisma.PrismaClientKnownRequestError
import { getUserById } from '@/lib/users';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '@/lib/cloudinary';

interface Params {
  params: { assetId: string };
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { userId, orgId, orgRole } = auth(); // Correct destructuring
    const { assetId } = params;

    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    if (!orgId) return new NextResponse('No active organization selected', { status: 400 });
    if (!assetId) return new NextResponse('Asset ID missing', { status: 400 });

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, clerkOrganizationId: orgId },
      include: { assignedTo: { select: { firstName: true, lastName: true, email: true, imageUrl: true, clerkUserId: true }} },
    });

    if (!asset) return new NextResponse('Asset not found or not part of this organization', { status: 404 });

    if (orgRole !== 'org:admin' && asset.assignedToClerkUserId !== userId) {
      return new NextResponse('Forbidden: You do not have access to this asset', { status: 403 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('[ASSET_ID_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { userId, orgId, orgRole } = auth(); // Correct destructuring
    const { assetId } = params;
    const body = await req.json();
    const {
      title, model, serialNumber, imageBase64, // Expect base64 for image update
      description, status,
      latitude, longitude, assignedToClerkUserId, removeImage, // Flag to remove image
    } = body;

    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    if (!orgId) return new NextResponse('No active organization selected', { status: 400 });
    if (!assetId) return new NextResponse('Asset ID missing', { status: 400 });

    const assetToUpdate = await prisma.asset.findUnique({
      where: { id: assetId, clerkOrganizationId: orgId },
    });

    if (!assetToUpdate) return new NextResponse('Asset not found or not part of this organization', { status: 404 });

    if (orgRole !== 'org:admin') {
       return new NextResponse('Forbidden: Insufficient role to update', { status: 403 });
    }
    
    let assignedToDbUserId: string | null | undefined = undefined; 
    if (assignedToClerkUserId === null) { 
        assignedToDbUserId = null;
    } else if (assignedToClerkUserId) { 
      const { user: assignee } = await getUserById({ clerkUserId: assignedToClerkUserId });
      if (!assignee) {
        return new NextResponse(`Assignee user with Clerk ID ${assignedToClerkUserId} not found in local DB`, { status: 404 });
      }
      const memberships = await clerkClient.users.getOrganizationMembershipList({ userId: assignedToClerkUserId });
      if (!memberships.some(mem => mem.organization.id === orgId)) {
        return new NextResponse('Assignee is not a member of this organization.', { status: 400 });
      }
      assignedToDbUserId = assignee.id;
    }

    let newImageUrl: string | null | undefined = undefined; // undefined means no change, null means remove

    if (removeImage) {
        if (assetToUpdate.imageUrl) {
            const publicId = getPublicIdFromUrl(assetToUpdate.imageUrl);
            if (publicId) {
                try {
                    await deleteFromCloudinary(publicId);
                } catch (deleteError) {
                    console.error("Cloudinary: Error deleting old image", deleteError);
                    // Decide if this should be a hard fail or just a warning
                }
            }
        }
        newImageUrl = null; // Set to null to remove from DB
    } else if (imageBase64) { // If new image is provided
        // Delete old image if it exists
        if (assetToUpdate.imageUrl) {
            const publicId = getPublicIdFromUrl(assetToUpdate.imageUrl);
             if (publicId) {
                try {
                    await deleteFromCloudinary(publicId);
                } catch (deleteError) {
                    console.error("Cloudinary: Error deleting old image before new upload", deleteError);
                }
            }
        }
        // Upload new image
        try {
            const uploadResult = await uploadToCloudinary(imageBase64, 'assets');
            newImageUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error('Cloudinary upload failed during update:', uploadError);
            return new NextResponse('Image upload failed', { status: 500 });
        }
    }


    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...(title && { title }),
        ...(model && { model }),
        ...(serialNumber && { serialNumber }),
        ...(newImageUrl !== undefined && { imageUrl: newImageUrl }), // Update image URL if changed or removed
        ...(description && { description }),
        ...(status && { status }),
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        ...(assignedToClerkUserId !== undefined && { 
            assignedToClerkUserId: assignedToClerkUserId,
            assignedToDbUserId: assignedToDbUserId,
        })
      },
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error('[ASSET_ID_PUT]', error);
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && error.meta?.target === 'Asset_serialNumber_key') {
      return new NextResponse('Serial number already exists for another asset.', { status: 409 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { userId, orgId, orgRole } = auth(); // Correct destructuring
    const { assetId } = params;

    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    if (!orgId) return new NextResponse('No active organization selected', { status: 400 });
    if (!assetId) return new NextResponse('Asset ID missing', { status: 400 });
    
    const assetToDelete = await prisma.asset.findUnique({
      where: { id: assetId, clerkOrganizationId: orgId },
    });

    if (!assetToDelete) return new NextResponse('Asset not found or not part of this organization', { status: 404 });

    if (orgRole !== 'org:admin') {
      return new NextResponse('Forbidden: Insufficient role', { status: 403 });
    }

    // Delete image from Cloudinary if it exists
    if (assetToDelete.imageUrl) {
      const publicId = getPublicIdFromUrl(assetToDelete.imageUrl);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (deleteError) {
          console.error("Cloudinary: Error deleting image during asset deletion", deleteError);
          // You might decide to log this but still proceed with DB deletion
        }
      }
    }

    await prisma.asset.delete({ where: { id: assetId } });
    return new NextResponse('Asset deleted', { status: 200 });
  } catch (error) {
    console.error('[ASSET_ID_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

**4. Asset Management (Frontend UI Updates)**

**Modified File: `components/tracker/AddAssetModal.tsx`**
```tsx
// components/tracker/AddAssetModal.tsx
"use client";
import React, { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { Briefcase, Search, X, Check, ChevronDown, ImageIcon, MapPin, UserPlus } from "lucide-react";
import Image from "next/image";
import userImgPlaceholder from "../../public/next.svg";
import { useOrganization, useUser } from "@clerk/nextjs";

interface OrgMember {
  id: string;
  identifier: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  role: string;
}

interface AddAssetModalProps {
  onClose: () => void;
  onAssetAdded: () => void;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ onClose, onAssetAdded }) => {
  const { organization } = useOrganization();
  const { user } = useUser();

  const [title, setTitle] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  // Store as base64 for sending to backend, and preview URL for display
  const [assetImageBase64, setAssetImageBase64] = useState<string | null>(null);
  const [assetImagePreview, setAssetImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState("Active");

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
    // Image is now optional on creation, can be added later
    // if (!assetImageBase64) newErrors.assetImage = "Asset image is required.";
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

    const assetData = {
      title,
      model,
      serialNumber,
      description,
      status,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      imageBase64: assetImageBase64, // Send base64 string
      assignedToClerkUserId: selectedAssigneeClerkId,
      clerkOrganizationId: organization.id,
    };

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to create asset (${response.status} ${response.statusText})` }));
        console.error(errorData.message);
        throw new Error(errorData.message);
      }
      onAssetAdded(); 
      onClose();
    } catch (error: any) {
      setFormError(error.message || "An unexpected error occurred.");
      console.error("Asset creation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAssetImageBase64(reader.result as string);
      setAssetImagePreview(reader.result as string);
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
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setFormError("Image size should not exceed 2MB.");
         setErrors(prev => ({...prev, assetImage: "Image size should not exceed 2MB."}));
        return;
      }
      handleFileRead(file);
    }
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
            
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                <label className="text-sm font-medium text-black mb-2 sm:mb-0">Asset Image (Optional)</label> {/* Optional now */}
                <div className="flex items-center space-x-3 sm:space-x-5 w-full sm:w-auto">
                  <div onClick={() => fileInputRef.current?.click()} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full border border-gray-300 cursor-pointer">
                    {assetImagePreview ? (
                      <Image src={assetImagePreview} alt="Preview" width={48} height={48} className="rounded-full object-cover" />
                    ) : ( <ImageIcon size={20} className="text-gray-500" /> )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop}
                    className={`flex-grow border border-dashed ${errors.assetImage ? "border-red-400" : "border-gray-300"} rounded-md p-2 cursor-pointer hover:border-[#6941C6] text-sm text-gray-500`}>
                    <p className="leading-snug text-center sm:text-left">
                      <span className="text-[#6941C6] font-medium">Click to upload</span> or drag and drop (Max 2MB)
                    </p>
                  </div>
                </div>
              </div>
              {errors.assetImage && typeof errors.assetImage === 'string' && (
                <p className="text-sm text-red-500 mt-1 text-right sm:text-left sm:ml-[calc(3rem+1.25rem)]">{errors.assetImage}</p>
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
                    {/* Add more statuses as needed, e.g., "Maintenance", "Retired" */}
                </select>
            </div>

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
```

**New File: `components/tracker/EditAssetModal.tsx`** (Similar to `AddAssetModal` but for editing)
```tsx
// components/tracker/EditAssetModal.tsx
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
```

**Modified File: `components/tracker/AssetTable.tsx`**
```tsx
// components/tracker/AssetTable.tsx
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from 'next/link'; // Import Link
import { Filter, List, LayoutGrid, Search, MoreVertical, ArrowLeft, ArrowRight, ExternalLink, Edit2, Trash2, MapPin, Image as ImageIcon, Eye } from "lucide-react";
import { useOrganization, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import EditAssetModal from './EditAssetModal'; // Import EditAssetModal

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

interface AssetTableProps {
  refreshTrigger: number; 
}

const AssetTable: React.FC<AssetTableProps> = ({ refreshTrigger }) => {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { orgRole, isLoaded: authLoaded, userId: currentUserId } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [activeMenuAssetId, setActiveMenuAssetId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!orgLoaded || !authLoaded || !organization) {
      if (orgLoaded && authLoaded && !organization) {
         setIsLoading(false);
         setAssets([]);
      }
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets`, { credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch assets (${response.status} ${response.statusText})` }));
        throw new Error(errorData.message);
      }
      const data: Asset[] = await response.json();
      setAssets(data);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [organization, orgLoaded, authLoaded, refreshTrigger]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveMenuAssetId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(currentData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };
  
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
    try {
        setActiveMenuAssetId(null);
        const response = await fetch(`/api/assets/${assetId}`, { method: 'DELETE', credentials: 'include' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Failed to delete asset (${response.status} ${response.statusText})` }));
            throw new Error(errorData.message);
        }
        fetchAssets(); // Refresh list
        alert("Asset deleted successfully.");
    } catch (err: any) {
        console.error("Delete error:", err);
        alert(`Error deleting asset: ${err.message}`);
    }
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setIsEditModalOpen(true);
    setActiveMenuAssetId(null);
  };

  const filteredAssets = assets.filter((asset) =>
    `${asset.title} ${asset.model} ${asset.serialNumber} ${asset.status} ${asset.assignedTo?.firstName || ''} ${asset.assignedTo?.lastName || ''} ${asset.assignedTo?.email || ''}`
      .toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const currentData = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveMenuAssetId(null);
    }
  };

  if (!orgLoaded || !authLoaded) {
    return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading organization data...</div>;
  }
  if (!organization && orgLoaded) { // Added orgLoaded to prevent premature message
    return <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl m-2 md:m-6 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">Please select or create an organization to view assets.</div>;
  }
  if (isLoading) return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading assets...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;

  const canManageAssets = orgRole === 'org:admin';

  return (
    <div className="px-4 md:px-6 lg:px-10 pt-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl shadow-sm">
          <div className="flex items-center w-full md:w-auto md:max-w-md bg-transparent py-1">
            <Search className="text-gray-400 dark:text-gray-500 mr-2.5" size={18} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search assets..."
              className="text-sm outline-none placeholder-gray-500 dark:placeholder-gray-400 bg-transparent w-full text-gray-700 dark:text-gray-300"/>
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <button className="flex items-center text-sm px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
              <Filter size={15} className="mr-1.5" />Filter
            </button>
          </div>
        </div>
      
      <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm min-w-[900px]">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 w-12">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 bg-white dark:bg-gray-700"
                  onChange={handleSelectAll} checked={selectedItems.length === currentData.length && currentData.length > 0} />
              </th>
              <th className="px-4 py-3">Asset (Title/Model)</th>
              <th className="px-4 py-3">Serial No.</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="text-gray-700 dark:text-gray-300">
            {currentData.map((asset) => (
            <tr key={asset.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 bg-white dark:bg-gray-700"
                    checked={selectedItems.includes(asset.id)} onChange={() => handleSelectItem(asset.id)} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/assets/${asset.id}`} className="hover:underline">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{asset.title}</div>
                  </Link>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{asset.model}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300">{asset.serialNumber}</span>
                </td>
                <td className="px-4 py-3">
                  {asset.imageUrl ? (
                    <a href={asset.imageUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
                      <Image src={asset.imageUrl} alt={asset.title} width={40} height={40} className="rounded object-cover"/>
                    </a>
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <ImageIcon size={20}/>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                      asset.status.toLowerCase() === "active" ? "bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300" : 
                      asset.status.toLowerCase() === "inactive" ? "bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300" :
                      "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${
                        asset.status.toLowerCase() === "active" ? "bg-green-500 dark:bg-green-400" : 
                        asset.status.toLowerCase() === "inactive" ? "bg-yellow-500 dark:bg-yellow-400" : "bg-gray-500 dark:bg-gray-400" }`}></span>
                    {asset.status}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {asset.assignedTo ? (
                    <div className="flex items-center space-x-2">
                        {asset.assignedTo.imageUrl && <Image src={asset.assignedTo.imageUrl} alt="assignee" width={24} height={24} className="rounded-full" />}
                        <div>
                            <div className="font-medium text-xs">
                                {asset.assignedTo.firstName || asset.assignedTo.email?.split('@')[0]} {asset.assignedTo.lastName}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-[11px]">{asset.assignedTo.email}</div>
                        </div>
                    </div>
                  ) : <span className="text-gray-400 dark:text-gray-500 text-xs italic">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-xs">
                    {asset.latitude && asset.longitude ? (
                        <a href={`https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                            <MapPin size={12} className="mr-1"/> View Map
                        </a>
                    ) : <span className="text-gray-400 dark:text-gray-500 italic">N/A</span>}
                </td>
                <td className="px-4 py-3 text-right relative">
                   {(canManageAssets || asset.assignedToClerkUserId === currentUserId) && ( // Admin or assigned user can interact
                    <button onClick={() => setActiveMenuAssetId(asset.id === activeMenuAssetId ? null : asset.id)}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                      <MoreVertical size={18} />
                    </button>
                   )}
                  {activeMenuAssetId === asset.id && (
                    <div ref={dropdownRef} className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg text-xs z-20 py-1">
                      <Link href={`/assets/${asset.id}`} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center">
                        <Eye size={14} className="mr-2"/> View Details
                      </Link>
                      {canManageAssets && ( // Only admins can edit/delete from table dropdown
                        <>
                          <button onClick={() => handleOpenEditModal(asset)} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center">
                            <Edit2 size={14} className="mr-2"/> Edit Asset
                          </button>
                          <button onClick={() => handleDeleteAsset(asset.id)} className="w-full text-left block px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center">
                            <Trash2 size={14} className="mr-2"/> Delete Asset
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
             {currentData.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-500 dark:text-gray-400">No assets found.</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
            <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ArrowLeft size={14} className="mr-1" /> Previous
            </button>
            <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                    <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-2.5 py-1 rounded-md font-medium ${
                            currentPage === pageNumber 
                                ? "bg-green-100 dark:bg-green-700/50 text-green-700 dark:text-green-200" 
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                    >
                        {pageNumber}
                    </button>
                ))}
            </div>
            <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next <ArrowRight size={14} className="ml-1" />
            </button>
        </div>
        )}
      </div>
      {isEditModalOpen && editingAsset && (
        <EditAssetModal 
            asset={editingAsset} 
            onClose={() => {setIsEditModalOpen(false); setEditingAsset(null);}} 
            onAssetUpdated={() => {
                setIsEditModalOpen(false); 
                setEditingAsset(null);
                fetchAssets(); // Re-fetch assets after update
            }}
        />
      )}
    </div>
  );
};

export default AssetTable;
```

**Modified File: `app/(tracker)/assets/page.tsx`** (Pass `handleAssetAdded` correctly)
```tsx
// app/(tracker)/assets/page.tsx
"use client";
import React, { useState } from "react";
import AssetTable from "@/components/tracker/AssetTable";
import AssetPageHeader from "@/components/tracker/AssetPageHeader";
import { useOrganization, OrganizationSwitcher } from "@clerk/nextjs";


export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("All Assets");
  const { organization } = useOrganization();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAssetModified = () => { // Renamed for clarity as it's used for add/edit/delete
    setRefreshKey(prevKey => prevKey + 1); 
  };


  return (
    <div className="w-full">
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-md font-semibold text-gray-800 dark:text-gray-200">Current Organization: {organization?.name || "None"}</h2>
        <OrganizationSwitcher
            hidePersonal={true}
            // Setting a new org will trigger a re-render and AssetTable should re-fetch due to org change.
            // You could also add specific logic here if needed, e.g. afterSelectOrganizationUrl
            appearance={{
              elements: {
                organizationSwitcherTrigger: "text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700",
                organizationSwitcherPopoverCard: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                organizationSwitcherPopoverActionButton: "text-primary dark:text-primary-foreground",
                organizationPreviewTextContainer: "text-gray-700 dark:text-gray-300",
                organizationSwitcherPreviewButton: "text-gray-700 dark:text-gray-300"
              }
            }}
        />
      </div>

      <AssetPageHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAssetAdded={handleAssetModified} // Pass callback
      />
      <div className="mt-4">
        {activeTab === "All Assets" && <AssetTable refreshTrigger={refreshKey} />}
        {activeTab === "Not Active" && (
          <div className="h-[300px] bg-white dark:bg-gray-800 rounded-xl m-2 md:m-6 border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            Not Active assets section (filter AssetTable or make separate component showing 'Inactive' status)
          </div>
        )}
      </div>
    </div>
  );
}
```
**Modified File: `components/tracker/AssetPageHeader.tsx`**
```tsx
// components/tracker/AssetPageHeader.tsx
"use client";
import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import AddAssetModal from "./AddAssetModal";

interface AssetPageHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAssetAdded: () => void; // Callback after an asset is successfully added
}

const AssetPageHeader: React.FC<AssetPageHeaderProps> = ({ activeTab, setActiveTab, onAssetAdded }) => {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const tabs = ["All Assets", "Not Active"]; // Example, can be dynamic

  // This component doesn't need its own refreshTrigger,
  // it calls onAssetAdded which is managed by the parent page (AssetsPage)

  return (
    <div className="w-full px-4 md:px-6 lg:px-10 relative">
      {isAddAssetOpen && <AddAssetModal 
        onClose={() => setIsAddAssetOpen(false)} 
        onAssetAdded={() => {
          onAssetAdded(); // Call parent's handler
          setIsAddAssetOpen(false); // Close modal after asset is added
        }} 
      />}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-6 pb-4 space-y-3 md:space-y-0">
        <div className="flex items-center space-x-3 md:space-x-4">
          <h2 className="text-xl md:text-2xl font-semibold text-black dark:text-white">Assets</h2>
          {/* Dynamic count can be added here if available via props or state */}
          {/* <div className="bg-gray-100 dark:bg-gray-700 text-green-600 dark:text-green-400 text-xs md:text-sm px-2 py-1 rounded-md font-medium">
            {/* Count * /}
          </div> */}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <button
            onClick={() => setIsAddAssetOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-[#34BC68] text-white rounded-md text-sm font-medium hover:bg-green-700 w-full sm:w-auto"
          >
            <PlusCircle size={16} className="mr-2" />
            New Asset
          </button>
        </div>
      </div>

      <div className="flex space-x-4 md:space-x-6 pt-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-medium pb-2.5 whitespace-nowrap ${
              activeTab === tab
                ? "text-[#34BC68] dark:text-green-400 border-b-2 border-[#34BC68] dark:border-green-400"
                : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AssetPageHeader;
```

**5. Asset Details Page**

**New File: `app/(tracker)/assets/[assetId]/page.tsx`**
```tsx
// app/(tracker)/assets/[assetId]/page.tsx
"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useOrganization } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, MapPin, ImageIcon, UserCircle, Tag, Barcode, FileText, CalendarDays, AlertTriangle } from 'lucide-react';
import EditAssetModal from '@/components/tracker/EditAssetModal'; // Assuming you have this

// Re-use Asset type
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

export default function AssetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.assetId as string;
  
  const { orgId, orgRole, userId: currentUserId } = useAuth();
  const { organization } = useOrganization();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchAssetDetails = useCallback(async () => {
    if (!assetId || !orgId) {
        // If orgId is not yet loaded, wait. If assetId is missing, error.
        if(assetId) setIsLoading(false); // Prevent indefinite loading if orgId is missing after load
        else setError("Asset ID is missing.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}`, {credentials: 'include'});
      if (!response.ok) {
        if (response.status === 404) throw new Error('Asset not found or you do not have permission to view it.');
        const errorData = await response.json().catch(() => ({message: `Error fetching asset (${response.status})`}));
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
    if (orgId) { // Only fetch if orgId is available
        fetchAssetDetails();
    }
  }, [orgId, fetchAssetDetails]);


  const handleDeleteAsset = async () => {
    if (!asset) return;
    if (!confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
    
    try {
      const response = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to delete asset (${response.status} ${response.statusText})` }));
        throw new Error(errorData.message);
      }
      alert("Asset deleted successfully.");
      router.push('/assets'); // Redirect to assets list
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(`Error deleting asset: ${err.message}`);
    }
  };

  const canManageAsset = orgRole === 'org:admin'; // Admins can edit/delete.
                                                  // Members might only if assigned, handled by API implicitly.

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      <p className="ml-4 text-lg text-gray-600 dark:text-gray-300">Loading asset details...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-10 px-4">
      <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
      <h2 className="mt-2 text-xl font-semibold text-red-600">Error</h2>
      <p className="mt-1 text-gray-700 dark:text-gray-300">{error}</p>
      <Link href="/assets" className="mt-6 inline-block px-6 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90">
        Back to Assets
      </Link>
    </div>
  );
  
  if (!asset) return (
     <div className="text-center py-10 px-4">
      <h2 className="mt-2 text-xl font-semibold text-gray-700 dark:text-gray-200">Asset Not Found</h2>
      <p className="mt-1 text-gray-600 dark:text-gray-300">The asset you are looking for does not exist or may have been moved.</p>
      <Link href="/assets" className="mt-6 inline-block px-6 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90">
        Back to Assets
      </Link>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm text-primary hover:underline dark:text-primary-foreground"
        >
          <ArrowLeft size={18} className="mr-1" /> Back to Assets
        </button>
        {canManageAsset && (
            <div className="flex items-center space-x-3">
            <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
                <Edit2 size={16} className="mr-2" /> Edit Asset
            </button>
            <button
                onClick={handleDeleteAsset}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
                <Trash2 size={16} className="mr-2" /> Delete Asset
            </button>
            </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Image Column */}
          <div className="md:col-span-1">
            {asset.imageUrl ? (
              <a href={asset.imageUrl} target="_blank" rel="noopener noreferrer">
                <Image
                  src={asset.imageUrl}
                  alt={asset.title}
                  width={500}
                  height={500}
                  className="rounded-lg object-cover w-full aspect-square shadow-md"
                />
              </a>
            ) : (
              <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 shadow-md">
                <ImageIcon size={64} />
                <span className="ml-2">No Image</span>
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="md:col-span-2 space-y-5">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{asset.title}</h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="flex items-center">
                <Tag size={18} className="mr-2 text-primary dark:text-primary-foreground/80" />
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Model: </span>
                  <span className="text-gray-600 dark:text-gray-400">{asset.model}</span>
                </div>
              </div>
              <div className="flex items-center">
                <Barcode size={18} className="mr-2 text-primary dark:text-primary-foreground/80" />
                 <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Serial Number: </span>
                  <span className="text-gray-600 dark:text-gray-400">{asset.serialNumber}</span>
                </div>
              </div>
               <div className="flex items-center">
                <AlertTriangle size={18} className={`mr-2 ${asset.status.toLowerCase() === 'active' ? 'text-green-500' : 'text-yellow-500'}`} />
                 <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Status: </span>
                  <span className={`font-medium ${asset.status.toLowerCase() === 'active' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{asset.status}</span>
                </div>
              </div>
              <div className="flex items-center">
                <CalendarDays size={18} className="mr-2 text-primary dark:text-primary-foreground/80" />
                 <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Created: </span>
                  <span className="text-gray-600 dark:text-gray-400">{new Date(asset.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
               <div className="flex items-center">
                <CalendarDays size={18} className="mr-2 text-primary dark:text-primary-foreground/80" />
                 <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Last Updated: </span>
                  <span className="text-gray-600 dark:text-gray-400">{new Date(asset.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
               <div className="flex items-center">
                <UserCircle size={18} className="mr-2 text-primary dark:text-primary-foreground/80" />
                <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Assigned To: </span>
                    {asset.assignedTo ? (
                        <span className="text-gray-600 dark:text-gray-400">
                        {asset.assignedTo.firstName || asset.assignedTo.email?.split('@')[0]} {asset.assignedTo.lastName || ''} ({asset.assignedTo.email})
                        </span>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400 italic">Unassigned</span>
                    )}
                </div>
              </div>
              {asset.latitude && asset.longitude && (
                <div className="flex items-center sm:col-span-2">
                  <MapPin size={18} className="mr-2 text-primary dark:text-primary-foreground/80" />
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Location: </span>
                    <a 
                        href={`https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {asset.latitude}, {asset.longitude} (View Map)
                    </a>
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-3">
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center">
                <FileText size={18} className="mr-2 text-primary dark:text-primary-foreground/80"/>Description
              </h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm">{asset.description}</p>
            </div>
            
          </div>
        </div>
      </div>

      {isEditModalOpen && asset && (
        <EditAssetModal
          asset={asset}
          onClose={() => setIsEditModalOpen(false)}
          onAssetUpdated={() => {
            setIsEditModalOpen(false);
            fetchAssetDetails(); // Refresh details after update
          }}
        />
      )}
    </div>
  );
}
```

**6. Clerk Webhook Listeners Update**

**Prisma Schema (Example Additions - `prisma/schema.prisma`)**

You might need to add models for organizations, roles, etc., if you want to sync them. This is a basic example. You'll need to decide which attributes to sync.

```prisma
// In your prisma/schema.prisma

// ... existing User and Asset models

// Example: Model for Clerk Organizations (if you want to store local copies/metadata)
model Organization {
  id                String   @id @default(cuid())
  clerkOrgId        String   @unique // Clerk's organization ID
  name              String
  slug              String?
  imageUrl          String?
  // other fields you want to sync
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  // members User[] @relation("OrganizationMembers") // If you have User.organizationId
}

// Example: Model for Clerk Roles (if you want to store local copies/metadata)
// This is highly dependent on how you want to manage roles locally
model Role {
  id          String @id @default(cuid())
  clerkRoleId String @unique // Clerk's role ID (e.g., "org:admin", "org:member")
  key         String @unique // The role key from Clerk (e.g., admin, member)
  name        String // Display name (e.g., Administrator, Basic Member)
  description String?
  // permissions Permission[] // If you have a Permission model
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// You might also want models for OrganizationMembership, Permission, etc.
// This depends heavily on your application's needs beyond just asset tracking.
```
**Remember to run `npx prisma migrate dev --name added_org_role_models` (or similar) after schema changes.**

**Modified File: `app/api/webhooks/clerk/route.ts`**
```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { createUser, UpdateUser } from '@/lib/users'; // Assuming UpdateUser exists and works by clerkUserId
import { UserJSON, OrganizationJSON, OrganizationMembershipJSON, EmailJSON, OrganizationInvitationJSON } from "@clerk/nextjs/server";


const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET not set');
    return new NextResponse('Internal Server Error: Webhook secret not configured', { status: 500 });
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occurred -- no svix headers', { status: 400 });
  }

  // Get the body
  let payload;
  try {
      payload = await req.json();
  } catch (error) {
      console.error("Error parsing webhook payload:", error);
      return new NextResponse('Invalid payload', { status: 400 });
  }
  
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error occurred verifying webhook', { status: 400 });
  }

  const eventType = evt.type;
  console.log(`Received webhook event: ${eventType}`, evt.data);

  try {
    switch (eventType) {
      // USER EVENTS
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data as UserJSON;
        if (!id || !email_addresses || email_addresses.length === 0) {
          return new NextResponse('Error: Missing user ID or email for user.created', { status: 400 });
        }
        await createUser({
          clerkUserId: id,
          email: email_addresses[0].email_address,
          firstName: first_name || '',
          lastName: last_name || '',
          imageUrl: image_url || '',
          // role: (public_metadata?.role as string) || 'user', // Example, if you set role in public_metadata
        });
        console.log(`User ${id} created in local DB.`);
        break;
      }
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data as UserJSON;
        if (!id) return new NextResponse('Error: Missing user ID for user.updated', { status: 400 });
        
        // Find user by clerkUserId and update
        const userToUpdate = await prisma.user.findUnique({ where: { clerkUserId: id } });
        if (userToUpdate) {
            await prisma.user.update({
                where: { clerkUserId: id },
                data: {
                    email: email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : userToUpdate.email,
                    firstName: first_name || userToUpdate.firstName,
                    lastName: last_name || userToUpdate.lastName,
                    imageUrl: image_url || userToUpdate.imageUrl,
                    // role: (public_metadata?.role as string) || userToUpdate.role,
                },
            });
            console.log(`User ${id} updated in local DB.`);
        } else {
            console.warn(`User ${id} not found in local DB for update.`);
             // Optionally, create if not found (upsert logic)
        }
        break;
      }
      case 'user.deleted': {
        const { id, deleted } = evt.data as UserJSON; // Check if 'deleted' field is true
        if (!id) return new NextResponse('Error: Missing user ID for user.deleted', { status: 400 });
        if (deleted) { // Clerk sometimes sends user.deleted with deleted: false for soft deletes
            try {
                await prisma.user.delete({ where: { clerkUserId: id } });
                console.log(`User ${id} deleted from local DB.`);
                 // You might also need to handle unassigning assets, etc.
            } catch (error: any) {
                if (error.code === 'P2025') { // Prisma's Record to delete does not exist
                    console.warn(`User ${id} not found in local DB for deletion, or already deleted.`);
                } else {
                    throw error; // Re-throw other errors
                }
            }
        } else {
             console.log(`User ${id} soft deleted or deletion event received with deleted:false.`);
        }
        break;
      }

      // EMAIL EVENTS (Mostly for logging or internal state, less likely to interact with core DB models directly)
      case 'email.created': {
        const emailData = evt.data as EmailJSON;
        console.log(`Email created: ID ${emailData.id}, To: ${emailData.to_email_address}, Status: ${emailData.status}`);
        // Example: Log this event, or update some notification status if relevant
        break;
      }

      // ORGANIZATION EVENTS
      case 'organization.created': {
        const orgData = evt.data as OrganizationJSON;
        // Example: if you have an Organization model in Prisma
        // This is a simplified example, adapt to your Prisma schema
        await prisma.organization.create({
          data: {
            clerkOrgId: orgData.id,
            name: orgData.name,
            slug: orgData.slug || undefined, // orgData.slug can be null
            imageUrl: orgData.image_url || undefined,
            // createdBy: orgData.created_by, // if you store this
          },
        }).catch(e => console.error("Failed to create org in DB:", e));
        console.log(`Organization ${orgData.id} created.`);
        break;
      }
      case 'organization.updated': {
        const orgData = evt.data as OrganizationJSON;
        await prisma.organization.update({
          where: { clerkOrgId: orgData.id },
          data: {
            name: orgData.name,
            slug: orgData.slug || undefined,
            imageUrl: orgData.image_url || undefined,
            // ... other fields
          },
        }).catch(e => console.warn("Failed to update org in DB or org not found:", e));
        console.log(`Organization ${orgData.id} updated.`);
        break;
      }
      case 'organization.deleted': {
        const orgData = evt.data as OrganizationJSON; // Contains id, object, slug, name
        try {
            await prisma.organization.delete({ where: { clerkOrgId: orgData.id } });
            console.log(`Organization ${orgData.id} deleted from local DB.`);
            // Cascade delete related assets or handle them (e.g., unassign, archive)
            await prisma.asset.updateMany({
                where: { clerkOrganizationId: orgData.id },
                data: { 
                    clerkOrganizationId: null, // Or handle as per your logic, maybe delete assets too
                    assignedToClerkUserId: null,
                    assignedToDbUserId: null,
                    status: "Archived" // Example
                } 
            });
            console.log(`Assets under organization ${orgData.id} updated/archived.`);
        } catch (error: any) {
            if (error.code === 'P2025') {
                 console.warn(`Organization ${orgData.id} not found in local DB for deletion.`);
            } else {
                console.error("Error deleting organization or its assets:", error);
            }
        }
        break;
      }

      // ORGANIZATION MEMBERSHIP EVENTS
      case 'organizationMembership.created': {
        const memberData = evt.data as OrganizationMembershipJSON;
        console.log(`Membership created: User ${memberData.public_user_data?.user_id} in Org ${memberData.organization.id} as ${memberData.role}`);
        // Example: If you track memberships locally or need to update user's org role
        // const user = await prisma.user.findUnique({ where: { clerkUserId: memberData.public_user_data.user_id }});
        // if (user) { /* update user's organization specific role if you store that */ }
        break;
      }
      case 'organizationMembership.deleted': {
        const memberData = evt.data as OrganizationMembershipJSON;
        console.log(`Membership deleted: User ${memberData.public_user_data?.user_id} from Org ${memberData.organization.id}`);
        // Example: Update user's local state, unassign assets if they were tied to this specific org membership role
        break;
      }
      case 'organizationMembership.updated': {
        const memberData = evt.data as OrganizationMembershipJSON;
        console.log(`Membership updated: User ${memberData.public_user_data?.user_id} in Org ${memberData.organization.id}, new role ${memberData.role}`);
        // Example: Update user's role within the organization in your local DB
        break;
      }
      
      // ORGANIZATION INVITATION EVENTS
      case 'organizationInvitation.accepted': {
        const invData = evt.data as OrganizationInvitationJSON;
        console.log(`Invitation accepted: Email ${invData.email_address} for Org ${invData.organization_id}, User ID ${invData.public_metadata?.user_id}`);
        break;
      }
      case 'organizationInvitation.created':{
        const invData = evt.data as OrganizationInvitationJSON;
        console.log(`Invitation created: Email ${invData.email_address} for Org ${invData.organization_id} by ${invData.inviter_user_id}`);
        break;
      }
      case 'organizationInvitation.revoked':{
        const invData = evt.data as OrganizationInvitationJSON;
        console.log(`Invitation revoked: Email ${invData.email_address} for Org ${invData.organization_id}`);
        break;
      }

      // Note: organizationDomain, permission, role events are less common to sync directly unless you have a complex local RBAC mirror.
      // For now, just log them. Expand if needed.
      case 'organizationDomain.created':
      case 'organizationDomain.deleted':
      case 'organizationDomain.updated':
      case 'permission.created':
      case 'permission.deleted':
      case 'permission.updated':
      case 'role.created': // Clerk's built-in roles, not your app-specific roles if any
      case 'role.deleted':
      case 'role.updated':
        console.log(`Received ${eventType}: ID ${evt.data.id}`);
        // Implement specific logic if you need to sync these to your DB
        break;

      default:
        console.warn(`Unhandled webhook event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error processing webhook ${eventType}:`, error);
    // It's generally better to return 200 to Clerk even if processing fails on your end
    // to prevent Clerk from resending the webhook repeatedly for a persistent processing error.
    // Log the error thoroughly for investigation.
    // However, for critical creation/deletion errors, you might reconsider.
    // For this example, we'll return 500 if an error occurs during processing for clarity.
    return new NextResponse('Error processing webhook', { status: 500 });
  }

  return new NextResponse('Webhook received and processed', { status: 200 });
}

```

**7. Reports Page (Setup and Gemini API Placeholder)**

**Modified File: `app/(tracker)/reports/page.tsx`**
```tsx
// app/(tracker)/reports/page.tsx
"use client";
import React, { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react';

type ReportFormat = "pdf" | "word" | "excel";
type ReportType = "all_assets" | "asset_assignments" | "asset_status_summary"; // Add more types

interface ReportParams {
  format: ReportFormat;
  type: ReportType;
  // Add other params like date ranges, status filters etc.
  dateFrom?: string;
  dateTo?: string;
  statusFilter?: string;
}

export default function ReportsPage() {
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [reportType, setReportType] = useState<ReportType>("all_assets");
  const [reportFormat, setReportFormat] = useState<ReportFormat>("pdf");
  // Add more state for filters if needed, e.g., date ranges

  const handleGenerateReport = async () => {
    if (!organization) {
      setError("No organization selected. Please select an organization first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const reportParams: ReportParams = {
      format: reportFormat,
      type: reportType,
      // ...other params
    };

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/octet-stream' },
        body: JSON.stringify(reportParams),
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: `Failed to generate report. Server responded with ${response.status}` }));
        throw new Error(errData.message || `Report generation failed with status: ${response.status}`);
      }

      // Handle file download
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `report.${reportFormat}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Report "${filename}" generated and download started.`);

    } catch (err: any) {
      console.error("Report generation error:", err);
      setError(err.message || "An unexpected error occurred during report generation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Generate Reports</h1>
      </div>

      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">{error}</div>}
      {successMessage && <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">{successMessage}</div>}
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 space-y-6">
        <div>
          <label htmlFor="reportType" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Report Type</label>
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          >
            <option value="all_assets">All Assets List</option>
            <option value="asset_assignments">Asset Assignments</option>
            <option value="asset_status_summary">Asset Status Summary</option>
            {/* Add more report types here */}
          </select>
        </div>

        <div>
          <label htmlFor="reportFormat" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Report Format</label>
          <div className="flex space-x-2">
            {(["pdf", "word", "excel"] as ReportFormat[]).map(fmt => (
                 <button
                    key={fmt}
                    onClick={() => setReportFormat(fmt)}
                    className={`flex items-center justify-center px-4 py-2 border rounded-lg text-sm font-medium
                                ${reportFormat === fmt 
                                    ? 'bg-primary text-white border-primary dark:bg-primary dark:border-primary' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                 >
                    {fmt === 'pdf' && <FileType size={16} className="mr-2"/>}
                    {fmt === 'word' && <FileText size={16} className="mr-2"/>}
                    {fmt === 'excel' && <FileSpreadsheet size={16} className="mr-2"/>}
                    {fmt.toUpperCase()}
                 </button>
            ))}
          </div>
        </div>

        {/* Add more filter options here, e.g., date pickers, status dropdowns */}
        {/*
        <div>
          <label htmlFor="dateFrom" className="block mb-2 text-sm font-medium">Date From</label>
          <input type="date" id="dateFrom" name="dateFrom" className="input-class" />
        </div>
        <div>
          <label htmlFor="dateTo" className="block mb-2 text-sm font-medium">Date To</label>
          <input type="date" id="dateTo" name="dateTo" className="input-class" />
        </div>
        */}

        <button
          onClick={handleGenerateReport}
          disabled={isLoading || !organization}
          className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 disabled:bg-gray-400 dark:bg-green-500 dark:hover:bg-green-600 dark:focus:ring-green-800 dark:disabled:bg-gray-500"
        >
          <Download size={18} className="mr-2" />
          {isLoading ? 'Generating Report...' : `Generate ${reportFormat.toUpperCase()} Report`}
        </button>
        {!organization && <p className="text-xs text-yellow-600 mt-2">Please ensure an organization is active to generate reports.</p>}
      </div>

       <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About Report Generation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
                This section uses an API to generate reports in your chosen format.
                The actual document creation (PDF, Word, Excel) from data would typically involve:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>Fetching the relevant data from the database based on your selected report type and filters.</li>
                <li>
                    Formatting this data appropriately. For complex formats like PDF and Word, this often involves using libraries 
                    (e.g., <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">pdf-lib</code>, <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">docx</code>) or a templating engine.
                    For Excel, libraries like <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">exceljs</code> are common.
                </li>
                <li>
                    If using an AI service like Gemini, you would send the structured data to the Gemini API with a prompt
                    instructing it to generate the content in the desired format (e.g., "Generate a PDF report summarizing these assets...").
                    The AI might return structured text, markdown, or in some cases, directly a file or base64 encoded file content if the API supports it.
                    This usually requires careful prompt engineering.
                </li>
                <li>The backend API then sends the generated file back to your browser for download.</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                The current implementation sets up the client-side request and placeholder for backend processing.
                You would need to build out the <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">/api/reports/generate</code> endpoint
                with your chosen data fetching and document generation logic.
            </p>
        </div>

    </div>
  );
}
```

**New File: `app/api/reports/generate/route.ts`**```typescript
// app/api/reports/generate/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
// For Gemini (Install the SDK: npm install @google/generative-ai)
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// For specific file generation, you'd use libraries like:
// PDF: 'pdf-lib' or 'puppeteer' (for HTML to PDF)
// Word: 'docx'
// Excel: 'exceljs'

type ReportFormat = "pdf" | "word" | "excel";
type ReportType = "all_assets" | "asset_assignments" | "asset_status_summary";

interface ReportParams {
  format: ReportFormat;
  type: ReportType;
  dateFrom?: string;
  dateTo?: string;
  statusFilter?: string;
}

// --- Gemini API Setup (Placeholder) ---
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// let genAI: GoogleGenerativeAI | null = null;
// if (GEMINI_API_KEY) {
//   genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// } else {
//   console.warn("GEMINI_API_KEY is not set. Report generation with Gemini will be unavailable.");
// }

// const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" }); // Or your preferred model

// const generationConfig = {
//   temperature: 0.9, // Adjust as needed
//   topK: 1,
//   topP: 1,
//   maxOutputTokens: 8192, // Adjust as needed
// };
// const safetySettings = [
//   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//   // ... other safety settings
// ];
// --- End Gemini Setup ---


export async function POST(req: Request) {
  try {
    const { userId, orgId, orgRole } = auth();
    if (!userId || !orgId) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized or no organization selected' }), { status: 401 });
    }

    const params: ReportParams = await req.json();

    // 1. Fetch Data from Prisma based on params.type and filters
    let data: any;
    switch (params.type) {
      case 'all_assets':
        data = await prisma.asset.findMany({
          where: { clerkOrganizationId: orgId /* Add statusFilter, date filters if provided */ },
          include: { assignedTo: true },
          orderBy: { title: 'asc' }
        });
        break;
      case 'asset_assignments':
        data = await prisma.asset.findMany({
            where: { 
                clerkOrganizationId: orgId, 
                assignedToClerkUserId: { not: null } 
                /* Add statusFilter, date filters */ 
            },
            include: { assignedTo: { select: { firstName: true, lastName: true, email: true }} },
            orderBy: { assignedTo: { firstName: 'asc' }}
        });
        break;
      case 'asset_status_summary':
         const statusCounts = await prisma.asset.groupBy({
            by: ['status'],
            where: { clerkOrganizationId: orgId /* date filters */ },
            _count: { status: true },
        });
        data = statusCounts.map(item => ({ status: item.status, count: item._count.status }));
        break;
      default:
        return new NextResponse(JSON.stringify({ message: 'Invalid report type' }), { status: 400 });
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
        return new NextResponse(JSON.stringify({ message: 'No data found for the selected report criteria.' }), { status: 404 });
    }

    // 2. Generate Report File (Placeholder for actual file generation)
    // This is where you would use Gemini or specific file libraries.
    
    let fileBuffer: Buffer;
    let contentType: string;
    let filename = `${params.type}_report_${new Date().toISOString().split('T')[0]}`;

    // --- Placeholder for Gemini/Library Integration ---
    if (params.format === "pdf") {
      contentType = "application/pdf";
      filename += ".pdf";
      // Example: Using a library or Gemini to generate PDF content into fileBuffer
      // For Gemini:
      // if (!model) return new NextResponse(JSON.stringify({ message: "Gemini AI model not initialized."}), { status: 500});
      // const prompt = `Generate a PDF report for the following asset data: ${JSON.stringify(data)}. Columns should be ... Summary should be ...`;
      // const result = await model.generateContentStream([{ text: prompt }]); // Or generateContent for single response
      // let textResponse = ""; for await (const chunk of result.stream) { textResponse += chunk.text(); }
      // fileBuffer = Buffer.from(textResponse); // This assumes Gemini returns base64 or similar PDF content. 
      // This part is HIGHLY dependent on Gemini's capabilities for direct file generation or structured content that you then convert.
      // Most likely, Gemini will give you text/markdown, and you use another library to make a PDF.
      fileBuffer = Buffer.from(`This is a placeholder PDF report for ${params.type} with data: ${JSON.stringify(data, null, 2)}`); // Placeholder
    } else if (params.format === "excel") {
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename += ".xlsx";
      // Example with 'exceljs' (you'd need to install and implement)
      // const workbook = new ExcelJS.Workbook();
      // const worksheet = workbook.addWorksheet('Assets');
      // // ... populate worksheet with data ...
      // fileBuffer = await workbook.xlsx.writeBuffer() as Buffer;
      fileBuffer = Buffer.from(`This is a placeholder Excel report for ${params.type}. Data: ${JSON.stringify(data, null, 2)}`); // Placeholder
    } else if (params.format === "word") {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      filename += ".docx";
      // Example with 'docx' library
      fileBuffer = Buffer.from(`This is a placeholder Word report for ${params.type}. Data: ${JSON.stringify(data, null, 2)}`); // Placeholder
    } else {
      return new NextResponse(JSON.stringify({ message: 'Invalid report format' }), { status: 400 });
    }
    // --- End Placeholder ---

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('[REPORTS_GENERATE_POST]', error);
    return new NextResponse(JSON.stringify({ message: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
```

**8. Dark Mode / Light Mode Switch**

Your application already has `next-themes` with `ThemeProvider` and `ThemeToggle`. The `globals.css` defines dark mode variables. The key is to ensure all components (existing and new) use Tailwind's utility classes that respect these CSS variables.

*   **Review `app/globals.css`**: Ensure `--background`, `--foreground`, `--card`, `--border`, etc., are correctly defined for both light and dark themes.
*   **Component Styling**: When building new components or modifying existing ones:
    *   Use semantic color classes like `bg-background`, `text-foreground`, `border-border`, `bg-card`.
    *   For specific colors that should adapt, use the theme variables directly or via Tailwind's `theme.extend.colors` in `tailwind.config.ts`.
    *   Example: `bg-primary text-primary-foreground`.
*   The provided UI components (like `AssetTable`, `AssetDetailsPage`, Modals) have been updated with `dark:` prefixes where appropriate, assuming your Tailwind CSS is set up for it (which it is via `darkMode: ["class"]`).

**To Test Dark Mode:**
Ensure your `Header.tsx` or another central place has the `<ThemeToggle />` component. Click it to switch themes and verify all UI elements adapt.

I have updated various component snippets above (e.g., `AssetTable`, `AssetDetailsPage`, `AssetPageHeader`, `AddAssetModal`, `EditAssetModal`) to include `dark:` variants for colors like `dark:bg-gray-800`, `dark:text-white`, `dark:border-gray-700`, etc. This relies on your existing `globals.css` theme variable setup.

**Final Steps & Considerations:**

1.  **Install Dependencies:** `npm install cloudinary` (if not already done for svix and clerk sdk). For Gemini: `npm install @google/generative-ai`. For file generation: `npm install pdf-lib docx exceljs` (or alternatives).
2.  **Prisma Migrations:** After updating `prisma/schema.prisma` (if you added `Organization`, `Role` models), run `npx prisma migrate dev --name your_migration_name` and `npx prisma generate`.
3.  **Cloudinary Setup:**
    *   Sign up for Cloudinary.
    *   Get your `CLOUD_NAME`, `API_KEY`, `API_SECRET` and put them in your `.env` file.
4.  **Gemini API Setup:**
    *   Get your `GEMINI_API_KEY` from Google AI Studio and add it to `.env`.
    *   Review the Gemini API documentation for specific capabilities regarding file generation or structured content output that you can then convert to files. The placeholder in `app/api/reports/generate/route.ts` will need to be replaced with actual Gemini SDK calls and potentially logic to convert Gemini's output to the desired file format using additional libraries.
5.  **Thorough Testing:**
    *   Test asset creation with image upload.
    *   Test asset editing (including changing/removing image).
    *   Test asset deletion (verify Cloudinary image is also deleted).
    *   Test the asset details page.
    *   Test all webhook events by performing actions in your Clerk dashboard (create user, create org, etc.) and check your server logs and database.
    *   Test the report generation page (it will download placeholder files until you implement the actual generation logic).
    *   Test dark/light mode switching across all pages and components.
6.  **Error Handling & UX:** Improve error messages and user feedback across the application. The provided code includes basic error handling, but you can expand on it.
7.  **Security:** Ensure API keys and secrets are only in `.env` and not exposed client-side unless explicitly designed for it (like public Cloudinary cloud name). Server-side operations are generally more secure for sensitive actions.
8.  **Large File Uploads for Cloudinary:** The current `AddAssetModal` and `EditAssetModal` use base64 encoding for images. This is fine for small images (e.g., < 2-4MB). For larger files, you'd typically use `FormData` and `multipart/form-data` requests, or have the client upload directly to Cloudinary using a signature obtained from your backend. The base64 approach is simpler to integrate initially with the existing JSON API structure.

This is a comprehensive set of changes. Implement and test them incrementally. Good luck!