export function printByIframe(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;

    iframe.onload = () => {
      try {
        const w = iframe.contentWindow;
        if (!w) throw new Error("NO_IFRAME_WINDOW");

        w.focus();
        w.print(); // ✅ bật print dialog ngay
        setTimeout(() => {
          iframe.remove();
          resolve();
        }, 800);
      } catch (e) {
        iframe.remove();
        reject(e);
      }
    };

    iframe.onerror = () => {
      iframe.remove();
      reject(new Error("IFRAME_LOAD_FAILED"));
    };

    document.body.appendChild(iframe);
  });
}
