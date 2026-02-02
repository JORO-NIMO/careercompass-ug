import { useEffect } from "react";

type Props = {
  title: string;
  description: string;
  companyName?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  applicationDeadline?: string | null;
  expiresAt?: string | null;
  opportunityType?: string | null;
  region?: string | null;
  applicationMethod?: string | null;
  applicationEmail?: string | null;
  applicationUrl?: string | null;
};

function removeExisting() {
  document.querySelectorAll<HTMLScriptElement>('script[data-jobposting-json-ld-single="true"]').forEach((node) => node.remove());
}

export default function SingleJobPostingJsonLd(props: Props) {
  useEffect(() => {
    removeExisting();

    const url = typeof window !== 'undefined' ? window.location.href : 'https://placementbridge.org/find-placements';
    const jobLocationType = props.region?.toLowerCase().includes('remote') ? 'TELECOMMUTE' : undefined;
    const applyUrl = props.applicationUrl || (props.applicationMethod === 'email' && props.applicationEmail ? `mailto:${props.applicationEmail}` : undefined);

    const item = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: props.title,
      description: props.description,
      datePosted: props.updatedAt || props.createdAt || undefined,
      validThrough: props.applicationDeadline || props.expiresAt || undefined,
      employmentType: props.opportunityType || 'FULL_TIME',
      hiringOrganization: props.companyName ? { '@type': 'Organization', name: props.companyName } : undefined,
      jobLocation: props.region ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressRegion: props.region } } : undefined,
      jobLocationType,
      applicantLocationRequirements: props.region ? { '@type': 'Country', name: props.region } : undefined,
      url,
      applicationContact: props.applicationEmail ? { '@type': 'ContactPoint', email: props.applicationEmail } : undefined,
      directApply: Boolean(applyUrl),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.jobpostingJsonLdSingle = 'true';
    script.text = JSON.stringify(item);
    document.head.append(script);

    return () => {
      removeExisting();
    };
  }, [props.title, props.description, props.companyName, props.updatedAt, props.createdAt, props.applicationDeadline, props.expiresAt, props.opportunityType, props.region, props.applicationMethod, props.applicationEmail, props.applicationUrl]);

  return null;
}
