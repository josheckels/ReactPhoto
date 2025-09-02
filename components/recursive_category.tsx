import React from 'react';
import { Link } from 'react-router-dom';
import {Category} from "@/utils/Types";
import {getCategoryUrl} from "@/utils/urlHelpers";

type CategoryProps = {
  category: Category; // The category object to render
};

const CategoryBreadcrumb: React.FC<CategoryProps> = ({ category }) => {
    if (!category) return (<></>); // Handle the case where the category is undefined
  return (
      <>
          {category.parentCategory && (
              <>
                <CategoryBreadcrumb category={category.parentCategory}/>
                <span className="text-muted-foreground">/</span>
              </>
          )}
        <Link to={getCategoryUrl(category.id)} className="text-primary hover:underline">
          {category.description}
        </Link>
      </>
  );
};

export default CategoryBreadcrumb;