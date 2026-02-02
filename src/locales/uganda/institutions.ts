export type InstitutionType = "University" | "Institute";

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  ownership?: "Public" | "Private";
  category?: string;
  location?: string;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Universities (Public + Private)
export const universities: Institution[] = [
  { name: "Makerere University (MUK)", location: "Kampala", ownership: "Public", type: "University", id: slugify("Makerere University (MUK)") },
  { name: "Mbarara University of Science and Technology (MUST)", location: "Mbarara", ownership: "Public", type: "University", id: slugify("Mbarara University of Science and Technology (MUST)") },
  { name: "Kyambogo University (KYU)", location: "Kampala", ownership: "Public", type: "University", id: slugify("Kyambogo University (KYU)") },
  { name: "Gulu University (GU)", location: "Gulu", ownership: "Public", type: "University", id: slugify("Gulu University (GU)") },
  { name: "Busitema University (BUS)", location: "Tororo/Busia", ownership: "Public", type: "University", id: slugify("Busitema University (BUS)") },
  { name: "Muni University (MU)", location: "Arua", ownership: "Public", type: "University", id: slugify("Muni University (MU)") },
  { name: "Kabale University (KABU)", location: "Kabale", ownership: "Public", type: "University", id: slugify("Kabale University (KABU)") },
  { name: "Lira University (LU)", location: "Lira", ownership: "Public", type: "University", id: slugify("Lira University (LU)") },
  { name: "Soroti University (SUN)", location: "Soroti", ownership: "Public", type: "University", id: slugify("Soroti University (SUN)") },
  { name: "Mountains of the Moon University (MMU)", location: "Fort Portal", ownership: "Public", type: "University", id: slugify("Mountains of the Moon University (MMU)") },
  { name: "Makerere University Business School (MUBS)", location: "Kampala", ownership: "Public", type: "University", id: slugify("Makerere University Business School (MUBS)") },
  { name: "Uganda Management Institute (UMI)", location: "Kampala", ownership: "Public", type: "University", id: slugify("Uganda Management Institute (UMI)") },
  { name: "Kampala International University (KIU)", location: "Kampala/Ishaka", ownership: "Private", type: "University", id: slugify("Kampala International University (KIU)") },
  { name: "Uganda Christian University (UCU)", location: "Mukono", ownership: "Private", type: "University", id: slugify("Uganda Christian University (UCU)") },
  { name: "Uganda Martyrs University (UMU)", location: "Nkozi", ownership: "Private", type: "University", id: slugify("Uganda Martyrs University (UMU)") },
  { name: "Ndejje University", location: "Luweero", ownership: "Private", type: "University", id: slugify("Ndejje University") },
  { name: "Nkumba University", location: "Entebbe", ownership: "Private", type: "University", id: slugify("Nkumba University") },
  { name: "Bugema University", location: "Luweero", ownership: "Private", type: "University", id: slugify("Bugema University") },
  { name: "Bishop Stuart University (BSU)", location: "Mbarara", ownership: "Private", type: "University", id: slugify("Bishop Stuart University (BSU)") },
  { name: "Islamic University in Uganda (IUIU)", location: "Mbale", ownership: "Private", type: "University", id: slugify("Islamic University in Uganda (IUIU)") },
  { name: "African Bible University", location: "Entebbe", ownership: "Private", type: "University", id: slugify("African Bible University") },
  { name: "International University of East Africa (IUEA)", location: "Kampala", ownership: "Private", type: "University", id: slugify("International University of East Africa (IUEA)") },
  { name: "Victoria University", location: "Kampala", ownership: "Private", type: "University", id: slugify("Victoria University") },
  // Private Universities list
  { name: "Cavendish University Uganda", ownership: "Private", type: "University", id: slugify("Cavendish University Uganda") },
  { name: "ISBAT University", ownership: "Private", type: "University", id: slugify("ISBAT University") },
  { name: "Clarke International University", ownership: "Private", type: "University", id: slugify("Clarke International University") },
  { name: "Metropolitan International University", ownership: "Private", type: "University", id: slugify("Metropolitan International University") },
  { name: "St. Lawrence University (SLAU)", ownership: "Private", type: "University", id: slugify("St. Lawrence University (SLAU)") },
  { name: "University of Kisubi (UNIK)", ownership: "Private", type: "University", id: slugify("University of Kisubi (UNIK)") },
  { name: "King Ceasor University", ownership: "Private", type: "University", id: slugify("King Ceasor University") },
  { name: "Africa Renewal University", ownership: "Private", type: "University", id: slugify("Africa Renewal University") },
  { name: "Kampala University", ownership: "Private", type: "University", id: slugify("Kampala University") },
  { name: "Kumi University", ownership: "Private", type: "University", id: slugify("Kumi University") },
  { name: "African Rural University", ownership: "Private", type: "University", id: slugify("African Rural University") },
  { name: "Muteesa I Royal University", ownership: "Private", type: "University", id: slugify("Muteesa I Royal University") },
  { name: "LivingStone International University", ownership: "Private", type: "University", id: slugify("LivingStone International University") },
  { name: "University of the Sacred Heart Gulu", ownership: "Private", type: "University", id: slugify("University of the Sacred Heart Gulu") },
  { name: "Uganda Pentecostal University", ownership: "Private", type: "University", id: slugify("Uganda Pentecostal University") },
  { name: "Ibanda University", ownership: "Private", type: "University", id: slugify("Ibanda University") },
  { name: "Valley University of Science and Technology", ownership: "Private", type: "University", id: slugify("Valley University of Science and Technology") },
  { name: "Team University", ownership: "Private", type: "University", id: slugify("Team University") },
  { name: "Avance International University", ownership: "Private", type: "University", id: slugify("Avance International University") },
];

