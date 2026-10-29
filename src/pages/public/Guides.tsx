import { Link } from 'react-router-dom';
import PublicLayout from '../../components/public/PublicLayout';
import { GUIDES } from '../../data/guides';

export default function Guides() {
  return (
    <PublicLayout
      title="Study Guides for University Students — StudiByte"
      description="Practical study guides for university students: study techniques, how GPA and CGPA are calculated, and academic planning."
    >
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-3">Study Guides</h1>
        <p className="text-white/70 mb-10">
          Practical, no-fluff guides on academics and study techniques for university students.
        </p>

        <ul className="space-y-6">
          {GUIDES.map(guide => (
            <li key={guide.slug} className="border-b border-white/10 pb-6">
              <Link
                to={`/guides/${guide.slug}`}
                className="text-xl font-semibold text-white hover:underline"
              >
                {guide.title}
              </Link>
              <p className="text-white/60 mt-2">{guide.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </PublicLayout>
  );
}
