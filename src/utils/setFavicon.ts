// src/utils/setFavicon.ts
export function setFavicon(iconUrl: string) {
  if (!iconUrl) return;

  let link: HTMLLinkElement | null =
    document.querySelector("link[rel~='icon']");

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.href = iconUrl;
}
