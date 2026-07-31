import { useParams, Navigate, Link } from 'react-router-dom';
import { GUIDES } from '../../data/guides';

export default function GuideDetail() {
  const { slug } = useParams<{ slug: string }>();
  const guide = GUIDES.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/guides" replace />;
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link to="/guides" className="text-sm text-white/50 hover:text-white/80">
        ← All guides
      </Link>

      <h1 className="text-3xl font-bold text-white mt-4 mb-2">{guide.title}</h1>
      <p className="text-white/60 mb-8">{guide.description}</p>

      <article className="space-y-5 text-white/85 leading-relaxed">
        {guide.content.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </article>
    </main>
  );
}
