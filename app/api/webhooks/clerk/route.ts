import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createUser } from '@/lib/users'
import { User } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET
    
    if (!WEBHOOK_SECRET) {
      throw new Error(
        'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
      )
    }

    // Verify the webhook using Clerk's helper function
    const evt = await verifyWebhook(req)

    const eventType = evt.type

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data

      if (!id || !email_addresses) {
        return new Response('Error occurred -- missing data', {
          status: 400
        })
      }

      const user = {
        clerkUserId: id,
        email: email_addresses[0].email_address,
        ...(first_name ? { firstName: first_name } : {}),
        ...(last_name ? { lastName: last_name } : {}),
        ...(image_url ? { imageUrl: image_url } : {})
      }

      await createUser(user as User)
    }

    // Return a 200 status code to acknowledge receipt of the webhook
    return new Response('Webhook received', { status: 200 })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error verifying webhook', { status: 400 })
  }
}
