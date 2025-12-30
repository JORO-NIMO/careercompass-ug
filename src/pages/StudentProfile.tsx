import { useEffect, useState } from "react";
import { Loader2, Plus, X, MapPin } from "lucide-react";
// ...existing imports...
// For reverse geocoding
const REVERSE_GEOCODE_API = "https://nominatim.openstreetmap.org/reverse?format=jsonv2";
import QuickNavigation from "@/components/QuickNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
	Institution,
	getInstitutesByCategory,
	instituteCategories,
	privateUniversities,
	publicUniversities,
} from "@/lib/institutions";
import { REGION_DISTRICT_GROUPS, UgandaRegion, findRegionForDistrict } from "@/lib/uganda-districts";
import { updateProfile } from "@/services/profilesService";

const RECOMMENDED_INTERESTS = [
	"Technology",
	"Finance",
	"Healthcare",
	"Engineering",
	"Education",
	"Creative Arts",
	"Energy & Climate",
	"Agriculture",
	"Tourism",
	"Social Impact",
];

const STAGE_OPTIONS = [
	{ value: "entry", label: "Learner / Emerging Talent" },
	{ value: "graduate", label: "Recent Graduate" },
	{ value: "professional", label: "Experienced Professional" },
];

const FOCUS_AREA_OPTIONS = [
	{ value: "computer-science", label: "Computer Science" },
	{ value: "business", label: "Business Administration" },
	{ value: "engineering", label: "Engineering" },
	{ value: "medicine", label: "Medicine" },
	{ value: "agriculture", label: "Agriculture" },
	{ value: "education", label: "Education" },
];

const AVAILABILITY_OPTIONS = [
	{ value: "immediately", label: "Available immediately" },
	{ value: "30_days", label: "Available in 30 days" },
	{ value: "60_days", label: "Available in 60 days" },
	{ value: "flexible", label: "Open to discussions" },
];

const getExtraStorageKey = (userId: string) => `placementbridge-profile-extra:${userId}`;

