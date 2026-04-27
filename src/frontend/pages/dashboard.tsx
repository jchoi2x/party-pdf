import type { ColDef, IDetailCellRendererParams } from 'ag-grid-community';
import { LicenseManager } from 'ag-grid-enterprise';
import 'ag-grid-enterprise';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { vars } from '@/constants/vars';
import { useApiAuth } from '@/contexts/api-auth';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

type DocumentRow = {
  id: string;
  sessionId: string;
  filename: string;
  status: 'pending' | 'ready';
  createdAt: string;
  bucketPath: string;
};

type ParticipantRow = {
  id: string;
  sessionId: string;
  userId: string;
  role: 'leader' | 'member';
  createdAt: string;
};

type SessionRow = {
  id: string;
  ownerId: string;
  createdAt: string;
  documents: DocumentRow[];
  participants: ParticipantRow[];
};

type SessionsResponse = {
  data: Array<{
    session: {
      id: string;
      ownerId: string;
      createdAt: string;
    };
    documents: DocumentRow[];
    participants: ParticipantRow[];
  }>;
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

type SessionValueFormatterParams = { value: unknown };
type SessionValueGetterParams = { data: SessionRow | undefined };

let agGridInitialized = false;
if (!agGridInitialized) {
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
  const gridRef = useRef<AgGridReact<SessionRow>>(null);
  const [rowData, setRowData] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await httpClient.get<SessionsResponse>('/api/sessions', {
        params: { page: 1, limit: 200 },
      });
      if (!response.ok || typeof response.data === 'string') {
        setRowData([]);
        toast.error('Could not load sessions');
        return;
      }

      setRowData(
        response.data.data.map((item) => ({
          id: item.session.id,
          ownerId: item.session.ownerId,
          createdAt: item.session.createdAt,
          documents: item.documents,
          participants: item.participants,
        })),
      );
    } catch {
      setRowData([]);
      toast.error('Could not load sessions');
    } finally {
      setIsLoading(false);
    }
  }, [httpClient]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const columnDefs = useMemo<ColDef<SessionRow>[]>(
    () => [
      {
        colId: 'expand',
        headerName: '',
        width: 64,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: 'agGroupCellRenderer',
      },
      {
        field: 'createdAt',
        headerName: 'Created At',
        minWidth: 180,
        valueFormatter: ({ value }: SessionValueFormatterParams) => (typeof value === 'string' ? formatCreatedAt(value) : ''),
      },
      { field: 'id', headerName: 'Session ID', minWidth: 260, flex: 1.4 },
      {
        colId: 'documentsCount',
        headerName: 'Documents',
        width: 120,
        valueGetter: ({ data }: SessionValueGetterParams) => data?.documents?.length ?? 0,
      },
      {
        colId: 'participantsCount',
        headerName: 'Participants',
        width: 130,
        valueGetter: ({ data }: SessionValueGetterParams) => data?.participants?.length ?? 0,
      },
      {
        colId: 'open',
        headerName: '',
        sortable: false,
        filter: false,
        width: 100,
        cellRenderer: ({ data }: { data: SessionRow }) => {
          if (!data) return '';
          return `<a href="/document/${data.id}" style="text-decoration:underline;">Open</a>`;
        },
      },
    ],
    [],
  );

  const detailCellRenderer = useCallback((params: IDetailCellRendererParams<SessionRow>) => {
    const data = params.data;
    if (!data) return null;

    return (
      <div className='grid grid-cols-1 gap-3 px-3 py-2 lg:grid-cols-2'>
        <div className='rounded border border-border p-2'>
          <h3 className='mb-2 text-sm font-semibold'>Documents</h3>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b border-border text-left'>
                <th className='py-1'>Filename</th>
                <th className='py-1'>Status</th>
                <th className='py-1'>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.documents.length === 0 ? (
                <tr>
                  <td className='py-2 text-muted-foreground' colSpan={3}>
                    No documents
                  </td>
                </tr>
              ) : (
                data.documents.map((doc: DocumentRow) => (
                  <tr key={doc.id} className='border-b border-border/50'>
                    <td className='py-1'>{doc.filename}</td>
                    <td className='py-1'>{doc.status}</td>
                    <td className='py-1'>{formatCreatedAt(doc.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className='rounded border border-border p-2'>
          <h3 className='mb-2 text-sm font-semibold'>Participants</h3>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b border-border text-left'>
                <th className='py-1'>User</th>
                <th className='py-1'>Role</th>
                <th className='py-1'>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.participants.length === 0 ? (
                <tr>
                  <td className='py-2 text-muted-foreground' colSpan={3}>
                    No participants
                  </td>
                </tr>
              ) : (
                data.participants.map((participant: ParticipantRow) => (
                  <tr key={participant.id} className='border-b border-border/50'>
                    <td className='py-1'>{participant.userId}</td>
                    <td className='py-1'>{participant.role}</td>
                    <td className='py-1'>{formatCreatedAt(participant.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, []);

  const themeStyle = useMemo(
    () =>
      ({
        '--ag-accent-color': '#00A2FF',
        '--ag-background-color': '#21222C',
        '--ag-border-color': '#429356',
        '--ag-border-radius': '0px',
        '--ag-foreground-color': '#68FF8E',
        '--ag-data-color': '#50F178',
        '--ag-header-background-color': '#21222C',
        '--ag-header-foreground-color': '#68FF8E',
        '--ag-font-size': '12px',
        '--ag-font-family': '"IBM Plex Mono", monospace',
        '--ag-odd-row-background-color': '#21222C',
        '--ag-range-selection-background-color': '#FFFF0020',
        '--ag-range-selection-border-color': 'yellow',
        '--ag-row-border-color': '#429356',
        '--ag-wrapper-border-color': '#429356',
      }) as React.CSSProperties,
    [],
  );

  return (
    <div className='flex-1 bg-background p-8'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-semibold text-foreground'>Dashboard</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            Sessions with expandable nested rows for documents and participants.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => void loadSessions()}>
            {isLoading ? 'Loading…' : 'Refresh'}
          </Button>
          <Button asChild variant='outline'>
            <Link href='/'>Back home</Link>
          </Button>
        </div>
      </div>

      <div className='ag-theme-quartz h-[640px] w-full rounded-md border border-border' style={themeStyle}>
        <AgGridReact<SessionRow>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          masterDetail
          detailCellRenderer={detailCellRenderer}
          detailRowAutoHeight
          pagination
          paginationPageSize={25}
          animateRows
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
