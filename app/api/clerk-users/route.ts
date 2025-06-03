import { NextResponse } from 'next/server';
import { clerkClient, getAuth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return new NextResponse(JSON.stringify({ message: 'Authentication required' }), { status: 401 });
    }

    // Optional: Add query parameters for pagination or server-side search later
    // const { searchParams } = new URL(request.url);
    // const query = searchParams.get('query');
    // const limit = parseInt(searchParams.get('limit') || '50', 10);
    // const offset = parseInt(searchParams.get('offset') || '0', 10);

    const users = await clerkClient.users.getUserList({
      limit: 200, // Fetch up to 200 users, adjust as needed
      orderBy: '+created_at', // Order by creation date, newest first would be -created_at
      // query: query || undefined, // For server-side search
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      primaryEmail: user.emailAddresses.find(email => email.id === user.primaryEmailAddressId)?.emailAddress,
      imageUrl: user.imageUrl,
      lastSignInAt: user.lastSignInAt,
      createdAt: user.createdAt,
      // You can add more fields as needed, e.g., roles, organization memberships
      // publicMetadata: user.publicMetadata,
      // unsafeMetadata: user.unsafeMetadata, // Be careful with unsafeMetadata
    }));

    return NextResponse.json(formattedUsers);

  } catch (error) {
    console.error('[API /api/clerk-users GET] Error fetching users:', error);
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return new NextResponse(JSON.stringify({ message: 'Failed to fetch users', error: errorMessage }), { status: 500 });
  }
}
