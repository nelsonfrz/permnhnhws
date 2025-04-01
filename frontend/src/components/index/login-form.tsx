'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from '@tanstack/react-router'; // Adjust import based on your router setup
import useLocalStorage from '@/hooks/use-local-storage';

// Define a Zod schema for the form.
const formSchema = z.object({
  username: z.string().min(2, {
    message: 'Username must be at least 2 characters.',
  }),
  password: z.string().min(1, {
    message: 'Password is required.',
  }),
});

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter();
  const [_storedCredentials, setStoredCredentials] = useLocalStorage('credentials', {
    username: '',
    password: '',
  });

  // Set up the form with react-hook-form and the Zod schema.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // On form submit, store the credentials and redirect.
  function onSubmit(values: z.infer<typeof formSchema>) {
    setStoredCredentials(values);
    router.navigate({ to: '/dashboard' });
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Gauge className="size-16" />
              </div>
              <span className="sr-only">PERM_NHN_HWS</span>
            </a>
            <h1 className="text-xl font-bold">PERM_NHN_HWS</h1>
          </div>
          <div className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Login
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
