// src/utils/qzPrint80.ts
import * as qz from "qz-tray";
import axios from "axios";

let connecting: Promise<void> | null = null;

async function qzEnsureConnected() {
  qz.api.setPromiseType((resolver: (resolve: any, reject: any) => void) => new Promise(resolver));
  if (qz.websocket.isActive()) return;

  if (!connecting) {
    connecting = (async () => {
      try {
        await qz.websocket.connect();
      } finally {
        connecting = null;
      }
    })();
  }
  return connecting;
}

export async function qzPrint80({ orderId }: { orderId: string }) {
  await qzEnsureConnected();

  // ✅ chọn máy in: ưu tiên tên chứa PT210, nếu không có thì lấy default
  let printer = "";
  try {
    printer = await qz.printers.find("PT210");
  } catch {
    printer = await qz.printers.getDefault();
  }

  // ✅ lấy HTML bill từ backend
  const PRINT_BASE = (process.env.REACT_APP_PRINT_BASE as string) || "http://localhost:9009";
  const url = `${PRINT_BASE}/print/receipt/${encodeURIComponent(orderId)}?paper=80`;

  const html = await axios.get(url).then(r => String(r.data || ""));

  const cfg = qz.configs.create(printer, {
    scaleContent: true,
    rasterize: true,
    copies: 1,
  });

  // QZ in HTML
  await qz.print(cfg, [{ type: "html", format: "plain", data: html }]);
}
