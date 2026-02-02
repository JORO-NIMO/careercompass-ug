/**
 * Location utilities using country-state-city library
 * Provides country, state, and city data for forms
 */

import { Country, State, City } from 'country-state-city';

// Cache countries to avoid repeated computations
let cachedCountries: ReturnType<typeof Country.getAllCountries> | null = null;
let cachedCountryMap: Record<string, ReturnType<typeof Country.getAllCountries>[0]> | null = null;

export function getAllCountries() {
  if (!cachedCountries) {
    cachedCountries = Country.getAllCountries();
  }
  return cachedCountries;
}

export function getCountryMap() {
  if (!cachedCountryMap) {
    const countries = getAllCountries();
    cachedCountryMap = {};
    countries.forEach(country => {
      cachedCountryMap![country.isoCode] = country;
    });
  }
  return cachedCountryMap;
}

export function getCountryName(isoCode: string) {
  const map = getCountryMap();
  return map[isoCode]?.name || isoCode;
}

export function getCountryFlag(isoCode: string) {
  const map = getCountryMap();
  return map[isoCode]?.flag || '🌍';
}

export function getCitiesOfCountry(countryCode: string) {
  if (!countryCode) return [];
  try {
    return City.getCitiesOfCountry(countryCode) || [];
  } catch (error) {
    console.error(`Failed to get cities for country ${countryCode}:`, error);
    return [];
  }
}

export function getStatesOfCountry(countryCode: string) {
  if (!countryCode) return [];
  try {
    return State.getStatesOfCountry(countryCode) || [];
  } catch (error) {
    console.error(`Failed to get states for country ${countryCode}:`, error);
    return [];
  }
}

/**
 * Get cities of a specific state in a country
 * @param countryCode ISO country code (e.g., 'US')
 * @param stateCode ISO state code (e.g., 'CA')
 */
export function getCitiesOfState(countryCode: string, stateCode: string) {
  if (!countryCode || !stateCode) return [];
  try {
    return City.getCitiesOfState(countryCode, stateCode) || [];
  } catch (error) {
    console.error(`Failed to get cities for state ${stateCode}:`, error);
    return [];
  }
}

/**
 * Format country data for select options
 */
export function formatCountriesForSelect() {
  return getAllCountries().map(country => ({
    label: `${country.flag} ${country.name}`,
    value: country.isoCode,
    flag: country.flag,
    name: country.name,
    isoCode: country.isoCode,
  }));
}

/**
 * Format cities for select options
 */
export function formatCitiesForSelect(cities: ReturnType<typeof City.getCitiesOfCountry>) {
  return (cities || []).map(city => ({
    label: city.name,
    value: city.name,
    name: city.name,
  }));
}

/**
 * Find country by ISO code
 */
export function findCountryByCode(isoCode: string) {
  return getCountryMap()[isoCode] || null;
}
