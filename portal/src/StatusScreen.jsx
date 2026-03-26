import config from './config'

export default function StatusScreen() {
  const params = new URLSearchParams(window.location.search)
  const success = params.get('status') === 'success'

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{config.appName}</h1>
        {success ? (
          <>
            <p className="text-green-600 font-medium mt-4">✓ Connected</p>
            <p className="text-sm text-gray-500 mt-1">You now have access to the network.</p>
          </>
        ) : (
          <>
            <p className="text-red-500 font-medium mt-4">✗ Connection Failed</p>
            <p className="text-sm text-gray-500 mt-1">Something went wrong. Please try again.</p>
            <a href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Back to login</a>
          </>
        )}
      </div>
    </div>
  )
}
