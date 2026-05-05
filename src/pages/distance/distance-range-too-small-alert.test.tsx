import { Grid, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MIN_DISTANCE_RANGE } from "../../constants";
import { DistanceRangeTooSmallAlert } from "./distance-range-too-small-alert";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      params?.count === undefined ? key : `${key}:${params.count}`,
  }),
}));

const renderAlert = () =>
  render(
    <MantineProvider>
      <Grid>
        <DistanceRangeTooSmallAlert />
      </Grid>
    </MantineProvider>
  );

describe("DistanceRangeTooSmallAlert", () => {
  it("renders the title and the message keyed off MIN_DISTANCE_RANGE", () => {
    renderAlert();
    expect(screen.getByText("distance.rangeTooSmallTitle")).toBeInTheDocument();
    expect(
      screen.getByText(`distance.rangeTooSmall:${MIN_DISTANCE_RANGE}`)
    ).toBeInTheDocument();
  });
});
