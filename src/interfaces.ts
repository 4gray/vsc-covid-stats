export interface ResponseData {
    latest: LatestData;
    locations: CountryData[];
}

export interface LatestData {
    confirmed: number;
    deaths: number;
    recovered: number;
}

export interface CountryData {
    coordinates: any;
    country: string;
    country_code: string;
    id: number;
    last_updated: string;
    latest: LatestData;
    province: string;
}
