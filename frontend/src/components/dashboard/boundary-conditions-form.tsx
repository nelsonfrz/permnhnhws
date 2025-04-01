import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Define the schema for boundary conditions.
const boundaryConditionsSchema = z.object({
  top_dirichlet: z.coerce.number({ invalid_type_error: 'Must be a number' }),
  left_dirichlet: z.coerce.number({ invalid_type_error: 'Must be a number' }),
  right_dirichlet: z.coerce.number({ invalid_type_error: 'Must be a number' }),
  bottom_dirichlet: z.coerce.number({ invalid_type_error: 'Must be a number' }),
  top_neumann: z.boolean(),
  left_neumann: z.boolean(),
  right_neumann: z.boolean(),
  bottom_neumann: z.boolean(),
});

export function BoundaryConditionsForm() {
  const form = useForm({
    resolver: zodResolver(boundaryConditionsSchema),
    defaultValues: {
      top_dirichlet: 0,
      left_dirichlet: 0,
      right_dirichlet: 0,
      bottom_dirichlet: 0,
      top_neumann: false,
      left_neumann: false,
      right_neumann: false,
      bottom_neumann: false,
    },
  });

  function onSubmit(values: any) {
    console.log('Boundary conditions:', values);
    // Add your simulation-specific submission logic here.
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Dirichlet Boundary Conditions */}
        <FormField
          control={form.control}
          name="top_dirichlet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Top Dirichlet Matrix Potential</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="left_dirichlet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Left Dirichlet Matrix Potential</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="right_dirichlet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Right Dirichlet Matrix Potential</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bottom_dirichlet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bottom Dirichlet Matrix Potential</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
