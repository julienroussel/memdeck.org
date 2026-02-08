import { ComingSoon } from "../components/coming-soon";
import { useDocumentMeta } from "../hooks/use-document-meta";

export const Toolbox = () => {
  useDocumentMeta({
    title: "Toolbox",
    description:
      "Memorized deck utilities for stack analysis, card lookups, and performance preparation.",
  });

  return <ComingSoon title="Toolbox" />;
};
