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
