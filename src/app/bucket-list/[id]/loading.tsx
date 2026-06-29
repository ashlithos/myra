export default function ExperienceEditLoading() {
  return (
    <div className="animate-pulse">
      {/* Back link */}
      <div className="h-3 w-32 bg-[#D4D0C8]/40 rounded mb-8" />

      {/* Banner photo placeholder */}
      <div className="aspect-[3/1] bg-[#D4D0C8]/20 rounded mb-8" />

      {/* Form fields */}
      <div className="max-w-xl space-y-6">
        {/* Name */}
        <div>
          <div className="h-3 w-24 bg-[#D4D0C8]/40 rounded mb-2" />
          <div className="h-10 bg-[#D4D0C8]/20 rounded border border-[#D4D0C8]/40" />
        </div>
        {/* Country */}
        <div>
          <div className="h-3 w-20 bg-[#D4D0C8]/40 rounded mb-2" />
          <div className="h-10 bg-[#D4D0C8]/20 rounded border border-[#D4D0C8]/40" />
        </div>
        {/* Description */}
        <div>
          <div className="h-3 w-28 bg-[#D4D0C8]/40 rounded mb-2" />
          <div className="h-24 bg-[#D4D0C8]/20 rounded border border-[#D4D0C8]/40" />
        </div>
        {/* Chip row (seasons) */}
        <div>
          <div className="h-3 w-32 bg-[#D4D0C8]/40 rounded mb-2" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-16 bg-[#D4D0C8]/30 rounded-full" />
            ))}
          </div>
        </div>
        {/* Status */}
        <div>
          <div className="h-3 w-20 bg-[#D4D0C8]/40 rounded mb-2" />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 w-24 bg-[#D4D0C8]/30 rounded" />
            ))}
          </div>
        </div>
        {/* Save button */}
        <div className="h-10 w-28 bg-[#D4D0C8]/40 rounded" />
      </div>
    </div>
  );
}
