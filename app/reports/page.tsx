'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RoleGuard from '@/components/web-role-guard'

function ReportsPageContent() {
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

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={['landlord', 'manager', 'admin']} screenName="reports-page">
      <ReportsPageContent />
    </RoleGuard>
  )
}

