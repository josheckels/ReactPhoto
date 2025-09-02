import { Routes, Route } from 'react-router-dom'
import { CategoryProvider } from '@/src/context/CategoryProvider'

// Import pages
import HomePage from '@/src/pages/Home'
import CategoriesPage from '@/src/pages/Categories'
import CategoryPage from '@/src/pages/Category'
import PhotoPage from '@/src/pages/Photo'
import NotFoundPage from '@/src/pages/NotFound'

function App() {
  return (
    <CategoryProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/categoryList" element={<CategoriesPage />} />
          <Route path="/category/:categoryId/:photoId" element={<PhotoPage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/photo/:photoId" element={<PhotoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </CategoryProvider>
  )
}

export default App