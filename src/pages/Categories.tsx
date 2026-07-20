import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Home } from "lucide-react"
import { getCategoryUrl, getFilterUrl, getS3ImageUrl } from "@/utils/urlHelpers";
import { useCategories } from "@/src/context/CategoryProvider";
import { Category } from "@/utils/Types";
import { Button } from "@/components/button";
import { usePageTitle } from "@/hooks/use-page-title";

export default function CategoriesPage() {
  const navigate = useNavigate();
  const { categories, loading } = useCategories();

  // Categories the user has ticked for the multi-category (intersection) filter
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Set the page title
  usePageTitle("All Categories");

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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

  const selectionLabel = `${selected.size} ${selected.size === 1 ? "category" : "categories"}`;

  return (
    <main className="container mx-auto py-10 px-4 pb-28">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/" className="flex items-center text-primary hover:underline">
          <Home className="h-4 w-4 mr-1" />
          Home
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-4">All Categories</h1>
      <p className="text-muted-foreground mb-8">
        Everything in reverse chronological order. Tick multiple categories to see the photos that
        appear in all of them (including their subcategories).
      </p>

      <div className="space-y-6">
        {/*Filter out the gaps where the category doesn't exist*/}
        {sortedCategories.filter(function(x) { return x; } ).map((category) => (
          <div
            key={category.id}
            className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${selected.has(category.id) ? "ring-2 ring-primary" : ""}`}
          >
            <div className="flex flex-row">
              {/* Selection checkbox (toggles the category in the multi-select filter) */}
              <div
                className="flex items-center justify-center px-3 cursor-pointer self-stretch"
                onClick={() => toggle(category.id)}
                role="checkbox"
                aria-checked={selected.has(category.id)}
                aria-label={`Select ${category.description}`}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selected.has(category.id)}
                  className="h-5 w-5 cursor-pointer pointer-events-none"
                />
              </div>

              {/* Clicking the rest of the card navigates into the category as before */}
              <div
                className="flex flex-row flex-1 cursor-pointer"
                onClick={() => navigate(getCategoryUrl(category.id))}
              >
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
          </div>
        ))}
      </div>

      {categories.length === 0 && <p className="text-muted-foreground">No categories found.</p>}

      {/* Floating action bar — stays visible while scrolling once at least one category is selected */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20 py-3 px-4">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{selectionLabel} selected</span>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button onClick={() => navigate(getFilterUrl(Array.from(selected)))}>
                View photos in {selectionLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
