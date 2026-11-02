/**
 * Static lists for the Profile form (country / dial code / US states / cities). Public reference
 * data; the city lists are inferred placeholders (the City select was never opened in the capture).
 */
export interface Country {
  iso: string;
  name: string;
  dial: string;
}

export const COUNTRIES: Country[] = [
  ["AF", "Afghanistan", "93"], ["AX", "Aland Islands", "358"], ["AL", "Albania", "355"], ["DZ", "Algeria", "213"],
  ["AS", "American Samoa", "1"], ["AD", "Andorra", "376"], ["AO", "Angola", "244"], ["AI", "Anguilla", "1"],
  ["AG", "Antigua and Barbuda", "1"], ["AR", "Argentina", "54"], ["AM", "Armenia", "374"], ["AW", "Aruba", "297"],
  ["AU", "Australia", "61"], ["AT", "Austria", "43"], ["AZ", "Azerbaijan", "994"], ["BS", "Bahamas", "1"],
  ["BH", "Bahrain", "973"], ["BD", "Bangladesh", "880"], ["BB", "Barbados", "1"], ["BY", "Belarus", "375"],
  ["BE", "Belgium", "32"], ["BZ", "Belize", "501"], ["BJ", "Benin", "229"], ["BM", "Bermuda", "1"],
  ["BT", "Bhutan", "975"], ["BO", "Bolivia", "591"], ["BA", "Bosnia and Herzegovina", "387"], ["BW", "Botswana", "267"],
  ["BR", "Brazil", "55"], ["BN", "Brunei", "673"], ["BG", "Bulgaria", "359"], ["KH", "Cambodia", "855"],
  ["CM", "Cameroon", "237"], ["CA", "Canada", "1"], ["CL", "Chile", "56"], ["CN", "China", "86"],
  ["CO", "Colombia", "57"], ["CR", "Costa Rica", "506"], ["HR", "Croatia", "385"], ["CY", "Cyprus", "357"],
  ["CZ", "Czech Republic", "420"], ["DK", "Denmark", "45"], ["DO", "Dominican Republic", "1"], ["EC", "Ecuador", "593"],
  ["EG", "Egypt", "20"], ["SV", "El Salvador", "503"], ["EE", "Estonia", "372"], ["FI", "Finland", "358"],
  ["FR", "France", "33"], ["GE", "Georgia", "995"], ["DE", "Germany", "49"], ["GH", "Ghana", "233"],
  ["GR", "Greece", "30"], ["GT", "Guatemala", "502"], ["HN", "Honduras", "504"], ["HK", "Hong Kong", "852"],
  ["HU", "Hungary", "36"], ["IS", "Iceland", "354"], ["IN", "India", "91"], ["ID", "Indonesia", "62"],
  ["IE", "Ireland", "353"], ["IL", "Israel", "972"], ["IT", "Italy", "39"], ["JM", "Jamaica", "1"],
  ["JP", "Japan", "81"], ["JO", "Jordan", "962"], ["KZ", "Kazakhstan", "7"], ["KE", "Kenya", "254"],
  ["KR", "South Korea", "82"], ["KW", "Kuwait", "965"], ["LV", "Latvia", "371"], ["LB", "Lebanon", "961"],
  ["LT", "Lithuania", "370"], ["LU", "Luxembourg", "352"], ["MY", "Malaysia", "60"], ["MT", "Malta", "356"],
  ["MX", "Mexico", "52"], ["MC", "Monaco", "377"], ["MA", "Morocco", "212"], ["NP", "Nepal", "977"],
  ["NL", "Netherlands", "31"], ["NZ", "New Zealand", "64"], ["NG", "Nigeria", "234"], ["NO", "Norway", "47"],
  ["PK", "Pakistan", "92"], ["PA", "Panama", "507"], ["PE", "Peru", "51"], ["PH", "Philippines", "63"],
  ["PL", "Poland", "48"], ["PT", "Portugal", "351"], ["PR", "Puerto Rico", "1"], ["QA", "Qatar", "974"],
  ["RO", "Romania", "40"], ["SA", "Saudi Arabia", "966"], ["RS", "Serbia", "381"], ["SG", "Singapore", "65"],
  ["SK", "Slovakia", "421"], ["SI", "Slovenia", "386"], ["ZA", "South Africa", "27"], ["ES", "Spain", "34"],
  ["LK", "Sri Lanka", "94"], ["SE", "Sweden", "46"], ["CH", "Switzerland", "41"], ["TW", "Taiwan", "886"],
  ["TH", "Thailand", "66"], ["TR", "Turkey", "90"], ["UA", "Ukraine", "380"], ["AE", "United Arab Emirates", "971"],
  ["GB", "United Kingdom", "44"], ["US", "United States", "1"], ["UY", "Uruguay", "598"], ["VE", "Venezuela", "58"],
  ["VN", "Vietnam", "84"], ["ZM", "Zambia", "260"], ["ZW", "Zimbabwe", "263"],
].map(([iso, name, dial]) => ({ iso, name, dial }));

/** Regional-indicator emoji flag for an ISO-2 code (no images). */
export const flag = (iso: string) => String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export const countryByName = (name: string) => COUNTRIES.find((c) => c.name === name);
export const countryByIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso);

/** Dial-code list order captured in 30b: United States, United Kingdom, divider, then A–Z. */
export const DIAL_PINNED = ["US", "GB"];

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

// inferred: city options (the City select was not opened during capture)
export const CITIES: Record<string, string[]> = {
  Colorado: ["Aspen", "Boulder", "Breckenridge", "Colorado Springs", "Denver", "Frisco", "Silverthorne", "Steamboat Springs", "Vail"],
  California: ["Los Angeles", "Mammoth Lakes", "San Diego", "San Francisco", "South Lake Tahoe"],
  Utah: ["Park City", "Provo", "Salt Lake City"],
};
export const citiesFor = (state: string) => CITIES[state] ?? ["Other"];
