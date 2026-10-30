import { useParams, Navigate, Link } from 'react-router-dom';
import PublicLayout from '../../components/public/PublicLayout';
import { GUIDES } from '../../data/guides';

/** `inline code` and **bold** inside a paragraph or list item. */
function renderInline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-green-300 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function Block({ text }: { text: string }) {
  if (text.startsWith('```')) {
    const code = text.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    return (
      <pre className="overflow-x-auto rounded-xl bg-black/40 border border-white/10 p-4 text-sm leading-relaxed text-green-200">
        <code>{code}</code>
      </pre>
    );
  }
  if (text.startsWith('## ')) {
    return <h2 className="text-xl font-bold text-white pt-4">{text.slice(3)}</h2>;
  }
  if (text.startsWith('- ')) {
    return (
      <ul className="list-disc pl-5 space-y-2">
        {text.split('\n').map((line, i) => (
          <li key={i}>{renderInline(line.replace(/^- /, ''))}</li>
        ))}
      </ul>
    );
  }
  return <p>{renderInline(text)}</p>;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function GuideDetail() {
  const { slug } = useParams<{ slug: string }>();
  const guide = GUIDES.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/guides" replace />;
  }

  return (
    <PublicLayout title={`${guide.title} | StudiByte Guides`} description={guide.description}>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/guides" className="text-sm text-white/50 hover:text-white/80">
          ← All guides
        </Link>

        <article>
          <h1 className="text-3xl font-bold text-white mt-4 mb-2">{guide.title}</h1>
          <p className="text-white/60 mb-3">{guide.description}</p>
          <p className="text-xs text-white/40 mb-8">
            By Adegbite Olaoluwa, Founder &amp; Developer, StudiByte
            {guide.updated && (
              <>
                {' · '}Last updated <time dateTime={guide.updated}>{formatDate(guide.updated)}</time>
              </>
            )}
          </p>

          <div className="space-y-5 text-white/85 leading-relaxed">
            {guide.content.map((block, i) => (
              <Block key={i} text={block} />
            ))}
          </div>
        </article>
      </div>
    </PublicLayout>
  );
}
