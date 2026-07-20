import React, { Suspense, useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ChevronLeft, ChevronRight, Home, Undo, Tag, Download, Loader2, MoreHorizontal } from "lucide-react"
import { useCategories } from "@/src/context/CategoryProvider";

import { Button } from "@/components/button"
import { PhotoMetadataPopup, PhotoMetadataDetails } from "@/components/photo-metadata-popup"
import {apiFetch, getS3ImageUrl, getPhotoUrl, getCategoryUrl, getOriginalS3ImageUrl} from "@/utils/urlHelpers";
import { Photo } from "@/utils/Types";
import CategoryBreadcrumb from "@/components/recursive_category";
import { usePageTitle } from "@/hooks/use-page-title";

// How long a navigation may take before we surface a "working" indicator. Fast
// (cached/preloaded) navigations resolve well under this, so no spinner flashes.
const NAV_SPINNER_DELAY_MS = 250

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
  usePageTitle(currentPhoto ? (currentPhoto.caption || '[Uncaptioned]') : "Photo Detail");

  // Simple swipe state
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  // Chrome (controls) visibility. The caption stays visible at all times; every
  // other control fades in on interaction and auto-hides after a short delay so
  // the photo can be viewed unobstructed. Toggling only opacity keeps the layout
  // stable (no reflow) when controls show/hide.
  const [showChrome, setShowChrome] = useState(false)
  const hideTimerRef = useRef<number | null>(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => setShowChrome(false), 3000)
  }, [clearHideTimer])

  const revealChrome = useCallback(() => {
    setShowChrome(true)
    scheduleHide()
  }, [scheduleHide])

  const toggleChrome = useCallback(() => {
    setShowChrome((prev) => {
      if (prev) {
        clearHideTimer()
        return false
      }
      scheduleHide()
      return true
    })
  }, [scheduleHide, clearHideTimer])

  // Clear any pending hide timer on unmount
  useEffect(() => clearHideTimer, [clearHideTimer])

  // Track whether the currently-selected photo's image has finished rendering.
  // Reset when we start loading a new photo (see the fetch effect below).
  const [imgLoaded, setImgLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Mobile: metadata/categories/download collapse into a single options menu.
  const [showInfoMenu, setShowInfoMenu] = useState(false)
  // Close the menu when navigating to another photo or when the chrome hides.
  useEffect(() => { setShowInfoMenu(false) }, [currentPhoto])
  useEffect(() => { if (!showChrome) setShowInfoMenu(false) }, [showChrome])

  // Distinguish touch devices (phones/tablets) from mouse-driven desktops by
  // input capability rather than viewport width — a phone in landscape is wide
  // enough to trip width breakpoints, so `md:` would wrongly treat it as desktop.
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setIsTouch(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Delayed "working" indicator: shown only if the replacement photo hasn't
  // rendered within NAV_SPINNER_DELAY_MS. "Not rendered" covers both the data
  // fetch and the image download, so slow navigations get feedback while the
  // previous photo stays on screen; fast ones show nothing.
  const [showNavSpinner, setShowNavSpinner] = useState(false)
  const navSpinnerTimerRef = useRef<number | null>(null)
  const isReplacing = loading || !imgLoaded

  useEffect(() => {
    // Only relevant once a photo is already on screen (i.e. navigating). Initial
    // load is handled by the full-screen loading state.
    if (isReplacing && currentPhoto) {
      navSpinnerTimerRef.current = window.setTimeout(
        () => setShowNavSpinner(true),
        NAV_SPINNER_DELAY_MS,
      )
    } else {
      setShowNavSpinner(false)
    }
    return () => {
      if (navSpinnerTimerRef.current !== null) {
        window.clearTimeout(navSpinnerTimerRef.current)
        navSpinnerTimerRef.current = null
      }
    }
  }, [isReplacing, currentPhoto])

  // Cached images (e.g. reloading the same URL, or a preloaded neighbor) can
  // finish loading before React attaches onLoad, so that event never fires.
  // Detect an already-complete image after each render to clear the indicator.
  useEffect(() => {
    if (imgRef.current?.complete) {
      setImgLoaded(true)
    }
  }, [currentPhoto])

  useEffect(() => {
    const fetchData = async () => {
      if (!photoId) {
        setError("No photo ID provided")
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setImgLoaded(false)

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

        // Surrounding photos for prev/next navigation only exist when we arrived from a category.
        // When viewing a photo without a category context (e.g. /photo/:photoId from the filter
        // results), skip the category fetch and simply show the single photo with no arrows.
        let categoryPhotos: Photo[] = [];
        if (categoryId) {
          // Only try to access the category if it exists in the categories array
          // This prevents errors during client-side navigation when categories might not be loaded yet
          let category = categories && categories[categoryId] ? categories[categoryId] : null;

          if (!category || !category.photos) {
            // Fetch all photos for the category
            const categoryResponse = await apiFetch(`/category/${categoryId}`)
            if (!categoryResponse.ok) {
              throw new Error("Failed to fetch photos")
            }
            category = await categoryResponse.json()
          }
          categoryPhotos = category?.photos || [];
        }
        setCategoryPhotos(categoryPhotos)

        // Check if first or last photo in category (an empty set hides both arrows)
        const currentIndex = categoryPhotos.findIndex((p: any) => p.id === Number(photoId))
        setIsFirstPhoto(currentIndex <= 0)
        setIsLastPhoto(currentIndex === -1 || currentIndex === categoryPhotos.length - 1)
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
        revealChrome();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        revealChrome();
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, error, currentPhoto, revealChrome]);

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

  const handleDownload = useCallback(async () => {
    if (!currentPhoto) return
    try {
      const url = getOriginalS3ImageUrl(currentPhoto);
      // Fetch as a Blob so we can force a browser download
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) {
        throw new Error(`Failed to download (${res.status})`);
      }
      const blob = await res.blob();

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
  }, [currentPhoto])

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
    // Taps (movement below the swipe threshold) are left to the click handler,
    // which the browser fires as a synthetic click after the touch. That handler
    // decides between the navigation zones and toggling the chrome.

    setTouchStartX(null)
  }

  // Click/tap zones over the viewing area: left 25% -> previous, right 25% -> next,
  // middle 50% -> toggle the chrome. Navigation zones intentionally do NOT reveal
  // the chrome, so you can cruise through a category with minimal distraction.
  // Works for mouse clicks and for touch taps (delivered as a synthetic click).
  const handleAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width

    if (fraction < 0.25) {
      if (!isFirstPhoto) handlePrevious()
    } else if (fraction > 0.75) {
      if (!isLastPhoto) handleNext()
    } else {
      toggleChrome()
    }
  }

  // Only take over the whole screen on the very first load. During navigation we
  // keep the previous photo visible and rely on the delayed spinner for feedback.
  if (loading && !currentPhoto) {
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

  // Faded-out controls become non-interactive so taps fall through to the toggle
  const chromeVisibility = showChrome ? "opacity-100" : "opacity-0 pointer-events-none"

  // Shared styling for the desktop-only hover tooltips on the overlay controls.
  // Positioning is appended per-control; touch devices don't hover, and `md:`
  // keeps these out of small screens entirely.
  const tooltipClass =
    "hidden md:block absolute whitespace-nowrap rounded bg-black/80 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
  // Keycap styling so an arrow-key hint clearly reads as a keyboard key
  const kbdClass =
    "ml-1 inline-flex items-center justify-center min-w-[1.25rem] rounded border border-white/50 bg-white/20 px-1 py-0.5 text-[11px] font-sans leading-none"

  return (
    // The viewer is fixed and fills the dynamic (visible) viewport, so it always
    // covers the screen and never scrolls away. The invisible buffer after it
    // makes the *document* scrollable, so a downward swipe collapses Safari's
    // toolbar while the viewer stays glued in place and grows to fill as the
    // toolbar retracts.
    <>
    <div
      className="fixed inset-x-0 top-0 h-[100dvh] bg-white z-50 flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Main content area with swipe functionality - now takes up most of the screen */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0"
        onClick={handleAreaClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerMove={(e) => { if (e.pointerType === 'mouse') revealChrome() }}
      >
        {/* Navigation buttons in corners as overlays */}
        <div className={`group absolute top-4 left-4 z-10 transition-opacity duration-300 ${chromeVisibility}`}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to category"
            onClick={(e) => { e.stopPropagation(); handleClose() }}
            onTouchEnd={(e) => e.stopPropagation()}
            className="rounded-full bg-black/40 backdrop-blur-sm text-white ring-1 ring-white/40 shadow-lg hover:bg-black/70 hover:text-white"
          >
            <Undo className="h-5 w-5"/>
          </Button>
          <span className={`${tooltipClass} top-full mt-2 left-0`}>Back to category</span>
        </div>

        <div className={`group absolute top-4 right-4 z-10 transition-opacity duration-300 ${chromeVisibility}`}>
          <Link
            to="/"
            aria-label="Home"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="flex items-center transition-colors p-2 rounded-full bg-black/40 backdrop-blur-sm text-white ring-1 ring-white/40 shadow-lg hover:bg-black/70"
          >
            <Home className="h-5 w-5" />
          </Link>
          <span className={`${tooltipClass} top-full mt-2 right-0`}>Home</span>
        </div>

        <div className="relative w-full h-full flex items-center justify-center">
          <img
            ref={imgRef}
            src={getS3ImageUrl(currentPhoto, 1500) || "/placeholder.svg"}
            alt={currentPhoto.caption}
            className="object-contain w-full h-full"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
          />
        </div>

        {/* Delayed "working" indicator; only appears if a navigation is slow to
            render, overlaying the still-visible previous photo. */}
        {showNavSpinner && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="rounded-full bg-black/50 backdrop-blur-sm p-3 shadow-lg">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          </div>
        )}

        {/* Side navigation buttons - only shown when needed */}
        {!isFirstPhoto && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous photo (left arrow key)"
            className={`group absolute left-4 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white ring-1 ring-white/40 shadow-lg hover:bg-black/70 hover:text-white transition-opacity duration-300 ${chromeVisibility}`}
            onClick={(e) => { e.stopPropagation(); handlePrevious() }}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <ChevronLeft className="h-12 w-12" />
            {/* Desktop-only hover hint that the left arrow key also navigates */}
            <span className={`${tooltipClass} left-full ml-2 top-1/2 -translate-y-1/2`}>
              Previous photo, or press<kbd className={kbdClass}>←</kbd>
            </span>
          </Button>
        )}

        {!isLastPhoto && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next photo (right arrow key)"
            className={`group absolute right-4 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white ring-1 ring-white/40 shadow-lg hover:bg-black/70 hover:text-white transition-opacity duration-300 ${chromeVisibility}`}
            onClick={(e) => { e.stopPropagation(); handleNext() }}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <ChevronRight className="h-12 w-12" />
            {/* Desktop-only hover hint that the right arrow key also navigates */}
            <span className={`${tooltipClass} right-full mr-2 top-1/2 -translate-y-1/2`}>
              Next photo, or press<kbd className={kbdClass}>→</kbd>
            </span>
          </Button>
        )}
      </div>

      {/* Footer: a normal row on desktop; on touch devices it overlays the
          bottom of the photo with a gradient scrim so the caption stays
          readable. Keyed off input type, not width, so landscape phones still
          get the overlay. */}
      <div
        className={
          isTouch
            ? "absolute inset-x-0 bottom-0 z-10 pt-10 text-white bg-gradient-to-t from-black/70 via-black/30 to-transparent"
            : "w-full text-black bg-white"
        }
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className={`flex items-center justify-between gap-3 px-4 w-full ${isTouch ? 'py-2' : 'py-1'}`}>
            {/* Caption - always visible */}
            <p className={`text-sm font-medium flex-grow break-words ${isTouch ? '[text-shadow:0_1px_3px_rgba(0,0,0,0.7)]' : ''}`}>{currentPhoto.caption}</p>

            {/* Desktop: metadata / categories / download inline with hover popups */}
            <div className={`${isTouch ? 'hidden' : 'flex'} items-center gap-4 transition-opacity duration-300 ${chromeVisibility}`}>
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
                onClick={handleDownload}
              >
                <Download className="h-5 w-5"/>
                <span className="text-sm">Download</span>
              </Button>
            </div>

            {/* Mobile: collapse everything into a single options menu (bottom-right) */}
            <div className={`${isTouch ? '' : 'hidden'} relative shrink-0 transition-opacity duration-300 ${chromeVisibility}`}>
              <button
                aria-label="Photo options"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowInfoMenu((v) => {
                    const next = !v
                    // Keep the chrome up while the menu is open
                    if (next) clearHideTimer(); else scheduleHide()
                    return next
                  })
                }}
                className="flex items-center justify-center p-2 -mr-1 rounded-full text-white hover:text-white/80"
              >
                <MoreHorizontal className="h-6 w-6" />
              </button>

              {showInfoMenu && (
                <>
                  {/* Backdrop closes the menu on an outside tap */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => { e.stopPropagation(); setShowInfoMenu(false); scheduleHide() }}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-72 max-h-[60vh] overflow-y-auto rounded-lg bg-white shadow-lg z-50">
                    {currentPhoto.metadata && (
                      <div>
                        <h3 className="font-medium text-gray-900 bg-gray-200 px-4 py-2">Metadata</h3>
                        <div className="p-4">
                          <PhotoMetadataDetails metadata={currentPhoto.metadata} />
                        </div>
                      </div>
                    )}

                    {currentPhoto.categories && currentPhoto.categories.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 bg-gray-200 px-4 py-2">Categories</h3>
                        <div className="space-y-2 p-4">
                          {sortRecursively(currentPhoto.categories).map((categoryId: number) => (
                            <div key={categoryId} className="flex items-center flex-wrap gap-1">
                              {categories && categories[categoryId] && (
                                <CategoryBreadcrumb category={categories[categoryId]} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); setShowInfoMenu(false); handleDownload() }}
                      className="flex w-full items-center gap-2 border-t px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
                    >
                      <Download className="h-5 w-5" />
                      <span className="text-sm">Download</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Invisible scroll buffer sitting behind the fixed viewer. It exists only
        to make the document tall enough to scroll, which is what collapses
        Safari's toolbar; the viewer always covers it, so it's never seen. Only
        applied on touch devices (coarse pointer) so desktops get no stray
        scrollbar. */}
    <div aria-hidden className="h-0 [@media(pointer:coarse)]:h-[150vh]" />
    </>
  )
}

export default function PhotoPage() {
  return (
    <Suspense>
      <PhotoDetailInner/>
    </Suspense>
  )
}