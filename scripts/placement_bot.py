#!/usr/bin/env python3
"""
Placement Bot for Ugandan Internship & Industrial Training Intelligence
Setup: pip install -r ../requirements.txt
"""

import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus

SECTORS = [
    "Agribusiness & Forestry",
    "Healthcare & Medical",
    "Media & ICT",
    "Finance & Commerce",
    "Tourism & Hospitality",
    "Engineering & Technical",
    "Legal & Professional Services",
]

PLACEMENT_TYPES = ["industrial training", "undergraduate internship", "graduate trainee"]

EXCLUSIONS = [".ac.ug", ".edu", "wikipedia.org", "curriculum", "syllabus", "admissions", "tuition"]
STALE_YEARS = ["2023", "2022", "2021", "2020", "2019"]
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
)


def clean_links(links: list[str]) -> list[str]:
    cleaned = []
    for link in links:
        lower = link.lower()
        if any(bad in lower for bad in EXCLUSIONS):
            continue
        if any(year in lower for year in STALE_YEARS):
            continue
        cleaned.append(link)
    return cleaned


def google_search(query: str) -> list[str]:
    url = f"https://www.google.com/search?q={quote_plus(query)}"
    headers = {"User-Agent": USER_AGENT}
    res = requests.get(url, headers=headers, timeout=10)
    if res.status_code != 200:
        return []
    soup = BeautifulSoup(res.text, "html.parser")
    links = []
    for g in soup.select(".tF2Cxc"):
        a = g.select_one("a")
        if a and a.get("href"):
            links.append(a["href"])
    return clean_links(links)


def build_queries(sector: str, placement_type: str, region: str | None = None) -> list[str]:
    base = f'Uganda "{sector}" {placement_type} 2025'
    region_part = f" {region}" if region else ""
    return [
        f"{base}{region_part}",
        f"{base}{region_part}",  # Global search across all domains
        f"{base}{region_part} site:(.ug OR .com OR .org OR .net OR .dev OR .co.ug OR .ac.ug)",
        f"{base}{region_part} (site:org OR site:gov OR site:org.ug OR site:go.ug)",
        f"{sector} graduate trainee Uganda 2025 -job-boards",
        f"{base} (Kampala OR Entebbe OR Mbarara OR Jinja)",
    ]


def scrape_uganda_placements(sectors: list[str], region: str | None = None):
    all_hits: list[dict] = []
    for sector in sectors:
        for placement_type in PLACEMENT_TYPES:
            queries = build_queries(sector, placement_type, region)
            for q in queries:
                print(f"[SCAN] {q}")
                links = google_search(q)
                for link in links:
                    all_hits.append({
                        "sector": sector,
                        "placement_type": placement_type,
                        "query": q,
                        "url": link,
                    })
                time.sleep(20)  # throttle to avoid detection
    return all_hits


def main():
    results = scrape_uganda_placements(SECTORS)
    print("\n--- RESULTS ---")
    for r in results:
        print(f"[{r['sector']} | {r['placement_type']}] {r['url']}")


if __name__ == "__main__":
    main()
