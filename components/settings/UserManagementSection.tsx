export default function UserManagementSection() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-base font-semibold text-gray-900">User Management</h2>
        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 uppercase tracking-wide">Coming Soon</span>
      </div>

      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center">
        <svg className="w-10 h-10 text-gray-200 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <p className="text-sm font-semibold text-gray-500">User management will be available</p>
        <p className="text-sm text-gray-400 mt-1">once authentication is set up.</p>
      </div>
    </div>
  )
}
