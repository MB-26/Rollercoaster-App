export type UUID = string;

export interface Park {
  id: UUID;
  name: string;
  country?: string;
}

export interface Manufacturer {
  id: UUID;
  name: string;
}

export interface Coaster {
  id: UUID;
  name: string;
  parkId: UUID;
  manufacturerId?: UUID;
  notes?: string;
}

export interface Rank {
  listId: string;       // e.g., "main"
  coasterId: UUID;
  position: number;     // 1 = best
  updatedAt: string;    // ISO string
}
