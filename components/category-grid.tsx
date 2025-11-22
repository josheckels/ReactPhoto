"use client"

import { useNavigate } from "react-router-dom"
import {getCategoryUrl, getS3ImageUrl} from "@/utils/urlHelpers";
import {Category} from "@/utils/Types";
// Helper function to find any category by ID (top-level or subcategory)
// Get photos for a specific category
export function CategoryGrid({ categories }: { categories: Category[] }) {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {categories.map((category : Category) => (
        <div
          key={category.id}
          className="border rounded-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer grayMatte"
          onClick={() => navigate(getCategoryUrl(category.id))}
        >
          <div className="flex flex-col justify-between h-full">
            {/* Fixed aspect ratio container */}
            <div className="relative w-full pt-[75%] overflow-hidden p-2">
              {/* Image positioned absolutely within the container */}
              <img
                src={category.defaultPhoto ? getS3ImageUrl(category.defaultPhoto, 750) : "/placeholder.svg"}
                alt={category.description}
                className="photoBorder object-contain absolute inset-0 m-auto w-full h-full"
              />
            </div>
            {/* Fixed height caption container */}
            <div className="p-2 h-[3rem] overflow-hidden font-bold caption">{category.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
