type ImageSetSlot = {
  imageIndex: number;
};

export type ImageSetErrors = Record<number, string>;
export type ImageSetResults<TResult> = Record<number, TResult>;

export function getRemainingImageSetSlots<TSlot extends ImageSetSlot>(slots: TSlot[], results: ImageSetResults<unknown>) {
  return slots.filter((slot) => !results[slot.imageIndex]).sort((left, right) => left.imageIndex - right.imageIndex);
}

export function getFailedImageSetSlots<TSlot extends ImageSetSlot>(
  slots: TSlot[],
  results: ImageSetResults<unknown>,
  errors: ImageSetErrors,
) {
  return getRemainingImageSetSlots(slots, results).filter((slot) => Boolean(errors[slot.imageIndex]));
}

export function recordImageSetSuccess<TResult>(results: ImageSetResults<TResult>, imageIndex: number, result: TResult) {
  return {
    ...results,
    [imageIndex]: result,
  };
}

export function recordImageSetFailure(errors: ImageSetErrors, imageIndex: number, message: string) {
  return {
    ...errors,
    [imageIndex]: message,
  };
}

export function clearImageSetFailure(errors: ImageSetErrors, imageIndex: number) {
  const next = { ...errors };
  delete next[imageIndex];
  return next;
}
