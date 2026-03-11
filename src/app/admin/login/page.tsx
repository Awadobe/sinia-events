'use client';

import { useState } from 'react';
import { login } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    const result = await login(formData);
    
    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-[80vh] w-full items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white text-lg font-bold shadow-sm mb-4">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Admin Login</h1>
          <p className="text-sm text-zinc-500">
            Enter your credentials to access the dashboard
          </p>
        </div>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@christex.foundation"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="password">Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Log In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
