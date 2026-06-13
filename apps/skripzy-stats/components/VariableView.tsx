'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useAppStore, Variable } from '@/lib/store';
import { Plus } from 'lucide-react';
import { Tooltip } from '@/components/Tooltip';

export function VariableView() {
  const { variables, setVariables, updateVariable } = useAppStore();

  const columns = React.useMemo<ColumnDef<Variable>[]>(() => {
    return [
      {
        header: () => (
          <Tooltip content="Kode atau nama singkat untuk variabel (misal: X1, Y, Usia)." position="bottom">
            <span>Nama</span>
          </Tooltip>
        ),
        accessorKey: 'name',
        cell: (info) => (
          <input
            className="w-full bg-transparent outline-none px-3 py-2 text-xs sm:text-sm focus:bg-indigo-50 focus:text-indigo-900 transition-colors"
            value={info.getValue() as string}
            onChange={(e) => updateVariable(info.row.index, 'name', e.target.value)}
          />
        ),
      },
      {
        header: () => (
          <Tooltip content="Deskripsi detail dari variabel agar lebih mudah dibaca di tabel output." position="bottom">
            <span>Label</span>
          </Tooltip>
        ),
        accessorKey: 'label',
        cell: (info) => (
          <input
            className="w-full bg-transparent outline-none px-3 py-2 text-xs sm:text-sm focus:bg-indigo-50 focus:text-indigo-900 transition-colors"
            value={info.getValue() as string}
            onChange={(e) => updateVariable(info.row.index, 'label', e.target.value)}
          />
        ),
      },
      {
        header: () => (
          <Tooltip content="Numerik untuk angka yang bisa dihitung, String untuk teks/kategori (Nama, ID)." position="bottom">
            <span>Tipe</span>
          </Tooltip>
        ),
        accessorKey: 'type',
        cell: (info) => (
          <select
            className="w-full bg-transparent outline-none px-3 py-2 text-xs sm:text-sm focus:bg-indigo-50 focus:text-indigo-900 transition-colors appearance-none cursor-pointer"
            value={info.getValue() as string}
            onChange={(e) => updateVariable(info.row.index, 'type', e.target.value)}
          >
            <option value="Numeric" className="bg-white text-slate-800">Numerik</option>
            <option value="String" className="bg-white text-slate-800">String (Teks)</option>
          </select>
        ),
      },
      {
        header: () => (
          <Tooltip content="Skala (angka kuantitatif), Nominal (kategori tanpa urutan), Ordinal (kategori berurutan)." position="bottom">
            <span>Ukuran</span>
          </Tooltip>
        ),
        accessorKey: 'measure',
        cell: (info) => (
          <select
            className="w-full bg-transparent outline-none px-3 py-2 text-xs sm:text-sm focus:bg-indigo-50 focus:text-indigo-900 transition-colors appearance-none cursor-pointer"
            value={info.getValue() as string}
            onChange={(e) => updateVariable(info.row.index, 'measure', e.target.value)}
          >
            <option value="Nominal" className="bg-white text-slate-800">Nominal</option>
            <option value="Ordinal" className="bg-white text-slate-800">Ordinal</option>
            <option value="Scale" className="bg-white text-slate-800">Skala (Scale)</option>
          </select>
        ),
      },
    ];
  }, [updateVariable]);

  const table = useReactTable({
    data: variables,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const addVariable = () => {
    const newCount = variables.length + 1;
    setVariables([
      ...variables,
      {
        id: `var_${Date.now()}`,
        name: `VAR${String(newCount).padStart(3, '0')}`,
        label: '',
        type: 'Numeric',
        measure: 'Scale'
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-white space-y-0">
      <div className="flex justify-start p-3 sm:p-4 border-b border-slate-200 bg-slate-50">
        <button
          onClick={addVariable}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-sm transition-colors text-white"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Tambah Variabel
        </button>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-max text-left border-collapse font-sans text-xs sm:text-sm">
          <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                <th className="px-3 py-2 border-b border-r border-slate-200 text-slate-400 font-bold uppercase tracking-wider w-10 text-center">
                  #
                </th>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 border-b border-r border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
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
      </div>
    </div>
  );
}
