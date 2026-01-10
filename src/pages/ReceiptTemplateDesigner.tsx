import React from "react";
import api from "../services/api";

type Tpl = {
  _id: string;
  name: string;
  html: string;
  css: string;
  isDefault?: boolean;
  isActive?: boolean;
  updatedAt?: string;
};

const ReceiptTemplateDesigner: React.FC = () => {
  const [items, setItems] = React.useState<Tpl[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [name, setName] = React.useState("");
  const [html, setHtml] = React.useState("");
  const [css, setCss] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [previewHtml, setPreviewHtml] = React.useState<string>("");

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get("/receipt-templates");
      setItems(res.data?.items || []);
      const def = (res.data?.items || []).find((x: Tpl) => x.isDefault) || (res.data?.items || [])[0];
      if (def?._id) {
        setSelectedId(def._id);
        setName(def.name);
        setHtml(def.html);
        setCss(def.css || "");
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchList();
  }, []);

  const onSelect = (t: Tpl) => {
    setSelectedId(t._id);
    setName(t.name);
    setHtml(t.html);
    setCss(t.css || "");
  };

  const save = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.put(`/receipt-templates/${selectedId}`, { name, html, css });
      await fetchList();
      alert("Đã lưu template");
    } finally {
      setLoading(false);
    }
  };

  const setDefault = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.post(`/receipt-templates/${selectedId}/set-default`, {});
      await fetchList();
      alert("Đã đặt làm mặc định");
    } finally {
      setLoading(false);
    }
  };

  const preview = async () => {
    setLoading(true);
    try {
      // preview trả về HTML
      const res = await api.post(`/receipt-templates/preview`, { html, css }, { responseType: "text" as any });
      setPreviewHtml(String(res.data || ""));
    } finally {
      setLoading(false);
    }
  };

  const printTest = () => {
    if (!selectedId) return;
    // Bạn có thể in thử bằng orderId thật:
    // window.open(`${process.env.REACT_APP_API_URL}/print/receipt/${orderId}?templateId=${selectedId}`, "_blank");
    alert("In thử: hãy dùng orderId thật rồi mở /print/receipt/:orderId?templateId=...");
  };

  const VarHelp = () => (
    <div className="text-xs text-gray-600 space-y-1">
      <div className="font-bold text-gray-800">Biến có sẵn (copy dùng):</div>
      <div><code>{"{{store.name}}"}</code>, <code>{"{{store.address}}"}</code>, <code>{"{{store.phone}}"}</code>, <code>{"{{store.logoUrl}}"}</code></div>
      <div><code>{"{{order.orderNumber}}"}</code>, <code>{"{{order.createdAt}}"}</code>, <code>{"{{order.barcodeDataUrl}}"}</code></div>
      <div><code>{"{{qr.dataUrl}}"}</code>, <code>{"{{qr.text}}"}</code></div>
      <div><code>{"{{cashier.name}}"}</code></div>
      <div className="mt-1">
        Items:
        <code className="ml-2">
          {"{{#each items}} ... {{name}} {{qty}} {{price}} {{total}} ... {{/each}}"}
        </code>
      </div>
      <div>
        Summary:
        <code className="ml-2">
          {"{{summary.subtotal}} {{summary.discount}} {{summary.extraFee}} {{summary.total}}"}
        </code>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      <div className="text-xl font-extrabold">Thiết kế Bill 80mm</div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1 border rounded-lg p-3 bg-white">
          <div className="font-bold mb-2">Templates</div>
          {loading && <div className="text-sm text-gray-500">Loading...</div>}
          <div className="space-y-2">
            {items.map((t) => (
              <button
                key={t._id}
                className={`w-full text-left px-3 py-2 rounded border ${
                  selectedId === t._id ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => onSelect(t)}
              >
                <div className="font-bold text-sm">
                  {t.name} {t.isDefault ? <span className="text-pink-600">(Default)</span> : null}
                </div>
                <div className="text-xs text-gray-500">{t._id}</div>
              </button>
            ))}
          </div>

          <div className="mt-3">
            <button onClick={setDefault} className="w-full px-3 py-2 rounded bg-pink-500 text-white font-bold">
              Set Default
            </button>
          </div>

          <div className="mt-3">
            <VarHelp />
          </div>
        </div>

        <div className="md:col-span-3 space-y-3">
          <div className="border rounded-lg p-3 bg-white space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded px-3 py-2"
                placeholder="Tên template"
              />
              <div className="flex gap-2">
                <button onClick={save} className="px-3 py-2 rounded bg-green-600 text-white font-bold">
                  Lưu
                </button>
                <button onClick={preview} className="px-3 py-2 rounded border font-bold">
                  Preview
                </button>
                <button onClick={printTest} className="px-3 py-2 rounded border font-bold">
                  In thử
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="font-bold text-sm mb-1">HTML (Handlebars)</div>
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  className="w-full border rounded p-2 h-[360px] font-mono text-xs"
                />
              </div>
              <div>
                <div className="font-bold text-sm mb-1">CSS</div>
                <textarea
                  value={css}
                  onChange={(e) => setCss(e.target.value)}
                  className="w-full border rounded p-2 h-[360px] font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-white">
            <div className="font-bold mb-2">Preview 80mm</div>
            <div className="border rounded bg-gray-50 p-2 overflow-auto">
              <iframe
                title="preview"
                style={{ width: "320px", height: "600px", border: "1px solid #ddd", background: "white" }}
                srcDoc={previewHtml || "<div style='padding:10px;color:#666'>Bấm Preview để xem</div>"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptTemplateDesigner;
