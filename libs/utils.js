import client from 'https';
import fs from 'fs';

export const waitForTimeout = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const getLastPathname = (url) => {
  const { pathname } = new URL(url);
  const paths = pathname.split('/');
  return paths[paths.length - 1];
};

export const downloadImage = (url, filepath) =>
  new Promise((resolve, reject) => {
    client.get(url, (res) => {
      if (res.statusCode === 200) {
        res
          .pipe(fs.createWriteStream(filepath))
          .on('error', reject)
          .once('close', () => resolve(filepath));
      } else {
        // Consume response data to free up memory
        res.resume();
        reject(
          new Error(`Request Failed With a Status Code: ${res.statusCode}`)
        );
      }
    });
  });
