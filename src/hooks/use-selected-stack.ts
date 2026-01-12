import { SELECTED_STACK_LSK } from "../constants";
import { type StackKey, type StackValue, stacks } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";

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
    setSelectedStackKey(key as StackKey);
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
