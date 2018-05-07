import { AuctionInterface } from "./Auction";

export interface LastPageInterface {
    lastPage: string;
}

export interface AuctionUrls {
    links: Url[];
}

interface Url {
    url: string;
}

export interface AuctionDataInterface {
    auctionDocument: string;
    auction: AuctionInterface;
}
