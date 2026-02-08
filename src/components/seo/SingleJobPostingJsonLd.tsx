import { useEffect } from "react";

type Props = {
  title: string;
  description: string;
  companyName?: string | null;
  companyWebsite?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  applicationDeadline?: string | null;
  expiresAt?: string | null;
  opportunityType?: string | null;
  region?: string | null;
  applicationMethod?: string | null;
  applicationEmail?: string | null;
  applicationUrl?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
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
          addressRegion: props.region || 'Uganda',
          addressLocality: props.region || 'Kampala', // Default to Kampala
          postalCode: '256', // Uganda country code as placeholder
        },
      };
    };

    const item = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: props.title,
      description: props.description,
      datePosted: props.updatedAt || props.createdAt || undefined,
      validThrough: props.applicationDeadline || props.expiresAt || undefined,
      employmentType: props.opportunityType || 'FULL_TIME',
      // hiringOrganization is REQUIRED - always provide a value
      hiringOrganization: {
        '@type': 'Organization',
        name: props.companyName || 'PlacementBridge Partner',
        sameAs: props.companyWebsite || 'https://placementbridge.org',
      },
      jobLocation: buildJobLocation(),
      jobLocationType,
      applicantLocationRequirements: isRemote ? { '@type': 'Country', name: 'Uganda' } : undefined,
      url,
      applicationContact: props.applicationEmail ? { '@type': 'ContactPoint', email: props.applicationEmail } : undefined,
      directApply: Boolean(applyUrl),
      // Add baseSalary if available (non-critical but recommended)
      baseSalary: props.salaryMin || props.salaryMax ? {
        '@type': 'MonetaryAmount',
        currency: 'UGX',
        value: {
          '@type': 'QuantitativeValue',
          minValue: props.salaryMin || undefined,
          maxValue: props.salaryMax || undefined,
          unitText: 'MONTH',
        },
      } : undefined,
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.jobpostingJsonLdSingle = 'true';
    script.text = JSON.stringify(item);
    document.head.append(script);

    return () => {
      removeExisting();
    };
  }, [props.title, props.description, props.companyName, props.companyWebsite, props.updatedAt, props.createdAt, props.applicationDeadline, props.expiresAt, props.opportunityType, props.region, props.applicationMethod, props.applicationEmail, props.applicationUrl, props.salaryMin, props.salaryMax]);

  return null;
}
