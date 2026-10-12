"use client";

import { useTransition, type FormEvent } from "react";

/**
 * React 19 resets a form after its `action` runs, so a validation error
 * wipes everything the person typed. Dispatching the action ourselves from
 * onSubmit skips that reset; the form keeps `action={formAction}` too, so
 * it still submits without JavaScript.
 */
export function useKeepValuesSubmit(dispatch: (fd: FormData) => void) {
  const [, startTransition] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
}
