import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCharityForUser } from "@/lib/data/charity";
import {
  contributionsToCsv,
  getContributionsForCharity,
} from "@/lib/data/contributions";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const charity = await getCharityForUser(session.user.id);
  if (!charity) return new Response("Not found", { status: 404 });

  const rows = await getContributionsForCharity(charity.id);
  const csv = contributionsToCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${charity.slug}-contributions.csv"`,
    },
  });
}
