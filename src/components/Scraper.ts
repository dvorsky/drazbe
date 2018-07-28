import * as scrappy from "scrape-it";
import { ScrapeOptions, ScrapeResult } from "scrape-it";
import { AuctionInterface } from "../interfaces/Auction";
import { AuctionUrls, LastPageInterface } from "../interfaces/ScrapeResultInterfaces";
import { StorageService } from "../interfaces/StorageService";

enum Regexes {
    PRICE = "((([0-9]{3}?\\.)+)?([0-9]{3}?\\,[0-9]+) HRK)",
    LOCATION = "(- (.+))",
    CADASTRAL_BIT = "( k\\..+ ([0-9]+\\/[0-9]+)+)",
}

export class Scraper {
    protected readonly ROOT_URL: string = "http://www.sudacka-mreza.hr/";
    protected readonly URL: string = "http://www.sudacka-mreza.hr/stecaj-ponude.aspx?Search=&Court=---&Type=False&Type1=False&Type2=False&Type3=&Manager=---&Status=N&P1=";
    protected readonly GET_LAST_PAGE_NUMBER_REGEXP: RegExp = /(Page=)([0-9]+)/;

    protected auctionsScraped: number = 0;

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
    private auctions: AuctionInterface[] = [];

    private storage: StorageService;

    private counter: number = 0;

    constructor(storage: StorageService) {
        this.storage = storage;
    }

    public async scrape(): Promise<void> {
        const url = this.URL;

        console.info("Started scraper");

        await scrappy(url, this.LAST_PAGE_MODEL, async (err, data: ScrapeResult<LastPageInterface>): Promise<void> => {

            const lastPageUrl: string = data.data.lastPage;

            const matches: RegExpMatchArray | null = lastPageUrl.match(this.GET_LAST_PAGE_NUMBER_REGEXP);

            if (matches === null) {
                throw new Error("I write bad error messages");
            }

            const lastPage: number = Number(matches[2]);

            await this.setUrls(lastPage);
            console.info("Got last page ", lastPage);
        });

        const auctionPromises: Promise<AuctionInterface[]>[] = this.urls.map(async (url) => await this.fetchAuctions(url));
        const auctions = await Promise.all(auctionPromises);

        for (const auction of auctions) {
            this.auctions.push(...auction);
        }

        console.log(`${this.auctionsScraped} successfully scraped`);
    }

    protected async fetchAuctions(url: string) {
        let auctionUrls: string[] = [];
        let auctions: AuctionInterface[] = [];

        await scrappy(url, this.AUCTION_LINK_MODEL, async (err, data: ScrapeResult<AuctionUrls>) => {
            if (err) {
                throw new Error("Im bad at writing error messages");
            }
            console.info("Im getting those urls!");
            auctionUrls = await this.getAuctionUrls(data.data);
        });

        if (auctionUrls.length === 0) {
            throw new Error("There are no auction urls to be scraped...");
        }

        for (const auctionUrl of auctionUrls) {
            await scrappy(auctionUrl, this.AUCTION_MODEL, async (err, data: ScrapeResult<AuctionInterface>) => {

                let price;
                if (data.data.price.match(Regexes.PRICE)) {
                    const matches = data.data.price.match(Regexes.PRICE);
                    if (matches === null) {
                        throw new Error('Found no matches for price field');
                    }

                    price = matches[1];

                    if (price === "0,00 HRK") {
                        price = "Cijena u oglasu";
                    }
                }

                let location;
                if (data.data.location.match(Regexes.LOCATION)) {
                    const matches = data.data.location.match(Regexes.LOCATION);
                    if (matches === null) {
                        throw new Error('Found no matches for location field');
                    }

                    location = matches[2];
                }

                let cadastral;
                if (data.data.document !== undefined && data.data.document !== null) {
                    if (data.data.document.match(Regexes.CADASTRAL_BIT)) {
                        const matches = data.data.document.match(Regexes.CADASTRAL_BIT);
                        if (matches === null) {
                            throw new Error('Found no matches for cadastral field');
                        }
                        cadastral = matches[2];
                    }
                }

                const auction: AuctionInterface = {
                    name: data.data.name,
                    court: data.data.court,
                    location: location as string,
                    category: data.data.category,
                    price: price as string,
                    offeringDate: data.data.offeringDate,
                    auctionDate: data.data.auctionDate,
                    cadastral: cadastral as string,
                    url: auctionUrl,
                };

                this.auctionsScraped++;
                console.log(`Scraped ${this.auctionsScraped} auctions...`);
                this.storage.pushData(auction);
                auctions.push(auction)
            });
        }

        if (auctions.length === 0) {
            throw new Error("No auctions scraped...");
        }

        console.log("Done ", ++this.counter, " pages");

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
