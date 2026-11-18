import { getPreorderSlots } from "@/lib/catalog";
import { getSettings } from "@/server/settings";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CheckoutForm } from "@/components/customer/CheckoutForm";
export const dynamic = "force-dynamic";
export default async function CheckoutPage() {
  const [slots, st] = await Promise.all([getPreorderSlots(), getSettings()]);
  return (<main className="mx-auto max-w-xl space-y-4 p-5"><AutoRefresh ms={5000} /><h1 className="text-3xl font-extrabold">Checkout</h1><CheckoutForm slots={slots} directOpen={st.directOpen} preorderOpen={st.preorderOpen} /></main>);
}
