"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Please contact support.';
      case 'AccessDenied':
        return 'Access was denied. You may not have permission to sign in.';
      case 'Verification':
        return 'The verification link may have expired or already been used.';
      case 'OAuthSignin':
        return 'Error occurred while trying to sign in with the OAuth provider.';
      case 'OAuthCallback':
        return 'Error occurred while handling the OAuth callback.';
      case 'OAuthCreateAccount':
        return 'Could not create an OAuth provider account.';
      case 'EmailCreateAccount':
        return 'Could not create an email provider account.';
      case 'Callback':
        return 'Error occurred during the callback process.';
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account. Please sign in with the original provider.';
      case 'EmailSignin':
        return 'Error sending the email for sign in.';
      case 'CredentialsSignin':
        return 'Invalid credentials. Please check your email and password.';
      case 'SessionRequired':
        return 'You need to be signed in to access this page.';
      default:
        return 'An unexpected error occurred during authentication. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Authentication Error</h1>
        <p className="text-slate-600 mb-6">
          {getErrorMessage(error)}
        </p>
        
        {error && (
          <p className="text-xs text-slate-400 mb-6 font-mono bg-slate-50 px-3 py-2 rounded-lg">
            Error code: {error}
          </p>
        )}
        
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
