import {Photo} from "@/utils/Types";

const BASE_API_URL = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}${(window.location.port === '8080' || window.location.port === '3000') ? ':8080' :''}/api`
    : "http://localhost:8080/api"

const RESIZED_BASE_URL = "https://s3-us-west-2.amazonaws.com/resized.jeckels.com/";
const FULL_SIZE_BASE_URL = "https://s3-us-west-2.amazonaws.com/photo.jeckels.com/";
const RESIZED_REGEX = /\d+-\d+x\d+.*/;

/**
 * Navigation helper functions for static export compatibility
 * These functions generate URLs with GET parameters instead of path parameters
 */

/**
 * Generate a URL for a photo page
 * @param photoId - The ID of the photo
 * @param categoryId - Category ID for context
 * @returns - URL string with path parameters
 */
export function getPhotoUrl(photoId: number, categoryId?: number | null): string {
  return `/category/${categoryId}/${photoId}`;
}

/**
 * Generate a URL for a category page
 * @param categoryId - The ID of the category
 * @returns - URL string with path parameters
 */
export function getCategoryUrl(categoryId: number | string): string {
  return `/category/${categoryId}`;
}

/**
 * A helper function to make API requests by adding a URL prefix automatically
 * and optionally accepting the fetch options.
 * @param endpoint - The specific API endpoint (e.g., `/category/123`)
 * @param options - Optional fetch configuration options
 * @returns - Promise resolving to a Response object
 */
export function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${BASE_API_URL}${endpoint}`;
  return fetch(url, {
    ...options,
    credentials: 'include'
  });
}

export function getS3ImageUrl(photo: Photo, maxDimension: number): string {

  let bestResolution = photo.resolutions[0];
  for (const resolution of photo.resolutions) {
    if (resolution.width <= maxDimension && resolution.height <= maxDimension) {
      bestResolution = resolution;
    }
  }

  if (RESIZED_REGEX.test(bestResolution.filename)) {
    return `${RESIZED_BASE_URL}${bestResolution.filename}`;
  }
  return `${FULL_SIZE_BASE_URL}${bestResolution.filename}`;
}


