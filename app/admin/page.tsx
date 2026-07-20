import CreateCharityForm from "@/components/admin/CreateCharityForm";
import { getCharityForUser } from "@/lib/data/charity";
import { requireSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);

  if (!charity) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-warm-200 bg-white p-8">
        <h1 className="text-2xl">Welcome to Yufora.</h1>
        <p className="mt-2 text-warm-700">
          Let&rsquo;s set up your shop. First, what&rsquo;s your organization
          called?
        </p>
        <CreateCharityForm />
      </div>
    );
  }

  const steps: {
    title: string;
    body: string;
    status: "ready" | "soon";
  }[] = [
    {
      title: "Add your first product",
      body: "The things you actually need — photos, a price, and the story behind it.",
      status: "soon",
    },
    {
      title: "Connect Stripe",
      body: "Donations go straight to your own account. We never hold the money.",
      status: "soon",
    },
    {
      title: "Embed your shop",
      body: "One snippet to paste into your website, and you're live.",
      status: "soon",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">{charity.name}</h1>
          <p className="mt-1 text-sm text-warm-600">
            Your shop address:{" "}
            <span className="font-mono text-warm-800">
              yufora.com/s/{charity.slug}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-warm-200 bg-white p-6"
          >
            <div className="flex items-center justify-between">
              <span
                aria-hidden="true"
                className="font-display text-3xl text-pink-200"
              >
                {i + 1}
              </span>
              <span className="rounded-full bg-warm-100 px-2.5 py-0.5 text-xs font-medium text-warm-600">
                Coming next
              </span>
            </div>
            <h2 className="mt-3 text-lg text-warm-900">{step.title}</h2>
            <p className="mt-1.5 text-sm text-warm-700">{step.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-warm-600">
        You&rsquo;re one of the first organizations in. Products, Stripe, and
        the embed are being built in that order — you&rsquo;ll see them appear
        here as they land.
      </p>
    </div>
  );
}
