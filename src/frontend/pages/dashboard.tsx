import type { ColDef, GridReadyEvent, IServerSideDatasource, IServerSideGetRowsParams } from 'ag-grid-community';
import { LicenseManager, ModuleRegistry, ServerSideRowModelModule } from 'ag-grid-enterprise';
import { AgGridReact } from 'ag-grid-react';
import { useMemo, useRef } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { vars } from '@/constants/vars';
import { useApiAuth } from '@/contexts/api-auth';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

type DocumentRow = {
  id: string;
  sessionId: string;
  filename: string;
  status: 'pending' | 'ready';
  createdAt: string;
  bucketPath: string;
};

type DocumentsResponse = {
  data: DocumentRow[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

let agGridInitialized = false;
if (!agGridInitialized) {
  ModuleRegistry.registerModules([ServerSideRowModelModule]);
  if (vars.agGridLicenseKey) {
    LicenseManager.setLicenseKey(vars.agGridLicenseKey);
  }
  agGridInitialized = true;
}

function formatCreatedAt(value: string): string {
  const asNumber = Number(value);
  const date = Number.isFinite(asNumber) ? new Date(asNumber) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DashboardPage() {
  const { httpClient } = useApiAuth();
  const gridRef = useRef<AgGridReact<DocumentRow>>(null);
  const pageSize = 50;

  const columnDefs = useMemo<ColDef<DocumentRow>[]>(
    () => [
      { field: 'filename', headerName: 'Filename', flex: 1.6, minWidth: 240 },
      { field: 'status', headerName: 'Status', width: 120 },
      {
        field: 'createdAt',
        headerName: 'Uploaded At',
        minWidth: 180,
        valueFormatter: ({ value }) => (typeof value === 'string' ? formatCreatedAt(value) : ''),
      },
      { field: 'sessionId', headerName: 'Session ID', minWidth: 220 },
      {
        colId: 'open',
        headerName: '',
        sortable: false,
        filter: false,
        width: 100,
        cellRenderer: ({ data }: { data: DocumentRow }) => {
          if (!data) return '';
          return `<a href="/document/${data.sessionId}" style="text-decoration:underline;">Open</a>`;
        },
      },
    ],
    [],
  );

  const datasource = useMemo<IServerSideDatasource>(
    () => ({
      getRows: async (params: IServerSideGetRowsParams<DocumentRow>) => {
        try {
          const requestedSize = (params.request.endRow ?? 0) - (params.request.startRow ?? 0);
          const limit = Math.max(1, Number.isFinite(requestedSize) ? requestedSize : pageSize);
          const page = Math.floor((params.request.startRow ?? 0) / limit) + 1;
          const response = await httpClient.get<DocumentsResponse>(`/api/docs`, {
            params: { page, limit },
          });

          if (!response.ok || typeof response.data === 'string') {
            params.fail();
            return;
          }

          const totalRows = Number(response.data.total);
          params.success({
            rowData: response.data.data,
            rowCount: Number.isFinite(totalRows) ? totalRows : undefined,
          });
        } catch {
          params.fail();
          return;
        }
      },
    }),
    [httpClient, pageSize],
  );

  const onGridReady = (event: GridReadyEvent<DocumentRow>) => {
    event.api.setGridOption('serverSideDatasource', datasource);
  };

  return (
    <div className='flex-1 bg-background p-8'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-semibold text-foreground'>Dashboard</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            All uploaded documents with server-side infinite loading.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={() => {
              gridRef.current?.api?.refreshServerSide({ purge: true });
            }}
          >
            Refresh
          </Button>
          <Button asChild variant='outline'>
            <Link href='/'>Back home</Link>
          </Button>
        </div>
      </div>

      <div className='ag-theme-alpine h-[640px] w-full rounded-md border border-border'>
        <AgGridReact<DocumentRow>
          ref={gridRef}
          columnDefs={columnDefs}
          rowModelType='serverSide'
          // @ts-expect-error
          serverSideStoreType='partial'
          cacheBlockSize={pageSize}
          paginationPageSize={pageSize}
          animateRows
          onGridReady={onGridReady}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
          }}
        />
      </div>
    </div>
  );
}
