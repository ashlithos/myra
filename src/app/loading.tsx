export default function HomeLoading() {
  return (
    <div className="py-16 md:py-24">
      {/* Hero */}
      <div className="text-center mb-20">
        <div className="h-3 w-48 shimmer rounded mx-auto mb-4" />
        <div className="h-10 w-72 shimmer rounded mx-auto mb-2" />
        <div className="h-10 w-56 shimmer rounded mx-auto" />
      </div>

      {/* Intent cards */}
      <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto mb-20">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white p-5 md:p-6 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="w-11 h-11 shimmer rounded mb-3" />
            <div className="h-5 w-40 shimmer rounded mb-2" />
            <div className="h-3 w-full shimmer rounded mb-1" />
            <div className="h-3 w-3/4 shimmer rounded" />
          </div>
        ))}
      </div>

      {/* Gallery wall placeholder */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen mb-20 h-48 shimmer" />

      {/* Stats */}
      <div className="flex justify-center gap-8 md:gap-12 text-center">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 shimmer rounded mx-auto" />
            <div className="h-2.5 w-16 shimmer rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
