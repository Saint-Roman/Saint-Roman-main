import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { BarcodeScannerPage } from '@/pages/BarcodeScannerPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { BlogPostsPage } from '@/pages/BlogPostsPage'
import { FaqsPage } from '@/pages/FaqsPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { CouponsPage } from '@/pages/CouponsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { WarehousePage } from '@/pages/WarehousePage'
import { SupportPage } from '@/pages/SupportPage'
import { AuditLogsPage } from '@/pages/AuditLogsPage'
import { BannersPage } from '@/pages/BannersPage'
import { TestimonialsPage } from '@/pages/TestimonialsPage'
import { TeamPage } from '@/pages/TeamPage'
import { InfluencersPage } from '@/pages/InfluencersPage'
import { MarketingPage } from '@/pages/MarketingPage'
import { ShippingPage } from '@/pages/ShippingPage'
import { CrmPage } from '@/pages/CrmPage'
import { AiPage } from '@/pages/AiPage'
import { MediaPage } from '@/pages/MediaPage'
import { ReturnsPage } from '@/pages/ReturnsPage'
import { FinancePage } from '@/pages/FinancePage'
import { AbandonedCartsPage } from '@/pages/AbandonedCartsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/barcode-scanner" element={<BarcodeScannerPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/blog-posts" element={<BlogPostsPage />} />
              <Route path="/faqs" element={<FaqsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/warehouse" element={<WarehousePage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/banners" element={<BannersPage />} />
              <Route path="/testimonials" element={<TestimonialsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/influencers" element={<InfluencersPage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route path="/crm" element={<CrmPage />} />
              <Route path="/ai" element={<AiPage />} />
              <Route path="/media" element={<MediaPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/abandoned-carts" element={<AbandonedCartsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

export default App