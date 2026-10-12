import Link from "next/link";
import NewGiveawayForm from "@/components/admin/giveaways/NewGiveawayForm";
import { requireGiveawayAdmin } from "@/lib/giveaways/admin-access";

export const metadata = { title: "New giveaway" };

export default async function NewGiveawayPage() {
  await requireGiveawayAdmin();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/giveaways" className="text-sm text-warm-600 hover:text-pink-700">
        ← Giveaways
      </Link>
      <h1 className="mt-3 text-3xl">New giveaway</h1>
      <p className="mt-2 text-warm-700">
        Start with the prize and when it ends. You&rsquo;ll set up entries and your
        organization&rsquo;s details next, and nothing is public until you go live.
      </p>
      <div className="mt-6 rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
        <NewGiveawayForm />
      </div>
    </div>
  );
}
