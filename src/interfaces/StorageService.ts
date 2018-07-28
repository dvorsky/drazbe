import { AuctionInterface } from "./Auction";

export interface StorageService {
    pushData(data: AuctionInterface): void;

    save(): void;
}
