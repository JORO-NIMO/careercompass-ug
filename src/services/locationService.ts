import { formatCountriesForSelect, getStatesOfCountry, getCitiesOfCountry, getCitiesOfState } from "@/lib/location-utils";
import { REGION_DISTRICT_GROUPS, findRegionForDistrict, UgandaRegion } from "@/lib/uganda-districts";

export interface SelectOption {
  label: string;
  value: string;
}

export interface CountryOption extends SelectOption {
  flag?: string;
  isoCode: string;
}

export function listCountries(): CountryOption[] {
  return formatCountriesForSelect().map((c) => ({ label: c.label, value: c.isoCode, flag: c.flag, isoCode: c.isoCode }));
}

export function listStates(countryIso: string): SelectOption[] {
  const states = getStatesOfCountry(countryIso);
  return states.map((s) => ({ label: s.name, value: s.isoCode }));
}

export function listCities(countryIso: string): SelectOption[] {
  const cities = getCitiesOfCountry(countryIso);
  return cities.map((c) => ({ label: c.name, value: c.name }));
}

export function listCitiesOfState(countryIso: string, stateIso: string): SelectOption[] {
  const cities = getCitiesOfState(countryIso, stateIso);
  return cities.map((c) => ({ label: c.name, value: c.name }));
}

export function listDistricts(countryIso: string): SelectOption[] {
  if (countryIso.toUpperCase() === "UG") {
    return REGION_DISTRICT_GROUPS.flatMap((group) => group.districts.map((d) => ({ label: d, value: d })));
  }
  return [];
}

export function getDistrictRegion(countryIso: string, districtName: string): UgandaRegion | undefined {
  if (countryIso.toUpperCase() !== "UG") return undefined;
  return findRegionForDistrict(districtName);
}
