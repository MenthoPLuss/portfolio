/**
 * Fictional tenders for the Tender AI exhibit. Organisations, references and
 * amounts are invented for illustration. The "extracted" fields are written by
 * hand and point at the line they came from. They are not Tender AI output.
 */

export type FieldKey = "issuer" | "category" | "value" | "emd" | "deadline" | "eligibility";

export interface Tender {
  id: string;
  short: string;
  title: string;
  lines: string[];
  fields: Record<FieldKey, { value: string; line: number }>;
  /** Numbers for the comparison view. */
  compare: { valueLakh: number; emd: number; deadline: string; deadlineSort: number };
}

export const FIELD_LABELS: Record<FieldKey, string> = {
  issuer: "Issuing body",
  category: "Category",
  value: "Estimated value",
  emd: "Earnest money (EMD)",
  deadline: "Bid deadline",
  eligibility: "Key eligibility",
};

export const tenders: Tender[] = [
  {
    id: "lab-computers",
    short: "Lab computers",
    title: "Supply of laboratory computers",
    lines: [
      "NOTICE INVITING TENDER · Ref. SAMPLE/IT/2026/014",
      "Issued by the Example Institute of Technology (fictional).",
      "Scope: supply and installation of 40 desktop computers for teaching labs.",
      "Category of procurement: Goods.",
      "Estimated cost: ₹18,40,000, inclusive of taxes.",
      "Earnest money deposit: ₹36,800 by online transfer.",
      "Last date for bid submission: 12 December 2026, 15:00.",
      "Bidders must show three years of IT hardware supply.",
    ],
    fields: {
      issuer: { value: "Example Institute of Technology", line: 1 },
      category: { value: "Goods", line: 3 },
      value: { value: "₹18,40,000", line: 4 },
      emd: { value: "₹36,800", line: 5 },
      deadline: { value: "12 Dec 2026, 15:00", line: 6 },
      eligibility: { value: "3 years of IT hardware supply", line: 7 },
    },
    compare: { valueLakh: 18.4, emd: 36800, deadline: "12 Dec 2026", deadlineSort: 20261212 },
  },
  {
    id: "cctv",
    short: "CCTV upkeep",
    title: "Campus CCTV maintenance, two years",
    lines: [
      "TENDER DOCUMENT · Ref. SAMPLE/SEC/2026/007",
      "Issued by the Sample Municipal Board (fictional).",
      "Scope: preventive maintenance of 120 cameras for 24 months.",
      "Category of procurement: Services.",
      "Estimated cost: ₹7,20,000 for the full term.",
      "Earnest money deposit: ₹14,400.",
      "Bids close on 5 December 2026 at 13:00.",
      "Bidders need an OEM authorisation and two similar contracts.",
    ],
    fields: {
      issuer: { value: "Sample Municipal Board", line: 1 },
      category: { value: "Services", line: 3 },
      value: { value: "₹7,20,000", line: 4 },
      emd: { value: "₹14,400", line: 5 },
      deadline: { value: "5 Dec 2026, 13:00", line: 6 },
      eligibility: { value: "OEM authorisation, 2 similar contracts", line: 7 },
    },
    compare: { valueLakh: 7.2, emd: 14400, deadline: "5 Dec 2026", deadlineSort: 20261205 },
  },
  {
    id: "solar",
    short: "Solar heaters",
    title: "Hostel solar water heaters",
    lines: [
      "INVITATION FOR BIDS · Ref. SAMPLE/WRK/2026/031",
      "Issued by the Demo District Council (fictional).",
      "Scope: design, supply and commissioning of solar water heaters for two hostels.",
      "Category of procurement: Works.",
      "Estimated cost: ₹26,00,000.",
      "Earnest money deposit: ₹52,000.",
      "Submission deadline: 19 December 2026, 17:00.",
      "Bidders must be registered contractors with solar installation experience.",
    ],
    fields: {
      issuer: { value: "Demo District Council", line: 1 },
      category: { value: "Works", line: 3 },
      value: { value: "₹26,00,000", line: 4 },
      emd: { value: "₹52,000", line: 5 },
      deadline: { value: "19 Dec 2026, 17:00", line: 6 },
      eligibility: { value: "Registered contractor, solar experience", line: 7 },
    },
    compare: { valueLakh: 26, emd: 52000, deadline: "19 Dec 2026", deadlineSort: 20261219 },
  },
];

export const FIELD_ORDER: FieldKey[] = ["issuer", "category", "value", "emd", "deadline", "eligibility"];
