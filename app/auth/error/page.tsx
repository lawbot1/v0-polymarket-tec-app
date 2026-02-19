import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-background grid-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Authentication Error</h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong during authentication. Please try again.
        </p>
        <Link href="/auth/login">
          <Button className="bg-foreground text-background hover:bg-foreground/90 mt-4">
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  )
}
