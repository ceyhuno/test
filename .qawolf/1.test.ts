/**
 * @jest-environment node
 */

import dotenv from "dotenv";
dotenv.config();

import { Browser, BrowserContext, devices } from "playwright";
import qawolf from "qawolf";
import axios from "axios";
import FormData from "form-data";

let browser: Browser;
let context: BrowserContext;

beforeAll(async () => {
  const device = devices["iPhone 11 Pro"];
  browser = await qawolf.launch();
  context = await browser.newContext({ ...device });
  await qawolf.register(context);
});

afterAll(async () => {
  await qawolf.stopVideos();
  await browser.close();
});

test("myTest", async () => {
  const {
    APP_KEY,
    APP_SECRET,
    BASE_URL,
    PAGE_URL,
    UNWANTED,
  } = process.env;

  const page = await context.newPage();
  await page.goto(PAGE_URL!, { waitUntil: "domcontentloaded" });
  await page.click(".cookie-settings-submitall");

  const allImmos = await page.$$eval(
    "#c104 > div > div.row.openimmo-search-list-item > div.col-4.immo-col.stretch",
    (immos) => immos.map((i) => i.textContent)
  );

  const availables = allImmos
    .map((i) => i!.replace("Weiter", "").trim())
    .filter((i) => {
      const size = parseFloat(
        i!
          .match(/\d+,\d+ m/g)![0]
          .replace(" m", "")
          .replace(",", ".")
      );
      return size > 70;
    });

  if (availables.length === 0) {
    console.log("ZERO");
    return;
  }

  await qawolf.scroll(page, "html", { x: 0, y: 591 });
  await page.click("text=Weiter");

  const allDetails = await page.$$eval(
    "#c105 > div > div.row.openimmo-detail-item.openimmo-detail-content > div.col-8.stretch.immo-col",
    (details) => details.map((i) => i.textContent)
  );

  if (
    allDetails[0]!.toLowerCase().includes(UNWANTED.toLowerCase())
  ) {
    console.log("UNWANTED");
    return;
  }

  const content = availables.join("\n");

  const form = new FormData();
  form.append("app_key", APP_KEY);
  form.append("app_secret", APP_SECRET);
  form.append("target_type", "app");
  form.append("content", content);

  await axios.post(BASE_URL!, form, { headers: form.getHeaders() });

  console.log("SENT");
});
