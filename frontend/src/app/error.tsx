'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.error('Application error:', error)
  }, [error])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-300">Loading...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 mb-8">
          An unexpected error occurred. Our team has been notified.
          {error.digest && (
            <span className="block mt-1 text-xs text-gray-400">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-color,#e35336)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={20} />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <Home size={20} />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
