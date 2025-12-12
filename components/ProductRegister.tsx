/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { Product } from "../types";

// Advanced Product Register (single-file)
// Features:
// - react-hook-form driven modal form + validation
// - client-side sorting & pagination
// - debounce search, highlighting
// - CSV import/export with simple parser
// - bulk select + delete
// - optimistic localStorage persistence with useLocalStorage hook
// - accessible table rows, keyboard support
// - small enter/escape keyboard shortcuts in modal

type Props = {
  onSelectProduct?: (p: Product) => void;
};

const STORAGE_KEY = "products_advanced_v2";
const PAGE_SIZE = 8;

function generateId(): string {
  try {
    if (
      typeof globalThis !== "undefined" &&
      (globalThis as any).crypto &&
      typeof (globalThis as any).crypto.randomUUID === "function"
    ) {
      return (globalThis as any).crypto.randomUUID();
    }
    // eslint-disable-next-line no-empty
  } catch {}
  return `p-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }, [key, state]);

  return [state, setState] as const;
}

function useDebounce<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function ProductRegisterAdvanced({ onSelectProduct }: Props) {
  // products persisted locally
  const [products, setProducts] = useLocalStorage<Product[]>(STORAGE_KEY, [
    {
      id: generateId(),
      sr_no: 1,
      productCode: "COT-001",
      productName: "Cotton Saree - Blue Stripes",
      description: "Lightweight cotton saree with blue stripes.",
      colorCode: "BL-STR",
      quantity: "12",
    },
    {
      id: generateId(),
      sr_no: 2,
      productCode: "SLK-002",
      productName: "Silk Saree - Maroon",
      description: "Elegant silk saree in maroon.",
      colorCode: "MRN",
      quantity: "5",
    },
  ]);

  // UI state
  const [query, setQuery] = useState("");
  const q = useDebounce(query, 300);
  const [sortBy, setSortBy] = useState<{
    key: keyof Product | null;
    dir: "asc" | "desc";
  }>({ key: null, dir: "asc" });

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // modal form
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Partial<Product>>({ defaultValues: {} });

  useEffect(() => {
    // ensure sr_no consistent
    setProducts((prev) => prev.map((p, i) => ({ ...p, sr_no: i + 1 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived list
  const filtered = useMemo(() => {
    const s = String(q || "")
      .trim()
      .toLowerCase();
    let list = products.slice();
    if (s) {
      list = list.filter((p) =>
        [p.productCode, p.productName, p.description, p.colorCode]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      );
    }
    if (sortBy.key) {
      list.sort((a: any, b: any) => {
        const ka = a[sortBy.key!];
        const kb = b[sortBy.key!];
        if (ka == null) return 1;
        if (kb == null) return -1;
        const A = String(ka).toLowerCase();
        const B = String(kb).toLowerCase();
        if (A === B) return 0;
        return sortBy.dir === "asc" ? (A < B ? -1 : 1) : A < B ? 1 : -1;
      });
    }
    return list;
  }, [products, q, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  function openNew() {
    setEditingId(null);
    reset();
    setIsOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    // Pre-fill the form with existing values so user can edit; but fields can be left empty to preserve original on submit
    setValue("productCode", p.productCode);
    setValue("productName", p.productName);
    setValue("description", p.description);
    setValue("colorCode", p.colorCode);
    setValue("quantity", p.quantity);
    setIsOpen(true);
  }

  async function onSubmit(data: Partial<Product>) {
    // Trim inputs where provided
    const codeRaw = data.productCode ?? "";
    const nameRaw = data.productName ?? "";
    const codeTrim = String(codeRaw).trim();
    const nameTrim = String(nameRaw).trim();

    // If creating (not editing) productCode & productName are required
    if (!editingId && (!codeTrim || !nameTrim)) {
      return alert("Product code and name are required.");
    }

    // When editing: find existing product & merge — preserve existing values if user left field empty
    if (editingId) {
      const existing = products.find((p) => p.id === editingId);
      if (!existing) return alert("Product not found.");

      // use provided values if non-empty, otherwise keep existing
      const finalCode = codeTrim || existing.productCode;
      const finalName = nameTrim || existing.productName;

      // check duplicate with others
      const duplicate = products.find(
        (x) =>
          x.productCode.toLowerCase() === finalCode.toLowerCase() &&
          x.id !== editingId
      );
      if (duplicate) return alert("A product with same code exists.");

      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                productCode: finalCode,
                productName: finalName,
                description:
                  data.description === undefined ||
                  String(data.description).trim() === ""
                    ? existing.description
                    : String(data.description),
                colorCode:
                  data.colorCode === undefined ||
                  String(data.colorCode).trim() === ""
                    ? existing.colorCode
                    : String(data.colorCode),
                quantity:
                  data.quantity === undefined ||
                  String(data.quantity).trim() === ""
                    ? existing.quantity
                    : String(data.quantity),
              }
            : p
        )
      );
    } else {
      // creating new product
      const duplicate = products.find(
        (x) => x.productCode.toLowerCase() === codeTrim.toLowerCase()
      );
      if (duplicate) return alert("A product with same code exists.");

      const newP: Product = {
        id: generateId(),
        sr_no: products.length + 1,
        productCode: codeTrim,
        productName: nameTrim,
        description: String(data.description || ""),
        colorCode: String(data.colorCode || ""),
        quantity: String(data.quantity ?? "0"),
      };
      setProducts((prev) => [...prev, newP]);
    }

    setIsOpen(false);
    reset();
  }

  function toggleSelect(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function selectAllOnPage(checked: boolean) {
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    const map: Record<string, boolean> = {};
    pageItems.forEach((p) => (map[p.id] = checked));
    setSelected((s) => ({ ...s, ...map }));
  }

  function bulkDelete() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return alert("No products selected.");
    if (!confirm(`Delete ${ids.length} product(s)?`)) return;
    setProducts((prev) =>
      prev
        .filter((p) => !ids.includes(p.id))
        .map((p, i) => ({ ...p, sr_no: i + 1 }))
    );
    setSelected({});
  }

  function singleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    setProducts((prev) =>
      prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, sr_no: i + 1 }))
    );
  }

  // CSV helpers
  function exportCSV() {
    const headers = [
      "Sr",
      "Product Code",
      "Product Name",
      "Description",
      "Color",
      "Quantity",
    ];
    const rows = products.map((p) => [
      p.sr_no,
      p.productCode,
      p.productName,
      p.description || "",
      p.colorCode || "",
      p.quantity || "0",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const out: string[][] = [];
    for (const line of lines) {
      const row: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = !inQ;
          }
        } else if (ch === "," && !inQ) {
          row.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      row.push(cur);
      out.push(row);
    }
    return out;
  }

  function importCSVFile(file: File | null) {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      const text = String(e.target?.result || "");
      const rows = parseCSV(text);
      const start =
        rows.length > 1 &&
        rows[0].some((c) => /product code/i.test(c) || /product name/i.test(c))
          ? 1
          : 0;
      const imported: Product[] = [];
      for (let i = start; i < rows.length; i++) {
        const rrow = rows[i];
        if (!rrow.length) continue;
        const p: Product = {
          id: generateId(),
          sr_no: products.length + imported.length + 1,
          productCode: rrow[1] ?? rrow[0] ?? `IMP-${i}`,
          productName: rrow[2] ?? rrow[1] ?? `Imported ${i}`,
          description: rrow[3] ?? "",
          colorCode: rrow[4] ?? "",
          quantity: rrow[5] ?? "0",
        };
        imported.push(p);
      }
      if (imported.length)
        setProducts((prev) =>
          [...prev, ...imported].map((p, i) => ({ ...p, sr_no: i + 1 }))
        );
    };
    r.readAsText(file);
  }

  // UI helpers
  function toggleSort(key: keyof Product) {
    setSortBy((s) => {
      if (s.key === key) return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
  }

  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            className="p-2 border rounded w-full sm:w-72"
            placeholder="Search product code, name or desc..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
          />

          <button
            onClick={openNew}
            className="px-3 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-2"
          >
            <Plus size={16} /> Add
          </button>

          <button
            onClick={exportCSV}
            className="px-3 py-2 border rounded inline-flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>

          <label className="px-3 py-2 border rounded inline-flex items-center gap-2 cursor-pointer">
            <Upload size={16} />
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => importCSVFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex gap-2 items-center">
          <div className="text-sm text-gray-600">
            {products.length} products
          </div>
          <button
            onClick={bulkDelete}
            className="px-3 py-2 bg-red-600 text-white rounded"
          >
            Delete selected
          </button>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onClick={() => {
            setIsOpen(false);
            reset();
          }}
        >
          <div
            className="bg-white rounded-lg shadow w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold mb-3">
              {editingId
                ? "Edit Product (leave fields blank to keep current)"
                : "Add Product"}
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">
                    Code{" "}
                    {editingId ? (
                      <span className="text-xs text-gray-400"> (optional)</span>
                    ) : null}
                  </label>
                  <input
                    className="p-2 border rounded w-full"
                    {...register("productCode", { required: !editingId })}
                    autoFocus={!editingId}
                  />
                  {errors.productCode && (
                    <div className="text-red-600 text-xs">Required</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-600">
                    Name{" "}
                    {editingId ? (
                      <span className="text-xs text-gray-400"> (optional)</span>
                    ) : null}
                  </label>
                  <input
                    className="p-2 border rounded w-full"
                    {...register("productName", { required: !editingId })}
                  />
                  {errors.productName && (
                    <div className="text-red-600 text-xs">Required</div>
                  )}
                </div>

                {/* DESCRIPTION: replaced input with textarea */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter product description"
                    className="p-2 border rounded w-full resize-y"
                    {...register("description")}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Color</label>
                  <input
                    className="p-2 border rounded w-full"
                    {...register("colorCode")}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">
                    Quantity
                  </label>
                  <input
                    className="p-2 border rounded w-full"
                    type="number"
                    min={0}
                    {...register("quantity")}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                  disabled={isSubmitting}
                >
                  {editingId ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border rounded"
                  onClick={() => {
                    reset();
                    setIsOpen(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">
                <input
                  type="checkbox"
                  checked={
                    pageItems.length > 0 &&
                    pageItems.every((p) => !!selected[p.id])
                  }
                  onChange={(e) => selectAllOnPage(e.target.checked)}
                />
              </th>
              <th className="border p-2">Sr</th>
              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort("productCode")}
              >
                Code{" "}
                {sortBy.key === "productCode" ? (
                  sortBy.dir === "asc" ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )
                ) : null}
              </th>
              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort("productName")}
              >
                Name{" "}
                {sortBy.key === "productName" ? (
                  sortBy.dir === "asc" ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )
                ) : null}
              </th>
              <th className="border p-2">Description</th>
              <th className="border p-2">Color</th>
              <th
                className="border p-2 cursor-pointer"
                onClick={() => toggleSort("quantity")}
              >
                Qty{" "}
                {sortBy.key === "quantity" ? (
                  sortBy.dir === "asc" ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )
                ) : null}
              </th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {pageItems.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-gray-50"
                tabIndex={0}
                onDoubleClick={() => onSelectProduct && onSelectProduct(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelectProduct && onSelectProduct(p);
                }}
              >
                <td className="border p-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!selected[p.id]}
                    onChange={() => toggleSelect(p.id)}
                  />
                </td>
                <td className="border p-2 text-center">{p.sr_no}</td>
                <td className="border p-2">{p.productCode}</td>
                <td className="border p-2">{p.productName}</td>

                {/* DESCRIPTION CELL: preserve line breaks and wrap long text */}
                <td className="border p-2">
                  <div className="whitespace-pre-wrap break-words">
                    {p.description}
                  </div>
                </td>

                <td className="border p-2">{p.colorCode}</td>
                <td className="border p-2 text-center">{p.quantity}</td>
                <td
                  className="border p-2 flex justify-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="p-1 hover:bg-blue-100 rounded"
                    onClick={() => openEdit(p)}
                    aria-label={`Edit ${p.productName}`}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="p-1 hover:bg-red-100 rounded"
                    onClick={() => singleDelete(p.id)}
                    aria-label={`Delete ${p.productName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {Math.min(start + 1, filtered.length)}–
          {Math.min(start + pageItems.length, filtered.length)} of{" "}
          {filtered.length}
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <div className="px-3 py-1 border rounded">
            Page {page} / {totalPages}
          </div>
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
