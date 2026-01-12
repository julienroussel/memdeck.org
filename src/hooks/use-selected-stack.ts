import { SELECTED_STACK_LSK } from "../constants";
import { type StackKey, type StackValue, stacks } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";

export const isStackKey = (key: string): key is StackKey => key in stacks;

type RequiredStackResult = {
  stackKey: StackKey;
  stack: StackValue;
  stackOrder: StackValue["order"];
  stackName: StackValue["name"];
};

type SelectedStackResult =
  | {
      stackKey: StackKey;
      stack: StackValue;
      stackOrder: StackValue["order"];
      stackName: StackValue["name"];
      setStackKey: (key: string) => void;
    }
  | {
      stackKey: "";
      stack: null;
      stackOrder: null;
      stackName: null;
      setStackKey: (key: string) => void;
    };

export const useSelectedStack = (): SelectedStackResult => {
  const [selectedStackKey, setSelectedStackKey] = useLocalDb<StackKey | "">(
    SELECTED_STACK_LSK,
    ""
  );

  const setStackKey = (key: string) => {
    if (isStackKey(key)) {
      setSelectedStackKey(key);
    } else {
      setSelectedStackKey("");
    }
  };

  // Validate that the key exists in stacks
  if (selectedStackKey !== "" && selectedStackKey in stacks) {
    const stack = stacks[selectedStackKey];
    return {
      stackKey: selectedStackKey,
      stack,
      stackOrder: stack.order,
      stackName: stack.name,
      setStackKey,
    };
  }

  return {
    stackKey: "",
    stack: null,
    stackOrder: null,
    stackName: null,
    setStackKey,
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
    stackKey: result.stackKey,
    stack: result.stack,
    stackOrder: result.stackOrder,
    stackName: result.stackName,
  };
};
