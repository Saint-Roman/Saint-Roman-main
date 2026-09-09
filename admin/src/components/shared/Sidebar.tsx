import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FolderTree, Package, Boxes, ClipboardList, Undo2, Users, Wallet, Newspaper, HelpCircle, Tag, BarChart3, Warehouse, LifeBuoy, ScrollText, Image, ImagePlus, UserCog, Megaphone, LineChart, Truck, Contact, Sparkles, Settings, Barcode, Quote, ShoppingCart } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/barcode-scanner', label: 'Barcode Scanner', icon: Barcode },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/warehouse', label: 'Warehouse', icon: Warehouse },
  { to: '/shipping', label: 'Shipping', icon: Truck },
  { to: '/returns', label: 'Returns', icon: Undo2 },
  { to: '/abandoned-carts', label: 'Abandoned Carts', icon: ShoppingCart },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/crm', label: 'CRM', icon: Contact },
  { to: '/coupons', label: 'Coupons', icon: Tag },
  { to: '/influencers', label: 'Influencers', icon: Megaphone },
  { to: '/marketing', label: 'Marketing', icon: LineChart },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/ai', label: 'AI Center', icon: Sparkles },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/team', label: 'Team', icon: UserCog },
  { to: '/banners', label: 'Banners', icon: Image },
  { to: '/testimonials', label: 'Testimonials', icon: Quote },
  { to: '/media', label: 'Media Library', icon: ImagePlus },
  { to: '/blog-posts', label: 'Blog Posts', icon: Newspaper },
  { to: '/faqs', label: 'FAQs', icon: HelpCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      <div className="px-4 py-5 text-lg font-semibold">Ellora Admin</div>
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/60'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}