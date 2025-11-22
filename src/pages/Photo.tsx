import React, { Suspense, useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ChevronLeft, ChevronRight, Home, Undo, Tag, Download } from "lucide-react"
import { useCategories } from "@/src/context/CategoryProvider";

import { Button } from "@/components/button"
import { PhotoMetadataPopup } from "@/components/photo-metadata-popup"
import {apiFetch, getS3ImageUrl, getPhotoUrl, getCategoryUrl, getOriginalS3ImageUrl} from "@/utils/urlHelpers";
import { Photo } from "@/utils/Types";
import CategoryBreadcrumb from "@/components/recursive_category";
import { usePageTitle } from "@/hooks/use-page-title";

function PhotoDetailInner() {
  const navigate = useNavigate();
  const params = useParams();

  const { categories } = useCategories();

  // Get parameters from path params
  // Handle both URL patterns: /category/:categoryId/:photoId and /photo/:photoId
  const photoId = params.photoId
    ? Number.parseInt(params.photoId, 10)
    : null

  const categoryId = params.categoryId
    ? Number.parseInt(params.categoryId, 10)
    : null

  const [categoryPhotos, setCategoryPhotos] = useState<Photo[]>([])

  const [currentPhoto, setCurrentPhoto] = useState<Photo | undefined>()
  const [isFirstPhoto, setIsFirstPhoto] = useState<boolean>(false)
  const [isLastPhoto, setIsLastPhoto] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Set the page title based on photo caption when available
  usePageTitle(currentPhoto ? currentPhoto.caption : "Photo Detail");

  // Simple swipe state
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!photoId) {
        setError("No photo ID provided")
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)

        // Fetch the current photo
        const photoResponse = await apiFetch(`/photo/${photoId}`, undefined)
        if (!photoResponse.ok) {
          if (photoResponse.status === 404) {
            throw new Error("Photo not found")
          }
          throw new Error("Failed to fetch photo")
        }
        const photoData = await photoResponse.json()
        setCurrentPhoto(photoData)

        // Only try to access the category if it exists in the categories array
        // This prevents errors during client-side navigation when categories might not be loaded yet
        let category = categoryId && categories && categories[categoryId] ? categories[categoryId] : null;

        if (!category || !category.photos) {
          // Fetch all photos for the category
          const categoryResponse = await apiFetch(`/category/${categoryId}`)
          if (!categoryResponse.ok) {
            throw new Error("Failed to fetch photos")
          }
          category = await categoryResponse.json()
        }
        const categoryPhotos = category?.photos || [];
        setCategoryPhotos(categoryPhotos)

        // Check if first or last photo in category
        const currentIndex = categoryPhotos.findIndex((p: any) => p.id === Number(photoId))
        setIsFirstPhoto(currentIndex === 0)
        setIsLastPhoto(currentIndex === categoryPhotos.length - 1)
      } catch (err) {
        setError("Error loading photo. Please try again later.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [photoId, categoryId, categories])
  
  // Separate useEffect for keyboard event listeners to ensure they have access to the latest state
  useEffect(() => {
    // Only set up keyboard navigation when data is loaded and not in error state
    if (loading || error || !currentPhoto) {
      return;
    }
    
    // Define handleKeyDown inside the useEffect to ensure it has access to the latest state
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        handlePrevious();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, error, currentPhoto]);

  const handlePrevious = useCallback(() => {
    if (isFirstPhoto) return

    const currentIndex = categoryPhotos.findIndex((p) => p.id === Number(photoId))
    if (currentIndex > 0) {
      const prevPhoto = categoryPhotos[currentIndex - 1]
      navigate(getPhotoUrl(prevPhoto.id, categoryId))
    }
  }, [isFirstPhoto, categoryPhotos, photoId, categoryId, navigate])

  const handleNext = useCallback(() => {
    if (isLastPhoto) return

    const currentIndex = categoryPhotos.findIndex((p) => p.id === Number(photoId))
    if (currentIndex < categoryPhotos.length - 1) {
      const nextPhoto = categoryPhotos[currentIndex + 1]
      navigate(getPhotoUrl(nextPhoto.id, categoryId))
    }
  }, [isLastPhoto, categoryPhotos, photoId, categoryId, navigate])

  const handleClose = () => {
    if (categoryId) {
      navigate(getCategoryUrl(categoryId))
    } else {
      navigate("/")
    }
  }

  // Simple swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return

    const touchEndX = e.changedTouches[0].clientX
    const diff = touchEndX - touchStartX

    // Minimum swipe distance (adjust as needed)
    const minSwipeDistance = 50

    if (diff > minSwipeDistance && !isFirstPhoto) {
      // Swiped right -> go to previous photo
      handlePrevious()
    } else if (diff < -minSwipeDistance && !isLastPhoto) {
      // Swiped left -> go to next photo
      handleNext()
    }

    setTouchStartX(null)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white/95 z-50 flex items-center justify-center">
        <div className="animate-pulse text-black text-lg">Loading photo...</div>
      </div>
    )
  }

  if (error || !currentPhoto) {
    return (
      <div className="fixed inset-0 bg-white/95 z-50 flex flex-col items-center justify-center">
        <div className="text-red-400 mb-4">{error || "Photo not found"}</div>
        <Button variant="outline" onClick={() => navigate("/")} className="text-black border-black">
          Return to Home
        </Button>
      </div>
    )
  }

  function sortRecursively(categoryIds: number[]) {
    if (!categoryIds || categoryIds.length === 0) return categoryIds;

    // Helper function to get the full path of a category from root to leaf
    function getCategoryPath(categoryId: number): string[] {
      const category = categories[categoryId];
      if (!category) return [];
      
      // If no parent, this is a root category
      if (!category.parentCategory) {
        return [category.description || ''];
      }
      
      // Otherwise, recursively get parent's path and append this category
      const parentId = category.parentCategory?.id || category.parentCategoryId || 0;
      const parentPath = getCategoryPath(parentId);
      return [...parentPath, category.description || ''];
    }

    // Sort by comparing category paths level by level
    return categoryIds.sort((aId, bId) => {
      const categoryA = categories[aId];
      const categoryB = categories[bId];
      
      if (!categoryA || !categoryB) return 0;
      
      const pathA = getCategoryPath(aId);
      const pathB = getCategoryPath(bId);
      
      // Compare paths level by level
      const minLength = Math.min(pathA.length, pathB.length);
      
      for (let i = 0; i < minLength; i++) {
        const comparison = pathA[i].localeCompare(pathB[i]);
        if (comparison !== 0) {
          return comparison;
        }
      }
      
      // If one path is a prefix of the other, shorter path comes first
      return pathA.length - pathB.length;
    });
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Main content area with swipe functionality - now takes up most of the screen */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation buttons in corners as overlays */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-full hover:bg-black/60 text-black/20 border"
          >
            <Undo className="h-5 w-5"/>
          </Button>
        </div>

        <div className="absolute top-4 right-4 z-10">
          <Link
            to="/"
            className="flex items-center transition-colors p-2 rounded-full hover:bg-black/60 text-black/20 border"
          >
            <Home className="h-5 w-5" />
          </Link>
        </div>

        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={getS3ImageUrl(currentPhoto, 1500) || "/placeholder.svg"}
            alt={currentPhoto.caption}
            className="object-contain max-h-[calc(100vh-100px)]"
            draggable={false}
          />
        </div>

        {/* Side navigation buttons - only shown when needed */}
        {!isFirstPhoto && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 p-3 hover:bg-black/60 rounded-full text-black/20 border"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-12 w-12" />
          </Button>
        )}

        {!isLastPhoto && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 p-3 hover:bg-black/60 rounded-full text-black/20 border"
            onClick={handleNext}
          >
            <ChevronRight className="h-12 w-12" />
          </Button>
        )}
      </div>

      {/* Compact footer */}
      <div className="w-full grayMatte text-black border-t border-black">
        <div className="max-w-6xl mx-auto align-middle">
          <div className="flex items-start justify-between gap-4 w-full">
            {/* Caption - smaller font */}
            <p className="text-sm font-medium flex-grow my-2">{currentPhoto.caption}</p>

            {/* Right side with metadata and categories */}
            <div className="flex items-center gap-4">
              {/* Metadata tooltip */}
              {currentPhoto.metadata && <PhotoMetadataPopup metadata={currentPhoto.metadata} />}

              {/* Categories tooltip with icon */}
              {currentPhoto.categories && currentPhoto.categories.length > 0 && (
                <div className="relative group">
                  <button className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors">
                    <Tag className="h-5 w-5" />
                    <span className="text-sm">Categories</span>
                  </button>

                  <div className="absolute bottom-full right-0 mb-0 w-[500px] bg-white rounded-lg shadow-lg overflow-hidden z-10 hidden group-hover:block">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                      <h3 className="font-medium text-gray-900 bg-gray-200 px-4 py-3 mb-0">Categories</h3>
                      <div className="space-y-2 p-4">
                        {sortRecursively(currentPhoto.categories).map((categoryId: number) => (
                          <div key={categoryId} className="flex flex-col">
                            <div className="flex items-center flex-wrap gap-1">
                              {categories && categories[categoryId] && (
                                <CategoryBreadcrumb category={categories[categoryId]} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Download button */}
              <Button
                variant="ghost"
                className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors p-0"
                onClick={async () => {
                  try {
                    const url = getOriginalS3ImageUrl(currentPhoto);
                    // Fetch as a Blob so we can force a browser download
                    const res = await fetch(url, { credentials: 'omit' });
                    if (!res.ok) {
                      throw new Error(`Failed to download (${res.status})`);
                    }
                    const blob = await res.blob();

                    // Derive a reasonable filename from the URL
                    const urlObj = new URL(url);

                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = currentPhoto.filename; // `download` attribute triggers save dialog
                    document.body.appendChild(a);
                    a.click();
                    // Cleanup
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
                  } catch (e) {
                    console.error('Download failed:', e);
                    // Optional: surface a lightweight alert; replace with toast if available
                    alert('Sorry, the download failed. Please try again.');
                  }
                }}
              >
                <Download className="h-5 w-5"/>
                <span className="text-sm">Download</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PhotoPage() {
  return (
    <Suspense>
      <PhotoDetailInner/>
    </Suspense>
  )
}