import { Link, useNavigate } from "react-router-dom"
import { Home } from "lucide-react"
import { getCategoryUrl, getS3ImageUrl } from "@/utils/urlHelpers";
import { useCategories } from "@/src/context/CategoryProvider";
import { Category } from "@/utils/Types";
import { usePageTitle } from "@/hooks/use-page-title";

export default function CategoriesPage() {
  const navigate = useNavigate();
  const { categories, loading } = useCategories();
  
  // Set the page title
  usePageTitle("All Categories");

  function outputPath(c: Category) : string {
    if (!c) {
      return '';
    }
    const parentPath = outputPath(c.parentCategory);
    return parentPath + (parentPath.length > 0 ? ': ' : '') + c.description;
  }

  const sortedCategories = [...categories].sort(function (a: Category, b: Category): number {
    return b.createdOn.getTime() - a.createdOn.getTime();
  });

  if (loading) {
    return (<div>Loading...</div>);
  }

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/" className="flex items-center text-primary hover:underline">
          <Home className="h-4 w-4 mr-1" />
          Home
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-8">All Categories</h1>
      <p className="text-muted-foreground mb-8">
        Everything in reverse chronological order.
      </p>

      <div className="space-y-6">
        {/*Filter out the gaps where the category doesn't exist*/}
        {sortedCategories.filter(function(x) { return x; } ).map((category) => (
          <div
            key={category.id}
            className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(getCategoryUrl(category.id))}
          >
            <div className="flex flex-row">
              <div className="w-1/3">
                <div className="aspect-video md:h-full relative">
                  <img
                    src={category.defaultPhoto ? getS3ImageUrl(category.defaultPhoto, 750) : "/placeholder.svg"}
                    alt={category.description}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <div className="p-4 w-5/6">
                <div className="flex flex-row gap-2 mb-2">
                  <h2 className="text-xl">
                    {category.parentCategory && (
                      outputPath(category.parentCategory) + ": "
                    )}

                    <span className="font-semibold" >{category.description}</span>
                  </h2>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Added {category.createdOn.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && <p className="text-muted-foreground">No categories found.</p>}
    </main>
  )
}