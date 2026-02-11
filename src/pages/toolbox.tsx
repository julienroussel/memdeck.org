import { useTranslation } from "react-i18next";
import { ComingSoon } from "../components/coming-soon";
import { useDocumentMeta } from "../hooks/use-document-meta";

export const Toolbox = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("toolbox.pageTitle"),
    description: t("toolbox.pageDescription"),
  });

  return <ComingSoon title={t("toolbox.title")} />;
};
