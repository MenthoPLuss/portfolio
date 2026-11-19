/**
 * The single content file for the portfolio.
 * Edit text, projects, roles and links here. Presentation lives in src/components.
 *
 * Rules kept by this ledger:
 * - Only verified facts. Unsupported case fields are left out rather than invented.
 * - Illustrations are labelled as illustrations or concepts.
 * - External links were checked on 19 November 2026.
 */

export type ProjectSlug = "jec-maps" | "m-phish" | "tender-ai" | "plugora";
export type ProjectIconName = "route" | "shield" | "pages" | "plug";

export interface ProjectLink {
  label: string;
  href: string;
  note?: string;
}

export interface CaseSection {
  heading: "Overview" | "Problem" | "My role" | "Team context" | "Approach" | "Current state" | "Next step";
  body: string[];
}

export interface Project {
  slug: ProjectSlug;
  title: string;
  icon: ProjectIconName;
  status: string;
  summary: string;
  /** Label shown on the preview media so illustrations are never mistaken for captures. */
  mediaLabel: string;
  mediaDescription: string;
  stack?: string[];
  stackNote?: string;
  sections: CaseSection[];
  links: ProjectLink[];
  credit?: string;
  metaDescription: string;
}

export interface Role {
  title: string;
  org: string;
  dates?: string;
  detail?: string;
  evidence?: { label: string; href: string };
}

export interface SkillGroup {
  name: string;
  items: string[];
  evidence: { label: string; href: string }[];
}

export const person = {
  name: "Asimangkan Boro",
  firstName: "Asimangkan",
  headline: "Software developer from Assam.",
  supporting:
    "Final-year CSE student at Jorhat Engineering College. I build software and help run the communities I’m part of.",
  intro:
    "I’m Asimangkan, a computer science student from Guwahati. At JEC, I’ve worked on campus navigation, explored ideas for EV charging, and helped organize student developer and sports teams. During my internship at Frint.in, I worked with a team on Tender AI.",
  location: "Guwahati, Assam, India",
  email: "asimangkan9@gmail.com",
  /** No original PDF was supplied, so the printable HTML résumé is used. */
  resume: { href: "/resume", label: "View résumé", isPdf: false },
  siteDescription:
    "Asimangkan Boro is a final-year Computer Science and Engineering student at Jorhat Engineering College, Assam. Projects, skills, experience and contact.",
};

export interface EvidenceTerm {
  id: string;
  text: string;
  capsule: string;
  icon: ProjectIconName | "people" | "sports";
  href: string;
  linkLabel: string;
}

export type AboutSegment = string | EvidenceTerm;

export const about: { heading: string; paragraphs: AboutSegment[][] } = {
  heading: "About",
  paragraphs: [
    [
      "Most of my time at JEC goes into two things: building software and running things with other people. On the software side I work on ",
      { id: "nav", text: "campus navigation", capsule: "JEC Maps, an interactive campus map and navigation project for JEC.", icon: "route", href: "/work/jec-maps", linkLabel: "View case: JEC Maps" },
      ", and with a team I’ve built a phishing-detection prototype for our final-year project.",
    ],
    [
      "Off the keyboard, I help organize ",
      { id: "gdg", text: "student developers", capsule: "Organizer, GDG on Campus JEC. Recruitment, interviews and campus-event planning.", icon: "people", href: "#role-gdg", linkLabel: "See role: GDG on Campus JEC" },
      " and coordinate ",
      { id: "sports", text: "college sports", capsule: "General Sports Secretary, JEC Students’ Union, 2026–2027. Intercollegiate sports including IIT Guwahati Spirit.", icon: "sports", href: "#role-sports", linkLabel: "See role: General Sports Secretary" },
      ". I’m also a club advisor for GLUG-JEC.",
    ],
  ],
};

