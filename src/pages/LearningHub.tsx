import React, { useState } from 'react';
import { searchBooks } from '@/services/openLibraryService';
import { getCourseraCourses } from '@/services/courseraService';

interface Book {
  key: string;
  title: string;
  author_name?: string[];
}

interface Course {
  id?: string;
  courseId?: string;
  name?: string;
  title?: string;
  description?: string;
}

interface BooksResponse {
  docs?: Book[];
}

interface CoursesResponse {
  elements?: Course[];
}

const LearningHub: React.FC = () => {
  const [query, setQuery] = useState('software engineering');
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      const bookResults = (await searchBooks(query)) as BooksResponse;
      setBooks(bookResults.docs ?? []);

      const courseResults = (await getCourseraCourses(10)) as CoursesResponse;
      setCourses(courseResults.elements ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Learning &amp; Growth Hub</h1>
        <p className="text-muted-foreground max-w-2xl">
          Discover resources that help learners, professionals, and organizations stay future-ready. Search across
          books, courses, and curated toolkits that support upskilling, career pivots, and program design.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="w-full flex-1 rounded border px-3 py-2"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search books, courses, or toolkits by keyword"
            aria-label="Search learning resources"
          />
          <button
            onClick={runSearch}
            className="inline-flex h-10 items-center justify-center rounded bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Explore
          </button>
        </div>
      </header>

      {loading && <div className="rounded border border-dashed p-6 text-center text-muted-foreground">Searching resources…</div>}

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Opportunity spotlights</h2>
          <p className="text-sm text-muted-foreground">
            Pair your learning plan with real-world opportunities spanning internships, apprenticeships, and community projects.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="h-full rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Explore cross-sector pathways</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse roles and programs across Uganda, filtered by region, industry, and preferred skill focus.
            </p>
            <a href="/find-placements" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
              Browse opportunities
            </a>
          </article>
          <article className="h-full rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Support emerging talent</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Post internships, fellowships, or full-time roles and reach a wider network of motivated candidates.
            </p>
            <a href="/for-companies" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
              Share an opportunity
            </a>
          </article>
          <article className="h-full rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Explore opportunities</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Build your talent profile to unlock curated learning resources and relevant opportunity updates.
            </p>
            <a href="/profile" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
              Update your profile
            </a>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Microlearning playlists</h2>
          <p className="text-sm text-muted-foreground">
            Tap into quick wins that build confidence and keep your team or cohort moving toward their goals.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Career navigation essentials</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Short videos and guides on personal branding, interview prep, and stakeholder communication.
            </p>
          </article>
          <article className="rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Program design toolkit</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Resources for educators and employers co-creating apprenticeships, bootcamps, or mentorship cohorts.
            </p>
          </article>
          <article className="rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Future skills lab</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Curated learning sprints on data literacy, green jobs, digital marketing, and product innovation.
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Mentorship &amp; community</h2>
          <p className="text-sm text-muted-foreground">
            Connect with peers, mentors, and coaches who can accelerate your learning and talent pipeline.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Mentor office hours</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Weekly virtual drop-ins featuring industry leaders ready to answer questions and share perspective.
            </p>
          </article>
          <article className="rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Community playbooks</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Practical facilitation templates for student clubs, alumni networks, and HR teams.
            </p>
          </article>
          <article className="rounded border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Peer learning circles</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Self-organized groups to swap resources, co-review portfolios, and reflect on growth milestones.
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Books &amp; toolkits</h2>
            <p className="text-sm text-muted-foreground">
              Downloadable guides and reading lists that inform academic projects, workplace initiatives, and community programs.
            </p>
          </div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Powered by Open Library</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {books.map((book) => (
            <article key={book.key} className="rounded border bg-card p-4 shadow-sm">
              <h3 className="font-medium leading-tight">{book.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{(book.author_name || []).join(', ')}</p>
            </article>
          ))}
          {books.length === 0 && !loading ? (
            <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
              No books yet—try a different keyword or explore our spotlighted resources above.
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Courses &amp; programs</h2>
            <p className="text-sm text-muted-foreground">
              Build stackable credentials through flexible online courses, short programs, and professional specializations.
            </p>
          </div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Powered by Coursera</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {courses.map((course) => (
            <article key={course.id || course.courseId} className="rounded border bg-card p-4 shadow-sm">
              <h3 className="font-medium leading-tight">{course.name || course.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{(course.description || '').slice(0, 120)}</p>
            </article>
          ))}
          {courses.length === 0 && !loading ? (
            <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
              Courses will appear here once you run a search or refresh your topics of interest.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default LearningHub;