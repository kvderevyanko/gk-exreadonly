const fs = require('fs');

const puppeteer = require('puppeteer');

const LAST = 2192;
const EMAIL = '';
const PASSWORD = '';

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://gonkong.me/login');

    await page.type('[type="email"]', EMAIL);
    await page.type('[type="password"]', PASSWORD);
    await page.click('[type="submit"]');
    await page.waitForNavigation({waitUntil: 'networkidle2'});

    await page.setJavaScriptEnabled(false);

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['stylesheet', 'font', 'image'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    let result = [];


    const sevenDays = (Date.now()/1000) - 60*60*24*7;
    const monthDays = (Date.now()/1000) - 60*60*24*30;

    for (let id = 1; id <= LAST; id++) {
        await page.goto(`https://gonkong.me/api/v1.1/user/${id}/comments?page=1`);
       // await page.content();

        let jsonResult = await page.evaluate(() =>  {
            try {
                return JSON.parse(document.querySelector("body").innerText);
            } catch(e) {
                return {};
            }
        });

        let stats = {
            7:0,
            30:0,
            userId:id
        }

        if(!jsonResult['data']) {
            continue;
        }

        let keys = Object.keys( jsonResult['data'] );
        for( let i = 0,length = keys.length; i < length; i++ ) {
            let messageDate = jsonResult['data'][keys[ i ]]['date'];
            let unixDate = Date.parse(messageDate)/1000;

            if(unixDate > sevenDays) {
                stats[7]++;
            }

            if(unixDate > monthDays) {
                stats[30]++;
            }
        }
        console.log(stats);
        result.push(stats)
    }

    result.sort(function(a, b) {
        return b[7] - a[7];
    });

    let fileName7 = Date.now()+'-c7.json';
    for( let i = 0,length = result.length; i < length; i++ ) {
        fs.appendFileSync(`./${fileName7}`, JSON.stringify(result[i])+"\n");
    }
    result.sort(function(a, b) {
        return b[30] - a[30];
    });

    let fileName30 = Date.now()+'-c30.json';
    for( let i = 0,length = result.length; i < length; i++ ) {
        fs.appendFileSync(`./${fileName30}`, JSON.stringify(result[i])+"\n");
    }

   await browser.close();
})();
