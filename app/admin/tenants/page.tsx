'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminTenantsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin - Tenants</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Admin tenants management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

