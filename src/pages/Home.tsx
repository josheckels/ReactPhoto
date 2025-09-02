import { useCategories } from "@/src/context/CategoryProvider";
import { Link } from "react-router-dom";
import { Button } from "@/components/button";
import { ListFilter } from "lucide-react";
import { CategoryGrid } from "@/components/category-grid";
import { usePageTitle } from "@/hooks/use-page-title";

const HomePage = () => {
  const { rootCategories, loading, error, newestCategories } = useCategories();

  const intro = function() {
      return (
          <div>
              <h1 className="text-3xl font-bold">Josh Eckels</h1>
              <br/>
              <div>
                  Howdy and welcome to my personal web site, which exists primarily to share my photos.
                  I live in San Diego and work at <a href="https://labkey.com">LabKey</a>.
                  You can reach me at <a href="mailto:josh@jeckels.com">josh@jeckels.com</a>
              </div>
              <br/>
              <br/>
          </div>
      )
  }

  // Set the page title
  usePageTitle("Photos");

  if (loading || error) {
    return (
      <div className="container mx-auto py-10 px-4">
          {intro()}
        <div className="flex justify-center items-center min-h-[300px]">
            {loading && <div className="animate-pulse text-lg">Loading...</div>}
            {error && <div className="text-red-500">{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
        {intro()}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Newest Photo Categories</h1>
          <a href="/categoryRSS">
              <Button variant="outline" className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4" />
                  RSS Feed
              </Button>
          </a>
      </div>
      <CategoryGrid categories={newestCategories} />
        <br/>
        <br/>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">All Photo Categories</h1>
        <Link to="/categoryList">
          <Button variant="outline" className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            Browse all Categories
          </Button>
        </Link>
      </div>
      <CategoryGrid categories={rootCategories} />
    </div>
  )
};

export default HomePage;