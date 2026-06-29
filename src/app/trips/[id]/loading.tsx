export default function TripDetailLoading() {
  return (
    <div>
      {/* Back link */}
      <div className="mb-12">
        <div className="h-3 w-28 shimmer rounded mb-6" />
        <div className="h-3 w-20 shimmer rounded mb-2 mt-6" />
        <div className="h-8 w-56 shimmer rounded" />
      </div>

      {/* Metadata grid */}
      <div className="border-t border-b border-[#D4D0C8] py-5 mb-12 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-2.5 w-16 shimmer rounded mb-2" />
            <div className="h-4 w-24 shimmer rounded" />
          </div>
        ))}
      </div>

      {/* Itinerary heading */}
      <div className="h-3 w-32 shimmer rounded mb-4" />

      {/* Itinerary rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-t border-[#D4D0C8] py-5 flex items-center justify-between gap-4">
          <div className="flex gap-4 items-start">
            <div className="h-4 w-6 shimmer rounded mt-0.5" />
            <div>
              <div className="h-5 w-40 shimmer rounded mb-1.5" />
              <div className="h-3 w-28 shimmer rounded" />
            </div>
          </div>
          <div className="h-5 w-16 shimmer rounded" />
        </div>
      ))}
    </div>
  );
}
