import { Navigate } from "react-router";
import { useSelectedStack } from "../hooks/use-selected-stack";

export const RequireStack = ({ children }: { children: React.ReactNode }) => {
  const { stackKey } = useSelectedStack();

  if (stackKey === "") {
    return <Navigate replace to="/" />;
  }

  return children;
};
