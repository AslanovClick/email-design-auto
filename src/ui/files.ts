// Картинки храним как data URL: так они переживают перезагрузку (черновик в IndexedDB)
// и без лишних шагов попадают в экспорт.

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function pickImage(): Promise<{ url: string; name: string } | null> {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      resolve(f ? { url: await readAsDataUrl(f), name: f.name } : null);
    };
    inp.click();
  });
}
