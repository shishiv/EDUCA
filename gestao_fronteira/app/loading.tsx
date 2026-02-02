export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full animate-spin">
            <div className="w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full"></div>
          </div>
        </div>
        <p className="text-gray-700 font-medium">Carregando Sistema...</p>
        <p className="text-sm text-gray-600 mt-2">SME Fronteira/MG</p>
      </div>
    </div>
  )
}
