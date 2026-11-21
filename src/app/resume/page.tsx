import type { Metadata } from "next";
import { education, experience, leadership, person, projects, skills } from "@/content/portfolio";
import { Monogram } from "@/components/Marks";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "Résumé",
  description: `Printable résumé of ${person.name}, final-year CSE student at Jorhat Engineering College.`,
};

export default function ResumePage() {
  return (
    <div className="resume">
      <nav className="resume-actions" aria-label="Résumé actions">
        <a className="text-link" href="/">
          Back to portfolio
        </a>
        <PrintButton />
      </nav>
      <main id="main" className="resume-sheet">
        <header className="resume-head">
          <Monogram className="resume-mark" />
          <div>
            <h1>{person.name}</h1>
            <p>Final-year B.Tech CSE student · Software developer</p>
            <p>
              {person.location} · <a href={`mailto:${person.email}`}>{person.email}</a> · <a href={person.github.href}>github.com/{person.github.handle}</a>
            </p>
          </div>
        </header>

        <section aria-labelledby="r-summary">
          <h2 id="r-summary">Summary</h2>
          <p>{person.intro}</p>
        </section>

        <section aria-labelledby="r-edu">
          <h2 id="r-edu">Education</h2>
          {education.map((e) => (
            <div key={e.title} className="resume-item">
              <h3>{e.title}</h3>
              <p>
                {e.org} · {e.dates}
              </p>
            </div>
          ))}
        </section>

        <section aria-labelledby="r-exp">
          <h2 id="r-exp">Experience and leadership</h2>
          {[...experience, ...leadership].map((r) => (
            <div key={r.id} className="resume-item">
              <h3>
                {r.title}, {r.org}
                {r.dates ? <span className="resume-date"> · {r.dates}</span> : null}
              </h3>
              {r.detail ? <p>{r.detail}</p> : null}
            </div>
          ))}
        </section>

        <section aria-labelledby="r-proj">
          <h2 id="r-proj">Projects</h2>
          {projects.map((p) => (
            <div key={p.slug} className="resume-item">
              <h3>
                {p.title} <span className="resume-date">· {p.status}</span>
              </h3>
              <p>{p.summary}</p>
              {p.links[0] ? <p className="resume-link">{p.links[0].href}</p> : null}
            </div>
          ))}
        </section>

        <section aria-labelledby="r-skills">
          <h2 id="r-skills">Skills</h2>
          <dl className="resume-skills">
            {skills.map((g) => (
              <div key={g.name}>
                <dt>{g.name}</dt>
                <dd>{g.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
