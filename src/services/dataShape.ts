import type { Park, Manufacturer, Coaster, Rank } from "../types";

export type DataFile = {
  version: number;
  parks: Park[];
  manufacturers: Manufacturer[];
  coasters: Coaster[];
  ranks: Rank[];
};
