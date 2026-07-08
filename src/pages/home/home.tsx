import { useTranslation } from "react-i18next";
import { useCardImagePreload } from "../../hooks/use-card-image-preload";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useSelectedStack } from "../../hooks/use-selected-stack";
import { HomeNoStack } from "./home-no-stack";
import { HomeWithStack } from "./home-with-stack";

export const Home = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    description: t("home.pageDescription"),
    title: t("home.pageTitle"),
  });
  useCardImagePreload();
  const { stackKey, stackName } = useSelectedStack();

  if (stackKey !== "") {
    return <HomeWithStack stackKey={stackKey} stackName={stackName} />;
  }

  return <HomeNoStack />;
};
