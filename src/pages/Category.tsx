import { useEffect, useState, Suspense } from "react"
import { useParams, Link } from "react-router-dom"
import { Home } from "lucide-react"
import { apiFetch } from "@/utils/urlHelpers";
import { CategoryGrid } from "@/components/category-grid";
import { PhotoGrid } from "@/components/photo-grid";
import { useCategories } from "@/src/context/CategoryProvider";
import CategoryBreadcrumb from "@/components/recursive_category";
import { usePageTitle } from "@/hooks/use-page-title";

function CategoryPageInner() {
  const params = useParams();
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false)
  const [photos, setPhotos] = useState<any[] | null>(null)
  
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

  const subcategories = category?.subcategories
    ? [...category.subcategories].sort((a, b) => a.description.localeCompare(b.description))
    : []

  // Set the page title based on category description when available
  usePageTitle(category ? category.description : "Category");

  useEffect(() => {
    if (!categoryId) return;

    // reset state for new category
    setLoadingPhotos(true);
    setPhotos(null);

    const ac = new AbortController();
    (async () => {
      try {
        const response = await apiFetch(`/category/${categoryId}`, { signal: ac.signal as any })
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Category not found")
          }
          throw new Error("Failed to fetch category")
        }
        const data = await response.json()
        setPhotos(data.photos ?? [])
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error(err)
      } finally {
        setLoadingPhotos(false)
      }
    })()

    return () => ac.abort()
  }, [categoryId])

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
    <main key={categoryId ?? 'none'} className="container mx-auto py-10 px-4">
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
      {subcategories && subcategories.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Subcategories</h2>
          <CategoryGrid categories={subcategories} />
          <br/>
        </>
      )}

      {/* Photos section */}
      {photos && photos.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Photos</h2>
          <PhotoGrid photos={photos} categoryId={category.id} />
        </>
      )}

      {loadingPhotos && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="border rounded-sm overflow-hidden grayMatte animate-pulse">
              <div className="relative w-full pt-[75%] bg-gray-200" />
              <div className="p-2 h-[3rem] bg-gray-100" />
            </div>
          ))}
        </div>
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