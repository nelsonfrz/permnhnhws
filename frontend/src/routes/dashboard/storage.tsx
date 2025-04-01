import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getAuthHeaders } from '@/lib/auth';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BACKEND_PREFIX_URL } from '@/lib/config';
import { ChartArea, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Route = createFileRoute('/dashboard/storage')({
  component: RouteComponent,
});

export default function RouteComponent() {
  const [measurements, setMeasurements] = useState([]);
  const [analysisImages, setAnalysisImages] = useState([]);
  const [analysesVisibleCount, setAnalysesVisibleCount] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filterValue, setFilterValue] = useState('');

  const loadMore = () => {
    setAnalysesVisibleCount((prevCount) => prevCount + 12);
  };

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const response = await fetch(BACKEND_PREFIX_URL + '/api/measurements', {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch recordings');
        }
        const data = await response.json();
        setMeasurements(data.measurements || []);
        setAnalysisImages(data.analysis_images || []);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
  }, []);

  type Measurement = {
    id: string;
    filename: string;
    created_at: number;
    duration_ms: number;
    row_count: number;
    file_link: string;
  };

  const columns: ColumnDef<Measurement>[] = [
    {
      accessorKey: 'filename',
      header: 'Filename',
      cell: ({ row }) => row.getValue('filename'),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => {
        const ts = row.getValue('created_at') as number;
        const date = new Date(ts * 1000);
        return date.toLocaleString();
      },
    },
    {
      accessorKey: 'duration_ms',
      header: 'Duration (s)',
      cell: ({ row }) => ((row.getValue('duration_ms') as number) / 1000).toFixed(2),
    },
    {
      accessorKey: 'row_count',
      header: 'Row Count',
      cell: ({ row }) => row.getValue('row_count'),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const measurement = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  to="/dashboard/analysis/$measurement"
                  params={{ measurement: measurement.filename.replace('.csv', '') }}
                >
                  <ChartArea />
                  Analyse
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: measurements,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) return <div>Loading recordings...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Measurement Recordings</h1>

      <div className="mb-4">
        <Input
          placeholder="Filter by filename..."
          value={filterValue}
          onChange={(event) => {
            setFilterValue(event.target.value);
            table.getColumn('filename')?.setFilterValue(event.target.value);
          }}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-4">
                  No measurements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <h1 className="text-xl font-bold mb-4">Analyses</h1>

      <div className="flex flex-col items-center">
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {analysisImages.slice(0, analysesVisibleCount).map((analysisImage, index) => (
            <li key={index}>
              <a
                href={`${BACKEND_PREFIX_URL + analysisImage}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={`${BACKEND_PREFIX_URL + analysisImage}`}
                  alt="Analysis"
                  className="w-full h-auto rounded-lg shadow-md transition-opacity duration-300 hover:opacity-75"
                />
              </a>
            </li>
          ))}
        </ul>
        {analysesVisibleCount < analysisImages.length && (
          <Button className="mt-4" onClick={loadMore}>
            Load More
          </Button>
        )}
      </div>
    </div>
  );
}
