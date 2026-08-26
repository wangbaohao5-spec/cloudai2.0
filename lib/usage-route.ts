import {
  classifyUsageFailure,
  refundUsage,
  type UsageFailureCode,
  type UsageMetadata,
} from "@/lib/usage";

type ReservedUsageTaskContext = {
  addRefundMetadata: (metadata: UsageMetadata) => void;
  setFailureCode: (failureCode: UsageFailureCode) => void;
};

export async function runReservedUsageTask<T>({
  initialFailureCode = "PROVIDER_ERROR",
  logLabel,
  task,
  usageRecordId,
  userId,
}: {
  initialFailureCode?: UsageFailureCode;
  logLabel: string;
  task: (context: ReservedUsageTaskContext) => Promise<T>;
  usageRecordId: string;
  userId: string;
}) {
  let failureCode = initialFailureCode;
  let refundMetadata: UsageMetadata = {};

  try {
    return await task({
      addRefundMetadata(metadata) {
        refundMetadata = { ...refundMetadata, ...metadata };
      },
      setFailureCode(nextFailureCode) {
        failureCode = nextFailureCode;
      },
    });
  } catch (error) {
    try {
      await refundUsage({
        usageRecordId,
        userId,
        failureCode: classifyUsageFailure(error, failureCode),
        ...(Object.keys(refundMetadata).length ? { metadata: refundMetadata } : {}),
      });
    } catch {
      console.error(`[usage] ${logLabel} refund failed`, { usageRecordId });
    }

    throw error;
  }
}
