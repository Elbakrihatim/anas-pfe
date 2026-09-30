/**
 * Static ISO 3166-1 alpha-2 country dataset.
 *
 * NOTE: As required, this is completely static on the frontend.
 * Do NOT fetch countries from a third-party API or backend database on render.
 */

// Generate flag emoji from 2-letter ISO 3166-1 alpha-2 code
export function getCountryFlag(code) {
  if (!code || typeof code !== "string" || code.length !== 2) return "🌐";
  try {
    const upper = code.toUpperCase();
    return String.fromCodePoint(
      ...upper.split("").map((c) => 127397 + c.charCodeAt(0))
    );
  } catch {
    return "🌐";
  }
}

export const COUNTRIES = [
  { code: "AF", name: "Afghanistan", nationality: "Afghan" },
  { code: "AL", name: "Albania", nationality: "Albanian" },
  { code: "DZ", name: "Algeria", nationality: "Algerian" },
  { code: "AD", name: "Andorra", nationality: "Andorran" },
  { code: "AO", name: "Angola", nationality: "Angolan" },
  { code: "AG", name: "Antigua and Barbuda", nationality: "Antiguan" },
  { code: "AR", name: "Argentina", nationality: "Argentine" },
  { code: "AM", name: "Armenia", nationality: "Armenian" },
  { code: "AU", name: "Australia", nationality: "Australian" },
  { code: "AT", name: "Austria", nationality: "Austrian" },
  { code: "AZ", name: "Azerbaijan", nationality: "Azerbaijani" },
  { code: "BS", name: "Bahamas", nationality: "Bahamian" },
  { code: "BH", name: "Bahrain", nationality: "Bahraini" },
  { code: "BD", name: "Bangladesh", nationality: "Bangladeshi" },
  { code: "BB", name: "Barbados", nationality: "Barbadian" },
  { code: "BY", name: "Belarus", nationality: "Belarusian" },
  { code: "BE", name: "Belgium", nationality: "Belgian" },
  { code: "BZ", name: "Belize", nationality: "Belizean" },
  { code: "BJ", name: "Benin", nationality: "Beninese" },
  { code: "BT", name: "Bhutan", nationality: "Bhutanese" },
  { code: "BO", name: "Bolivia", nationality: "Bolivian" },
  { code: "BA", name: "Bosnia and Herzegovina", nationality: "Bosnian" },
  { code: "BW", name: "Botswana", nationality: "Motswana" },
  { code: "BR", name: "Brazil", nationality: "Brazilian" },
  { code: "BN", name: "Brunei", nationality: "Bruneian" },
  { code: "BG", name: "Bulgaria", nationality: "Bulgarian" },
  { code: "BF", name: "Burkina Faso", nationality: "Burkinabe" },
  { code: "BI", name: "Burundi", nationality: "Burundian" },
  { code: "CV", name: "Cabo Verde", nationality: "Cabo Verdean" },
  { code: "KH", name: "Cambodia", nationality: "Cambodian" },
  { code: "CM", name: "Cameroon", nationality: "Cameroonian" },
  { code: "CA", name: "Canada", nationality: "Canadian" },
  { code: "CF", name: "Central African Republic", nationality: "Central African" },
  { code: "TD", name: "Chad", nationality: "Chadian" },
  { code: "CL", name: "Chile", nationality: "Chilean" },
  { code: "CN", name: "China", nationality: "Chinese" },
  { code: "CO", name: "Colombia", nationality: "Colombian" },
  { code: "KM", name: "Comoros", nationality: "Comorian" },
  { code: "CG", name: "Congo", nationality: "Congolese" },
  { code: "CD", name: "Congo (DRC)", nationality: "Congolese" },
  { code: "CR", name: "Costa Rica", nationality: "Costa Rican" },
  { code: "CI", name: "Côte d'Ivoire", nationality: "Ivorian" },
  { code: "HR", name: "Croatia", nationality: "Croatian" },
  { code: "CU", name: "Cuba", nationality: "Cuban" },
  { code: "CY", name: "Cyprus", nationality: "Cypriot" },
  { code: "CZ", name: "Czech Republic", nationality: "Czech" },
  { code: "DK", name: "Denmark", nationality: "Danish" },
  { code: "DJ", name: "Djibouti", nationality: "Djiboutian" },
  { code: "DM", name: "Dominica", nationality: "Dominican" },
  { code: "DO", name: "Dominican Republic", nationality: "Dominican" },
  { code: "EC", name: "Ecuador", nationality: "Ecuadorian" },
  { code: "EG", name: "Egypt", nationality: "Egyptian" },
  { code: "SV", name: "El Salvador", nationality: "Salvadoran" },
  { code: "GQ", name: "Equatorial Guinea", nationality: "Equatoguinean" },
  { code: "ER", name: "Eritrea", nationality: "Eritrean" },
  { code: "EE", name: "Estonia", nationality: "Estonian" },
  { code: "SZ", name: "Eswatini", nationality: "Swazi" },
  { code: "ET", name: "Ethiopia", nationality: "Ethiopian" },
  { code: "FJ", name: "Fiji", nationality: "Fijian" },
  { code: "FI", name: "Finland", nationality: "Finnish" },
  { code: "FR", name: "France", nationality: "French" },
  { code: "GA", name: "Gabon", nationality: "Gabonese" },
  { code: "GM", name: "Gambia", nationality: "Gambian" },
  { code: "GE", name: "Georgia", nationality: "Georgian" },
  { code: "DE", name: "Germany", nationality: "German" },
  { code: "GH", name: "Ghana", nationality: "Ghanaian" },
  { code: "GR", name: "Greece", nationality: "Greek" },
  { code: "GD", name: "Grenada", nationality: "Grenadian" },
  { code: "GT", name: "Guatemala", nationality: "Guatemalan" },
  { code: "GN", name: "Guinea", nationality: "Guinean" },
  { code: "GW", name: "Guinea-Bissau", nationality: "Bissau-Guinean" },
  { code: "GY", name: "Guyana", nationality: "Guyanese" },
  { code: "HT", name: "Haiti", nationality: "Haitian" },
  { code: "HN", name: "Honduras", nationality: "Honduran" },
  { code: "HK", name: "Hong Kong", nationality: "Hong Konger" },
  { code: "HU", name: "Hungary", nationality: "Hungarian" },
  { code: "IS", name: "Iceland", nationality: "Icelandic" },
  { code: "IN", name: "India", nationality: "Indian" },
  { code: "ID", name: "Indonesia", nationality: "Indonesian" },
  { code: "IR", name: "Iran", nationality: "Iranian" },
  { code: "IQ", name: "Iraq", nationality: "Iraqi" },
  { code: "IE", name: "Ireland", nationality: "Irish" },
  { code: "IL", name: "Israel", nationality: "Israeli" },
  { code: "IT", name: "Italy", nationality: "Italian" },
  { code: "JM", name: "Jamaica", nationality: "Jamaican" },
  { code: "JP", name: "Japan", nationality: "Japanese" },
  { code: "JO", name: "Jordan", nationality: "Jordanian" },
  { code: "KZ", name: "Kazakhstan", nationality: "Kazakhstani" },
  { code: "KE", name: "Kenya", nationality: "Kenyan" },
  { code: "KW", name: "Kuwait", nationality: "Kuwaiti" },
  { code: "KG", name: "Kyrgyzstan", nationality: "Kyrgyz" },
  { code: "LA", name: "Laos", nationality: "Lao" },
  { code: "LV", name: "Latvia", nationality: "Latvian" },
  { code: "LB", name: "Lebanon", nationality: "Lebanese" },
  { code: "LS", name: "Lesotho", nationality: "Basotho" },
  { code: "LR", name: "Liberia", nationality: "Liberian" },
  { code: "LY", name: "Libya", nationality: "Libyan" },
  { code: "LI", name: "Liechtenstein", nationality: "Liechtensteiner" },
  { code: "LT", name: "Lithuania", nationality: "Lithuanian" },
  { code: "LU", name: "Luxembourg", nationality: "Luxembourger" },
  { code: "MG", name: "Madagascar", nationality: "Malagasy" },
  { code: "MW", name: "Malawi", nationality: "Malawian" },
  { code: "MY", name: "Malaysia", nationality: "Malaysian" },
  { code: "MV", name: "Maldives", nationality: "Maldivian" },
  { code: "ML", name: "Mali", nationality: "Malian" },
  { code: "MT", name: "Malta", nationality: "Maltese" },
  { code: "MR", name: "Mauritania", nationality: "Mauritanian" },
  { code: "MU", name: "Mauritius", nationality: "Mauritian" },
  { code: "MX", name: "Mexico", nationality: "Mexican" },
  { code: "MD", name: "Moldova", nationality: "Moldovan" },
  { code: "MC", name: "Monaco", nationality: "Monegasque" },
  { code: "MN", name: "Mongolia", nationality: "Mongolian" },
  { code: "ME", name: "Montenegro", nationality: "Montenegrin" },
  { code: "MA", name: "Morocco", nationality: "Moroccan" },
  { code: "MZ", name: "Mozambique", nationality: "Mozambican" },
  { code: "MM", name: "Myanmar", nationality: "Burmese" },
  { code: "NA", name: "Namibia", nationality: "Namibian" },
  { code: "NP", name: "Nepal", nationality: "Nepali" },
  { code: "NL", name: "Netherlands", nationality: "Dutch" },
  { code: "NZ", name: "New Zealand", nationality: "New Zealander" },
  { code: "NI", name: "Nicaragua", nationality: "Nicaraguan" },
  { code: "NE", name: "Niger", nationality: "Nigerien" },
  { code: "NG", name: "Nigeria", nationality: "Nigerian" },
  { code: "MK", name: "North Macedonia", nationality: "Macedonian" },
  { code: "NO", name: "Norway", nationality: "Norwegian" },
  { code: "OM", name: "Oman", nationality: "Omani" },
  { code: "PK", name: "Pakistan", nationality: "Pakistani" },
  { code: "PS", name: "Palestine", nationality: "Palestinian" },
  { code: "PA", name: "Panama", nationality: "Panamanian" },
  { code: "PG", name: "Papua New Guinea", nationality: "Papua New Guinean" },
  { code: "PY", name: "Paraguay", nationality: "Paraguayan" },
  { code: "PE", name: "Peru", nationality: "Peruvian" },
  { code: "PH", name: "Philippines", nationality: "Filipino" },
  { code: "PL", name: "Poland", nationality: "Polish" },
  { code: "PT", name: "Portugal", nationality: "Portuguese" },
  { code: "QA", name: "Qatar", nationality: "Qatari" },
  { code: "RO", name: "Romania", nationality: "Romanian" },
  { code: "RU", name: "Russia", nationality: "Russian" },
  { code: "RW", name: "Rwanda", nationality: "Rwandan" },
  { code: "SA", name: "Saudi Arabia", nationality: "Saudi" },
  { code: "SN", name: "Senegal", nationality: "Senegalese" },
  { code: "RS", name: "Serbia", nationality: "Serbian" },
  { code: "SG", name: "Singapore", nationality: "Singaporean" },
  { code: "SK", name: "Slovakia", nationality: "Slovak" },
  { code: "SI", name: "Slovenia", nationality: "Slovenian" },
  { code: "SO", name: "Somalia", nationality: "Somali" },
  { code: "ZA", name: "South Africa", nationality: "South African" },
  { code: "KR", name: "South Korea", nationality: "South Korean" },
  { code: "ES", name: "Spain", nationality: "Spanish" },
  { code: "LK", name: "Sri Lanka", nationality: "Sri Lankan" },
  { code: "SD", name: "Sudan", nationality: "Sudanese" },
  { code: "SE", name: "Sweden", nationality: "Swedish" },
  { code: "CH", name: "Switzerland", nationality: "Swiss" },
  { code: "SY", name: "Syria", nationality: "Syrian" },
  { code: "TW", name: "Taiwan", nationality: "Taiwanese" },
  { code: "TJ", name: "Tajikistan", nationality: "Tajik" },
  { code: "TZ", name: "Tanzania", nationality: "Tanzanian" },
  { code: "TH", name: "Thailand", nationality: "Thai" },
  { code: "TG", name: "Togo", nationality: "Togolese" },
  { code: "TN", name: "Tunisia", nationality: "Tunisian" },
  { code: "TR", name: "Turkey", nationality: "Turkish" },
  { code: "UG", name: "Uganda", nationality: "Ugandan" },
  { code: "UA", name: "Ukraine", nationality: "Ukrainian" },
  { code: "AE", name: "United Arab Emirates", nationality: "Emirati" },
  { code: "GB", name: "United Kingdom", nationality: "British" },
  { code: "US", name: "United States", nationality: "American" },
  { code: "UY", name: "Uruguay", nationality: "Uruguayan" },
  { code: "UZ", name: "Uzbekistan", nationality: "Uzbek" },
  { code: "VE", name: "Venezuela", nationality: "Venezuelan" },
  { code: "VN", name: "Vietnam", nationality: "Vietnamese" },
  { code: "YE", name: "Yemen", nationality: "Yemeni" },
  { code: "ZM", name: "Zambia", nationality: "Zambian" },
  { code: "ZW", name: "Zimbabwe", nationality: "Zimbabwean" },
].sort((a, b) => a.name.localeCompare(b.name));

export const COUNTRY_BY_CODE = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

export function getCountryName(code) {
  if (!code) return "";
  const upper = code.toUpperCase();
  if (COUNTRY_BY_CODE[upper]) {
    return COUNTRY_BY_CODE[upper].name;
  }
  return code;
}

export function formatCountryLabel(code) {
  if (!code) return "";
  const upper = code.toUpperCase();
  const c = COUNTRY_BY_CODE[upper];
  if (c) {
    return `${getCountryFlag(upper)} ${c.code} - ${c.name}`;
  }
  return code;
}
