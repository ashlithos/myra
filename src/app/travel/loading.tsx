export default function TravelLoading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="h-2.5 w-28 shimmer rounded mb-2" />
        <div className="h-8 w-64 shimmer rounded" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
        {[1, 2, 3].map((n) => (
          <div key={n} className="border border-[#D4D0C8] bg-white flex flex-col">
            {/* Remove button placeholder */}
            <div className="flex justify-end px-3 pt-2">
              <div className="w-6 h-6" />
            </div>
            {/* Avatar */}
            <div className="flex flex-col items-center px-6 pb-5 gap-3">
              <div className="w-20 h-20 rounded-full shimmer" />
              <div className="h-4 w-20 shimmer rounded" />
            </div>
            {/* Place pills */}
            <div className="px-5 pb-4 flex gap-2 flex-wrap">
              {n === 1 && (
                <>
                  <div className="h-7 w-16 shimmer rounded" />
                  <div className="h-7 w-20 shimmer rounded" />
                </>
              )}
              {n === 2 && (
                <div className="h-7 w-14 shimmer rounded" />
              )}
              {n === 3 && (
                <div className="h-3 w-32 shimmer rounded mt-1" />
              )}
            </div>
            {/* Input */}
            <div className="px-5 pb-5">
              <div className="h-11 shimmer rounded" />
            </div>
          </div>
        ))}

        {/* Add friend placeholder */}
        <div className="border border-dashed border-[#D4D0C8] min-h-[220px] flex flex-col items-center justify-center gap-2 opacity-40">
          <span className="text-4xl text-[#1A1A1A]/15">+</span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A]/30">Add friend</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#D4D0C8] pt-5 flex items-center gap-4">
        <div className="space-y-1.5">
          <div className="h-2 w-16 shimmer rounded" />
          <div className="h-2.5 w-48 shimmer rounded" />
        </div>
        <div className="ml-auto h-8 w-20 shimmer" />
      </div>
    </div>
  );
}
