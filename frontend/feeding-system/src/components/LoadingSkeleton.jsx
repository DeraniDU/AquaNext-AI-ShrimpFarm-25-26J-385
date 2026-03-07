// Loading skeleton component for better UX
export const TankCardSkeleton = () => {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
          </div>
        </div>
        <div className="h-6 w-24 bg-gray-200 rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 w-28 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-6 rounded-xl shadow-md animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
          <div className="h-10 w-16 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
};

















