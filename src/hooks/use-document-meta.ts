import { useEffect } from "react";
import { useLocation } from "react-router";
import { SITE_NAME, SITE_URL } from "../constants";

type DocumentMeta = {
  title: string;
  description: string;
};

type MetaValues = {
  fullTitle: string;
  description: string;
  canonicalUrl: string;
};

type MetaEntry = {
  kind: "meta" | "link";
  selector: string;
  resolve: (values: MetaValues) => string;
};

const META_ENTRIES: readonly MetaEntry[] = [
  {
    kind: "meta",
    selector: 'meta[name="description"]',
    resolve: (v) => v.description,
  },
  {
    kind: "meta",
    selector: 'meta[name="title"]',
    resolve: (v) => v.fullTitle,
  },
  {
    kind: "meta",
    selector: 'meta[property="og:title"]',
    resolve: (v) => v.fullTitle,
  },
  {
    kind: "meta",
    selector: 'meta[property="og:description"]',
    resolve: (v) => v.description,
  },
  {
    kind: "meta",
    selector: 'meta[property="og:url"]',
    resolve: (v) => v.canonicalUrl,
  },
  {
    kind: "meta",
    selector: 'meta[property="twitter:url"]',
    resolve: (v) => v.canonicalUrl,
  },
  {
    kind: "meta",
    selector: 'meta[property="twitter:title"]',
    resolve: (v) => v.fullTitle,
  },
  {
    kind: "meta",
    selector: 'meta[property="twitter:description"]',
    resolve: (v) => v.description,
  },
  {
    kind: "link",
    selector: 'link[rel="canonical"]',
    resolve: (v) => v.canonicalUrl,
  },
];

const setMetaContent = (selector: string, content: string) => {
  const element = document.querySelector<HTMLMetaElement>(selector);
  if (element) {
    element.content = content;
  }
};

const setCanonicalHref = (href: string) => {
  const element = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (element) {
    element.href = href;
  }
};

const savePrevious = (entry: MetaEntry): string => {
  if (entry.kind === "link") {
    const el = document.querySelector<HTMLLinkElement>(entry.selector);
    return el?.href ?? "";
  }
  const el = document.querySelector<HTMLMetaElement>(entry.selector);
  return el?.content ?? "";
};

const applyEntry = (entry: MetaEntry, value: string) => {
  if (entry.kind === "link") {
    setCanonicalHref(value);
  } else {
    setMetaContent(entry.selector, value);
  }
};

export const formatTitle = (title: string): string =>
  title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

export const buildCanonicalUrl = (pathname: string): string =>
  `${SITE_URL}${pathname}`;

export const useDocumentMeta = ({ title, description }: DocumentMeta) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const values: MetaValues = {
      fullTitle: formatTitle(title),
      description,
      canonicalUrl: buildCanonicalUrl(pathname),
    };

    const prevTitle = document.title;
    const savedEntries = META_ENTRIES.map((entry) => ({
      entry,
      prev: savePrevious(entry),
    }));

    document.title = values.fullTitle;
    for (const { entry } of savedEntries) {
      applyEntry(entry, entry.resolve(values));
    }

    return () => {
      document.title = prevTitle;
      for (const { entry, prev } of savedEntries) {
        applyEntry(entry, prev);
      }
    };
  }, [title, description, pathname]);
};
