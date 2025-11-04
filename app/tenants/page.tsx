'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function TenantsPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tenants</h1>
        <Button onClick={() => router.push('/tenants/add')}>Add Tenant</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Tenants management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

