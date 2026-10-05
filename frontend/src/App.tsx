import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getGreeting } from '@/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

export default function App() {
  const [name, setName] = useState('world')
  const greeting = useQuery({
    queryKey: ['greeting', name],
    queryFn: () => getGreeting(name),
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-8">
      <Card>
        <CardHeader>
          <CardTitle>Hello</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          {greeting.isPending && <Skeleton className="h-5 w-40" />}
          {greeting.isError && (
            <Alert variant="destructive">
              <AlertDescription>{greeting.error.message}</AlertDescription>
            </Alert>
          )}
          {greeting.isSuccess && <p data-testid="greeting">{greeting.data.message}</p>}
        </CardContent>
      </Card>
    </main>
  )
}
