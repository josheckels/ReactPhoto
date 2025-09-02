export interface Photo {
  id: number;
  caption: string;
  height: number;
  width: number;
  resolutions: {
    filename: string;
    height: number;
    width: number;
  }[];
  categories: number[];
  metadata: PhotoMetadata;
}

export interface PhotoMetadata {
  iso: string
  aperture: string
  exposureTime: number
  cameraModel: string
  lensModel: string
  focalLength: number
  photographer: string
  license: string
}

export interface Category {
  id: number;
  description: string;
  parentCategory: Category;
  parentCategoryId? : number;
  createdOn: Date,
  subcategories?: Category[];
  defaultPhoto?: Photo;
  photos?: Photo[];
}