import * as fs from "fs";
import { Parser } from "json2csv";
import { AuctionInterface } from "../interfaces/Auction";

export class CsvStorageService {
    protected data: AuctionInterface[] = [];
    protected savePath: string;

    constructor(savePath: string) {
        this.savePath = savePath;
    }

    public pushData(data: AuctionInterface): void {
        this.data.push(data);
    }

    public save(): void {
        const parser = new Parser({
            fields: [
                "name",
                "court",
                "location",
                "category",
                "price",
                "offeringDate",
                "auctionDate",
                "document",
                "url",
                "cadastral"
            ]
        });

        const path = `${this.savePath}/data.csv`;

        try {
            const csv = parser.parse(this.data);
            fs.writeFileSync(path, csv);
        } catch (err) {
            console.error(err);
        }

        console.log(`Data successfully stored in ${path}`);
    }
}
