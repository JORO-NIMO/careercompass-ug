import React, { useState } from 'react';
import { searchBooks } from '@/services/openLibraryService';
import { fetchCourses } from '@/services/courseraService';

const LearningHub: React.FC = () => {
  const [query, setQuery] = useState('software engineering');
  const [books, setBooks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      const bk = await searchBooks(query);
      setBooks(bk.docs ?? []);
      const cs = await fetchCourses(10);
      setCourses(cs.elements ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Learning Hub</h1>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 p-2 border rounded" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button onClick={runSearch} className="px-3 py-1 rounded bg-primary text-white">Search</button>
      </div>

      {loading && <div>Loading...</div>}

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Books</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {books.map((b: any) => (
            <div key={b.key} className="p-3 border rounded bg-card">
              <div className="font-medium">{b.title}</div>
              <div className="text-sm text-muted">{(b.author_name || []).join(', ')}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((c: any) => (
            <div key={c.id || c.courseId} className="p-3 border rounded bg-card">
              <div className="font-medium">{c.name || c.title}</div>
              <div className="text-sm text-muted">{c.description?.slice(0, 120)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LearningHub;
