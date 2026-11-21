/**
 * The single content file for the portfolio.
 * Edit text, projects, roles and links here. Presentation lives in src/components and src/features.
 *
 * Rules kept by this ledger:
 * - Only verified facts. Unsupported case fields are left out rather than invented.
 * - Interactive demos are labelled as demonstrations, concepts or simulations.
 * - `editorial` holds creative copy (headlines and statements). It is voice, not biography.
 * - External links were checked on 19 and 20 November 2026.
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
  number: string;
  title: string;
  icon: ProjectIconName;
  status: string;
  summary: string;
  /** Short labels shown on the exhibit. Only technologies confirmed in the project's own repository. */
  tech: string[];
  /** What the interactive exhibit is, stated plainly so it is never mistaken for the product. */
  demo: { kind: string; note: string };
  stack?: string[];
  stackNote?: string;
  sections: CaseSection[];
  links: ProjectLink[];
  credit?: string;
  metaDescription: string;
}

export interface Role {
  id: string;
  title: string;
  org: string;
  dates?: string;
  detail?: string;
  evidence?: { label: string; href: string };
}

export interface SkillGroup {
  name: string;
  items: string[];
  evidence: { label: string; href: string; why: string }[];
}

export const person = {
  name: "Asimangkan Boro",
  firstName: "Asimangkan",
  role: "Software developer",
  headline: "Software developer from Assam.",
  supporting:
    "Final-year CSE student at Jorhat Engineering College. I build software and help run the communities I’m part of.",
  intro:
    "I’m Asimangkan, a computer science student from Guwahati. At JEC, I’ve worked on campus navigation, explored ideas for EV charging, and helped organize student developer and sports teams. During my internship at Frint.in, I worked with a team on Tender AI.",
  location: "Guwahati, Assam, India",
  email: "asimangkan9@gmail.com",
  /** Confirmed by the owner on 20 November 2026 as the account the portfolio is published from. */
  github: { label: "GitHub", handle: "MenthoPLuss", href: "https://github.com/MenthoPLuss" },
  /** No original PDF was supplied, so the printable HTML résumé is used. */
  resume: { href: "/resume", label: "View résumé", isPdf: false },
  siteDescription:
    "Asimangkan Boro is a final-year Computer Science and Engineering student at Jorhat Engineering College, Assam. Projects, skills, experience and contact.",
};

/** Creative copy for the editorial layout. */
export const editorial = {
  heroLines: ["Making digital", "things feel"],
  heroAccentWord: "human",
  heroText: "Software developer from Assam. Building useful software, exploring ideas, and bringing people together.",
  heroMeta: ["Portfolio", "Edition 2026", "Assam, India"],
  aboutStatement: ["Code is what I build with.", "Curiosity is why I build."],
  intersection: ["Software development", "Campus projects", "Technical experimentation", "Student communities", "Event organization", "Leadership"],
  contactStatement: "Have something worth building?",
  contactLine: "Let’s talk about it.",
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
      { id: "nav", text: "campus navigation", capsule: "JEC Maps, an interactive campus map and navigation project for JEC.", icon: "route", href: "/work/jec-maps", linkLabel: "Open case: JEC Maps" },
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
    number: "01",
    title: "JEC Maps",
    icon: "route",
    status: "Campus navigation project",
    summary: "An interactive campus map and navigation system for Jorhat Engineering College, and the start of a longer plan for a 3D campus twin called JECVERSE.",
    tech: ["Next.js", "React", "TypeScript", "Tailwind CSS", "MapLibre GL"],
    demo: {
      kind: "Route-finding demo",
      note: "Demonstration geometry. Places and paths are illustrative, not JEC’s real layout. Routes are computed in your browser.",
    },
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
        body: ["Current work is the interactive campus map and navigation interface. The demo on this page uses demonstration geometry, not the app’s map data."],
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
    number: "02",
    title: "M-PHISH",
    icon: "shield",
    status: "Final-year project prototype · v0.1.0",
    summary: "A contextual phishing and web-trust prototype that explains why a website may be risky before you trust it.",
    tech: ["FastAPI", "Python", "Next.js", "Chromium extension", "SQLite"],
    demo: {
      kind: "Message inspection demo",
      note: "Synthetic messages on reserved example domains. A few simple rules run in your browser to explain the idea. This is not the M-PHISH engine.",
    },
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
    number: "03",
    title: "Tender AI",
    icon: "pages",
    status: "Team internship project · Frint.in · Jul–Aug 2026",
    summary: "A tender discovery and document-intelligence platform for Indian public procurement, built by an internship team.",
    tech: ["Node.js", "Express", "React", "Vite", "FastAPI"],
    demo: {
      kind: "Document extraction preview",
      note: "Fictional tenders. The extracted fields are prewritten sample data that illustrate the interface. They are not output from Tender AI.",
    },
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
    number: "04",
    title: "Plugora",
    icon: "plug",
    status: "Product concept",
    summary: "A peer-to-peer concept for sharing home EV chargers with nearby drivers.",
    tech: ["Product concept", "Booking flow", "Map interface"],
    demo: {
      kind: "Booking concept simulation",
      note: "Concept simulation with sample chargers. Nothing is reserved, no payment is taken and availability is not live.",
    },
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
        body: ["Concept. Listing and booking are proposed flows, not a working product. The demo on this page is a simulation with sample data."],
      },
    ],
    links: [],
    metaDescription: "Plugora: a product concept for peer-to-peer sharing of home EV chargers.",
  },
];

