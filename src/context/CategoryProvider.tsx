import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "@/utils/urlHelpers";
import { Category } from "@/utils/Types";

interface CategoryContextValue {
  categories: Category[];
  rootCategories: Category[];
  newestCategories: Category[];
  loading: boolean;
  error: string | null;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [newestCategories, setNewestCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Use a ref to track if we've already started fetching
  const fetchStartedRef = React.useRef(false);

  useEffect(() => {
    // Prevent duplicate fetches caused by StrictMode double-rendering
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    
    const fetchCategories = async () => {
      try {
        const response = await apiFetch("/categories");
        if (!response.ok) throw new Error("Failed to fetch categories");
        const data : Category[] = await response.json()
        const prepped : Category[] = [];
        const rootCategories : Category[] = [];
        const newestCategories : Category[] = [];

        Object.values(data).forEach((category: Category) => {
          prepped[category.id] = category;
          category.createdOn = new Date(category.createdOn);
          category.subcategories = [];
          if (!category.parentCategoryId) {
            rootCategories.push(category);
          }
        });

        Object.values(data).forEach((category : Category) => {
          if (category.parentCategoryId) {
            const parent : Category = prepped[category.parentCategoryId];
            if (parent) {
              parent.subcategories?.push(category);
              category.parentCategory = parent;
            }
          }
        });

        rootCategories.sort((a, b) => a.description.localeCompare(b.description));
        const newestCats = Object.values(prepped)
            .sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime())
            .slice(0, 8);

        setCategories(prepped)
        setRootCategories(rootCategories)
        setNewestCategories(newestCats)

      } catch (err) {
        setError("Error loading categories. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
      <CategoryContext.Provider value={{rootCategories, categories, newestCategories, loading, error}}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) throw new Error("useCategories must be used within a CategoryProvider");
  return context;
};