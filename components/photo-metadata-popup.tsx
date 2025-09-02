"use client"

import { Camera } from "lucide-react"
import {PhotoMetadata} from "@/utils/Types";
import React from "react";

interface PhotoMetadataPopupProps {
  metadata: PhotoMetadata
}

export function PhotoMetadataPopup({ metadata }: PhotoMetadataPopupProps) {

    const formatExposureTime = (exposureTime: number): any => {
        if (exposureTime < 1 && exposureTime > 0) {
            return `1/${Math.round(1 / exposureTime)}`;
        }
        return exposureTime;
    };

    return (
    <div className="relative group">
      <button
        className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors"
        aria-label="Show photo metadata"
      >
        <Camera className="h-5 w-5" />
        <span className="text-sm">Metadata</span>
      </button>

      {/* Tooltip that appears on hover */}
        <div className="absolute bottom-full right-0 mb-2 w-96 bg-white rounded-lg shadow-lg overflow-hidden z-10 hidden group-hover:block">
            <h3 className="font-medium text-gray-900 bg-gray-200 px-4 py-3 mb-0">Photo Metadata</h3>

        <div className="p-4">
            <div className="space-y-2 text-sm">
              {metadata.photographer && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-gray-600">Photographer:</span>
                  <span className="font-medium">{metadata.photographer}</span>
                </div>
              )}
              {metadata.cameraModel && (
                  <div className="grid grid-cols-2 gap-1">
                  <span className="text-gray-600">Camera:</span>
                  <span className="font-medium">{metadata.cameraModel}</span>
               </div>
              )}
              {metadata.lensModel && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-gray-600">Lens:</span>
                  <span className="font-medium">{metadata.lensModel}</span>
                </div>
              )}
              {metadata.focalLength && (
                  <div className="grid grid-cols-2 gap-1">
                  <span className="text-gray-600">Focal length:</span>
                  <span className="font-medium">{metadata.focalLength} mm</span>
               </div>
              )}
              {metadata.iso && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-gray-600">ISO:</span>
                  <span className="font-medium">{metadata.iso}</span>
                </div>
              )}
              {metadata.aperture && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-gray-600">Aperture:</span>
                  <span className="font-medium">f{metadata.aperture}</span>
                </div>
                )}
              {metadata.exposureTime && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-gray-600">Exposure time:</span>
                  <span className="font-medium">{formatExposureTime(metadata.exposureTime)} sec</span>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  )
}

