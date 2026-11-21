/**
 * Sample chargers for the Plugora concept simulation.
 * Names, hours and slots are invented. Nothing here is live availability.
 */

export interface Charger {
  id: string;
  letter: string;
  name: string;
  x: number;
  y: number;
  connector: string;
  power: string;
  host: string;
  slots: { time: string; open: boolean }[];
}

export const chargers: Charger[] = [
  {
    id: "lane3",
    letter: "A",
    name: "Lane 3 home charger",
    x: 22,
    y: 22,
    connector: "Type 2",
    power: "7.2 kW",
    host: "Sample host",
    slots: [
      { time: "17:00", open: false },
      { time: "18:00", open: true },
      { time: "19:00", open: true },
      { time: "20:00", open: false },
    ],
  },
  {
    id: "park",
    letter: "B",
    name: "Park Road garage",
    x: 62,
    y: 16,
    connector: "Type 2",
    power: "3.3 kW",
    host: "Sample host",
    slots: [
      { time: "17:00", open: true },
      { time: "18:00", open: false },
      { time: "19:00", open: true },
      { time: "20:00", open: true },
    ],
  },
  {
    id: "riverside",
    letter: "C",
    name: "Riverside driveway",
    x: 80,
    y: 52,
    connector: "15 A socket",
    power: "3.0 kW",
    host: "Sample host",
    slots: [
      { time: "17:00", open: false },
      { time: "18:00", open: false },
      { time: "19:00", open: true },
      { time: "20:00", open: false },
    ],
  },
  {
    id: "market",
    letter: "D",
    name: "Market Street flat",
    x: 36,
    y: 58,
    connector: "Type 2",
    power: "7.2 kW",
    host: "Sample host",
    slots: [
      { time: "17:00", open: true },
      { time: "18:00", open: true },
      { time: "19:00", open: false },
      { time: "20:00", open: true },
    ],
  },
];

/** The visitor's position on the sample map. */
export const YOU = { x: 50, y: 40 };
