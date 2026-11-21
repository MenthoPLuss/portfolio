import { about, credits, editorial, education, experience, leadership, person, projects, skills, type Role } from "@/content/portfolio";
import { LabStage } from "@/features/lab/LabStage";
import { ClientRoot } from "./ClientRoot";
import { CaseLink, SmartLink } from "./CaseLink";
import { CopyEmail } from "./CopyEmail";
import { EvidenceTerm } from "./EvidenceTerm";
import { LivingType } from "./editorial/LivingType";
import { Nav } from "./editorial/Nav";
import { MarkTile, Monogram, ProjectIcon } from "./Marks";
import { MenuToggle } from "./MenuToggle";
import { MotionToggle } from "./MotionToggle";
import { SoundToggle } from "./SoundToggle";

function SectionHead({ index, id, title, dek }: { index: string; id: string; title: string; dek?: string }) {
  return (
    <header className="section-head">
      <p className="section-index mono" aria-hidden="true">
        <span className="index-square" />({index})
      </p>
      <h2 id={id} className="section-title" data-reveal="mask" tabIndex={-1}>
        <span>{title}</span>
      </h2>
      {dek ? <p className="section-dek">{dek}</p> : null}
    </header>
  );
}

function RoleRow({ role, undatedLabel }: { role: Role; undatedLabel?: string }) {
  return (
    <li id={role.id} className="index-row">
      <p className="index-date mono">{role.dates ?? undatedLabel ?? ""}</p>
      <div className="index-main">
        <h3>
          {role.org}
          <span className="index-sub">{role.title}</span>
        </h3>
        {role.detail ? <p>{role.detail}</p> : null}
      </div>
      <p className="index-side">
        {role.evidence ? (
          <SmartLink href={role.evidence.href} className="text-link">
            {role.evidence.label}
          </SmartLink>
        ) : null}
      </p>
    </li>
  );
}

