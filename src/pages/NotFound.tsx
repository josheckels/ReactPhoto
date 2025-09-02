import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/use-page-title';

export default function NotFoundPage() {
  // Set the page title
  usePageTitle("404 - Page Not Found");
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-8">The page you are looking for does not exist.</p>
      <Link 
        to="/" 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}