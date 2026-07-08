import { SELECTED_STACK_LSK } from "../constants";
import { type StackKey, type StackValue, stacks } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";

export const isStackKey = (key: string): key is StackKey => key in stacks;

type RequiredStackResult = {
  stackKey: StackKey;
  stack: StackValue;
  stackOrder: StackValue["order"];
  stackName: StackValue["name"];
};

type SelectedStackResult =
  | (RequiredStackResult & {
      setStackKey: (key: StackKey | "") => void;
    })
  | {
      stackKey: "";
      stack: null;
      stackOrder: null;
      stackName: null;
      setStackKey: (key: StackKey | "") => void;
    };

const isStackKeyOrEmpty = (value: unknown): value is StackKey | "" =>
  typeof value === "string" && (value === "" || value in stacks);

export const useSelectedStack = (): SelectedStackResult => {
  // Corruption recovery is reset-on-write — the on-disk value is low-stakes
  // (a single stack-key string) so we let the next user interaction overwrite
  // it; see useStackLimits for the locking discipline used when data loss is
  // unrecoverable.
  const [selectedStackKey, setSelectedStackKey] = useLocalDb<StackKey | "">(
    SELECTED_STACK_LSK,
    "",
    isStackKeyOrEmpty,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  const setStackKey = (key: StackKey | ""): void => {
    setSelectedStackKey(key);
  };

  // Validate that the key exists in stacks
  if (selectedStackKey !== "" && selectedStackKey in stacks) {
    const stack = stacks[selectedStackKey];
    return {
      setStackKey,
      stack,
      stackKey: selectedStackKey,
      stackName: stack.name,
      stackOrder: stack.order,
    };
  }

  return {
    setStackKey,
    stack: null,
    stackKey: "",
    stackName: null,
    stackOrder: null,
  };
};

/**
 * Hook for use in RequireStack-protected pages.
 * Returns guaranteed non-null stack values.
 * Throws if no stack is selected (indicates incorrect usage outside protected routes).
 */
export const useRequiredStack = (): RequiredStackResult => {
  const result = useSelectedStack();

  if (result.stackKey === "") {
    throw new Error(
      "useRequiredStack must be used within a RequireStack-protected route"
    );
  }

  return {
    stack: result.stack,
    stackKey: result.stackKey,
    stackName: result.stackName,
    stackOrder: result.stackOrder,
  };
};
