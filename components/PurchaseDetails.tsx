/* eslint-disable react-hooks/exhaustive-deps */
// src/components/PurchaseDetails.tsx
import React, { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Product, Purchase } from "../types";

type Props = {
  prefillProduct?: Product | null;
};

export default function PurchaseDetails({ prefillProduct }: Props) {
  // ----- DEFAULT PRODUCTS -----
  const DEFAULT_PRODUCTS = (): Product[] => {
    const id = () =>
      crypto.randomUUID?.() ??
      `p-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return [
      {
        id: id(),
        productCode: "COT-001",
        productName: "Cotton Saree - Blue Stripes",
        description: "Soft cotton saree with blue stripes",
        colorCode: "Blue",
        quantity: "12",
      },
      {
        id: id(),
        productCode: "SLK-002",
        productName: "Silk Saree - Maroon",
        description: "Premium silk saree with elegant pattern",
        colorCode: "Maroon",
        quantity: "5",
      },
      {
        id: id(),
        productCode: "GRT-003",
        productName: "Georgette Saree - Pink",
        description: "Lightweight georgette saree",
        colorCode: "Pink",
        quantity: "8",
      },
      {
        id: id(),
        productCode: "LNN-004",
        productName: "Linen Saree - Green",
        description: "Pure linen saree for summer collection",
        colorCode: "Green",
        quantity: "6",
      },
      {
        id: id(),
        productCode: "KNC-005",
        productName: "Kanchipuram Silk - Gold Border",
        description: "Traditional Kanchipuram saree",
        colorCode: "Gold",
        quantity: "3",
      },
    ] as Product[];
  };

  const loadProducts = (): Product[] => {
    try {
      const raw = localStorage.getItem("products_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveProducts = (items: Product[]) => {
    localStorage.setItem("products_v1", JSON.stringify(items));
  };

  const [products, setProducts] = useState<Product[]>(() => loadProducts());

  useEffect(() => {
    if (!products || products.length === 0) {
      const defs = DEFAULT_PRODUCTS();
      setProducts(defs);
      saveProducts(defs);
    }
    // intentionally no deps to run once on mount
  }, []);

  // ----- PURCHASES -----
  const loadPurchases = (): Purchase[] => {
    try {
      const raw = localStorage.getItem("purchases_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const [purchases, setPurchases] = useState<Purchase[]>(loadPurchases);

  useEffect(() => {
    localStorage.setItem("purchases_v1", JSON.stringify(purchases));
  }, [purchases]);

  // ----- FORM & MODAL STATE -----
  const [showModal, setShowModal] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [quantity, setQuantity] = useState("");

  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Focus management
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);

  // Prefill from parent prop if provided
  useEffect(() => {
    if (!prefillProduct) return;

    setProductCode(prefillProduct.productCode ?? "");
    setProductName(prefillProduct.productName ?? "");
    setDescription(prefillProduct.description ?? "");
    setColorCode(prefillProduct.colorCode ?? "");
    setQuantity(prefillProduct.quantity ?? "");
    setDate(today);

    if (prefillProduct.id) {
      const found = products.find(
        (p) =>
          p.productCode === prefillProduct.productCode ||
          p.id === prefillProduct.id
      );
      if (found) setSelectedProductId(found.id);
      else setSelectedProductId("");
    }
  }, [prefillProduct, products, today]);

  // When selected product changes, prefill fields
  useEffect(() => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;
    setProductCode(prod.productCode ?? "");
    setProductName(prod.productName ?? "");
    setDescription(prod.description ?? "");
    setColorCode(prod.colorCode ?? "");
    setQuantity(prod.quantity ?? "");
    setDate(today);
  }, [selectedProductId, products, today]);

  function clearForm() {
    setDate(today);
    setProductCode("");
    setProductName("");
    setDescription("");
    setColorCode("");
    setQuantity("");
    setSelectedProductId("");
  }

  // ---------- Stock update helpers ----------
  function increaseProductStock(
    productIdOrCode: { id?: string; code?: string } | null,
    qtyToAdd: number
  ) {
    if (!productIdOrCode) return;
    const updated = products.map((p) => {
      const match =
        (productIdOrCode.id && p.id === productIdOrCode.id) ||
        (productIdOrCode.code && p.productCode === productIdOrCode.code);
      if (!match) return p;
      const prev = Number(p.quantity ?? "0") || 0;
      const next = prev + qtyToAdd;
      return { ...p, quantity: String(next) };
    });
    setProducts(updated);
    saveProducts(updated);
  }

  function decreaseProductStock(
    productIdOrCode: { id?: string; code?: string } | null,
    qtyToRemove: number
  ) {
    if (!productIdOrCode) return;
    const updated = products.map((p) => {
      const match =
        (productIdOrCode.id && p.id === productIdOrCode.id) ||
        (productIdOrCode.code && p.productCode === productIdOrCode.code);
      if (!match) return p;
      const prev = Number(p.quantity ?? "0") || 0;
      let next = prev - qtyToRemove;
      if (next < 0) next = 0;
      return { ...p, quantity: String(next) };
    });
    setProducts(updated);
    saveProducts(updated);
  }

  // ---------- Save Purchase (updates stock) ----------
  function handleSave(e?: React.FormEvent) {
    e?.preventDefault();

    if (!productName || !productCode || quantity === "") {
      alert("Please fill required fields (Product Code, Name, Quantity).");
      return;
    }

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Quantity must be a positive number.");
      return;
    }

    const newPurchase: Purchase = {
      id: crypto.randomUUID?.() ?? `pu-${Date.now()}`,
      productId: selectedProductId || undefined,
      date,
      productCode,
      productName,
      description,
      colorCode,
      quantity,
    };

    // 1) add purchase
    setPurchases((prev) => [...prev, newPurchase]);

    // 2) update stock: increase product's quantity if that default product exists (match by id first, then code)
    if (selectedProductId) {
      increaseProductStock({ id: selectedProductId }, qtyNum);
    } else {
      // try match by productCode
      const foundByCode = products.find((p) => p.productCode === productCode);
      if (foundByCode) increaseProductStock({ id: foundByCode.id }, qtyNum);
      else {
        // if no matching default product, optionally we could create a new product entry or skip
        // we'll skip stock update in that case
      }
    }

    clearForm();
    closeModal();
  }

  // ---------- Delete Purchase (revert stock) ----------
  function handleDelete(id: string) {
    const toDelete = purchases.find((p) => p.id === id);
    if (!toDelete) return;
    if (
      !confirm(
        "Delete this purchase? This will also revert stock changes if applicable."
      )
    )
      return;

    // revert stock: try to find product by productId or productCode and decrease
    const qtyNum = Number(toDelete.quantity) || 0;
    if (qtyNum > 0) {
      if (toDelete.productId) {
        decreaseProductStock({ id: toDelete.productId }, qtyNum);
      } else {
        const foundByCode = products.find(
          (p) => p.productCode === toDelete.productCode
        );
        if (foundByCode) decreaseProductStock({ id: foundByCode.id }, qtyNum);
      }
    }

    setPurchases((prev) => prev.filter((p) => p.id !== id));
  }

  function updateProduct(updated: Product) {
    const updatedList = products.map((p) =>
      p.id === updated.id ? updated : p
    );
    setProducts(updatedList);
    saveProducts(updatedList);
    if (selectedProductId === updated.id) {
      setProductCode(updated.productCode ?? "");
      setProductName(updated.productName ?? "");
      setDescription(updated.description ?? "");
      setColorCode(updated.colorCode ?? "");
      setQuantity(updated.quantity ?? "");
    }
  }

  // ---------- Modal helpers ----------
  function openModal() {
    previouslyFocusedElement.current = document.activeElement;
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setTimeout(() => {
      (previouslyFocusedElement.current as HTMLElement | null)?.focus?.();
      openButtonRef.current?.focus();
    });
  }

  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 0);

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeModal();
        }
        if (e.key === "Tab" && modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              (last as HTMLElement).focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              (first as HTMLElement).focus();
            }
          }
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [showModal]);

  function onOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) closeModal();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Purchase Entry</h2>

        <div className="flex gap-2">
          <button
            ref={openButtonRef}
            onClick={openModal}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Add Purchase
          </button>
        </div>
      </div>

      {/* Saved purchases table */}
      <div>
        <h3 className="text-lg font-semibold">Saved Purchases</h3>

        <table className="w-full border-collapse border mt-4 text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Sr</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Code</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-3 text-gray-500">
                  No purchases yet.
                </td>
              </tr>
            ) : (
              purchases.map((pu, idx) => (
                <tr key={pu.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-center">{idx + 1}</td>
                  <td className="border p-2">{pu.date}</td>
                  <td className="border p-2">{pu.productCode}</td>
                  <td className="border p-2">{pu.productName}</td>
                  <td className="border p-2">{pu.quantity}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleDelete(pu.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="text-red-600" size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Default products list */}
      <div>
        <h3 className="text-lg font-semibold mt-4">Default Products</h3>
        <div className="space-y-2 mt-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="p-2 border rounded flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  {p.productName} ({p.productCode})
                </div>
                <div className="text-sm text-gray-600">
                  {p.description} • {p.colorCode} • Qty: {p.quantity}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProductCode(p.productCode ?? "");
                    setProductName(p.productName ?? "");
                    setDescription(p.description ?? "");
                    setColorCode(p.colorCode ?? "");
                    setQuantity(p.quantity ?? "");
                    setDate(today);
                    setSelectedProductId(p.id);
                    openModal();
                  }}
                  className="px-3 py-1 bg-amber-100 rounded"
                >
                  Use
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newName =
                      prompt("Product Name", p.productName) ?? p.productName;
                    const newCode =
                      prompt("Product Code", p.productCode) ?? p.productCode;
                    const newDesc =
                      prompt("Description", p.description) ?? p.description;
                    const newColor =
                      prompt("Color Code", p.colorCode) ?? p.colorCode;
                    const newQty = prompt("Quantity", p.quantity) ?? p.quantity;

                    const updated: Product = {
                      ...p,
                      productName: newName,
                      productCode: newCode,
                      description: newDesc,
                      colorCode: newColor,
                      quantity: newQty,
                    };
                    updateProduct(updated);
                  }}
                  className="px-3 py-1 bg-gray-100 rounded"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onMouseDown={onOverlayClick}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Purchase"
            ref={modalRef}
            className="bg-white rounded-lg shadow-lg w-full max-w-3xl mx-4 p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Add Purchase</h3>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-sm block mb-1">
                  Use Default Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">-- Select default product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.productCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    if (products.length > 0)
                      setSelectedProductId(products[0].id);
                  }}
                  className="px-4 py-2 bg-gray-100 rounded"
                >
                  Use First Default
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="text-sm block mb-1">Date</label>
                <input
                  ref={firstInputRef}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm block mb-1">Product Code</label>
                <input
                  type="text"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="text-sm block mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="text-sm block mb-1">Available Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm block mb-1">Color Code</label>
                <input
                  type="text"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded"
                >
                  Save Purchase
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearForm();
                    closeModal();
                  }}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
