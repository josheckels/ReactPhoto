"use client"

import { useNavigate } from "react-router-dom"
import {getS3ImageUrl, getPhotoUrl} from "@/utils/urlHelpers";
import {Photo} from "@/utils/Types";
import React from "react";


export function PhotoGrid({ photos, categoryId }: { photos: Photo[]; categoryId: number }) {
  const navigate = useNavigate()

  return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {photos?.map((photo: Photo) => (
            <div
                key={photo.id}
                className="border rounded-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer grayMatte"
                onClick={() => navigate(getPhotoUrl(photo.id, categoryId))}
            >
              <div className="flex flex-col justify-between h-full">
                {/* Fixed aspect ratio container */}
                <div className="relative w-full pt-[75%] overflow-hidden p-2">
                  {/* Image positioned absolutely within the container */}
                  <img
                      src={getS3ImageUrl(photo, 750)}
                      alt={photo.caption || "Uncaptioned photo"}
                      className="photoBorder object-contain absolute inset-0 m-auto w-full h-full"
                  />
                </div>
                <div className="p-2 h-[3rem] overflow-hidden caption">{photo.caption}</div>
              </div>
            </div>
        ))}
      </div>
  )
}
