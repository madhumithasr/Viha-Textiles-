import { useState } from "react";
import { Search, Plus, Eye, Trash2 } from "lucide-react";
import { Client } from "../types";

export function ClientRegister() {
  const now = new Date().toISOString();

  // first default client
  const defaultClient: Client = {
    id: crypto.randomUUID(),
    sr_no: 1,
    client_name: "Ramesh Patel",
    mobile: "9876543210",
    alternate_mobile: "9123456780",
    city_area: "Ahmedabad",
    client_type: "Retail",
    gst_no: "24ABCDE1234F1Z5",
    opening_balance: 2500,
    notes: "Regular customer, prefers morning delivery.",
    created_at: now,
    updated_at: now,
  };

  // second default client
  const defaultClient2: Client = {
    id: crypto.randomUUID(),
    sr_no: 2,
    client_name: "Kiran Enterprises",
    mobile: "9012345678",
    alternate_mobile: "",
    city_area: "Mumbai",
    client_type: "Wholesale",
    gst_no: "27PQRS5678L9Z2",
    opening_balance: 12000,
    notes: "Bulk orders monthly. Payment usually by NEFT.",
    created_at: now,
    updated_at: now,
  };

  // initial client list
  const [clients, setClients] = useState<Client[]>(() => [
    defaultClient,
    defaultClient2,
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");

  const textFields = [
    "client_name",
    "mobile",
    "alternate_mobile",
    "city_area",
    "notes",
  ] as const;

  type TextField = (typeof textFields)[number];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formClient, setFormClient] = useState<Partial<Client> | null>(null);

  // new client modal
  function openNewClientForm() {
    const now = new Date().toISOString();
    setFormClient({
      client_name: "",
      mobile: "",
      city_area: "",
      created_at: now,
      updated_at: now,
    });
    setIsFormOpen(true);
  }

  function saveClientFromForm() {
    if (!formClient) return;

    if (!formClient.client_name && !formClient.mobile) {
      alert("Please enter at least a client name or mobile number.");
      return;
    }

    const now = new Date().toISOString();

    const newClient: Client = {
      id: crypto.randomUUID(),
      sr_no: clients.length + 1,
      client_name: formClient.client_name ?? "",
      mobile: formClient.mobile ?? "",
      alternate_mobile: formClient.alternate_mobile ?? "",
      city_area: formClient.city_area ?? "",
      client_type:
        (formClient.client_type as Client["client_type"]) ?? "Retail",
      gst_no: formClient.gst_no ?? "",
      opening_balance: formClient.opening_balance ?? 0,
      notes: formClient.notes ?? "",
      created_at: formClient.created_at ?? now,
      updated_at: now,
    };

    // insert at top
    setClients((prev) => [
      newClient,
      ...prev.map((c, i) => ({ ...c, sr_no: i + 2 })),
    ]);

    setIsFormOpen(false);
    setFormClient(null);
  }

  function cancelForm() {
    setIsFormOpen(false);
    setFormClient(null);
  }

  function updateClient<K extends keyof Client>(
    id: string,
    field: K,
    value: Client[K]
  ) {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        if (field !== "updated_at" && field !== "created_at") {
          updated.updated_at = new Date().toISOString();
        }
        return updated;
      })
    );
  }

  function updateClientString(id: string, field: TextField, value: string) {
    updateClient(id, field, value as Client[TextField]);
  }

  function deleteClient(id: string) {
    if (!confirm("Are you sure you want to delete this client?")) return;

    setClients((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      return filtered.map((c, idx) => ({ ...c, sr_no: idx + 1 }));
    });
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.mobile.includes(searchTerm);

    const matchesType = !filterType || client.client_type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="h-full flex flex-col bg-[#fefefe]">
      <div className="border-b-2 border-red-700 bg-amber-50 p-4">
        <h1 className="text-3xl font-bold text-red-800">Client Register</h1>
      </div>

      {/* Search / Filters */}
      <div className="p-4 bg-white border-b border-gray-300 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="px-4 py-2 border border-gray-300 rounded"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Retail">Retail</option>
          <option value="Wholesale">Wholesale</option>
          <option value="Dealer">Dealer</option>
          <option value="Other">Other</option>
        </select>

        <button
          onClick={openNewClientForm}
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          New Client
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-amber-100 border-b-2 border-red-700">
            <tr>
              <th className="border px-2 py-2">Sr No.</th>
              <th className="border px-2 py-2">Client Name</th>
              <th className="border px-2 py-2">Mobile</th>
              <th className="border px-2 py-2">Alt Mobile</th>
              <th className="border px-2 py-2">City/Area</th>
              <th className="border px-2 py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-yellow-50">
                <td className="border px-2 py-1 text-center">{client.sr_no}</td>

                {textFields.map((field) => (
                  <td key={field} className="border px-2 py-1">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 py-1 text-sm"
                      value={String(client[field] ?? "")}
                      onChange={(e) =>
                        updateClientString(client.id, field, e.target.value)
                      }
                    />
                  </td>
                ))}

                <td className="border px-2 py-1">
                  <div className="flex gap-1 justify-center">
                    <button className="p-1 hover:bg-blue-100 rounded">
                      <Eye className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isFormOpen && formClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-[95%] max-w-2xl p-4">
            <h2 className="text-xl font-semibold mb-2">New Client</h2>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm">Customer Name</label>
                <input
                  className="w-full border px-2 py-1 rounded"
                  value={formClient.client_name ?? ""}
                  onChange={(e) =>
                    setFormClient({
                      ...formClient,
                      client_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm">City/area</label>
                <input
                  className="w-full border px-2 py-1 rounded"
                  value={formClient.city_area ?? ""}
                  onChange={(e) =>
                    setFormClient({ ...formClient, city_area: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm">Mobile Number</label>
                <input
                  className="w-full border px-2 py-1 rounded"
                  value={formClient.mobile ?? ""}
                  onChange={(e) =>
                    setFormClient({ ...formClient, mobile: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={cancelForm}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-amber-600 text-white"
                onClick={saveClientFromForm}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
