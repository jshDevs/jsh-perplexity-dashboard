/**
 * DatasetPreviewTable — tabla paginada de preview del dataset
 * usando TanStack Table v8. Muestra las primeras columnas con
 * truncado de texto largo y paginación client-side.
 */
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MAX_COLS = 12
const CELL_MAX = 40

interface Props {
  rows:    Record<string, unknown>[]
  columns: string[]
}

export default function DatasetPreviewTable({ rows, columns }: Props) {
  const visibleCols = columns.slice(0, MAX_COLS)

  const colDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      visibleCols.map((col) => ({
        accessorKey: col,
        header:      col,
        cell: (info) => {
          const v = String(info.getValue() ?? '')
          return v.length > CELL_MAX ? `${v.slice(0, CELL_MAX)}…` : v
        },
        size: 140,
      })),
    [visibleCols],
  )

  const table = useReactTable({
    data:          rows,
    columns:       colDefs,
    getCoreRowModel:       getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 whitespace-nowrap border-b border-slate-700 font-semibold">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50'}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-1.5 text-slate-300 whitespace-nowrap border-b border-slate-800/60">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Pág {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          {' · '}{rows.length} filas
          {columns.length > MAX_COLS && ` · ${columns.length - MAX_COLS} cols ocultas`}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-fast"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-fast"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
