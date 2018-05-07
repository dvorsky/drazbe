import * as fs from "fs";
import * as scrappy from "scrape-it";
import { ScrapeOptions, ScrapeResult } from "scrape-it";
import { typeIsOrHasBaseType } from "tslint/lib/language/typeUtils";
import { AuctionDataInterface, AuctionUrls, LastPageInterface } from "../interfaces/ScrapeResultInterfaces";
import { AuctionInterface } from "../interfaces/Auction";

const GoogleSpreadsheet = require('google-spreadsheet');

export class Scraper {
    protected readonly ROOT_URL: string = "http://www.sudacka-mreza.hr/";
    protected readonly URL: string = "http://www.sudacka-mreza.hr/stecaj-ponude.aspx?Search=&Court=---&Type=False&Type1=False&Type2=False&Type3=&Manager=---&Status=N&P1=";
    protected readonly GET_LAST_PAGE_NUMBER_REGEXP: RegExp = /(Page=)([0-9]+)/;

    protected readonly AUCTION_LINK_MODEL: ScrapeOptions = {
        links: {
            listItem: "#o_Results tr",
            data: {
                url: {
                    selector: "a",
                    attr: "href",
                },
            },
        },
    };

    protected readonly LAST_PAGE_MODEL: ScrapeOptions = {
        lastPage: {
            selector: "a#pag-last",
            attr: "href",
        }
    };

    protected readonly AUCTION_MODEL: ScrapeOptions = {
        document: {
            selector: "#mainContent > div:nth-child(6)",
            how: "html",
        },

        name: "#hr_oHeader tr:nth-child(1) td:nth-child(2)",
        court: "#hr_oHeader tr:nth-child(2) td:nth-child(2)",
        location: "#hr_oHeader tr:nth-child(3) td:nth-child(2)",
        category: "#hr_oHeader tr:nth-child(4) td:nth-child(2)",

        offeringDate: "#hr_oHeader tr:nth-child(5) td:nth-child(2)",
        auctionDate: "#hr_oHeader tr:nth-child(5) td:nth-child(4)",

        price: "#hr_oHeader tr:nth-child(7) td:nth-child(2)",
    };

    private urls: string[] = [];
    private auctions: AuctionInterface[];

    public async scrape(): Promise<void> {
        const url = this.URL;

        await scrappy(url, this.LAST_PAGE_MODEL, async (err, data: ScrapeResult<LastPageInterface>) => {

            const lastPageUrl: string = data.data.lastPage;

            const matches: RegExpMatchArray | null = lastPageUrl.match(this.GET_LAST_PAGE_NUMBER_REGEXP);

            if (matches === null) {
                throw new Error("I write bad error messages");
            }

            const lastPage: number = Number(matches[2]);

            await this.setUrls(lastPage);
        });

        for (const url of this.urls) {
            await this.fetchAuctions(url);
        }
    }

    protected async fetchAuctions(url: string) {
        let auctionUrls: string[];
        let auctions: AuctionInterface[];

        await scrappy(url, this.AUCTION_LINK_MODEL, async (err, data: ScrapeResult<AuctionUrls>) => {
            if (err) {
                throw new Error("Im bad at writing error messages");
            }
            console.info("Im getting those urls!");
            auctionUrls = await this.getAuctionUrls(data.data);
        });

        for (const auctionUrl of auctionUrls) {
            await scrappy(auctionUrl, this.AUCTION_MODEL, async (err, data: ScrapeResult<AuctionInterface>) => {
                // TODO: Add regex location cleanup
                const auction: AuctionInterface = {
                    name: data.data.name,
                    court: data.data.court,
                    location: data.data.location,
                    category: data.data.category,
                    price: data.data.price,
                    offeringDate: data.data.offeringDate,
                    auctionDate: data.data.auctionDate,
                    document: data.data.document,
                    url: auctionUrl,
                };

                const doc = new GoogleSpreadsheet("1GY8BLSMUTruUbLo5_A5YPazXgnz0o-aA3ofigvlFZuQ");
                let sheet;

                const creds = require("../../private/googleCreds.json");
                await doc.useServiceAccountAuth(creds, async () => {
                    await doc.getInfo(async (err, info) => {
                        console.log(info);
                    });
                });


                console.log("shit shoulda happened");
                // console.log(auction);
                auctions.push(auction)
            });
        }

        return auctions;
    }

    protected async setUrls(lastPage: number) {
        for (let page = 1; page <= lastPage; page++) {
            this.urls.push(`${this.URL}&Page=${page}`)
        }
    }

    protected async getAuctionUrls(data: AuctionUrls): Promise<string[]> {
        const auctionUrls: string[] = [];

        for (const auctionUrl of data.links) {
            if (!auctionUrl.url) {
                continue;
            }
            auctionUrls.push(this.ROOT_URL + auctionUrl.url);
        }

        return auctionUrls;
    }
}
