import { useEffect, useState, Suspense } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Home, X } from "lucide-react"
import { apiFetch } from "@/utils/urlHelpers";
import { PhotoGrid } from "@/components/photo-grid";
import { useCategories } from "@/src/context/CategoryProvider";
import { Photo } from "@/utils/Types";
import { usePageTitle } from "@/hooks/use-page-title";

function FilterResultsInner() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories } = useCategories()

  const selectedIds = (searchParams.get("cats") || "")
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))

  // Stable dependency for the effect (arrays are re-created every render)
  const selectedKey = selectedIds.join(",")

  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  usePageTitle("Filtered Photos")

  useEffect(() => {
    if (selectedKey.length === 0) {
      setPhotos([])
      return
    }

    setLoadingPhotos(true)
    setPhotos(null)
    setError(null)

    const ac = new AbortController()
    ;(async () => {
      try {
        const response = await apiFetch(`/photos?categories=${selectedKey}`, { signal: ac.signal as any })
        if (!response.ok) {
          throw new Error("Failed to fetch photos")
        }
        const data = await response.json()
        setPhotos(data ?? [])
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error(err)
          setError("Error loading photos. Please try again later.")
        }
      } finally {
        setLoadingPhotos(false)
      }
    })()

    return () => ac.abort()
  }, [selectedKey])

  function removeCategory(id: number) {
    const remaining = selectedIds.filter((c) => c !== id)
    if (remaining.length === 0) {
      setSearchParams({})
    } else {
      setSearchParams({ cats: remaining.join(",") })
    }
  }

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link to="/" className="flex items-center text-primary hover:underline">
          <Home className="h-4 w-4 mr-1" />
          Home
        </Link>
        / <Link to="/categoryList" className="text-primary hover:underline">All Categories</Link>
        / <div className="font-bold">Filtered photos</div>
      </div>

      <h1 className="text-3xl font-bold mb-2">Photos in all selected categories</h1>
      <p className="text-muted-foreground mb-6">
        Showing only photos that appear in every selected category (or one of its subcategories).
      </p>

      {/* Selected category chips */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {selectedIds.map((id) => (
          <span key={id} className="inline-flex items-center gap-2 bg-gray-100 border rounded-full px-3 py-1 text-sm">
            {categories && categories[id] ? categories[id].description : `Category ${id}`}
            <button
              type="button"
              aria-label="Remove category from filter"
              className="text-gray-500 hover:text-red-600"
              onClick={() => removeCategory(id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <Link to="/categoryList" className="text-primary hover:underline text-sm px-2 py-1">
          + Adjust selection
        </Link>
      </div>

      {selectedIds.length === 0 && (
        <p className="text-muted-foreground">
          No categories selected.{" "}
          <Link to="/categoryList" className="text-primary hover:underline">Choose categories</Link>{" "}
          to filter.
        </p>
      )}

      {error && <div className="text-red-500">{error}</div>}

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

      {!loadingPhotos && photos && photos.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </h2>
          <PhotoGrid photos={photos} />
        </>
      )}

      {!loadingPhotos && photos && photos.length === 0 && selectedIds.length > 0 && (
        <p className="text-muted-foreground">No photos appear in all of the selected categories.</p>
      )}
    </main>
  )
}

export default function FilterResultsPage() {
  return (
    <Suspense>
      <FilterResultsInner />
    </Suspense>
  )
}
