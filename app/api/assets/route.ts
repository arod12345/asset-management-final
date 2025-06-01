// app/api/assets/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clerkNodeSDK from '@clerk/clerk-sdk-node'; // Use Clerk Node SDK
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { getUserById, createUser } from '@/lib/users'; // To find Prisma user ID from Clerk ID and create user

// Ensure this route is treated as dynamic for every request so auth() has cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId, orgId, orgRole } = await auth();
    const body = await req.json();
    const {
      title,
      model,
      serialNumber,
      imageUrl,
      description,
      status,
      latitude,
      longitude,
      assignedToClerkUserId, // Expecting Clerk User ID of the assignee
    } = body;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!orgId) {
      return new NextResponse('No active organization selected', { status: 400 });
    }

    // Only organization admins can create assets
    if (orgRole !== 'org:admin') {
      return new NextResponse('Forbidden: Insufficient role', { status: 403 });
    }

    if (!title || !model || !serialNumber || !description) {
      return new NextResponse('Missing required asset fields', { status: 400 });
    }

    let assignedToDbUserId: string | undefined = undefined;
    if (assignedToClerkUserId) {
      const { user: assignee } = await getUserById({ clerkUserId: assignedToClerkUserId });
      
      if (!assignee) {
        // User doesn't exist in local DB, but exists in Clerk
        // Let's try to get their info from Clerk and create them
        try {
          console.log(`User with Clerk ID ${assignedToClerkUserId} not found in local DB. Fetching from Clerk...`);
          const clerkUser = await clerkNodeSDK.users.getUser(assignedToClerkUserId);
          
          if (clerkUser) {
            // Create user in local DB using Clerk data
            const email = clerkUser.emailAddresses[0]?.emailAddress || "";
            const firstName = clerkUser.firstName || "";
            const lastName = clerkUser.lastName || "";
            const imageUrl = clerkUser.imageUrl || "";
            
            const newUser = {
              clerkUserId: assignedToClerkUserId,
              email,
              firstName,
              lastName,
              imageUrl
            };
            
            const { user: createdUser, error } = await createUser(newUser as any);
            
            if (createdUser) {
              console.log(`Created user in local DB with ID: ${createdUser.id}`);
              assignedToDbUserId = createdUser.id;
            } else {
              console.error(`Failed to create user in local DB: ${error}`);
              return new NextResponse(`Failed to create user in local DB: ${error}`, { status: 500 });
            }
          } else {
            return new NextResponse(`User with Clerk ID ${assignedToClerkUserId} not found in Clerk`, { status: 404 });
          }
        } catch (error) {
          console.error("Error fetching/creating user:", error);
          return new NextResponse(`Error creating user from Clerk data: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            { status: 500 });
        }
      } else {
        // User exists in local DB, use their ID
        console.log(`Assigning asset to user with Clerk ID: ${assignedToClerkUserId}`);
        assignedToDbUserId = assignee.id;
      }
    }

    const asset = await prisma.asset.create({
      data: {
        title,
        model,
        serialNumber,
        imageUrl,
        description,
        status: status || 'Active',
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        clerkOrganizationId: orgId,
        assignedToClerkUserId: assignedToClerkUserId || null, // Store clerk ID directly
        assignedToDbUserId: assignedToDbUserId || null,     // Store prisma ID for relation
      },
    });

    return NextResponse.json(asset, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('[ASSETS_POST]', error);
    
    // Check for Prisma known request errors
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && error.meta?.target === 'Asset_serialNumber_key') {
        return new NextResponse('Serial number already exists.', { status: 409 });
      }
    }
    
    // Handle general errors
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(errorMessage, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId, orgId, orgRole } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (!orgId) {
      return new NextResponse('No active organization selected', { status: 400 });
    }

    let assets;
    if (orgRole === 'org:admin') {
      // Admins see all assets in the organization
      assets = await prisma.asset.findMany({
        where: { clerkOrganizationId: orgId },
        include: { assignedTo: { select: { firstName: true, lastName: true, email: true, imageUrl: true, clerkUserId: true }} }, // Include assignee details
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Members see only assets assigned to them within that organization
      assets = await prisma.asset.findMany({
        where: {
          clerkOrganizationId: orgId,
          assignedToClerkUserId: userId,
        },
        include: { assignedTo: { select: { firstName: true, lastName: true, email: true, imageUrl: true, clerkUserId: true }} },
        orderBy: { createdAt: 'desc' },
      });
    }
    return NextResponse.json(assets, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('[ASSETS_GET]', error);
    // Handle error properly
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(errorMessage, { status: 500 });
  }
}