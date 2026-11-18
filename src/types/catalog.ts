export type OptionItem = { id: string; name: string; extra_price: number; is_available: boolean };
export type OptionGroup = { id: string; name: string; is_required: boolean; min_select: number; max_select: number; option_items: OptionItem[] };
export type Product = { id: string; name: string; slug: string; description: string | null; ingredients?: string | null; base_price: number; image_url: string | null; is_available: boolean; option_groups?: OptionGroup[] };
export type CartOption = { groupName: string; itemId: string; name: string; extra: number };
export type CartItem = { key: string; productId: string; slug: string; name: string; unitPrice: number; qty: number; options: CartOption[] };
