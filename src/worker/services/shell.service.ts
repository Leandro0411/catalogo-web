import { escapeHtml } from '../lib/html';
import { findActiveTenantBySlug } from '../repositories/tenants.repo';

const HOME_TITLE = 'Catálogos online';
const HOME_DESCRIPTION = 'Catálogos online de nuestros negocios';
const ADMIN_TITLE = 'Panel';
const NOT_FOUND_TITLE = 'Catálogo no encontrado';

export interface ShellMeta {
  status: number;
  title: string;
  description: string;
  imageUrl: string | null;
  noindex: boolean;
  url: string;
}

function firstSegment(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}

export async function buildShellMeta(db: D1Database, url: URL): Promise<ShellMeta> {
  const canonicalUrl = url.toString();

  if (url.pathname === '/') {
    return {
      status: 200,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      imageUrl: null,
      noindex: false,
      url: canonicalUrl,
    };
  }

  const slug = firstSegment(url.pathname);

  if (slug === 'admin') {
    return {
      status: 200,
      title: ADMIN_TITLE,
      description: ADMIN_TITLE,
      imageUrl: null,
      noindex: true,
      url: canonicalUrl,
    };
  }

  const tenant = await findActiveTenantBySlug(db, slug);

  if (!tenant) {
    return {
      status: 404,
      title: NOT_FOUND_TITLE,
      description: NOT_FOUND_TITLE,
      imageUrl: null,
      noindex: true,
      url: canonicalUrl,
    };
  }

  return {
    status: 200,
    title: tenant.name,
    description: `Catálogo de ${tenant.name}`,
    imageUrl: tenant.logo_key ? new URL(`/img/${tenant.logo_key}`, url.origin).toString() : null,
    noindex: tenant.noindex === 1,
    url: canonicalUrl,
  };
}

export function applyShellMeta(response: Response, meta: ShellMeta): Response {
  const rewriter = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(meta.title);
      },
    })
    .on('head', {
      element(element) {
        const tags = [
          `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
          `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
          `<meta property="og:type" content="website">`,
          `<meta property="og:url" content="${escapeHtml(meta.url)}">`,
        ];

        if (meta.imageUrl) {
          tags.push(`<meta property="og:image" content="${escapeHtml(meta.imageUrl)}">`);
        }

        if (meta.noindex) {
          tags.push(`<meta name="robots" content="noindex, nofollow">`);
        }

        element.append(tags.join(''), { html: true });
      },
    });

  const rewritten = rewriter.transform(response);
  const headers = new Headers(rewritten.headers);
  headers.set('Cache-Control', 'no-cache');

  if (meta.noindex) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return new Response(rewritten.body, { status: meta.status, headers });
}
