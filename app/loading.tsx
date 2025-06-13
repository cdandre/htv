export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-primary/5 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping animation-delay-200" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">HTV</span>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  )
}