export const projects: Project[] = [
  {
    slug: "jec-maps",
    title: "JEC Maps / JECVERSE",
    icon: "route",
    status: "Campus navigation project",
    summary: "An interactive campus map and navigation system for Jorhat Engineering College, and the start of a longer plan for a 3D campus twin.",
    mediaLabel: "Concept illustration",
    mediaDescription: "Illustration of a route drawing across a stylised campus map. Not real geodata.",
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "MapLibre GL"],
    stackNote: "From the project’s package.json.",
    sections: [
      {
        heading: "Overview",
        body: [
          "JEC Maps explores navigation at Jorhat Engineering College: an interactive campus map in the browser.",
          "JECVERSE is the longer-term vision for the same work: a real-time 3D twin of the campus.",
        ],
      },
      {
        heading: "Problem",
        body: ["A campus is easier to use when its buildings, paths and departments can be found on one shared map. JEC Maps explores that for JEC."],
      },
      {
        heading: "My role",
        body: ["I work on the campus-navigation interface and the map setup."],
      },
      {
        heading: "Approach",
        body: [
          "The current build is a Next.js application written in TypeScript and styled with Tailwind CSS.",
          "MapLibre GL renders the interactive map in the browser. A build script copies the MapLibre worker files so the app serves them itself.",
        ],
      },
      {
        heading: "Current state",
        body: ["Current work is the interactive campus map and navigation interface. The preview on this page is a concept illustration, not a capture of the app."],
      },
      {
        heading: "Next step",
        body: ["Proposed for JECVERSE and not yet built: indoor routing, avatars and a real-time 3D digital twin of the campus."],
      },
    ],
    links: [{ label: "JEC Maps on GitHub", href: "https://github.com/MenthoPLuss/jec-maps" }],
    metaDescription: "JEC Maps: an interactive campus map and navigation project for Jorhat Engineering College, and the JECVERSE 3D campus vision.",
  },
  {
    slug: "m-phish",
    title: "M-PHISH",
    icon: "shield",
    status: "Final-year project prototype · v0.1.0",
    summary: "A contextual phishing and web-trust prototype that explains why a website may be risky before you trust it.",
    mediaLabel: "Illustrative example",
    mediaDescription: "Synthetic example message with an explanatory inspection panel. The message and addresses are made up and contain no real links.",
    stack: ["FastAPI", "Python", "Next.js", "TypeScript", "Chromium extension (Manifest V3)", "SQLite"],
    stackNote: "From the project README. Version from its 0.1.0 changelog.",
    sections: [
      {
        heading: "Overview",
        body: ["M-PHISH is a contextual phishing-detection and web-trust prototype. It helps a person decide whether to trust a website before entering credentials or paying."],
      },
      {
        heading: "Problem",
        body: ["A bare “safe” or “unsafe” verdict rarely explains itself. M-PHISH combines URL signals, page observations and context into an assessment a person can read."],
      },
      {
        heading: "Team context",
        body: ["A final-year project built by a team. The repository lists several contributors."],
      },
      {
        heading: "Approach",
        body: [
          "A Chromium extension runs a fast URL-only check on each top-level navigation. Low-risk pages stay quiet. Medium, high or uncertain results trigger a deeper investigation.",
          "A FastAPI backend scores the evidence deterministically, including checks such as a mismatch between a claimed identity and the real destination, or a credential form posting to another origin. An optional language model only rephrases that evidence.",
          "A Next.js dashboard shows investigations and reports, stored in SQLite.",
        ],
      },
      {
        heading: "Current state",
        body: ["Prototype at version 0.1.0. The project describes itself as a prototype, not a malware scanner or a guarantee that a website is safe."],
      },
    ],
    links: [
      { label: "M-PHISH on GitHub", href: "https://github.com/riiiituraaj/M-PHISH" },
      { label: "M-PHISH dashboard", href: "https://m-phish.vercel.app", note: "Project dashboard listed by the repository." },
    ],
    metaDescription: "M-PHISH: a final-year phishing-detection and web-trust prototype with a browser extension, FastAPI backend and Next.js dashboard.",
  },
  {
    slug: "tender-ai",
    title: "Tender AI",
    icon: "pages",
    status: "Team internship project · Frint.in · Jul–Aug 2026",
    summary: "A tender discovery and document-intelligence platform for Indian public procurement, built by an internship team.",
    mediaLabel: "Illustration",
    mediaDescription: "Neutral illustration of tender documents being read and highlighted. Not a capture of the product.",
    stack: ["Node.js", "Express", "React", "Vite", "Python", "FastAPI"],
    stackNote: "From the team repository README.",
    sections: [
      {
        heading: "Overview",
        body: ["Tender AI brings Indian public tenders into one place and helps read the documents that come with them."],
      },
      {
        heading: "Problem",
        body: ["Tenders are spread across portals such as GeM and Assam e-Procurement, and each one arrives with long RFP documents to read."],
      },
      {
        heading: "Team context",
        body: [
          "I worked on Tender AI as a Software Development Intern at Frint.in, July–August 2026, as part of the internship project team.",
          "Credit belongs to the whole internship team. Individual responsibilities are not listed here.",
        ],
      },
      {
        heading: "Approach",
        body: [
          "The repository has three services: a Node.js and Express API with scrapers for the procurement portals, a React web application built with Vite, and a Python FastAPI service.",
          "The FastAPI service uses a language model for RFP clause analysis and bid-eligibility scoring.",
        ],
      },
      {
        heading: "Current state",
        body: ["Internship project. The source is public in a team member’s repository, which states all rights are reserved."],
      },
    ],
    links: [{ label: "Tender AI repository (team)", href: "https://github.com/Souvik16-Js/tender.ai.whole", note: "Maintained by team member Souvik16-Js." }],
    credit: "Frint.in internship team",
    metaDescription: "Tender AI: a team internship project at Frint.in for tender discovery and RFP document intelligence.",
  },
  {
    slug: "plugora",
    title: "Plugora",
    icon: "plug",
    status: "Product concept",
    summary: "A peer-to-peer concept for sharing home EV chargers with nearby drivers.",
    mediaLabel: "Concept preview",
    mediaDescription: "Concept illustration of a sample charger card and a sample booking flow on a small map. Sample data only.",
    sections: [
      {
        heading: "Overview",
        body: ["Plugora is a peer-to-peer concept for sharing home EV chargers. Owners could list a home charger, and nearby drivers could find it and reserve a slot."],
      },
      {
        heading: "Problem",
        body: ["A home charger often sits unused for much of the day. Plugora asks whether it could serve drivers nearby."],
      },
      {
        heading: "Approach",
        body: ["Two proposed flows: an owner lists a charger with its available hours, and a driver finds a charger on a map and reserves a slot."],
      },
      {
        heading: "Current state",
        body: ["Concept. Listing and booking are proposed flows, not a working product. The preview is an illustration with sample data."],
      },
    ],
    links: [],
    metaDescription: "Plugora: a product concept for peer-to-peer sharing of home EV chargers.",
  },
];

