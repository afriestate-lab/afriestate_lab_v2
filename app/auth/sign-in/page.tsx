'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/languageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!role) {
        setError('Please select a role')
        setLoading(false)
        return
      }

      if (!identifier || !password) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      // Determine if identifier is email or phone
      let authEmail = identifier
      const isEmail = /^\S+@\S+\.\S+$/.test(identifier)

      if (!isEmail) {
        // Phone number - find user's email
        const cleanedPhone = identifier.replace(/\D/g, '')
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('email')
          .eq('phone_number', cleanedPhone)
          .single()

        if (tenantUser) {
          authEmail = tenantUser.email
        } else {
          setError('No account found with this phone number')
          setLoading(false)
          return
        }
      }

      // Sign in with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail.toLowerCase().trim(),
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        // Redirect based on role
        switch (role) {
          case 'tenant':
            router.push('/tenant')
            break
          case 'landlord':
            router.push('/landlord')
            break
          case 'admin':
            router.push('/admin')
            break
          default:
            router.push('/')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="landlord">Landlord</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Phone</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter email or phone number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm">
              <Link href="/auth/sign-up" className="text-primary hover:underline">
                Don't have an account? Sign up
              </Link>
            </div>

            <div className="text-center text-sm">
              <Link href="/auth/reset-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

