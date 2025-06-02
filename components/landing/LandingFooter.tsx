import Link from 'next/link';
import { Leaf, Twitter, Github, Linkedin } from 'lucide-react'; // Placeholder icons

const LandingFooter = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 py-12 px-6 md:px-10">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {/* Logo and Company Info */}
        <div className="mb-6 md:mb-0 lg:col-span-1">
          <Link href="/" className="flex items-center space-x-2 text-xl font-semibold text-white mb-3">
            <Leaf size={24} className="text-green-400" />
            <span>Asset Scout</span>
          </Link>
          <p className="text-sm text-gray-400">
            Empowering organizations to manage assets with clarity and efficiency.
          </p>
        </div>

        {/* Links Section 1 (e.g., Product) */}
        <div>
          <h5 className="font-semibold text-white mb-3">Product</h5>
          <ul className="space-y-2 text-sm">
            <li><Link href="#features" className="hover:text-green-400 transition-colors">Features</Link></li>
            <li><Link href="#use-cases" className="hover:text-green-400 transition-colors">Use Cases</Link></li>
            <li><Link href="/pricing" className="hover:text-green-400 transition-colors">Pricing</Link></li> {/* Assuming a pricing page */} 
            <li><Link href="/docs" className="hover:text-green-400 transition-colors">Documentation</Link></li> {/* Assuming docs */} 
          </ul>
        </div>

        {/* Links Section 2 (e.g., Company) */}
        <div>
          <h5 className="font-semibold text-white mb-3">Company</h5>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-green-400 transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-green-400 transition-colors">Contact</Link></li>
            <li><Link href="/careers" className="hover:text-green-400 transition-colors">Careers</Link></li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h5 className="font-semibold text-white mb-3">Social Networks</h5>
          <div className="flex space-x-4">
            <Link href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-400 transition-colors">
              <Twitter size={20} />
            </Link>
            <Link href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-400 transition-colors">
              <Github size={20} />
            </Link>
            <Link href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-400 transition-colors">
              <Linkedin size={20} />
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-10 pt-8 border-t border-gray-700 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Asset Scout. All rights reserved.</p>
        <p className="mt-1">
          <Link href="/privacy-policy" className="hover:text-green-400 transition-colors">Privacy Policy</Link> &middot; 
          <Link href="/terms-of-service" className="hover:text-green-400 transition-colors">Terms of Service</Link>
        </p>
      </div>
    </footer>
  );
};

export default LandingFooter;
