'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminReportsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin - Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>System Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Admin reports coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

