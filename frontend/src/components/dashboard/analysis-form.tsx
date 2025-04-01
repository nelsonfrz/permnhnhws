import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useParams } from '@tanstack/react-router';
import { BACKEND_PREFIX_URL } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';

// Define the schema for our analysis request form.
const formSchema = z.object({
  filename: z.string().nonempty('Filename is required'),
  start_elapsed: z.coerce.number({ invalid_type_error: 'Must be a number' }),
  end_elapsed: z.coerce.number({ invalid_type_error: 'Must be a number' }),
  bins: z.coerce
    .number({ invalid_type_error: 'Must be a number' })
    .min(1, 'At least 1 bin required'),
  conversion_factor: z.coerce.number({ invalid_type_error: 'Must be a number' }),
});

export function AnalysisForm() {
  const { measurement } = useParams({ from: '/dashboard/analysis/$measurement' });
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filename: measurement + '.csv',
      start_elapsed: 0,
      end_elapsed: 0,
      bins: 20,
      conversion_factor: 10.3958,
    },
  });

  const [analysisImage, setAnalysisImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);

  async function onSubmit(values: any) {
    setError(null);
    setAnalysisImage(null);
    setAnalysisResults(null);
    try {
      const response = await fetch(BACKEND_PREFIX_URL + '/api/measurements/analyse', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Analysis failed');
      }
      const data = await response.json();
      // data.analysis_file is the URL to the generated image
      setAnalysisImage(data.analysis_file);
      setAnalysisResults(data.results);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="start_elapsed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Elapsed (ms)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>Start elapsed time (ms) for the analysis.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_elapsed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Elapsed (ms)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  End elapsed time (ms) for the analysis (0 selects whole dataset).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bins"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bins</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  Number of bins for the k<sub>s</sub> histogram.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="conversion_factor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conversion Factor</FormLabel>
                <FormControl>
                  <Input type="number" step="any" {...field} />
                </FormControl>
                <FormDescription>
                  Conversion factor to calculate k<sub>s</sub>.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Analyse Measurement</Button>
        </form>
      </Form>

      {error && <p className="text-red-500">{error}</p>}

      {analysisImage && (
        <div className="mt-6">
          <p className="font-medium mb-2">Analysis Result:</p>
          <img
            src={BACKEND_PREFIX_URL + analysisImage}
            alt="Analysis Result"
            className="max-w-full h-auto border rounded"
          />
          {analysisResults && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <pre className="text-sm">{JSON.stringify(analysisResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
