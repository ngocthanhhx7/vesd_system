import { Helmet } from 'react-helmet-async';

export function Seo({ title, description, schema }: { title: string; description: string; schema?: object }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="canonical" href={window.location.href} />
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
    </Helmet>
  );
}
