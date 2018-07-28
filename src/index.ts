import * as path from "path";
import { CsvStorageService } from "./components/CsvStorageService";
import { Scraper } from "./components/scraper";

const savePath = path.resolve("./data");
const storage = new CsvStorageService(savePath);

(async () => {
    const scraper = new Scraper(storage);
    await scraper.scrape();

    storage.save();
})();
