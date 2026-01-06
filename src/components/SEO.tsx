import { useEffect } from "react";

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

type SEOProps = {
  title: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  jsonLd?: JsonLd;
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

const SEO = ({ title, description, keywords, canonical, jsonLd }: SEOProps) => {
  useEffect(() => {
    document.title = title;

    if (description) {
      upsertMetaTag("description", description);
    }

    if (keywords?.length) {
      upsertMetaTag("keywords", keywords.join(", "));
    }

    if (canonical) {
      const url = canonical.startsWith("http") ? canonical : `${window.location.origin}${canonical}`;
      upsertCanonicalLink(url);
    }

    if (jsonLd) {
      insertJsonLd(jsonLd);
    }

    return () => {
      if (jsonLd) {
        removeExistingJsonLd();
      }
    };
  }, [title, description, keywords, canonical, jsonLd]);

  return null;
};

export default SEO;
