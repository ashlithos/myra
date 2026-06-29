export default function TripDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Back link */}
      <div className="mb-12">
        <div className="h-3 w-28 bg-[#D4D0C8]/40 rounded mb-6" />
        <div className="h-3 w-20 bg-[#D4D0C8]/30 rounded mb-2 mt-6" />
        <div className="h-8 w-56 bg-[#D4D0C8]/40 rounded" />
      </div>

      {/* Metadata grid */}
      <div className="border-t border-b border-[#D4D0C8] py-5 mb-12 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-2.5 w-16 bg-[#D4D0C8]/40 rounded mb-2" />
            <div className="h-4 w-24 bg-[#D4D0C8]/30 rounded" />
          </div>
        ))}
      </div>

      {/* Itinerary heading */}
      <div className="h-3 w-32 bg-[#D4D0C8]/40 rounded mb-4" />

      {/* Itinerary rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-t border-[#D4D0C8] py-5 flex items-center justify-between gap-4">
          <div className="flex gap-4 items-start">
            <div className="h-4 w-6 bg-[#D4D0C8]/30 rounded mt-0.5" />
            <div>
              <div className="h-5 w-40 bg-[#D4D0C8]/40 rounded mb-1.5" />
              <div className="h-3 w-28 bg-[#D4D0C8]/30 rounded" />
            </div>
          </div>
          <div className="h-5 w-16 bg-[#D4D0C8]/30 rounded" />
        </div>
      ))}
    </div>
  );
}
