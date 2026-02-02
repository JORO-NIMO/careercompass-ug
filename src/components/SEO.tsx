import { useEffect } from "react";

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

type SEOProps = {
  title: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  jsonLd?: JsonLd;
  siteName?: string;
};

function upsertMetaTag(name: string, content: string) {
  if (!content) return;
  const selector = `meta[name="${name}"]`;
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.append(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonicalLink(href: string) {
  if (!href) return;
  const selector = "link[rel=canonical]";
  let link = document.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.append(link);
  }
  link.setAttribute("href", href);
}

function removeExistingJsonLd() {
  document.querySelectorAll<HTMLScriptElement>('script[data-seo-json-ld="true"]').forEach((node) => {
    node.remove();
  });
}

function insertJsonLd(jsonLd: JsonLd) {
  removeExistingJsonLd();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.seoJsonLd = "true";
  script.text = JSON.stringify(jsonLd);
  document.head.append(script);
}

const DEFAULT_DESCRIPTION = "All jobs in one place — find internships, entry-level roles, and career opportunities worldwide.";

const SEO = ({ title, description = DEFAULT_DESCRIPTION, keywords, canonical, jsonLd, siteName }: SEOProps) => {
  useEffect(() => {
    document.title = title;

    if (description) {
      upsertMetaTag("description", description);
      // Open Graph description
      const ogDescSel = 'meta[property="og:description"]';
      let ogDesc = document.querySelector<HTMLMetaElement>(ogDescSel);
      if (!ogDesc) {
        ogDesc = document.createElement("meta");
        ogDesc.setAttribute("property", "og:description");
        document.head.append(ogDesc);
      }
      ogDesc.setAttribute("content", description);
      // Twitter description
      upsertMetaTag("twitter:description", description);
    }

    if (keywords?.length) {
      upsertMetaTag("keywords", keywords.join(", "));
    }

    {
      const url = canonical
        ? (canonical.startsWith("http") ? canonical : `${window.location.origin}${canonical}`)
        : window.location.href;
      upsertCanonicalLink(url);
      // Open Graph URL
      const ogUrlSel = 'meta[property="og:url"]';
      let ogUrl = document.querySelector<HTMLMetaElement>(ogUrlSel);
      if (!ogUrl) {
        ogUrl = document.createElement("meta");
        ogUrl.setAttribute("property", "og:url");
        document.head.append(ogUrl);
      }
      ogUrl.setAttribute("content", url);
    }

    // Open Graph title
    const ogTitleSel = 'meta[property="og:title"]';
    let ogTitle = document.querySelector<HTMLMetaElement>(ogTitleSel);
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.append(ogTitle);
    }
    ogTitle.setAttribute("content", title);

    // Open Graph site_name
    const ogSiteSel = 'meta[property="og:site_name"]';
    let ogSite = document.querySelector<HTMLMetaElement>(ogSiteSel);
    if (!ogSite) {
      ogSite = document.createElement("meta");
      ogSite.setAttribute("property", "og:site_name");
      document.head.append(ogSite);
    }
    ogSite.setAttribute("content", siteName || title);

    // Twitter title
    upsertMetaTag("twitter:title", title);

    if (jsonLd) {
      insertJsonLd(jsonLd);
    }

    return () => {
      if (jsonLd) {
        removeExistingJsonLd();
      }
    };
  }, [title, description, keywords, canonical, jsonLd, siteName]);

  return null;
};

export default SEO;
