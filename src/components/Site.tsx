import { about, education, experience, person, projects, skills } from "@/content/portfolio";
import { APERTURE } from "@/lib/mark";
import { ClientRoot } from "./ClientRoot";
import { CaseLink, SmartLink } from "./CaseLink";
import { CopyEmail } from "./CopyEmail";
import { CreditsDetails } from "./CreditsDetails";
import { EvidenceTerm } from "./EvidenceTerm";
import { HeroAperture } from "./HeroAperture";
import { Loader } from "./Loader";
import { Monogram, ProjectIcon } from "./Marks";
import { MenuToggle } from "./MenuToggle";
import { MotionToggle } from "./MotionToggle";
import { PlayOverview } from "./PlayOverview";
import { ProjectPoster } from "./ProjectPoster";
import { SoundControl } from "./SoundControl";

const pct = (v: number) => `${((v / 32) * 100).toFixed(3)}%`;

function StaticPoster() {
  // Low-contrast night terrain, shown first and whenever WebGL is unavailable.
  return (
    <div className="hero-poster" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="pool" cx="50%" cy="62%" r="38%">
            <stop offset="0" stopColor="#FFAF76" stopOpacity="0.22" />
            <stop offset="1" stopColor="#FFAF76" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M0 560 C180 520 300 470 460 500 C600 528 700 470 820 486 C960 504 1060 450 1220 470 C1380 490 1480 520 1600 506 V900 H0 Z" fill="#141a16" />
        <path d="M0 640 C220 600 360 620 520 610 C700 598 760 640 980 630 C1180 620 1300 590 1600 620 V900 H0 Z" fill="#181f1a" />
        <ellipse cx="800" cy="640" rx="560" ry="190" fill="url(#pool)" />
        <g fill="none" stroke="#B7D0A5" strokeOpacity="0.08" strokeWidth="1.2">
          <path d="M60 720 C320 690 520 704 780 698 C1040 692 1240 710 1540 690" />
          <path d="M20 780 C300 750 560 772 820 760 C1080 748 1300 772 1580 750" />
          <path d="M0 840 C260 820 540 836 800 828 C1060 820 1340 842 1600 826" />
        </g>
        <path d="M640 900 C700 820 760 770 800 700 M800 700 C860 760 980 800 1120 900 M800 700 C760 660 700 640 640 610" fill="none" stroke="#F3EFE4" strokeOpacity="0.07" strokeWidth="2" />
      </svg>
    </div>
  );
}

