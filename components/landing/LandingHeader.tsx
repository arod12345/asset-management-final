import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component from shadcn/ui
import { Leaf } from 'lucide-react'; // Using Leaf as a placeholder logo icon

const LandingHeader = () => {
  return (
    <header className="py-4 px-6 md:px-10 bg-white sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 text-2xl font-bold text-green-600">
          <Leaf size={28} />
          <span>Asset Scout</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-6 items-center">
          <Link href="#features" className="text-gray-600 hover:text-green-600 transition-colors">
            Features
          </Link>
          <Link href="#use-cases" className="text-gray-600 hover:text-green-600 transition-colors">
            Use Cases
          </Link>
          <Link href="#testimonials" className="text-gray-600 hover:text-green-600 transition-colors">
            Testimonials
          </Link>
        </nav>

        {/* Action Button */}
        <div>
          <Button asChild className="bg-green-500 hover:bg-green-600 text-white">
            <Link href="/assets">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