const StudentProfile = () => {
	const [geoLoading, setGeoLoading] = useState(false);
	// Helper: Reverse geocode lat/lon to district/region
	const reverseGeocode = async (lat: number, lon: number) => {
		const url = `${REVERSE_GEOCODE_API}&lat=${lat}&lon=${lon}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error("Failed to reverse geocode");
		const data = await res.json();
		// Try to extract district and region from address
		const address = data.address || {};
		const district = address.county || address.state_district || address.district || address.city || address.town || address.village || "";
		const region = address.state || address.region || "";
		return { district: district.trim(), region: region.trim() };
	};

	// Handler: Get device location and update fields
	const handleGetDeviceLocation = async () => {
		if (!navigator.geolocation) {
			toast({ title: "Geolocation not supported", description: "Your browser does not support geolocation.", variant: "destructive" });
			return;
		}
		setGeoLoading(true);
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const { latitude, longitude } = pos.coords;
					const { district: foundDistrict, region: foundRegion } = await reverseGeocode(latitude, longitude);
					if (foundDistrict) {
						setDistrict(foundDistrict);
						setLocation(`${foundDistrict}${foundRegion ? ` (${foundRegion})` : ""}`);
						setRegion(foundRegion as UgandaRegion);
						setLegacyLocation("");
						toast({ title: "Location captured", description: `Detected: ${foundDistrict}${foundRegion ? ` (${foundRegion})` : ""}` });
					} else {
						toast({ title: "Location not found", description: "Could not determine your district.", variant: "destructive" });
					}
				} catch (err) {
					toast({ title: "Location error", description: "Could not resolve your location.", variant: "destructive" });
				} finally {
					setGeoLoading(false);
				}
			},
			(err) => {
				toast({ title: "Location denied", description: "Permission denied or unavailable.", variant: "destructive" });
				setGeoLoading(false);
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	};
	const { user } = useAuth();
	const { toast } = useToast();

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [interests, setInterests] = useState<string[]>(["Technology", "Finance"]);
	const [newInterest, setNewInterest] = useState("");
	const [institutionType, setInstitutionType] = useState<"University" | "Institute">("University");
	const [institutionId, setInstitutionId] = useState<string | undefined>(undefined);
	const [stage, setStage] = useState("");
	const [focusArea, setFocusArea] = useState("");
	const [availability, setAvailability] = useState("");
	const [location, setLocation] = useState("");
	const [region, setRegion] = useState<UgandaRegion | "">("");
	const [district, setDistrict] = useState("");
	const [legacyLocation, setLegacyLocation] = useState("");
	const [cvLink, setCvLink] = useState("");
	const [bio, setBio] = useState("");
	const [schoolName, setSchoolName] = useState("");
	const [courseOfStudy, setCourseOfStudy] = useState("");
	const [yearOfStudy, setYearOfStudy] = useState("");
	const [portfolioUrl, setPortfolioUrl] = useState("");
	const [loadingProfile, setLoadingProfile] = useState(false);
	const [saving, setSaving] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);

	const handleInstitutionTypeChange = (value: string) => {
		if (value === "University" || value === "Institute") {
			setInstitutionType(value);
			setInstitutionId(undefined);
		}
	};

	const addInterest = () => {
		const trimmed = newInterest.trim();
		if (trimmed && !interests.includes(trimmed)) {
			setInterests((prev) => [...prev, trimmed]);
			setNewInterest("");
		}
	};

	const removeInterest = (interest: string) => {
		setInterests((prev) => prev.filter((value) => value !== interest));
	};

	const toggleRecommendedInterest = (interest: string) => {
		if (interests.includes(interest)) {
			removeInterest(interest);
			return;
		}
		setInterests((prev) => [...prev, interest]);
	};

	const handleRegionSelect = (value: string) => {
		const nextRegion = value as UgandaRegion;
		if (region === nextRegion) {
			return;
		}
		setRegion(nextRegion);
		setDistrict("");
		setLocation("");
		setLegacyLocation("");
	};

	const handleDistrictSelect = (value: string) => {
		if (district === value) {
			return;
		}
		setDistrict(value);
		const datasetRegion = findRegionForDistrict(value);
		if (!region && datasetRegion) {
			setRegion(datasetRegion);
		}
		if (value) {
			const resolvedRegion = region || datasetRegion || "";
			setLocation(`${value}${resolvedRegion ? ` (${resolvedRegion})` : ""}`);
		} else {
			setLocation("");
		}
		setLegacyLocation("");
	};

	const districtOptions = region
		? REGION_DISTRICT_GROUPS.find((group) => group.region === region)?.districts ?? []
		: [];

	useEffect(() => {
		if (!user) {
			setEmail("");
			return;
		}

		setEmail(user.email ?? "");

		const cached = window.localStorage.getItem(getExtraStorageKey(user.id));
		if (cached) {
			try {
				const parsed = JSON.parse(cached) as Partial<{
					phoneNumber: string;
					cvLink: string;
					bio: string;
					focusArea: string;
					institutionType: "University" | "Institute";
					institutionId?: string;
					region: UgandaRegion;
					district: string;
				}>;
				if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
				if (parsed.cvLink) setCvLink(parsed.cvLink);
				if (parsed.bio) setBio(parsed.bio);
				if (parsed.focusArea) setFocusArea(parsed.focusArea);
				if (parsed.institutionType) setInstitutionType(parsed.institutionType);
				if (parsed.institutionId) setInstitutionId(parsed.institutionId);
				if (parsed.region) setRegion(parsed.region);
				if (parsed.district) {
					const trimmedDistrict = parsed.district.trim();
					setDistrict(trimmedDistrict);
					const resolvedRegion = parsed.region ?? findRegionForDistrict(trimmedDistrict);
					if (resolvedRegion) {
						setRegion(resolvedRegion);
						setLocation(`${trimmedDistrict} (${resolvedRegion})`);
					} else {
						setLocation(trimmedDistrict);
					}
					setLegacyLocation("");
				}
			} catch (error) {
				console.warn("Failed to parse cached profile details", error);
			}
		}

		let active = true;
		const loadProfile = async () => {
			setLoadingProfile(true);
			const { data, error } = await supabase
				.from("profiles")
				.select("full_name, areas_of_interest, location, experience_level, availability_status, email")
				.eq("id", user.id)
				.maybeSingle();

			if (!active) {
				return;
			}

			if (error) {
				console.error("Unable to load profile", error);
				toast({
					title: "Profile not available",
					description: "We could not load your saved profile. Update your details and save again.",
				});
			}

			if (data) {
				if (data.full_name) {
					const segments = data.full_name.trim().split(/\s+/);
					setFirstName(segments[0] ?? "");
					setLastName(segments.slice(1).join(" "));
				}
				if (Array.isArray(data.areas_of_interest) && data.areas_of_interest.length > 0) {
					setInterests(data.areas_of_interest);
				}
				if (data.location) {
					const sanitisedLocation = data.location.trim();
					setLocation(sanitisedLocation);
					const locationMatch = sanitisedLocation.match(/^(.*?)(?:\s*\((Central|Eastern|Northern|Western)\))?$/i);
					const extractedDistrict = locationMatch?.[1]?.trim() ?? sanitisedLocation;
					const matchedRegionName = locationMatch?.[2]
						? (locationMatch[2].charAt(0).toUpperCase() + locationMatch[2].slice(1).toLowerCase()) as UgandaRegion
						: undefined;
					const derivedRegion = findRegionForDistrict(extractedDistrict) ?? matchedRegionName;
					if (derivedRegion) {
						setRegion(derivedRegion);
						setDistrict(extractedDistrict);
						setLegacyLocation("");
					} else {
						setRegion("");
						setDistrict("");
						setLegacyLocation(sanitisedLocation);
					}
				} else {
					setLocation("");
					setDistrict("");
					setRegion("");
					setLegacyLocation("");
				}
				if (data.experience_level) {
					setStage(data.experience_level);
				}
				if (data.availability_status) {
					setAvailability(data.availability_status);
				}
				if (data.email) {
					setEmail(data.email);
				}
				if (data.cv_url) {
					setCvLink(data.cv_url);
				}
				if (data.school_name) {
					setSchoolName(data.school_name);
				}
				if (data.course_of_study) {
					setCourseOfStudy(data.course_of_study);
				}
				if (data.year_of_study) {
					setYearOfStudy(data.year_of_study);
				}
				if (data.portfolio_url) {
					setPortfolioUrl(data.portfolio_url);
				}
			}

			setLoadingProfile(false);
		};

		void loadProfile();

		return () => {
			active = false;
		};
	}, [toast, user]);

	const persistExtraFields = (
		userId: string,
		overrides?: Partial<{ region: UgandaRegion | ""; district: string }>,
	) => {
		const regionToCache = overrides?.region ?? region;
		const districtToCache = overrides?.district ?? district;
		const trimmedDistrict = districtToCache?.trim();
		const payload = {
			phoneNumber,
			cvLink,
			bio,
			focusArea,
			institutionType,
			institutionId,
			region: regionToCache || undefined,
			district: trimmedDistrict || undefined,
		};
		window.localStorage.setItem(getExtraStorageKey(userId), JSON.stringify(payload));
	};

	const handleSaveProfile = async () => {
		if (!user) {
			toast({
				title: "Sign in required",
				description: "Create an account or sign in to save your profile.",
				variant: "destructive",
			});
			return;
		}

		const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
		if (!fullName) {
			toast({
				title: "Name required",
				description: "Add at least a first name so employers recognise you.",
				variant: "destructive",
			});
			return;
		}

		const interestPayload = focusArea && !interests.includes(focusArea)
			? [...interests, focusArea]
			: interests;
		const regionForDistrict = district ? findRegionForDistrict(district) : undefined;
		const effectiveRegion: UgandaRegion | "" = (region || regionForDistrict || "") as UgandaRegion | "";
		const compiledLocation = district
			? `${district}${effectiveRegion ? ` (${effectiveRegion})` : ""}`
			: location.trim();
		const locationPayload = compiledLocation ? compiledLocation : null;
		if (district && !region && regionForDistrict) {
			setRegion(regionForDistrict);
		}
		if (compiledLocation && compiledLocation !== location) {
			setLocation(compiledLocation);
		}
		if (district) {
			setLegacyLocation("");
		}


		try {
			setSaving(true);

			await updateProfile({
				full_name: fullName,
				areas_of_interest: interestPayload,
				location: locationPayload as string | null, // Type cast compatible with service
				experience_level: stage || null,
				availability_status: availability || null,
				cv_url: cvLink.trim() || null,
				school_name: schoolName.trim() || null,
				course_of_study: courseOfStudy.trim() || null,
				year_of_study: yearOfStudy || null,
				portfolio_url: portfolioUrl.trim() || null,
			});

			persistExtraFields(user.id, { region: effectiveRegion, district });
			toast({
				title: "Profile saved",
				description: "Your profile is now up to date. Preview to confirm everything looks good.",
			});
		} catch (error) {
			console.error("Failed to save profile", error);
			toast({ title: "Save failed", description: "Please try again in a moment.", variant: "destructive" });
		} finally {
			setSaving(false);
		}
	};

	const handlePreviewProfile = () => {
		setPreviewOpen(true);
	};

	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="py-16">
				<div className="container mx-auto px-4">
					<div className="max-w-2xl mx-auto space-y-8">
						<div className="text-center">
							<h1 className="text-3xl font-bold">Talent Profile</h1>
							<p className="text-muted-foreground">Complete your profile to unlock tailored learning and career matches</p>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Personal Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="firstname">First Name</Label>
										<Input
											id="firstname"
											placeholder="Stephen"
											value={firstName}
											onChange={(event) => setFirstName(event.target.value)}
											disabled={loadingProfile || saving}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="lastname">Last Name</Label>
										<Input
											id="lastname"
											placeholder="Aine"
											value={lastName}
											onChange={(event) => setLastName(event.target.value)}
											disabled={loadingProfile || saving}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										placeholder="aine.othername@company.com"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										disabled={loadingProfile || saving}
									/>
									<p className="text-xs text-muted-foreground">
										Examples: aine.othername@company.com, aine.othername@gmail.com, aine.othername@school.ac.ug
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="phone">Phone Number</Label>
									<Input
										id="phone"
										placeholder="+256 756128513"
										value={phoneNumber}
										onChange={(event) => setPhoneNumber(event.target.value)}
										disabled={loadingProfile || saving}
									/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="cv-link">CV Link (Google Drive / Online)</Label>
										<Input
											id="cv-link"
											placeholder="https://drive.google.com/..."
											value={cvLink}
											onChange={(event) => setCvLink(event.target.value)}
											disabled={loadingProfile || saving}
										/>
										<p className="text-[10px] text-muted-foreground">Recruiters will use this to view your professional history.</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="portfolio">Portfolio / Website (Optional)</Label>
										<Input
											id="portfolio"
											placeholder="https://yourwork.com"
											value={portfolioUrl}
											onChange={(event) => setPortfolioUrl(event.target.value)}
											disabled={loadingProfile || saving}
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Learning & Experience</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Institution Type</Label>
										<Select value={institutionType} onValueChange={handleInstitutionTypeChange} disabled={loadingProfile || saving}>
											<SelectTrigger>
												<SelectValue placeholder="Select type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="University">University</SelectItem>
												<SelectItem value="Institute">Institute</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>{institutionType === "University" ? "University" : "Institute"}</Label>
										<Select value={institutionId} onValueChange={setInstitutionId} disabled={loadingProfile || saving}>
											<SelectTrigger>
												<SelectValue
													placeholder={
														institutionType === "University" ? "Select your university" : "Select your institute"
													}
												/>
											</SelectTrigger>
											<SelectContent className="max-h-80">
												{institutionType === "University" ? (
													<>
														<SelectGroup>
															<SelectLabel>Public Universities</SelectLabel>
															{publicUniversities.map((university) => (
																<SelectItem key={university.id} value={university.id}>
																	{university.name}
																</SelectItem>
															))}
														</SelectGroup>
														<SelectGroup>
															<SelectLabel>Private Universities</SelectLabel>
															{privateUniversities.map((university) => (
																<SelectItem key={university.id} value={university.id}>
																	{university.name}
																</SelectItem>
															))}
														</SelectGroup>
													</>
												) : (
													<>
														{instituteCategories.map((category) => (
															<SelectGroup key={category}>
																<SelectLabel>{category}</SelectLabel>
																{getInstitutesByCategory(category).map((item: Institution) => (
																	<SelectItem key={item.id} value={item.id}>
																		{item.name} {item.ownership ? `(${item.ownership})` : ""}
																	</SelectItem>
																))}
															</SelectGroup>
														))}
													</>
												)}
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="school-name">Official School / Faculty Name</Label>
										<Input
											id="school-name"
											placeholder="e.g. Faculty of Computing"
											value={schoolName}
											onChange={(event) => setSchoolName(event.target.value)}
											disabled={loadingProfile || saving}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="course">Course of Study</Label>
										<Input
											id="course"
											placeholder="e.g. B.Sc in Software Engineering"
											value={courseOfStudy}
											onChange={(event) => setCourseOfStudy(event.target.value)}
											disabled={loadingProfile || saving}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="year">Year of Study / Graduation</Label>
									<Select value={yearOfStudy || undefined} onValueChange={setYearOfStudy} disabled={loadingProfile || saving}>
										<SelectTrigger id="year">
											<SelectValue placeholder="Select year" />
										</SelectTrigger>
										<SelectContent>
											{["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Finalist", "Graduate"].map((y) => (
												<SelectItem key={y} value={y}>{y}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Stage</Label>
										<Select value={stage || undefined} onValueChange={setStage} disabled={loadingProfile || saving}>
											<SelectTrigger>
												<SelectValue placeholder="Select stage" />
											</SelectTrigger>
											<SelectContent>
												{STAGE_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Focus Area</Label>
										<Select value={focusArea || undefined} onValueChange={setFocusArea} disabled={loadingProfile || saving}>
											<SelectTrigger>
												<SelectValue placeholder="Select focus" />
											</SelectTrigger>
											<SelectContent>
												{FOCUS_AREA_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Label>Region in Uganda</Label>
											<Button
												type="button"
												size="icon"
												variant="outline"
												className="ml-2"
												onClick={handleGetDeviceLocation}
												disabled={geoLoading || loadingProfile || saving}
												title="Use my device location"
											>
												{geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
											</Button>
										</div>
										<Select value={region || undefined} onValueChange={handleRegionSelect} disabled={loadingProfile || saving}>
											<SelectTrigger>
												<SelectValue placeholder="Select region" />
											</SelectTrigger>
											<SelectContent>
												{REGION_DISTRICT_GROUPS.map((group) => (
													<SelectItem key={group.region} value={group.region}>
														{group.region} region
													</SelectItem>
												))}
												<SelectItem value="online">Online / Remote</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>District</Label>
										<Select
											value={district || undefined}
											onValueChange={handleDistrictSelect}
											disabled={loadingProfile || saving || !region}
										>
											<SelectTrigger>
												<SelectValue placeholder={region ? "Select district" : "Select region first"} />
											</SelectTrigger>
											<SelectContent className="max-h-80">
												{districtOptions.map((option) => (
													<SelectItem key={option} value={option}>
														{option}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{legacyLocation && !district && (
											<p className="text-xs text-muted-foreground">
												We found your previous location as {legacyLocation}. Pick the closest district to improve matches.
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label>Availability</Label>
										<Select value={availability || undefined} onValueChange={setAvailability} disabled={loadingProfile || saving}>
											<SelectTrigger>
												<SelectValue placeholder="Select availability" />
											</SelectTrigger>
											<SelectContent>
												{AVAILABILITY_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Areas of Interest</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<p className="text-sm font-medium text-muted-foreground">Select suggested focus areas</p>
									<div className="flex flex-wrap gap-2">
										{RECOMMENDED_INTERESTS.map((interest) => {
											const active = interests.includes(interest);
											return (
												<Button
													key={interest}
													type="button"
													variant={active ? "secondary" : "outline"}
													size="sm"
													className="rounded-full"
													onClick={() => toggleRecommendedInterest(interest)}
													disabled={loadingProfile || saving}
												>
													{interest}
												</Button>
											);
										})}
									</div>
								</div>

								<div className="flex flex-wrap gap-2">
									{interests.map((interest) => (
										<Badge key={interest} variant="secondary" className="flex items-center gap-1">
											{interest}
											<X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeInterest(interest)} />
										</Badge>
									))}
								</div>

								<div className="flex gap-2">
									<Input
										placeholder="Add area of interest"
										value={newInterest}
										onChange={(event) => setNewInterest(event.target.value)}
										onKeyDown={(event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												addInterest();
											}
										}}
										disabled={loadingProfile || saving}
									/>
									<Button
										onClick={addInterest}
										size="icon"
										variant="outline"
										disabled={loadingProfile || saving || !newInterest.trim()}
									>
										{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
									</Button>
								</div>

								<p className="text-sm text-muted-foreground">
									Add your areas of interest to receive relevant opportunity recommendations
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Additional Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="cv">CV/Resume Link</Label>
									<Input
										id="cv"
										placeholder="https://drive.google.com/file/d/..."
										value={cvLink}
										onChange={(event) => setCvLink(event.target.value)}
										disabled={loadingProfile || saving}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="bio">Bio</Label>
									<Textarea
										id="bio"
										placeholder="Tell us about yourself, your goals, and the opportunities you're aiming for..."
										rows={4}
										value={bio}
										onChange={(event) => setBio(event.target.value)}
										disabled={loadingProfile || saving}
									/>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Talent profile FAQs</CardTitle>
							</CardHeader>
							<CardContent>
								<Accordion type="single" collapsible className="space-y-2">
									<AccordionItem value="why-save">
										<AccordionTrigger>Why should I save my profile?</AccordionTrigger>
										<AccordionContent>
											Saving keeps your interests and availability synced across PlacementBridge so employers and mentors can match with you instantly.
										</AccordionContent>
									</AccordionItem>
									<AccordionItem value="preview">
										<AccordionTrigger>What does preview show?</AccordionTrigger>
										<AccordionContent>
											Preview mirrors what employers see: your headline, interests, preferred location, and availability. Update and save any time before you share.
										</AccordionContent>
									</AccordionItem>
									<AccordionItem value="privacy">
										<AccordionTrigger>Who can view my details?</AccordionTrigger>
										<AccordionContent>
											Only verified employers and PlacementBridge admins can access your profile. Contact details stay hidden unless you decide to share them.
										</AccordionContent>
									</AccordionItem>
								</Accordion>
							</CardContent>
						</Card>

						<QuickNavigation />

						<div className="flex gap-4">
							<Button className="flex-1" onClick={handleSaveProfile} disabled={saving || loadingProfile}>
								{saving ? (
									<span className="flex items-center justify-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Saving…
									</span>
								) : (
									"Save Profile"
								)}
							</Button>
							<Button
								variant="outline"
								className="flex-1"
								onClick={handlePreviewProfile}
								disabled={loadingProfile && !firstName}
							>
								Preview Profile
							</Button>
						</div>
					</div>
				</div>
			</main>
			<Footer />

			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Profile preview</DialogTitle>
						<DialogDescription>
							Confirm the details employers will see before you share your profile.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<h3 className="text-lg font-semibold">
								{[firstName, lastName].filter(Boolean).join(" ") || "Unnamed candidate"}
							</h3>
							<p className="text-sm text-muted-foreground">
								{focusArea || stage
									? `${focusArea || ""}${focusArea && stage ? " · " : ""}${stage ? STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage : ""
									}`
									: "Update your focus area and stage to improve matches."}
							</p>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<p className="font-semibold">Email</p>
								<p className="text-muted-foreground">{email || "Add your contact email"}</p>
							</div>
							<div>
								<p className="font-semibold">Phone</p>
								<p className="text-muted-foreground">{phoneNumber || "Optional"}</p>
							</div>
							<div>
								<p className="font-semibold">Location</p>
								<p className="text-muted-foreground">{location || "Not set yet"}</p>
							</div>
							<div>
								<p className="font-semibold">Availability</p>
								<p className="text-muted-foreground">
									{availability
										? AVAILABILITY_OPTIONS.find((option) => option.value === availability)?.label ?? availability
										: "Add availability to speed up matches"}
								</p>
							</div>
						</div>
						<div>
							<p className="font-semibold">Interests</p>
							<div className="mt-2 flex flex-wrap gap-2">
								{interests.map((interest) => (
									<Badge key={interest} variant="secondary">
										{interest}
									</Badge>
								))}
								{interests.length === 0 && (
									<span className="text-sm text-muted-foreground">
										Add interests from the suggestions above.
									</span>
								)}
							</div>
						</div>
						<div className="space-y-1">
							<p className="font-semibold">Bio</p>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap border border-dashed rounded-md p-3">
								{bio || "Share your goals, strengths, and achievements to help employers understand your story."}
							</p>
						</div>
						<div>
							<p className="font-semibold">CV link</p>
							<p className="text-sm text-primary break-all">
								{cvLink || "Attach a public CV/portfolio link for faster reviews."}
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setPreviewOpen(false)}>
							Close
						</Button>
						<Button
							onClick={() => {
								setPreviewOpen(false);
								void handleSaveProfile();
							}}
							disabled={saving}
						>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default StudentProfile;

