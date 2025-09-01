import Dexie, { type Table } from "dexie";
import type { Park, Manufacturer, Coaster, Rank } from "../types";

export class CoasterDB extends Dexie {
  parks!: Table<Park, string>;
  manufacturers!: Table<Manufacturer, string>;
  coasters!: Table<Coaster, string>;
  ranks!: Table<Rank, [string, string]>; // [listId+coasterId]

  constructor() {
    super("CoasterDB");
    this.version(1).stores({
      parks: "id,name",
      manufacturers: "id,name",
      coasters: "id,parkId,manufacturerId,name",
      ranks: "[listId+coasterId], listId, position",
    });
  }
}

export const db = new CoasterDB();
