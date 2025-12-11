import { SELECTED_STACK_LSK } from "../constants";
import { stacks } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";

export const useSelectedStack = () => {
  const [selectedStackKey, setSelectedStackKey] = useLocalDb(
    SELECTED_STACK_LSK,
    "mnemonica"
  );
  const selectedStack = stacks[selectedStackKey];

  return {
    stackKey: selectedStackKey,
    setStackKey: setSelectedStackKey,
    stack: selectedStack,
    stackOrder: selectedStack?.order,
    stackName: selectedStack?.name,
  };
};
