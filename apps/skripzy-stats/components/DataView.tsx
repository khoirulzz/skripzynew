'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useAppStore } from '@/lib/store';

export function DataView() {
  const { dataset, variables, updateDataCell } = useAppStore();

  const columns = React.useMemo<ColumnDef<any>[]>(() => {
    return variables.map((v) => ({
      header: v.name,
      accessorKey: v.name,
      cell: (info) => {
        const initialValue = info.getValue() as string;
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [value, setValue] = React.useState(initialValue);

        const onBlur = () => {
          updateDataCell(info.row.index, info.column.id, value);
        };

        // eslint-disable-next-line react-hooks/rules-of-hooks
        React.useEffect(() => {
          setValue(initialValue);
        }, [initialValue]);

        return (
          <input
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            className="w-full min-w-[80px] bg-transparent outline-none px-3 py-2 text-xs sm:text-sm focus:bg-indigo-50 focus:text-indigo-900 transition-colors"
          />
        );
      },
    }));
  }, [variables, updateDataCell]);

  const table = useReactTable({
    data: dataset,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (variables.length === 0) {
    return (
      <div className="flex bg-slate-50 h-full w-full items-center justify-center text-slate-500 font-mono text-sm p-6 text-center">
        Belum ada variabel. Silakan impor data atau tambahkan variabel di menu "Variable View".
      </div>
    );
  }

  return (
    <div className="overflow-auto bg-white h-full w-full">
      <table className="w-full min-w-max text-left border-collapse font-sans text-xs sm:text-sm">
        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b border-slate-200">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              <th className="px-3 py-2 border-r border-slate-200 text-slate-400 font-bold uppercase tracking-wider w-10 text-center">
                #
              </th>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 border-r border-slate-200 text-slate-600 font-bold uppercase tracking-wider whitespace-nowrap">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              <td className="border-r border-slate-200 text-slate-400 text-center font-mono text-xs bg-slate-50">
                {row.index + 1}
              </td>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border-r border-slate-200 whitespace-nowrap p-0 m-0 text-slate-700">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="p-3 sm:p-4 border-t border-slate-200">
        <button 
          onClick={() => {
            const emptyRow = variables.reduce((acc, v) => ({ ...acc, [v.name]: '' }), {});
            useAppStore.getState().setDataset([...dataset, emptyRow]);
          }}
          className="text-xs sm:text-sm text-indigo-600 font-bold tracking-wider hover:text-indigo-500 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors uppercase"
        >
          + Tambah Data
        </button>
      </div>
    </div>
  );
}