// Institutes grouped by category
export const institutes: Institution[] = [
  // Agriculture, Fisheries, and Forestry
  { name: "Bukalasa Agricultural College", ownership: "Public", type: "Institute", category: "Agriculture, Fisheries, and Forestry", id: slugify("Bukalasa Agricultural College") },
  { name: "Fisheries Training College", ownership: "Public", type: "Institute", category: "Agriculture, Fisheries, and Forestry", id: slugify("Fisheries Training College") },
  { name: "Nyabyeya Forestry College Masindi", ownership: "Public", type: "Institute", category: "Agriculture, Fisheries, and Forestry", id: slugify("Nyabyeya Forestry College Masindi") },

  // Health Institutions
  { name: "Health Tutors College Mulago", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Health Tutors College Mulago") },
  { name: "Butabika School of Psychiatric Nursing", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Butabika School of Psychiatric Nursing") },
  { name: "Butabika School of Psychiatric Clinical Officers", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Butabika School of Psychiatric Clinical Officers") },
  { name: "Ernest Cook Ultra Sound Research Education Institute", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Ernest Cook Ultra Sound Research Education Institute") },
  { name: "Jinja School of Nursing and Midwifery", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Jinja School of Nursing and Midwifery") },
  { name: "School of Clinical Officers-Gulu", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("School of Clinical Officers-Gulu") },
  { name: "School of Clinical Officers Fortportal", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("School of Clinical Officers Fortportal") },
  { name: "School of Hygiene Mbale", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("School of Hygiene Mbale") },
  { name: "Masaka School of Comprehensive Nursing", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Masaka School of Comprehensive Nursing") },
  { name: "Mulago Paramedical Schools", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Mulago Paramedical Schools") },
  { name: "Ophathalmic Clinical Officers Training School", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Ophathalmic Clinical Officers Training School") },
  { name: "Soroti School of Comprehensive Nursing", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("Soroti School of Comprehensive Nursing") },
  { name: "School of Clinical Officers-Mbale", ownership: "Public", type: "Institute", category: "Health Institutions", id: slugify("School of Clinical Officers-Mbale") },
  { name: "Kabale Institute of Health Sciences", ownership: "Private", type: "Institute", category: "Health Institutions", id: slugify("Kabale Institute of Health Sciences") },
  { name: "Medicare Health Professionals", ownership: "Private", type: "Institute", category: "Health Institutions", id: slugify("Medicare Health Professionals") },
  { name: "Machsu School of Clinical", ownership: "Private", type: "Institute", category: "Health Institutions", id: slugify("Machsu School of Clinical") },
  { name: "Medical Laboratory Technician's School, Jinja", ownership: "Private", type: "Institute", category: "Health Institutions", id: slugify("Medical Laboratory Technician's School, Jinja") },
  { name: "International Institute of Health Science", ownership: "Private", type: "Institute", category: "Health Institutions", id: slugify("International Institute of Health Science") },
  { name: "Kabale School of Comprehensive Nursing", ownership: "Private", type: "Institute", category: "Health Institutions", id: slugify("Kabale School of Comprehensive Nursing") },
  { name: "Lira School of Comprehensive Nursing", ownership: "Private", type: "Institute", category: "Health Institutions", id: slugify("Lira School of Comprehensive Nursing") },
  { name: "Chemiquip International School for Laboratory Training", ownership: "Private", type: "Institute", category: "Health Institutions", id: slugify("Chemiquip International School for Laboratory Training") },

  // Theology
  { name: "All Nations Theological College", ownership: "Private", type: "Institute", category: "Theology", id: slugify("All Nations Theological College") },
  { name: "Africa Theological Seminary", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Africa Theological Seminary") },
  { name: "Glad Tidings Bible College", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Glad Tidings Bible College") },
  { name: "Institute of Advanced Leadership", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Institute of Advanced Leadership") },
  { name: "Katigondo National Major Seminary", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Katigondo National Major Seminary") },
  { name: "Kampala Evangelical School of Theology", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Kampala Evangelical School of Theology") },
  { name: "Reformed Theological College", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Reformed Theological College") },
  { name: "Uganda Bible Institute", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Uganda Bible Institute") },
  { name: "Uganda Baptist Seminary", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Uganda Baptist Seminary") },
  { name: "St. Paul National Seminary Kinyamasika", ownership: "Private", type: "Institute", category: "Theology", id: slugify("St. Paul National Seminary Kinyamasika") },
  { name: "Pentacostal Thelogical College (PTC)", ownership: "Private", type: "Institute", category: "Theology", id: slugify("Pentacostal Thelogical College (PTC)") },

  // Media Institutes
  { name: "Uganda Institute of Business and Media Studies", ownership: "Private", type: "Institute", category: "Media Institutes", id: slugify("Uganda Institute of Business and Media Studies") },
  { name: "Uganda Institute of Information and Communications Tech", ownership: "Private", type: "Institute", category: "Media Institutes", id: slugify("Uganda Institute of Information and Communications Tech") },
  { name: "UMCAT School of Journalism and Mass Communication", ownership: "Private", type: "Institute", category: "Media Institutes", id: slugify("UMCAT School of Journalism and Mass Communication") },
  { name: "International Institute of Business and Media Studies", ownership: "Private", type: "Institute", category: "Media Institutes", id: slugify("International Institute of Business and Media Studies") },

  // Business Institutions
  { name: "Uganda College of Commerce Aduku", ownership: "Public", type: "Institute", category: "Business Institutions", id: slugify("Uganda College of Commerce Aduku") },
  { name: "Uganda College of Commerce Kabale", ownership: "Public", type: "Institute", category: "Business Institutions", id: slugify("Uganda College of Commerce Kabale") },
  { name: "Uganda College of Commerce Pakwach", ownership: "Public", type: "Institute", category: "Business Institutions", id: slugify("Uganda College of Commerce Pakwach") },
  { name: "Uganda College of Commerce Soroti", ownership: "Public", type: "Institute", category: "Business Institutions", id: slugify("Uganda College of Commerce Soroti") },
  { name: "Uganda College of Commerce Tororo", ownership: "Public", type: "Institute", category: "Business Institutions", id: slugify("Uganda College of Commerce Tororo") },
  { name: "Kabalore College of Commerce", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Kabalore College of Commerce") },
  { name: "Progressive Institute of Business", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Progressive Institute of Business") },
  { name: "Rwenzori College of Commerce", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Rwenzori College of Commerce") },
  { name: "Royal Institute of Business and Technical Education", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Royal Institute of Business and Technical Education") },
  { name: "Rosa Mystica Inst of Business & Voc Training Fortportal", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Rosa Mystica Inst of Business & Voc Training Fortportal") },
  { name: "Uganda Institute of Banking and Finance", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Uganda Institute of Banking and Finance") },
  { name: "United College of Business Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("United College of Business Studies") },
  { name: "Institute of Accountancy and Commerce", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Institute of Accountancy and Commerce") },
  { name: "Kiima College of Business Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Kiima College of Business Studies") },
  { name: "International School of Business and Technology", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("International School of Business and Technology") },
  { name: "International College of Business and Computer Science", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("International College of Business and Computer Science") },
  { name: "International Institute of Education Katwe", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("International Institute of Education Katwe") },
  { name: "Mbarara Business Institute", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Mbarara Business Institute") },
  { name: "Kampala College of Business", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Kampala College of Business") },
  { name: "Kabarole College of Commerce", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Kabarole College of Commerce") },
  { name: "Kampala College of Commerce and Advanced Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Kampala College of Commerce and Advanced Studies") },
  { name: "Kyotera College of Business Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Kyotera College of Business Studies") },
  { name: "Light Bureau of Accountany College", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Light Bureau of Accountany College") },
  { name: "Mult-Tech Management Accountancy Programme", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Mult-Tech Management Accountancy Programme") },
  { name: "Makerere Business Institute", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Makerere Business Institute") },
  { name: "Makerere College of Business and Computer Studies Rukungiri", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Makerere College of Business and Computer Studies Rukungiri") },
  { name: "Maganjo Institute of Career Education", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Maganjo Institute of Career Education") },
  { name: "Nyamitanga College of Business Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Nyamitanga College of Business Studies") },
  { name: "Nakawa Institute of Business Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Nakawa Institute of Business Studies") },
  { name: "UNITED COLLEGE OF BUSINESS STUDIES RUKUNGIRI", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("UNITED COLLEGE OF BUSINESS STUDIES RUKUNGIRI") },
  { name: "INSTITUTE OF BUSINESS STUDIES, TECHNOLOGY& AGRIC", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("INSTITUTE OF BUSINESS STUDIES, TECHNOLOGY& AGRIC") },
  { name: "YMCA College of Business Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("YMCA College of Business Studies") },
  { name: "YWCA Training Institute", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("YWCA Training Institute") },
  { name: "Zenith Business College", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Zenith Business College") },
  { name: "The College of Business Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("The College of Business Studies") },
  { name: "Tropical College of Commerce and Computer Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Tropical College of Commerce and Computer Studies") },
  { name: "Bridge Tutorial College", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Bridge Tutorial College") },
  { name: "Bethel Training Institute", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Bethel Training Institute") },
  { name: "College of Business and Management Studies", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("College of Business and Management Studies") },
  { name: "College of Business Studies Uganda", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("College of Business Studies Uganda") },
  { name: "Fortportal Institute of Commerce", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Fortportal Institute of Commerce") },
  { name: "Great Lakes Regional College", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Great Lakes Regional College") },
  { name: "Higher Learning Institute of Business Masaka", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Higher Learning Institute of Business Masaka") },
  { name: "African College of Commerce", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("African College of Commerce") },
  { name: "Aptech Computer Education Centre", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Aptech Computer Education Centre") },
  { name: "Ankole West Institute of Science and Technology", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Ankole West Institute of Science and Technology") },
  { name: "Buganda Royal Institute of Business and Technical Education", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Buganda Royal Institute of Business and Technical Education") },
  { name: "College of Professional Development", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("College of Professional Development") },
  { name: "Centre for Procurement Management", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Centre for Procurement Management") },
  { name: "Celak Vocational College", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Celak Vocational College") },
  { name: "Datamine Technical Business School", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Datamine Technical Business School") },
  { name: "Institute of Management Science and Technology", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Institute of Management Science and Technology") },
  { name: "Management and Accontancy Training Company Limited", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Management and Accontancy Training Company Limited") },
  { name: "Nkokonjeru Institute of Management and Technology", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Nkokonjeru Institute of Management and Technology") },
  { name: "Makerere International Inst of Env Devt & Practical Skills", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Makerere International Inst of Env Devt & Practical Skills") },
  { name: "Skills Resource Centre", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("Skills Resource Centre") },
  { name: "AICM Vocatraing Training College", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("AICM Vocatraing Training College") },
  { name: "St. Joseph Poly Technic Institute", ownership: "Private", type: "Institute", category: "Business Institutions", id: slugify("St. Joseph Poly Technic Institute") },

  // Management Institutions
  { name: "Management Training and Advisory Centre", ownership: "Public", type: "Institute", category: "Management Institutions", id: slugify("Management Training and Advisory Centre") },
  { name: "Liberty College of Management and Journalism", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Liberty College of Management and Journalism") },
  { name: "Makerere Institute of Administrative Management", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Makerere Institute of Administrative Management") },
  { name: "Mbarara Institute for Social Development", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Mbarara Institute for Social Development") },
  { name: "Makerere Institute of Management", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Makerere Institute of Management") },
  { name: "Makerere Institute for Social Development", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Makerere Institute for Social Development") },
  { name: "Nile Institute of Management Studies Arua", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Nile Institute of Management Studies Arua") },
  { name: "Nile Management Training Centre", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Nile Management Training Centre") },
  { name: "Nsamizi Training Institute of Social Devt", ownership: "Public", type: "Institute", category: "Management Institutions", id: slugify("Nsamizi Training Institute of Social Devt") },
  { name: "Visions Institute of Public Relations and Management", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Visions Institute of Public Relations and Management") },
  { name: "Rukungiri Institute of Management", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Rukungiri Institute of Management") },
  { name: "Bishop Magambo Counsellor Training Institute", ownership: "Private", type: "Institute", category: "Management Institutions", id: slugify("Bishop Magambo Counsellor Training Institute") },

  // National Teachers Colleges (NTC)
  { name: "National Teachers College Unyama", ownership: "Public", type: "Institute", category: "National Teachers Colleges (NTC)", id: slugify("National Teachers College Unyama") },
  { name: "National Teachers College Mubende", ownership: "Public", type: "Institute", category: "National Teachers Colleges (NTC)", id: slugify("National Teachers College Mubende") },
  { name: "National Teachers College Kabale", ownership: "Public", type: "Institute", category: "National Teachers Colleges (NTC)", id: slugify("National Teachers College Kabale") },
  { name: "National Teachers College-Kaliro", ownership: "Public", type: "Institute", category: "National Teachers Colleges (NTC)", id: slugify("National Teachers College-Kaliro") },
  { name: "National Teachers College Muni", ownership: "Public", type: "Institute", category: "National Teachers Colleges (NTC)", id: slugify("National Teachers College Muni") },

  // Specialized Colleges & Technical Institution
  { name: "Uganda Wildlife Training Institute Kasese", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Uganda Wildlife Training Institute Kasese") },
  { name: "The Crested Crane Hotel and Tourism Training Centre", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("The Crested Crane Hotel and Tourism Training Centre") },
  { name: "Pearlcrest Hospitality Training Institute", ownership: "Private", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Pearlcrest Hospitality Training Institute") },
  { name: "Uganda Technical College Bushenyi", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Uganda Technical College Bushenyi") },
  { name: "Uganda Technical College Elgon", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Uganda Technical College Elgon") },
  { name: "Uganda Technical College Kicwamba", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Uganda Technical College Kicwamba") },
  { name: "Uganda Technical College Lira", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Uganda Technical College Lira") },
  { name: "Uganda Technical Collegeg Masaka", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Uganda Technical Collegeg Masaka") },
  { name: "Law Development Centre", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Law Development Centre") },
  { name: "Meteorological Training Institute", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Meteorological Training Institute") },
  { name: "Institute of Survey and Land Management", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Institute of Survey and Land Management") },
  { name: "East African School of Aviation, Soroti", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("East African School of Aviation, Soroti") },
  { name: "Tororo Co-operative College", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Tororo Co-operative College") },
  { name: "Uganda Cooperative College Kigumba", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Uganda Cooperative College Kigumba") },
  { name: "Michelangelo College of Creative Arts, Kisubi", ownership: "Private", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("Michelangelo College of Creative Arts, Kisubi") },
  { name: "St Paul Regional Study Center Arua", ownership: "Private", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("St Paul Regional Study Center Arua") },
  { name: "IACE Makerere University-Fortportal", ownership: "Public", type: "Institute", category: "Specialized Colleges & Technical Institution", id: slugify("IACE Makerere University-Fortportal") },
];

export const instituteCategories = Array.from(
  new Set(institutes.map((i) => i.category).filter(Boolean))
).sort() as string[];

export const publicUniversities = universities.filter((u) => u.ownership === "Public");
export const privateUniversities = universities.filter((u) => u.ownership === "Private");

export function getInstitutesByCategory(category: string) {
  return institutes.filter((i) => i.category === category);
}