export const skills: SkillGroup[] = [
  {
    name: "Development",
    items: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    evidence: [{ label: "JEC Maps", href: "/work/jec-maps" }],
  },
  {
    name: "Maps",
    items: ["MapLibre GL", "Campus-navigation interface work"],
    evidence: [{ label: "JEC Maps", href: "/work/jec-maps" }],
  },
  {
    name: "Coordination",
    items: ["Recruitment", "Participant communication", "Follow-ups", "Team leadership", "Event logistics", "Registration", "Deadline tracking"],
    evidence: [
      { label: "GDG on Campus JEC", href: "#role-gdg" },
      { label: "Sports Secretary", href: "#role-sports" },
    ],
  },
  {
    name: "Tools",
    items: ["Google Forms", "Online meeting coordination"],
    evidence: [{ label: "GDG on Campus JEC", href: "#role-gdg" }],
  },
];

export const experience: { dated: (Role & { id: string })[]; community: (Role & { id: string })[] } = {
  dated: [
    {
      id: "role-frint",
      title: "Software Development Intern",
      org: "Frint.in",
      dates: "Jul–Aug 2026",
      detail: "Worked on Tender AI as part of the internship project team.",
      evidence: { label: "Tender AI case", href: "/work/tender-ai" },
    },
    {
      id: "role-sports",
      title: "General Sports Secretary",
      org: "JEC Students’ Union",
      dates: "2026–2027",
      detail: "Coordinates registrations, documentation, accommodation and communication for intercollegiate sports, including IIT Guwahati Spirit.",
    },
  ],
  community: [
    {
      id: "role-gdg",
      title: "Organizer",
      org: "GDG on Campus JEC",
      detail: "Coordinates recruitment, candidate communications, online interviews and campus-event planning with faculty advisors and student leads across technical, development, design and management teams.",
    },
    {
      id: "role-glug",
      title: "Club Advisor",
      org: "GLUG-JEC",
    },
  ],
};

export const education = [
  {
    title: "B.Tech in Computer Science and Engineering",
    org: "Jorhat Engineering College, Jorhat, Assam",
    dates: "Final year, currently pursuing",
  },
  {
    title: "Higher Secondary Education",
    org: "Sai Vikash Vidya Niketan",
    dates: "2021–2023",
  },
];

/** Timed overview beats in seconds. Captions double as the accessible transcript. */
export const overviewBeats: { start: number; end: number; scene: "mark" | ProjectSlug | "contact"; caption: string }[] = [
  { start: 0, end: 3, scene: "mark", caption: "Asimangkan Boro. Software developer from Assam." },
  { start: 3, end: 8, scene: "jec-maps", caption: "JEC Maps: campus navigation for Jorhat Engineering College. Concept illustration." },
  { start: 8, end: 12, scene: "m-phish", caption: "M-PHISH: a phishing and web-trust prototype. The example message is synthetic." },
  { start: 12, end: 16, scene: "tender-ai", caption: "Tender AI: a team internship project at Frint.in." },
  { start: 16, end: 20, scene: "plugora", caption: "Plugora: a concept for sharing home EV chargers. Sample data." },
  { start: 20, end: 24, scene: "contact", caption: "Say hello: asimangkan9@gmail.com" },
];

export const OVERVIEW_DURATION = 24;

export const credits = [
  { what: "Geist Sans typeface", who: "Vercel", license: "SIL Open Font License 1.1", href: "https://vercel.com/font" },
  { what: "IBM Plex Mono typeface", who: "IBM, via Fontsource", license: "SIL Open Font License 1.1", href: "https://github.com/IBM/plex" },
  { what: "3D rendering", who: "three.js", license: "MIT", href: "https://threejs.org" },
  { what: "Framework", who: "Next.js and React", license: "MIT", href: "https://nextjs.org" },
  { what: "Score and sound effects", who: "Original, synthesised live in the browser with the Web Audio API", license: "Made for this site" },
  { what: "AB monogram, project marks, terrain and previews", who: "Original, generated in code for this site", license: "Made for this site" },
  { what: "Interaction reference", who: "orchestrated.nl, used as a reference for pacing only", license: "No assets used", href: "https://orchestrated.nl/" },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
