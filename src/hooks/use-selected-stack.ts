import { SELECTED_STACK_LSK } from "../constants";
import { type StackKey, stacks } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";

const DEFAULT_STACK_KEY: StackKey = "mnemonica";

export const useSelectedStack = () => {
  const [selectedStackKey, setSelectedStackKey] = useLocalDb<StackKey>(
    SELECTED_STACK_LSK,
    DEFAULT_STACK_KEY
  );

  // Validate that the key exists in stacks, otherwise fall back to default
  const validStackKey: StackKey =
    selectedStackKey in stacks ? selectedStackKey : DEFAULT_STACK_KEY;
  const selectedStack = stacks[validStackKey];

  return {
    stackKey: validStackKey,
    setStackKey: (key: StackKey) => {
      setSelectedStackKey(key);
    },
    stack: selectedStack,
    stackOrder: selectedStack.order,
    stackName: selectedStack.name,
  };
};
