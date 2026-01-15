import AdminSidebar from '@/components/layout/AdminSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-gray-100 w-full lg:w-auto min-w-0">
        {/* Add top padding on mobile for the fixed header */}
        <div className="lg:pt-0 pt-14">
          {children}
        </div>
      </main>
    </div>
  )
}
