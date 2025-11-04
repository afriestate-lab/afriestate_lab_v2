'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Property Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Reports coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

