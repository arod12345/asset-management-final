import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { CheckCircle, ShieldCheck, BarChart, Users, Zap } from 'lucide-react'; // Example icons

// Placeholder data for testimonials - replace with actual data or fetching logic
const testimonials = [
  {
    quote: "Asset Scout has revolutionized how we track our equipment. The dashboard is intuitive and the support is top-notch!",
    name: "Priyanka Patel",
    title: "Operations Manager, Tech Solutions Inc.",
    avatar: "/placeholder-avatars/priyanka.jpg" // Replace with actual image path
  },
  {
    quote: "The ability to customize asset fields and generate reports on the fly has saved us countless hours.",
    name: "Chen Zhiying",
    title: "Facility Manager, Global Logistics Co.",
    avatar: "/placeholder-avatars/chen.jpg"
  },
  {
    quote: "We finally have a single source of truth for all our assets. Implementation was smooth and the team was very helpful.",
    name: "David Njoroge",
    title: "IT Director, Creative Minds Agency",
    avatar: "/placeholder-avatars/david.jpg"
  },
  {
    quote: "The role-based access control is crucial for our security compliance. Asset Scout delivered exactly what we needed.",
    name: "Aisha Khan",
    title: "Security Officer, FinTech Innovators",
    avatar: "/placeholder-avatars/aisha.jpg"
  }
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
      <LandingHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section id="hero" className="py-20 md:py-32 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-gray-900">
          <div className="container mx-auto px-6 text-center">
            <div className="mb-3">
              <span className="inline-block bg-green-200 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                100% Secure Asset Delivery
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 dark:text-white mb-6">
              Empower Your Organization <br /> with <span className="text-green-600 dark:text-green-400">Asset Scout</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
              A unified & flexible platform to track, manage, and optimize your valuable assets. Gain insights and streamline operations for your organization.
            </p>
            <Button size="lg" asChild className="bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-3">
              <Link href="/dashboard">Try Asset Scout Free</Link>
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">No credit card required. Get started in minutes.</p>
            
            {/* Placeholder for the dashboard image */}
            <div className="mt-16 max-w-4xl mx-auto">
              <Image 
                src="/images/landing/dashboard-mockup.png" // IMPORTANT: Replace with actual path to your image
                alt="Asset Scout Dashboard Mockup"
                width={1200}
                height={750}
                className="rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700"
                priority // Load hero image quickly
              />
            </div>
          </div>
        </section>

        {/* Trusted By Section (Placeholder) */}
        <section className="py-12 bg-white dark:bg-slate-800/50">
          <div className="container mx-auto px-6 text-center">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">
              Trusted by 1000+ leading organizations worldwide
            </h3>
            {/* Add logos here */}
            <div className="flex flex-wrap justify-center items-center gap-x-8 md:gap-x-12 gap-y-4">
              <span className="text-gray-400 dark:text-gray-500 text-2xl font-medium">Logo1</span>
              <span className="text-gray-400 dark:text-gray-500 text-2xl font-medium">Logo2</span>
              <span className="text-gray-400 dark:text-gray-500 text-2xl font-medium">Logo3</span>
              <span className="text-gray-400 dark:text-gray-500 text-2xl font-medium">Logo4</span>
              <span className="text-gray-400 dark:text-gray-500 text-2xl font-medium">Logo5</span>
            </div>
          </div>
        </section>

        {/* Features Section: Take Control of Your Assets */}
        <section id="features" className="py-16 md:py-24 bg-gray-50 dark:bg-slate-900">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">Take Control of Your Assets</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
                Manage assets effectively with a centralized platform that offers everything you need, from an insightful dashboard to robust monitoring.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1: Insightful Dashboard */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                <BarChart className="w-10 h-10 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Insightful Dashboard</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Get a clear overview of your asset status, utilization, and maintenance schedules at a glance.
                </p>
              </div>
              {/* Feature 2: Role-Based Access */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                <Users className="w-10 h-10 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Role-Based Access</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Ensure data security and control by assigning specific roles and permissions to your team members.
                </p>
              </div>
              {/* Feature 3: Every Asset Counted */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                <CheckCircle className="w-10 h-10 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Every Asset Counted</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Capture and track every asset from purchase to disposal with detailed records and history.
                </p>
              </div>
              {/* Feature 4: Asset Monitoring */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                <Zap className="w-10 h-10 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Asset Monitoring</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Stay updated with real-time alerts for maintenance, location changes, or status updates.
                </p>
              </div>
            </div>
            {/* Placeholder for feature images/mockups from the landing page */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                    <Image src="/images/landing/feature-dashboard.png" alt="Dashboard Feature" width={800} height={600} className="rounded-md" />
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                    <Image src="/images/landing/feature-asset-list.png" alt="Asset List Feature" width={800} height={600} className="rounded-md" />
                </div>
            </div>
          </div>
        </section>

        {/* Benefits Section: Secure and Streamlined Asset Oversight */}
        <section id="benefits" className="py-16 md:py-24 bg-white dark:bg-slate-800/50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">Secure and Streamlined Asset Oversight</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
                Master your asset lifecycle with features designed for privacy, security, insight, and control.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center p-4">
                <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Privacy</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your data is protected with industry-leading security measures and privacy controls.</p>
              </div>
              <div className="text-center p-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Security</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Robust security protocols ensure your asset information is safe and accessible only to authorized users.</p>
              </div>
              <div className="text-center p-4">
                <BarChart className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Insight</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Gain valuable insights from your asset data to make informed decisions and optimize performance.</p>
              </div>
              <div className="text-center p-4">
                <Zap className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Control</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Full control over your asset data, user access, and reporting functionalities, tailored to your needs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-16 md:py-24 bg-gray-50 dark:bg-slate-900">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-3">Don't Take Our Word For It!</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">Hear It From Our Trusted Partners.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.slice(0,3).map((testimonial, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-green-200 dark:border-green-700/50">
                  <p className="text-gray-600 dark:text-gray-300 italic mb-4">"{testimonial.quote}"</p>
                  <div className="flex items-center">
                    {/* Placeholder for avatar image */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-green-500 font-bold text-lg mr-4">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{testimonial.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section id="cta" className="py-20 md:py-32 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Take Control of Your Assets Today!</h2>
            <p className="text-lg md:text-xl max-w-xl mx-auto mb-10">
              Ready to transform your asset management? Join thousands of satisfied users and experience the Asset Scout difference.
            </p>
            <Button size="lg" variant="outline" asChild className="bg-white text-green-600 hover:bg-gray-100 border-2 border-white hover:border-gray-100 text-lg px-8 py-3 font-semibold">
              <Link href="/dashboard">Sign Up for Free</Link>
            </Button>
          </div>
        </section>

      </main>

      <LandingFooter />
    </div>
  );
}