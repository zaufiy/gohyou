import { z } from "zod";
export const orderSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(60, "Nama maksimal 60 karakter"),
  whatsapp: z.string().trim().regex(/^(\+62|62|0)8\d{7,12}$/, "Format nomor WhatsApp tidak valid").optional().or(z.literal("")),
  type: z.enum(["direct", "preorder"]),
  slotId: z.string().uuid().nullable().optional(),
  agreed: z.literal(true, { errorMap: () => ({ message: "Setujui ketentuan pesanan terlebih dahulu" }) }),
  items: z.array(z.object({
    productId: z.string().uuid(), qty: z.number().int().min(1).max(50), optionIds: z.array(z.string().uuid()).max(20),
  })).min(1, "Keranjang kosong").max(30),
});
