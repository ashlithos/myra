export default function BucketListLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="h-3 w-24 shimmer rounded mb-6" />
        <div className="h-8 w-48 shimmer rounded mb-2" />
        <div className="h-3 w-64 shimmer rounded" />
      </div>

      {/* Tab controls */}
      <div className="flex gap-4 mb-8 border-b border-[#D4D0C8] pb-0">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-20 shimmer rounded-t" />
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#D4D0C8] group">
            {/* Photo area */}
            <div className="aspect-[4/3] shimmer" />
            {/* Card body */}
            <div className="p-4">
              <div className="h-4 w-3/4 shimmer rounded mb-2" />
              <div className="h-3 w-1/2 shimmer rounded mb-3" />
              <div className="h-5 w-16 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
