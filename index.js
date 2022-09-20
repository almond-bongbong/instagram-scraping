import dotenv from 'dotenv';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { waitForElementByText } from './libs/elements.js';
import {
  downloadImage,
  getLastPathname,
  waitForTimeout,
} from './libs/utils.js';

dotenv.config();

const BROWSER_WIDTH = 1280;
const BROWSER_HEIGHT = 1280;

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
    args: [`--window-size=${BROWSER_WIDTH},${BROWSER_HEIGHT}`],
    defaultViewport: {
      width: BROWSER_WIDTH,
      height: BROWSER_HEIGHT,
    },
  });
  const page = await browser.newPage();
  await page.goto('https://www.instagram.com/');

  // Instagram login
  await page.waitForSelector('input[name="username"]');
  await page.type('input[name="username"]', process.env.INSTAGRAM_ID);
  await page.type('input[name="password"]', process.env.INSTAGRAM_PASSWORD);
  await page.click('button[type="submit"]');

  // Save info
  const saveInfoButton = await waitForElementByText(page, 'Save Info');
  await saveInfoButton.click();

  // Turn on notifications
  const turnOnNotificationsButton = await waitForElementByText(page, 'Turn On');
  await turnOnNotificationsButton.click();

  // Go to influencers page
  await page.goto(
    `https://www.instagram.com/${process.env.INSTAGRAM_INFLUENCER_ID}/`
  );

  // Wait for posts
  await page.waitForSelector('article');

  // Get all posts
  const posts = await page.$$('article a[role="link"]');

  let currentPostIndex = 0;
  while (currentPostIndex < posts.length) {
    await posts[currentPostIndex].click();
    const dialog = await page.waitForSelector('div[role="dialog"]');

    // Get post content text
    const username = await dialog.waitForSelector('h2');
    const content = await page.evaluate(
      (username) => username.nextElementSibling.innerText,
      username
    );

    // Get Image urls
    const imageUrls = [];
    while (true) {
      const prevButton = await page.$('button[aria-label="Go Back"]');
      const isFirstSlide = !prevButton;

      const images = await dialog.$$(
        'div[role="presentation"] > div > ul li div[role="button"] img'
      );
      const targetImage = images[isFirstSlide ? 0 : 1];
      const imageUrl = await page.evaluate(
        (image) => image.getAttribute('src'),
        targetImage
      );
      imageUrls.push(imageUrl);

      const nextButton = await dialog.$('button[aria-label="Next"]');
      if (!nextButton) break;
      await nextButton.click();
      await waitForTimeout(1000);
    }

    // Download images
    const downloadDir = `${process.cwd()}/posts`;
    const postDir = content.substring(0, 10).replace(/(\r\n|\n|\r)/gm, '');
    const postDirPath = `${downloadDir}/${postDir}`;
    if (!fs.existsSync(postDirPath)) fs.mkdirSync(postDirPath);
    const downloadPromises = imageUrls.map((imageUrl) =>
      downloadImage(imageUrl, `${postDirPath}/${getLastPathname(imageUrl)}`)
    );
    await Promise.all(downloadPromises);

    // Download content
    fs.writeFileSync(`${postDirPath}/content.txt`, content);

    // Close dialog
    const closeDialogButton = await page.$('svg[aria-label="Close"]');
    await closeDialogButton.click();
    currentPostIndex++;
  }

  console.log('Done!');
  await browser.close();
})();
