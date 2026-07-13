export interface LockEpdaDraftInput {
  inquiryId: number
  patch: Record<string, unknown>
  snapshot: Record<string, unknown>
}

export interface LockEpdaDraftDependencies<TResult> {
  updateEpda: (inquiryId: number, patch: Record<string, unknown>) => Promise<unknown>
  lockEpda: (inquiryId: number, snapshot: Record<string, unknown>) => Promise<TResult>
}

/** Persist editable columns before the backend makes the EPDA snapshot immutable. */
export async function lockEpdaDraft<TResult>(
  input: LockEpdaDraftInput,
  dependencies: LockEpdaDraftDependencies<TResult>,
): Promise<TResult> {
  await dependencies.updateEpda(input.inquiryId, input.patch)
  return dependencies.lockEpda(input.inquiryId, input.snapshot)
}
