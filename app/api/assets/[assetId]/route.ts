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
    const { userId, orgId, orgRole } = await auth(); // Correct destructuring and await auth()
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
    const { userId, orgId, orgRole } = await auth(); // Correct destructuring and await auth()
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
      if (orgId && assignedToClerkUserId) { 
        const memberships = await clerkClient.users.getOrganizationMembershipList({ userId: assignedToClerkUserId });
        if (!memberships.some(mem => mem.organization.id === orgId)) {
          return new NextResponse('Assignee is not a member of this organization.', { status: 400 });
        }
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
    const { userId, orgId, orgRole } = await auth(); // Correct destructuring and await auth()
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