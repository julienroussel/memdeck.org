import { Alert, Grid } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { MIN_DISTANCE_RANGE } from "../../constants";

export const DistanceRangeTooSmallAlert = () => {
  const { t } = useTranslation();
  return (
    <Grid.Col span={12}>
      <Alert
        color="yellow"
        icon={<IconAlertCircle aria-hidden="true" />}
        role="alert"
        title={t("distance.rangeTooSmallTitle")}
      >
        {t("distance.rangeTooSmall", { count: MIN_DISTANCE_RANGE })}
      </Alert>
    </Grid.Col>
  );
};