export const skills: SkillGroup[] = [
  {
    name: "Frontend engineering",
    items: ["React", "TypeScript", "Tailwind CSS"],
    evidence: [{ label: "JEC Maps", href: "/work/jec-maps", why: "The campus map interface is a React and TypeScript app styled with Tailwind CSS." }],
  },
  {
    name: "Frameworks and app architecture",
    items: ["Next.js App Router"],
    evidence: [
      { label: "JEC Maps", href: "/work/jec-maps", why: "Built as a Next.js application." },
      { label: "This portfolio", href: "#credits", why: "Built with Next.js App Router and TypeScript." },
    ],
  },
  {
    name: "Maps and spatial interfaces",
    items: ["MapLibre GL", "Campus-navigation interface work"],
    evidence: [{ label: "JEC Maps", href: "/work/jec-maps", why: "MapLibre GL renders the interactive campus map." }],
  },
  {
    name: "Coordination and leadership",
    items: ["Recruitment", "Participant communication", "Follow-ups", "Team leadership", "Event logistics", "Registration", "Deadline tracking"],
    evidence: [
      { label: "GDG on Campus JEC", href: "#role-gdg", why: "Recruitment, candidate communications, interviews and event planning." },
      { label: "General Sports Secretary", href: "#role-sports", why: "Registrations, documentation, accommodation and communication for intercollegiate sports." },
    ],
  },
  {
    name: "Tools",
    items: ["Google Forms", "Online meeting coordination"],
    evidence: [{ label: "GDG on Campus JEC", href: "#role-gdg", why: "Used for recruitment and online interviews." }],
  },
];

export const experience: Role[] = [
  {
    id: "role-frint",
    title: "Software Development Intern",
    org: "Frint.in",
    dates: "Jul–Aug 2026",
    detail: "Worked on Tender AI as part of the internship project team.",
    evidence: { label: "Tender AI case", href: "/work/tender-ai" },
  },
];

export const leadership: Role[] = [
  {
    id: "role-gdg",
    title: "Organizer",
    org: "GDG on Campus JEC",
    detail: "Coordinates recruitment, candidate communications, online interviews and campus-event planning with faculty advisors and student leads across technical, development, design and management teams.",
  },
  {
    id: "role-sports",
    title: "General Sports Secretary",
    org: "JEC Students’ Union",
    dates: "2026–2027",
    detail: "Coordinates registrations, documentation, accommodation and communication for intercollegiate sports, including IIT Guwahati Spirit.",
  },
  {
    id: "role-glug",
    title: "Club Advisor",
    org: "GLUG-JEC",
  },
];

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

export const credits = [
  { what: "Geist Sans and Geist Serif typefaces", who: "Vercel, bundled from the geist package", license: "SIL Open Font License 1.1", href: "https://vercel.com/font" },
  { what: "IBM Plex Mono typeface", who: "IBM, via Fontsource", license: "SIL Open Font License 1.1", href: "https://github.com/IBM/plex" },
  { what: "Framework", who: "Next.js and React", license: "MIT", href: "https://nextjs.org" },
  { what: "Interface sound cues", who: "Original, synthesised in the browser with the Web Audio API", license: "Made for this site" },
  { what: "AB monogram, project marks and interactive demos", who: "Original, written in code for this site", license: "Made for this site" },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
