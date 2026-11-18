export const formatRupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
export const queueLabel = (type: string, n: number) => (type === "direct" ? "L" : "P") + "-" + String(n).padStart(3, "0");
