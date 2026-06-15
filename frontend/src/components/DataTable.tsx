import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface DataTableProps {
  data:    Record<string, unknown>[]
  columns?: ColumnDef<Record<string, unknown>>[]
  pageSize?: number
}

function autoColumns(data: Record<string, unknown>[]): ColumnDef<Record<string, unknown>>[] {
  if (!data.length) return []
  return Object.keys(data[0]).map((key) => ({
    accessorKey: key,
    header:      key,
    cell: ({ getValue }) => {
      const v = getValue()
      if (v === null || v === undefined) return <span className="text-slate-500">-</span>
      return <span>{String(v)}</span>
    },
  }))
}

export default function DataTable({ data, columns: propColumns, pageSize = 20 }: DataTableProps) {
  const [sorting,       setSorting]       = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columns = useMemo(
    () => propColumns ?? autoColumns(data),
    [propColumns, data]
  )

  const table = useReactTable({
    data,
    columns,
    state:              { sorting, columnFilters },
    onSortingChange:    setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel:    getCoreRowModel(),
    getSortedRowModel:  getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc'  && <ChevronUp size={12} />}
                      {header.column.getIsSorted() === 'desc' && <ChevronDown size={12} />}
                      {!header.column.getIsSorted()           && <ChevronsUpDown size={12} className="text-slate-600" />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800 transition-fast">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Mostrando {table.getRowModel().rows.length} de {data.length} filas</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 bg-slate-700 rounded disabled:opacity-40 hover:bg-slate-600 transition-fast"
          >Anterior</button>
          <span>Pág {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 bg-slate-700 rounded disabled:opacity-40 hover:bg-slate-600 transition-fast"
          >Siguiente</button>
        </div>
      </div>
    </div>
  )
}