export function Site({ initialCase }: { initialCase: string | null }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Loader skip={!!initialCase} />
      <div id="page">
        <header className="site-header">
          <a className="wordmark" href="#top">
            <Monogram className="wordmark-mark" stroke={2.2} />
            <span>{person.name}</span>
          </a>
          <nav id="site-nav" aria-label="Primary">
            <ul>
              <li>
                <a href="#work" data-nav>
                  Work
                </a>
              </li>
              <li>
                <a href="#skills" data-nav>
                  Skills
                </a>
              </li>
              <li>
                <a href="#about" data-nav>
                  About
                </a>
              </li>
              <li>
                <a href="#contact" data-nav>
                  Contact
                </a>
              </li>
            </ul>
            <MotionToggle className="nav-motion" />
          </nav>
          <MenuToggle />
        </header>

        <main id="main" tabIndex={-1}>
          {/* ---------------------------------------------------------- hero + descent */}
          <section id="top" className="hero" aria-labelledby="hero-title">
            <div className="hero-sticky">
              <StaticPoster />
              <div className="hero-mark-wrap">
                <div className="hero-mark-box" data-mark-box>
                  <Monogram className="hero-mark-svg" />
                  <div
                    className="aperture"
                    style={{ left: pct(APERTURE.x), top: pct(APERTURE.y), width: pct(APERTURE.w), height: pct(APERTURE.h) }}
                  >
                    <HeroAperture />
                  </div>
                  <div className="play-slot" style={{ top: pct(28) }}>
                    <PlayOverview />
                  </div>
                </div>
              </div>

              <div className="hero-copy">
                <p className="hero-name mono">{person.name}</p>
                <h1 id="hero-title">{person.headline}</h1>
                <p className="lede">{person.supporting}</p>
                <p className="hero-links">
                  <a className="text-link strong" href="#work">
                    Explore projects
                  </a>
                  <a className="text-link" href={person.resume.href}>
                    {person.resume.label}
                  </a>
                </p>
              </div>

              <div className="hero-intro">
                <p>{person.intro}</p>
              </div>

              <a className="scroll-cue mono" href="#about">
                <span>Scroll</span>
                <i aria-hidden="true" />
              </a>
            </div>
          </section>

          {/* ---------------------------------------------------------- about */}
          <section id="about" className="section about grid" aria-labelledby="about-title">
            <div className="about-side" data-reveal>
              <h2 id="about-title" className="section-title">
                {about.heading}
              </h2>
              <figure className="portrait">
                <div className="portrait-frame" aria-hidden="true">
                  <svg viewBox="0 0 120 150" className="portrait-contours">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <ellipse key={i} cx="60" cy="96" rx={14 + i * 9} ry={8 + i * 6} fill="none" />
                    ))}
                  </svg>
                  <Monogram className="portrait-mark" />
                </div>
                <figcaption className="mono small muted">Monogram portrait · {person.location}</figcaption>
              </figure>
            </div>
            <div className="about-text" data-reveal>
              {about.paragraphs.map((para, i) => (
                <p key={i}>
                  {para.map((seg, j) => (typeof seg === "string" ? <span key={j}>{seg}</span> : <EvidenceTerm key={seg.id} term={seg} />))}
                </p>
              ))}
              <dl className="facts">
                <div>
                  <dt>Studying</dt>
                  <dd>B.Tech CSE, final year, Jorhat Engineering College</dd>
                </div>
                <div>
                  <dt>Based in</dt>
                  <dd>{person.location}</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* ---------------------------------------------------------- work */}
          <section id="work" className="section work" aria-labelledby="work-title">
            <div className="section-head grid">
              <h2 id="work-title" className="section-title" tabIndex={-1}>
                Selected projects
              </h2>
              <p className="section-note">Four projects, from campus navigation to an internship team build. Previews are original illustrations, labelled on each card.</p>
            </div>
            <div className="work-grid">
              {projects.map((p, i) => (
                <article key={p.slug} className={`card card-${i + 1}`} aria-labelledby={`p-${p.slug}`} data-reveal>
                  <ProjectPoster project={p} />
                  <div className="card-caption">
                    <p className="card-status mono">
                      <ProjectIcon name={p.icon} className="icon-sm" />
                      {p.status}
                    </p>
                    <h3 id={`p-${p.slug}`}>{p.title}</h3>
                    <p className="card-summary">{p.summary}</p>
                    <CaseLink slug={p.slug} className="text-link strong">
                      View case<span className="sr-only">: {p.title}</span>
                    </CaseLink>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------------- skills */}
          <section id="skills" className="section rows-section" aria-labelledby="skills-title">
            <div className="section-head grid">
              <h2 id="skills-title" className="section-title">
                Skills
              </h2>
              <p className="section-note">Grouped by where they were used.</p>
            </div>
            <ul className="rows" data-reveal>
              {skills.map((g) => (
                <li key={g.name} className="row">
                  <h3 className="row-name">{g.name}</h3>
                  <p className="row-main">{g.items.join(" · ")}</p>
                  <p className="row-side">
                    <span className="mono small muted">Evidence </span>
                    {g.evidence.map((ev, k) => (
                      <span key={ev.href + ev.label}>
                        {k > 0 ? ", " : ""}
                        <SmartLink href={ev.href} className="text-link">
                          {ev.label}
                        </SmartLink>
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------------------------------------------------------- experience */}
          <section id="experience" className="section rows-section" aria-labelledby="experience-title">
            <div className="section-head grid">
              <h2 id="experience-title" className="section-title">
                Experience &amp; leadership
              </h2>
            </div>
            <ul className="rows" data-reveal>
              {experience.dated.map((r) => (
                <li key={r.id} id={r.id} className="row">
                  <p className="row-date mono">{r.dates}</p>
                  <div className="row-main">
                    <h3>
                      {r.title}, <span className="muted-strong">{r.org}</span>
                    </h3>
                    {r.detail ? <p>{r.detail}</p> : null}
                  </div>
                  <p className="row-side">
                    {r.evidence ? (
                      <SmartLink href={r.evidence.href} className="text-link">
                        {r.evidence.label}
                      </SmartLink>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
            <h3 className="rows-subhead">
              Community roles <span className="mono small muted">· ongoing, undated</span>
            </h3>
            <ul className="rows" data-reveal>
              {experience.community.map((r) => (
                <li key={r.id} id={r.id} className="row">
                  <p className="row-date mono">Undated</p>
                  <div className="row-main">
                    <h3>
                      {r.title}, <span className="muted-strong">{r.org}</span>
                    </h3>
                    {r.detail ? <p>{r.detail}</p> : null}
                  </div>
                  <p className="row-side" />
                </li>
              ))}
            </ul>
          </section>

          {/* ---------------------------------------------------------- education */}
          <section id="education" className="section rows-section" aria-labelledby="education-title">
            <div className="section-head grid">
              <h2 id="education-title" className="section-title">
                Education
              </h2>
            </div>
            <ul className="rows" data-reveal>
              {education.map((e) => (
                <li key={e.title} className="row">
                  <p className="row-date mono">{e.dates}</p>
                  <div className="row-main">
                    <h3>{e.title}</h3>
                    <p>{e.org}</p>
                  </div>
                  <p className="row-side" />
                </li>
              ))}
            </ul>
          </section>

          {/* ---------------------------------------------------------- contact */}
          <section id="contact" className="section contact" aria-labelledby="contact-title">
            <h2 id="contact-title" className="section-title">
              Contact
            </h2>
            <p className="contact-lede">Email is the quickest way to reach me. Based in {person.location}.</p>
            <a className="email-big" href={`mailto:${person.email}`}>
              {person.email}
            </a>
            <CopyEmail email={person.email} />
            <p className="contact-links">
              <a className="text-link strong" href={person.resume.href}>
                {person.resume.label}
              </a>
              <a className="text-link" href="#top">
                Back to top
              </a>
            </p>
            <div className="contact-mark" aria-hidden="true">
              <Monogram />
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <p className="small muted">© 2026 {person.name}. Built with original code, marks and sound.</p>
          <CreditsDetails />
          <div className="footer-actions">
            <MotionToggle />
            <a className="text-link" href="#top">
              Back to top
            </a>
          </div>
        </footer>

        <SoundControl />
      </div>
      <ClientRoot initialCase={initialCase} />
    </>
  );
}
