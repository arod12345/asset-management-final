// app/api/assets/[assetId]/route.ts
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getUserById } from '@/lib/users';

interface Params {
  params: { assetId: string };
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { userId, orgId, orgRole } = auth();
    const { assetId } = params;

    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    if (!orgId) return new NextResponse('No active organization selected', { status: 400 });
    if (!assetId) return new NextResponse('Asset ID missing', { status: 400 });

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, clerkOrganizationId: orgId }, // Ensure asset belongs to the current org
      include: { assignedTo: { select: { firstName: true, lastName: true, email: true, imageUrl: true, clerkUserId: true }} },
    });

    if (!asset) return new NextResponse('Asset not found or not part of this organization', { status: 404 });

    // Admins can see any asset in their org. Members can only see if assigned to them.
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
    const { userId, orgId, orgRole } = auth();
    const { assetId } = params;
    const body = await req.json();
    const {
      title, model, serialNumber, imageUrl, description, status,
      latitude, longitude, assignedToClerkUserId,
    } = body;

    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    if (!orgId) return new NextResponse('No active organization selected', { status: 400 });
    if (!assetId) return new NextResponse('Asset ID missing', { status: 400 });

    const assetToUpdate = await prisma.asset.findUnique({
      where: { id: assetId, clerkOrganizationId: orgId },
    });

    if (!assetToUpdate) return new NextResponse('Asset not found or not part of this organization', { status: 404 });

    // Admins can update any asset. Members can only update assets assigned to them (potentially limited fields).
    // For simplicity here, only admins can update. You can expand this.
    if (orgRole !== 'org:admin') {
      // Example: allow member to update status or location if assigned
      // if (assetToUpdate.assignedToClerkUserId !== userId || (title || model || serialNumber /* etc if not allowed to change*/)) {
      //   return new NextResponse('Forbidden: Insufficient permissions to update this asset or these fields', { status: 403 });
      // }
       return new NextResponse('Forbidden: Insufficient role to update', { status: 403 });
    }
    
    let assignedToDbUserId: string | null | undefined = undefined; // undefined means don't change, null means unassign
    if (assignedToClerkUserId === null) { // Explicitly unassigning
        assignedToDbUserId = null;
    } else if (assignedToClerkUserId) { // Assigning or changing assignment
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


    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...(title && { title }),
        ...(model && { model }),
        ...(serialNumber && { serialNumber }),
        imageUrl: imageUrl, // Can be set to null
        ...(description && { description }),
        ...(status && { status }),
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        // Only update assignment if assignedToClerkUserId is provided in the payload
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
    const { userId, orgId, orgRole } = auth();
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

    await prisma.asset.delete({ where: { id: assetId } });
    return new NextResponse('Asset deleted', { status: 200 });
  } catch (error) {
    console.error('[ASSET_ID_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}