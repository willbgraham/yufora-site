"use client";

import { useActionState, useState, useTransition } from "react";
import {
  approveItem,
  rejectItem,
  saveItemEdits,
  type ItemEditState,
} from "@/app/actions/news";
import { Button } from "@/components/ui/Button";

const initial: ItemEditState = { status: "idle" };

const fieldBase =
  "mt-1 w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-sm text-warm-900 focus:border-pink-600";

export default function ReviewControls({
  itemId,
  defaults,
}: {
  itemId: string;
  defaults: { editedTitle: string; editedExcerpt: string; editorNote: string };
}) {
  const [pending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const boundSave = saveItemEdits.bind(null, itemId);
  const [saveState, saveAction, saving] = useActionState(boundSave, initial);

  return (
    <div className="mt-4 border-t border-warm-100 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => approveItem(itemId))}
        >
          {pending ? "…" : "Approve"}
        </Button>
        <button
          type="button"
          onClick={() => setShowEdit((v) => !v)}
          className="rounded-md px-3 py-2 text-sm font-medium text-warm-700 hover:bg-warm-100"
        >
          {showEdit ? "Cancel edit" : "Edit"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Reject this item? It won't appear on the news page."))
              startTransition(() => rejectItem(itemId));
          }}
          className="rounded-md px-3 py-2 text-sm font-medium text-warm-600 hover:bg-warm-100 hover:text-pink-700"
        >
          Reject
        </button>
      </div>

      {showEdit && (
        <form action={saveAction} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-warm-900">
              Headline{" "}
              <span className="font-normal text-warm-500">
                (leave blank to keep the original)
              </span>
            </label>
            <input
              name="editedTitle"
              defaultValue={defaults.editedTitle}
              maxLength={300}
              className={fieldBase}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-900">
              Your summary{" "}
              <span className="font-normal text-warm-500">
                (your own words are safest — replaces the excerpt)
              </span>
            </label>
            <textarea
              name="editedExcerpt"
              rows={3}
              maxLength={2000}
              defaultValue={defaults.editedExcerpt}
              className={fieldBase}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-900">
              Editor note{" "}
              <span className="font-normal text-warm-500">(internal, optional)</span>
            </label>
            <input
              name="editorNote"
              defaultValue={defaults.editorNote}
              maxLength={500}
              className={fieldBase}
            />
          </div>
          {saveState.status === "error" && saveState.message && (
            <p role="alert" className="text-sm text-pink-700">
              {saveState.message}
            </p>
          )}
          {saveState.status === "idle" && saveState.message && (
            <p role="status" className="text-sm font-medium text-teal-700">
              {saveState.message}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save edits"}
          </Button>
        </form>
      )}
    </div>
  );
}
