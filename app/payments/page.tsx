'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Payments</h1>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Payments management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

