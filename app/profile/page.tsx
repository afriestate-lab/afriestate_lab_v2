'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useLanguage } from '@/lib/languageContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Settings, 
  Globe, 
  Moon, 
  CreditCard, 
  LogOut, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  role: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t, currentLanguage, changeLanguage } = useLanguage()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/sign-in?redirect=/profile')
      return
    }

    if (user) {
      loadUserProfile()
    }
  }, [user, authLoading, router])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone_number, role')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
      } else {
        setUserProfile(userData)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'rw' ? 'en' : 'rw'
    changeLanguage(newLanguage)
  }

  const getRoleText = (role: string | null) => {
    if (!role) return currentLanguage === 'rw' ? 'Ntacyo' : 'None'
    switch (role) {
      case 'tenant':
        return currentLanguage === 'rw' ? 'Umukode' : 'Tenant'
      case 'landlord':
        return currentLanguage === 'rw' ? "Nyir'inyubako" : 'Landlord'
      case 'manager':
        return currentLanguage === 'rw' ? 'Umuyobozi' : 'Manager'
      case 'admin':
        return currentLanguage === 'rw' ? 'Umugenzuzi mukuru' : 'Admin'
      default:
        return role
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">
            {currentLanguage === 'rw' ? 'Gukura amakuru...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {currentLanguage === 'rw' ? 'Subira inyuma' : 'Back'}
          </Button>
          <h1 className="text-3xl font-bold">
            {currentLanguage === 'rw' ? 'Konti' : 'Profile'}
          </h1>
        </div>

        {/* Profile Header Card */}
        <Card className="mb-6 shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-8">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-12 w-12 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">
                  {userProfile?.full_name || user.email?.split('@')[0] || (currentLanguage === 'rw' ? 'Konti' : 'User')}
                </h2>
                {userProfile?.email && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {userProfile.email}
                  </p>
                )}
                {userProfile?.phone_number && (
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4" />
                    {userProfile.phone_number}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {currentLanguage === 'rw' ? 'Amakuru yawe' : 'Personal Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-slate-100">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">
                  {currentLanguage === 'rw' ? 'Amazina' : 'Full Name'}
                </p>
                <p className="font-medium">
                  {userProfile?.full_name || (currentLanguage === 'rw' ? 'Ntacyo' : 'Not set')}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-slate-100">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">
                  {currentLanguage === 'rw' ? 'Imeri' : 'Email'}
                </p>
                <p className="font-medium">
                  {userProfile?.email || user.email || (currentLanguage === 'rw' ? 'Ntacyo' : 'Not set')}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-slate-100">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">
                  {currentLanguage === 'rw' ? 'Telefoni' : 'Phone Number'}
                </p>
                <p className="font-medium">
                  {userProfile?.phone_number || (currentLanguage === 'rw' ? 'Ntacyo' : 'Not set')}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-slate-100">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">
                  {currentLanguage === 'rw' ? 'Uruhare' : 'Role'}
                </p>
                <p className="font-medium">
                  {getRoleText(userProfile?.role || null)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {currentLanguage === 'rw' ? 'Igenamiterere' : 'Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-slate-100">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium">
                    {currentLanguage === 'rw' ? 'Ururimi' : 'Language'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentLanguage === 'rw' ? 'Kinyarwanda' : 'English'}
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentLanguage === 'rw' ? 'Hindura' : 'Change'}
              </span>
            </button>

            <Separator />

            <div className="flex items-center justify-between p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-slate-100">
                  <Moon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {currentLanguage === 'rw' ? 'Ubwoba bw'ijoro' : 'Dark Mode'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentLanguage === 'rw' ? 'Ntibyakoreshejwe' : 'Not available'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {currentLanguage === 'rw' ? 'Kwishyura' : 'Subscription'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {currentLanguage === 'rw' ? 'Amafaranga wishyuye' : 'Amount Paid'}
              </p>
              <p className="font-medium">
                {currentLanguage === 'rw' ? 'Kubuntu (0 RWF)' : 'Free (0 RWF)'}
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {currentLanguage === 'rw' ? "Uburyo bw'kwishyura" : 'Payment Mode'}
              </p>
              <p className="font-medium">
                {currentLanguage === 'rw' ? 'Ntabwo byashyizwemo' : 'Not set'}
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {currentLanguage === 'rw' ? 'Igihe gikurikiyeho cyo kwishyura' : 'Next Payment Date'}
              </p>
              <p className="font-medium">
                {currentLanguage === 'rw' ? 'Kubuntu - ntacyo gisabwa' : 'Free - nothing required'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="shadow-lg border-0 border-red-200">
          <CardContent className="p-6">
            <Button
              variant="destructive"
              className="w-full h-12 text-base font-semibold"
              onClick={() => setShowSignOutDialog(true)}
            >
              <LogOut className="h-5 w-5 mr-2" />
              {currentLanguage === 'rw' ? 'Sohoka' : 'Sign Out'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {currentLanguage === 'rw' ? 'Sohoka' : 'Sign Out'}
            </DialogTitle>
            <DialogDescription>
              {currentLanguage === 'rw' 
                ? 'Uremeza ko ushaka gusohoka?'
                : 'Are you sure you want to sign out?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSignOutDialog(false)}
            >
              {currentLanguage === 'rw' ? 'Hagarika' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
            >
              {currentLanguage === 'rw' ? 'Sohoka' : 'Sign Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

