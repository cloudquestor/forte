import config from './config'

function Logo() {
  return (
    <div className="flex flex-col items-center mb-6">
      <img src="/logo.png" alt={config.appName} className="h-16 object-contain"
           onError={(e) => { e.target.style.display = 'none' }} />
    </div>
  )
}

export default function StatusScreen() {
  const params = new URLSearchParams(window.location.search)
  const success = params.get('status') === 'success'

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8 text-center space-y-4">
        <Logo />
        {success ? (
          <>
            <div className="text-green-600 text-4xl">✓</div>
            <p className="text-sm font-medium text-gray-700">Connected!</p>
            <p className="text-xs text-gray-500">You now have access to the network.</p>
          </>
        ) : (
          <>
            <div className="text-red-500 text-4xl">✗</div>
            <p className="text-sm font-medium text-gray-700">Connection Failed</p>
            <p className="text-xs text-gray-500">Something went wrong. Please try again.</p>
            <a href="/"
               className="block w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-xl text-sm transition-colors">
              Back to Sign In
            </a>
          </>
        )}
      </div>
    </div>
  )
}
