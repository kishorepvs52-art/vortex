import { cn } from '../../lib/cn';
import { Skeleton } from './Feedback';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  hideBelow?: 'sm' | 'md' | 'lg';
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyMessage = 'Nothing here yet',
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  if (loading) {
    return (
      <div className="glass p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <div className="glass p-10 text-center text-sm text-muted">{emptyMessage}</div>;
  }

  return (
    <div className="glass overflow-hidden p-0">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'px-4 py-3 text-left text-[11px] font-display font-600 uppercase tracking-[0.14em] text-muted whitespace-nowrap',
                    c.hideBelow === 'md' && 'hidden md:table-cell',
                    c.hideBelow === 'lg' && 'hidden lg:table-cell',
                    c.hideBelow === 'sm' && 'hidden sm:table-cell',
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-white/5 last:border-0 transition-colors hover:bg-neon/[0.04]',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-4 py-3 text-cream/90 align-middle',
                      c.hideBelow === 'md' && 'hidden md:table-cell',
                      c.hideBelow === 'lg' && 'hidden lg:table-cell',
                      c.hideBelow === 'sm' && 'hidden sm:table-cell',
                      c.className,
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) {
    return <p className="text-xs text-muted mt-3">Showing all {total} record{total === 1 ? '' : 's'}</p>;
  }
  return (
    <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
      <p className="text-xs text-muted">
        Page <span className="text-neon font-600">{page}</span> of {totalPages} · {total} records
      </p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded-lg glass text-xs font-display font-600 text-cream disabled:opacity-40 hover:border-neon/40 transition-colors"
        >
          ← Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded-lg glass text-xs font-display font-600 text-cream disabled:opacity-40 hover:border-neon/40 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
