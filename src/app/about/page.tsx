import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const projects = [
  "Carlo Social",
  "ViewTube",
  "Tweeter",
  "Rivo Studio",
  "Whisk AI",
  "Real Truth Social",
  "Carlo Kitchen",
  "Dancing Taco",
  "Never Watch",
  "Daily Affirmations",
  "Win7",
  "Slice of Pi",
];

export default function AboutPage() {
  return (
    <main className="soft-grid min-h-screen bg-cream px-4 py-5 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SiteNav />

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-soft backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-6 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-leaf-700">
                About LittleLeafy
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-stone-950 md:text-6xl">
                Built by a maker, for people who love making things grow.
              </h1>
              <p className="mt-5 text-lg font-semibold leading-8 text-stone-600">
                LittleLeafy is a free browser-based tool for designing printable plant pots,
                plant labels, and garden helpers. It was created by <strong>James B</strong>, a
                junior in high school from Ridgefield, Washington, who loves 3D modeling, web
                development, and plants — of course.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  className="press-button rounded-full bg-leaf-500 px-5 py-3 text-sm font-black text-white shadow-press"
                  href="https://www.youtube.com/@jamesbcreates"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Watch @jamesbcreates
                </a>
                <Link
                  className="press-button rounded-full border border-lilac-200 bg-white px-5 py-3 text-sm font-black text-lilac-700 shadow-press"
                  href="/"
                >
                  Open the builder
                </Link>
              </div>
            </div>

            <div className="bg-leaf-50/70 p-4 md:p-6">
              <div className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-soft">
                <img
                  alt="James B, creator of LittleLeafy"
                  className="h-full max-h-[640px] w-full object-cover object-top"
                  src="/james-b-creator.png"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-soft backdrop-blur md:p-8">
            <h2 className="text-2xl font-black text-stone-950">Meet the creator</h2>
            <div className="mt-4 grid gap-4 text-base font-medium leading-7 text-stone-600">
              <p>
                James works on LittleLeafy while balancing school, a part-time job, and the
                normal chaos of building ambitious projects after homework. The idea behind the
                site is simple: useful maker tools should be approachable, fast, and fun enough
                that people actually want to come back to them.
              </p>
              <p>
                His creative world sits at the intersection of 3D printing, browser-based
                software, practical design, and small everyday tools. Through his YouTube channel,
                <strong> @jamesbcreates</strong>, James shares 3D-printing-focused projects and
                experiments with other makers.
              </p>
              <p>
                LittleLeafy reflects that mix: part web app, part 3D modeling experiment, and
                part love letter to tiny desk gardens.
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-soft backdrop-blur md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white p-3 shadow-inner">
                <img
                  alt="Rivo Technologies logo"
                  className="h-full w-full object-contain"
                  src="/rivo-technologies-logo.png"
                />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-leaf-700">
                  Rivo Technologies
                </p>
                <h2 className="mt-1 text-2xl font-black text-stone-950">
                  A growing project studio from Ridgefield, WA.
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 text-base font-medium leading-7 text-stone-600">
              <p>
                James is the founder and owner of <strong>Rivo Technologies</strong>, based out
                of Ridgefield, Washington, USA. Rivo is a creative technology studio focused on
                shipping playful, practical, and sometimes wonderfully weird apps, tools, games,
                experiments, and browser extensions.
              </p>
              <p>
                Rivo projects have reached <strong>tens of thousands of people worldwide</strong>,
                and the audience keeps growing.
              </p>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-soft backdrop-blur md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-leaf-700">
                Projects
              </p>
              <h2 className="mt-1 text-2xl font-black text-stone-950">
                A few things Rivo has built.
              </h2>
            </div>
            <p className="max-w-xl text-sm font-semibold text-stone-500">
              From social experiments and AI tools to Chrome extensions, iOS apps, and mobile games.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {projects.map((project) => (
              <span
                key={project}
                className="rounded-full border border-leaf-100 bg-leaf-50 px-4 py-2 text-sm font-black text-leaf-700"
              >
                {project}
              </span>
            ))}
            <span className="rounded-full border border-lilac-100 bg-lilac-50 px-4 py-2 text-sm font-black text-lilac-700">
              And many more
            </span>
          </div>
        </section>

        <footer className="py-5 text-center text-sm font-semibold text-stone-500">
          Made for plant people, makers, and tiny desk gardens.
        </footer>
      </div>
    </main>
  );
}
