// /c/Users/hp/desktop/clerk-webhooks/app/page.tsx
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function Home() {
  const user = await currentUser();

  if (user) {
    // If user is logged in, redirect to the tracker dashboard
    redirect('/dashboard');
  }

  return (
    <section className='py-24'>
      <div className='container text-center'>
        <h1 className='text-4xl font-bold mb-6'>Welcome to ExpenseScout</h1>
        <p className="mb-8 text-lg text-gray-600">
          Manage your enterprise assets and expenses efficiently.
        </p>
        <div className="space-x-4">
          <Link href="/sign-in" className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Sign In
          </Link>
          <Link href="/sign-up" className="px-6 py-3 border border-primary text-primary rounded-md hover:bg-primary/10">
            Sign Up
          </Link>
        </div>
        <p className="mt-10 text-sm text-gray-500">
          This is the public landing page.
          Authenticated users will be redirected to their dashboard.
        </p>
      </div>
    </section>
  );
}