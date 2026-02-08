import { useEffect } from "react";
import type { ListingWithCompany } from '@/services/listingsService';

type Props = {
  jobs: ListingWithCompany[];
};

function removeExisting() {
  document.querySelectorAll<HTMLScriptElement>('script[data-jobposting-json-ld="true"]').forEach((node) => node.remove());
}

export default function JobPostingJsonLd({ jobs }: Props) {
  useEffect(() => {
    if (!Array.isArray(jobs) || jobs.length === 0) return;
    removeExisting();

    const items = jobs.map((j) => {
      const url = typeof window !== 'undefined' ? window.location.origin : 'https://placementbridge.org';
      const applyUrl = j.application_url || (j.application_method === 'email' && j.application_email ? `mailto:${j.application_email}` : undefined);
      const jobLocationType = j.region?.toLowerCase().includes('remote') ? 'TELECOMMUTE' : undefined;
      return {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: j.title,
        description: j.description,
        datePosted: j.updated_at || j.created_at,
        validThrough: j.application_deadline || j.expires_at || undefined,
        employmentType: j.opportunity_type || 'FULL_TIME',
        hiringOrganization: j.companies?.name ? { '@type': 'Organization', name: j.companies.name } : undefined,
        jobLocation: j.region ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressRegion: j.region } } : undefined,
        jobLocationType,
        applicantLocationRequirements: j.region ? { '@type': 'Country', name: j.region } : undefined,
        url: `${url}/find-placements`,
        applicationContact: j.application_email ? { '@type': 'ContactPoint', email: j.application_email } : undefined,
        directApply: Boolean(applyUrl),
      };
    });

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.jobpostingJsonLd = 'true';
    script.text = JSON.stringify(items);
    document.head.append(script);

    return () => {
      removeExisting();
    };
  }, [jobs]);

  return null;
}
