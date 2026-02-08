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
      const isRemote = jobLocationType === 'TELECOMMUTE';
      
      // Build complete address for jobLocation (required fields for Google)
      const buildJobLocation = () => {
        if (isRemote) {
          return undefined; // Remote jobs don't need physical location
        }
        return {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'UG', // Uganda as default country
            addressRegion: j.region || 'Uganda',
            addressLocality: j.region || 'Kampala', // Default to Kampala
            postalCode: '256', // Uganda country code as placeholder
          },
        };
      };

      return {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: j.title,
        description: j.description,
        datePosted: j.updated_at || j.created_at,
        validThrough: j.application_deadline || j.expires_at || undefined,
        employmentType: j.opportunity_type || 'FULL_TIME',
        // hiringOrganization is REQUIRED - always provide a value
        hiringOrganization: {
          '@type': 'Organization',
          name: j.companies?.name || 'PlacementBridge Partner',
          sameAs: j.companies?.website_url || 'https://placementbridge.org',
        },
        jobLocation: buildJobLocation(),
        jobLocationType,
        applicantLocationRequirements: isRemote ? { '@type': 'Country', name: 'Uganda' } : undefined,
        url: `${url}/placements/${j.id}`,
        applicationContact: j.application_email ? { '@type': 'ContactPoint', email: j.application_email } : undefined,
        directApply: Boolean(applyUrl),
        // Add baseSalary if available (non-critical but recommended)
        baseSalary: j.salary_min || j.salary_max ? {
          '@type': 'MonetaryAmount',
          currency: 'UGX',
          value: {
            '@type': 'QuantitativeValue',
            minValue: j.salary_min || undefined,
            maxValue: j.salary_max || undefined,
            unitText: 'MONTH',
          },
        } : undefined,
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
