// lib/users.ts
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma

// Define a type for the data expected by createUser, matching the relevant fields of your Prisma User model
type CreateUserArgs = Omit<Prisma.UserCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'assetsAssigned'>;

export async function createUser(data: CreateUserArgs) {
  try {
    const user = await prisma.user.create({ data });
    return { user };
  } catch (error) {
    // It's good to log the actual error for debugging
    console.error("Error creating user in DB:", error);
    // Provide a more specific error message or object if needed
    return { error: error instanceof Error ? error.message : "Unknown error creating user" };
  }
}

export async function getUserById({
  id,
  clerkUserId
}: {
  id?: string;
  clerkUserId?: string;
}) {
  try {
    if (!id && !clerkUserId) {
      throw new Error('id or clerkUserId is required');
    }

    const query = id ? { id } : { clerkUserId };

    const user = await prisma.user.findUnique({ where: query });
    return { user };
  } catch (error) {
    return { error };
  }
}

// UpdateUser remains the same for now
export async function UpdateUser(id: string, data: Partial<Prisma.UserUpdateInput>) { // Use Prisma.UserUpdateInput
  try {
    const user = await prisma.user.update({
      where: { id },
      data
    });
    return { user };
  } catch (error) {
    return { error };
  }
}