import { AuctionInterface } from "../interfaces/Auction";

const GoogleSpreadsheet = require('google-spreadsheet');

export class Sheets {
    protected readonly DOCUMENT_ID: string = "1GY8BLSMUTruUbLo5_A5YPazXgnz0o-aA3ofigvlFZuQ";
    protected readonly CREDENTIALS_FILE: string = "../../private/googleCreds.json";

    protected creds: any;
    protected doc: any;

    constructor() {
        this.doc = new GoogleSpreadsheet(this.DOCUMENT_ID);
        this.creds = require(this.CREDENTIALS_FILE);
    }

    protected async pushData(data: AuctionInterface) {

        await this.doc.useServiceAccountAuth(this.creds, async () => {
            await this.doc.addRow(1,
                data,
                (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
        });

    }
}