export function Site({ initialCase }: { initialCase: string | null }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div id="page">
        <header className="site-header">
          <a className="brand" href="#top" aria-label={`${person.name}, back to top`}>
            <MarkTile />
            <span className="brand-name">{person.name}</span>
          </a>
          <Nav />
          <div className="header-tools">
            <a className="header-resume" href={person.resume.href} data-cursor="View">
              Résumé
            </a>
            <SoundToggle />
            <MenuToggle />
          </div>
        </header>

        <main id="main" tabIndex={-1}>
          {/* ------------------------------------------------------------ hero */}
          <section id="top" className="hero" aria-labelledby="hero-title">
            <div className="hero-meta mono">
              <span>(00)</span>
              {editorial.heroMeta.map((m) => (
                <span key={m}>{m}</span>
              ))}
              <span className="hero-meta-role">{person.role}</span>
            </div>
            <LivingType />
            <div className="hero-foot">
              <div className="hero-id">
                <p className="hero-name">{person.name}</p>
                <p className="mono hero-cred">Final-year B.Tech CSE · Jorhat Engineering College</p>
              </div>
              <p className="hero-text">{editorial.heroText}</p>
              <div className="hero-actions">
                <a className="btn btn-ink" href="#work">
                  Explore selected work
                </a>
                <a className="btn btn-line" href={person.resume.href} data-cursor="View">
                  View résumé
                </a>
              </div>
            </div>
            <a className="hero-scroll mono" href="#work">
              <span className="hero-scroll-line" aria-hidden="true" />
              Scroll · (01) Selected work
            </a>
          </section>

          {/* ------------------------------------------------------------ work */}
          <section id="work" className="section work" aria-labelledby="work-title">
            <SectionHead index="01" id="work-title" title="Selected work" dek="Four projects, each with a working demonstration. Demos run in your browser on sample data and say so." />
            <div className="exhibits">
              {projects.map((p, i) => (
                <article key={p.slug} className={`exhibit exhibit-${i % 2 ? "b" : "a"} theme-${p.slug}`} aria-labelledby={`p-${p.slug}`} data-reveal="exhibit">
                  <div className="exhibit-text">
                    <p className="exhibit-num" aria-hidden="true">
                      {p.number}
                    </p>
                    <p className="exhibit-status mono">
                      <ProjectIcon name={p.icon} className="icon-sm" />
                      {p.status}
                    </p>
                    <h3 id={`p-${p.slug}`}>{p.title}</h3>
                    <p className="exhibit-summary">{p.summary}</p>
                    <ul className="tags" aria-label={`${p.title} technologies`}>
                      {p.tech.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                    <p className="exhibit-links">
                      <CaseLink slug={p.slug} className="link-arrow">
                        Read case study<span className="sr-only">: {p.title}</span>
                      </CaseLink>
                      {p.links[0] ? (
                        <a className="text-link" href={p.links[0].href} target="_blank" rel="noopener noreferrer" data-cursor="Visit">
                          {p.slug === "tender-ai" ? "Team repository" : "Repository"}
                          <span className="sr-only"> for {p.title} (opens in a new tab)</span>
                          <span aria-hidden="true"> ↗</span>
                        </a>
                      ) : null}
                    </p>
                  </div>
                  <figure className="exhibit-figure">
                    <figcaption className="mono exhibit-caption">
                      <span>{p.demo.kind}</span>
                      <span>Interactive</span>
                    </figcaption>
                    <LabStage slug={p.slug} context="exhibit" />
                  </figure>
                </article>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------------------ about */}
          <section id="about" className="section about" aria-labelledby="about-title">
            <SectionHead index="02" id="about-title" title="About" />
            <p className="statement" data-reveal="lines">
              {editorial.aboutStatement.map((line, i) => (
                <span key={line} className="statement-line" style={{ ["--i" as string]: i }}>
                  <span>{line}</span>
                </span>
              ))}
            </p>
            <div className="about-grid">
              <figure className="identity" aria-label="Typographic identity">
                <div className="identity-plate" aria-hidden="true">
                  <Monogram className="identity-mark" stroke={1.2} />
                  <span className="identity-initials">A/B</span>
                </div>
                <figcaption className="mono">
                  <span>{person.name}</span>
                  <span>{person.location}</span>
                  <span>B.Tech CSE · JEC · Final year</span>
                </figcaption>
              </figure>
              <div className="about-text" data-reveal="fade">
                {about.paragraphs.map((para, i) => (
                  <p key={i}>{para.map((seg, j) => (typeof seg === "string" ? <span key={j}>{seg}</span> : <EvidenceTerm key={seg.id} term={seg} />))}</p>
                ))}
                <div className="intersection">
                  <p className="mono">At the intersection of</p>
                  <ul>
                    {editorial.intersection.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------ skills */}
          <section id="skills" className="section" aria-labelledby="skills-title">
            <SectionHead index="03" id="skills-title" title="Skills" dek="Grouped by where they were used. Open a group to see the evidence." />
            <ol className="skills" data-reveal="fade">
              {skills.map((g, i) => (
                <li key={g.name} className="skill">
                  <span className="skill-num mono" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="skill-name">{g.name}</h3>
                  <p className="skill-items">{g.items.join(" · ")}</p>
                  <details className="skill-evidence">
                    <summary>
                      Evidence <span className="mono">({g.evidence.length})</span>
                      <span className="sr-only"> for {g.name}</span>
                    </summary>
                    <ul>
                      {g.evidence.map((ev) => (
                        <li key={ev.label + ev.href}>
                          <SmartLink href={ev.href} className="text-link">
                            {ev.label}
                          </SmartLink>
                          <span>{ev.why}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ol>
          </section>

          {/* ------------------------------------------------------------ experience */}
          <section id="experience" className="section" aria-labelledby="experience-title">
            <SectionHead index="04" id="experience-title" title="Experience" />
            <ul className="index-list" data-reveal="fade">
              {experience.map((r) => (
                <RoleRow key={r.id} role={r} />
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------------------ leadership */}
          <section id="leadership" className="section" aria-labelledby="leadership-title">
            <SectionHead index="05" id="leadership-title" title="Leadership" dek="Student communities and campus organisations. Roles without dates are listed as such." />
            <ul className="index-list" data-reveal="fade">
              {leadership.map((r) => (
                <RoleRow key={r.id} role={r} undatedLabel="Dates not listed" />
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------------------ education */}
          <section id="education" className="section" aria-labelledby="education-title">
            <SectionHead index="06" id="education-title" title="Education" />
            <ul className="index-list" data-reveal="fade">
              {education.map((e) => (
                <li key={e.title} className="index-row">
                  <p className="index-date mono">{e.dates}</p>
                  <div className="index-main">
                    <h3>
                      {e.title}
                      <span className="index-sub">{e.org}</span>
                    </h3>
                  </div>
                  <p className="index-side" />
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------------------ contact */}
          <section id="contact" className="section contact" aria-labelledby="contact-title">
            <p className="section-index mono" aria-hidden="true">
              <span className="index-square" />
              (07)
            </p>
            <h2 id="contact-title" className="contact-title" data-reveal="lines">
              <span className="statement-line" style={{ ["--i" as string]: 0 }}>
                <span>{editorial.contactStatement}</span>
              </span>
            </h2>
            <p className="contact-line">{editorial.contactLine}</p>
            <a className="contact-email" href={`mailto:${person.email}`} data-cursor="Write">
              {person.email}
            </a>
            <CopyEmail email={person.email} />
            <ul className="contact-links">
              <li>
                <a className="text-link" href={person.github.href} target="_blank" rel="noopener noreferrer" data-cursor="Visit">
                  {person.github.label} · {person.github.handle}
                  <span className="sr-only"> (opens in a new tab)</span>
                  <span aria-hidden="true"> ↗</span>
                </a>
              </li>
              <li>
                <a className="text-link" href={person.resume.href} data-cursor="View">
                  {person.resume.label}
                </a>
              </li>
              <li>
                <a className="text-link" href="#top">
                  Back to top
                </a>
              </li>
            </ul>
            <div className="sign-off" aria-hidden="true">
              <MarkTile large />
              <span className="mono">Asimangkan Boro · {person.location}</span>
            </div>
          </section>
        </main>

        {/* ------------------------------------------------------------ credits */}
        <footer id="credits" className="site-footer" aria-labelledby="credits-title">
          <div className="footer-grid">
            <div>
              <p className="section-index mono" aria-hidden="true">
                <span className="index-square" />
                (08)
              </p>
              <h2 id="credits-title" className="footer-title">
                Credits
              </h2>
            </div>
            <ul className="credits">
              {credits.map((c) => (
                <li key={c.what}>
                  <span className="credit-what">{c.what}</span>
                  <span className="credit-who">
                    {c.href ? (
                      <a className="text-link" href={c.href} target="_blank" rel="noopener noreferrer">
                        {c.who}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      c.who
                    )}
                  </span>
                  <span className="credit-license mono">{c.license}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-bottom">
            <p className="mono">© 2026 {person.name}</p>
            <div className="footer-tools">
              <MotionToggle />
              <SoundToggle />
              <a className="text-link" href="#top">
                Back to top
              </a>
            </div>
          </div>
        </footer>
      </div>
      <ClientRoot initialCase={initialCase} />
    </>
  );
}
