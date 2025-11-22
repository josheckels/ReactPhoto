import { useEffect, useState, Suspense, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Home } from "lucide-react"
import { apiFetch } from "@/utils/urlHelpers";
import { CategoryGrid } from "@/components/category-grid";
import { PhotoGrid } from "@/components/photo-grid";
import { useCategories } from "@/src/context/CategoryProvider";
import CategoryBreadcrumb from "@/components/recursive_category";
import { usePageTitle } from "@/hooks/use-page-title";

function CategoryPageInner() {
  const params = useParams();
  const navigate = useNavigate();
  const [loadingPhotos, setLoadingPhotos] = useState<any>(null)
  const [photos, setPhotos] = useState<any>(null)
  // Use a ref to track if we've already started fetching for this categoryId
  const fetchStartedRef = useRef<Record<number, boolean>>({});
  
  // Get category ID from path params
  const categoryId = params.categoryId
    ? Number.parseInt(params.categoryId, 10)
    : null
    
  const { categories, loading, error } = useCategories();

  let category = null;
  if (categoryId) {
    for (const c of categories) {
      if (c && c.id === categoryId) {
        category = c;
        break;
      }
    }
  }

  if (category && category.subcategories) {
    category.subcategories.sort((a, b) => a.description.localeCompare(b.description));
  }

  // Set the page title based on category description when available
  usePageTitle(category ? category.description : "Category");

  useEffect(() => {
    const fetchCategory = async () => {
      if (!categoryId) {
        return;
      }
      
      // Prevent duplicate fetches caused by StrictMode double-rendering
      if (fetchStartedRef.current[categoryId]) {
        return;
      }
      
      // Mark this categoryId as being fetched
      fetchStartedRef.current[categoryId] = true;
      
      try {
        setLoadingPhotos(true)
        const response = await apiFetch(`/category/${categoryId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Category not found")
          }
          throw new Error("Failed to fetch category")
        }
        const data = await response.json()
        setPhotos(data.photos);
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingPhotos(false)
      }
    }

    fetchCategory()
  }, [categoryId])

  // Always use the photos fetched specifically for this category
  if (category && photos) {
    category.photos = photos;
  }

  if (loading) {
    return (
      <main className="container mx-auto py-10 px-4">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/" className="flex items-center text-primary hover:underline">
            <Home className="h-4 w-4 mr-1" />
            Home
          </Link>
        </div>
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-pulse text-lg">Loading category...</div>
        </div>
      </main>
    )
  }

  if (error || !category) {
    return (
      <Suspense>
        <main className="container mx-auto py-10 px-4">
          <div className="flex items-center gap-2 mb-6">
            <Link to="/" className="flex items-center text-primary hover:underline">
              <Home className="h-4 w-4 mr-1" />
              Home
            </Link>
          </div>
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="text-red-500">{error || (categoryId ? `Category ${categoryId} not found` : "No category ID provided")}</div>
          </div>
        </main>
      </Suspense>
    )
  }

  return (
    <main className="container mx-auto py-10 px-4">
      {/* Navigation breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 sticky top-0 bg-white z-10 py-4 border-b">
        <Link to="/" className="flex items-center text-primary hover:underline">
          <Home className="h-4 w-4 mr-1"/>
          Home
        </Link>
        {category.parentCategory && (<>/</>)}
        <CategoryBreadcrumb category={category.parentCategory}/>
        / <div className="font-bold">{category.description}</div>
      </div>


      {category.subcategories && category.subcategories.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Subcategories</h2>
          <CategoryGrid categories={category.subcategories} />
          <br/>
        </>
      )}

      {/* Photos section */}
      {category.photos && category.photos.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Photos</h2>
          <PhotoGrid category={category} />
        </>
      )}

      {(!category.photos || category.photos.length === 0) &&
        (!category.subcategories || category.subcategories.length === 0) && (
          <p className="text-muted-foreground">Loading...</p>
        )}
    </main>
  )
}

export default function CategoryPage() {
  return (
    <Suspense>
      <CategoryPageInner />
    </Suspense>
  )
}