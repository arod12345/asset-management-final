import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
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
          const clerkUser = await clerkClient.users.getUser(assignedToClerkUserId);
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

    // Create notification if asset is assigned
    if (asset.assignedToClerkUserId && asset.id && asset.title) {
      try {
        await prisma.notification.create({
          data: {
            message: `Asset "${asset.title}" has been assigned to you.`,
            recipientClerkUserId: asset.assignedToClerkUserId,
            recipientDbUserId: asset.assignedToDbUserId!, // Add non-null assertion if confident, or handle potential null
            assetId: asset.id,
            type: 'asset_assignment',
          },
        });
        console.log(`[ASSETS_POST] Notification created for user ${asset.assignedToClerkUserId} regarding asset ${asset.id}`);
      } catch (notificationError) {
        // Log the error but don't let it fail the main asset creation response
        console.error(`[ASSETS_POST] Failed to create notification for asset ${asset.id}:`, notificationError);
      }
    }

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