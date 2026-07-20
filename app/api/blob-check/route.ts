// TEMPORARY staging-verification route: exercises the exact Vercel Blob
// OIDC upload path (BLOB_STORE_ID + deployment identity) used by product
// photo uploads. Removed immediately after verification — see git history.
export async function GET() {
  try {
    const { put, del } = await import("@vercel/blob");
    const content = new Blob([`yufora blob check ${Date.now()}`], {
      type: "text/plain",
    });
    const blob = await put("verify/blob-check.txt", content, {
      access: "public",
      addRandomSuffix: true,
    });
    const fetched = await fetch(blob.url);
    const body = await fetched.text();
    await del(blob.url);
    return Response.json({
      ok: true,
      uploadedTo: new URL(blob.url).hostname,
      fetchStatus: fetched.status,
      roundTrip: body.startsWith("yufora blob check"),
      deleted: true,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
