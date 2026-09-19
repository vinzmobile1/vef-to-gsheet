import React, { useState, useMemo } from "react";
import {
  Search,
  Layers,
  Box,
  CheckCircle2,
  Package,
  Boxes,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { ItemSummaryRow } from "../types";

interface DataPreviewTableProps {
  data: ItemSummaryRow[];
  headers: string[];
  totalCount: number;
  lastUpdated?: string;
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
  data,
  headers,
  totalCount,
  lastUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Extract unique item groups for filter
  const itemGroups = useMemo(() => {
    const groups = new Set<string>();
    data.forEach((item) => {
      if (item.item_group) groups.add(item.item_group);
    });
    return Array.from(groups).sort();
  }, [data]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (row.item && String(row.item).toLowerCase().includes(q)) ||
        (row.item_name && String(row.item_name).toLowerCase().includes(q)) ||
        (row.brand && String(row.brand).toLowerCase().includes(q)) ||
        (row.item_group && String(row.item_group).toLowerCase().includes(q)) ||
        (row.parent_item_group && String(row.parent_item_group).toLowerCase().includes(q));

      const matchesGroup =
        selectedGroup === "ALL" || row.item_group === selectedGroup;

      return matchesSearch && matchesGroup;
    });
  }, [data, searchQuery, selectedGroup]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalActual = 0;
    let totalAvailable = 0;
    let totalReserved = 0;

    data.forEach((row) => {
      const act = Number(row.actual_qty) || 0;
      const avl = Number(row.available_qty) || 0;
      const res = Number(row.reserved_qty) || 0;
      totalActual += act;
      totalAvailable += avl;
      totalReserved += res;
    });

    return {
      totalItems: data.length,
      totalActual,
      totalAvailable,
      totalReserved,
      groupsCount: itemGroups.length,
    };
  }, [data, itemGroups]);

  // Paginated rows
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <Package className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Belum Ada Data Item Summary
        </h3>
        <p className="text-xs text-slate-700 max-w-md mx-auto mt-1">
          Klik tombol <b>"Tarik & Ekspor ke Google Sheets"</b> atau <b>"Pratinjau Data"</b> di atas untuk menarik data real-time dari ERPNext Frappe VEF.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Item SKU</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {stats.totalItems.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            {stats.groupsCount} Kategori Item Group
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Actual QTY</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {stats.totalActual.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            Stok fisik gudang
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Available QTY</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {stats.totalAvailable.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-indigo-600 mt-0.5 font-medium">
            Siap dijual / dipesan
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Reserved QTY</span>
            <Box className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {stats.totalReserved.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5 font-medium">
            Dalam pesanan tertahan
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filter & Search Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight whitespace-nowrap">
              Pratinjau Data Ekspor
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              {filteredData.length} baris
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari item, kode, brand..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter by Item Group */}
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kategori</option>
              {itemGroups.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-3 px-3.5 whitespace-nowrap">#</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Item Code</th>
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[200px]">Item Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Brand</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Item Group</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Parent Item Group</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Actual QTY</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Available QTY</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Reserved QTY</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">UOM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => {
                  const actualIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px]">
                        {actualIdx}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {row.item}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-800">
                        {row.item_name || "-"}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap">
                        {row.brand || "-"}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] whitespace-nowrap">
                          {row.item_group || "-"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 text-[11px] whitespace-nowrap">
                        {row.parent_item_group || "-"}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                        {Number(row.actual_qty).toLocaleString("id-ID")}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-emerald-600">
                        {Number(row.available_qty).toLocaleString("id-ID")}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-amber-600">
                        {Number(row.reserved_qty).toLocaleString("id-ID")}
                      </td>
                      <td className="py-2.5 px-3.5 text-center text-slate-500 font-medium text-[11px]">
                        {row.uom || "-"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data yang sesuai dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <div>
            Menampilkan{" "}
            <span className="font-semibold text-slate-800">
              {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredData.length)}
            </span>{" "}
            dari <span className="font-semibold text-slate-800">{filteredData.length}</span> data
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition font-medium"
            >
              Sebelumnya
            </button>
            <span className="px-2 text-slate-700">
              Hal {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition font-medium"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
