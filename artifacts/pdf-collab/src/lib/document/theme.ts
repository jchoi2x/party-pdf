import WebViewer from "@pdftron/webviewer";

export function applyWebViewerTheme(_instance: Awaited<ReturnType<typeof WebViewer>>, dark: boolean) {
  const component = document.querySelector('apryse-webviewer') as HTMLElement | null;
  if (!component?.shadowRoot) return;
  const host = component.shadowRoot.host as HTMLElement;
  const style = host.style;
  if (dark) {
    style.setProperty("--gray-1", "#0d1421");
    style.setProperty("--gray-2", "#131d30");
    style.setProperty("--gray-3", "#1a2640");
    style.setProperty("--gray-4", "#263348");
    style.setProperty("--gray-5", "#4a5870");
    style.setProperty("--gray-6", "#8a9ab8");
    style.setProperty("--gray-7", "#b0bed8");
    style.setProperty("--gray-8", "#ccd4e8");
    style.setProperty("--gray-9", "#d8e0f0");
    style.setProperty("--gray-10", "#e4eaf8");
    style.setProperty("--gray-11", "#edf0fa");
    style.setProperty("--gray-12", "#ffffff");
    style.setProperty("--blue-1", "#0d1829");
    style.setProperty("--blue-2", "#111f38");
    style.setProperty("--blue-3", "#1a2e50");
    style.setProperty("--blue-4", "#1f3660");
    style.setProperty("--blue-5", "#3a5490");
    style.setProperty("--blue-6", "#7594d6");
  } else {
    const vars = [
      "--gray-1","--gray-2","--gray-3","--gray-4","--gray-5",
      "--gray-6","--gray-7","--gray-8","--gray-9","--gray-10",
      "--gray-11","--gray-12",
      "--blue-1","--blue-2","--blue-3","--blue-4","--blue-5","--blue-6",
    ];
    vars.forEach((v) => style.removeProperty(v));
  }
}
