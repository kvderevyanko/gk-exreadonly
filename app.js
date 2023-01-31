const fs = require('fs');

const puppeteer = require('puppeteer');

const LAST = 2185;
const EMAIL = '';
const PASSWORD = '';

const CLASSES = {
    '404': 'relative flex items-top justify-center min-h-screen bg-gray-100 dark:bg-gray-900 sm:items-center sm:pt-0',
    'deleted': 'text-red-500 mb-4 border border-red-500 rounded uppercase inline-flex leading-none py-0.5 px-1 text-xxs',
    'banned': 'bg-red-500 text-white rounded-xl leading-none text-xs py-1 px-2'
}

const SELECTORS = Object.fromEntries(Object.entries(CLASSES).map(([type, classesString]) => {
    const selector = classesString
        .split(' ')
        .filter(classItem => !classItem.includes('.'))
        .filter(classItem => !classItem.includes(':'))
        .map(classItem => `.${classItem}`)
        .join('');
    return [type, selector]
}));

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

    const results = {
        404: 0,
        deleted: 0,
        banned: 0,
    };

    const notFound = new Set();
    const deleted = new Set();
    const banned = new Set();

    for (let id = 1; id <= LAST; id++) {
        await page.goto(`https://gonkong.me/u/${id}`);
        if (await page.$(SELECTORS['404']) !== null) {
            console.log('404', id);
            results['404']++;
            notFound.add(id);
        } else if (await page.$(SELECTORS.deleted) !== null) {
            console.log('deleted', id);
            results['deleted']++;
            deleted.add(id)
        } else if (await page.$(SELECTORS.banned) !== null) {
            console.log('banned', id);
            results['banned']++;
            banned.add(id);
        } else {
            console.log("ok");
        }
    }

    console.log(results);
    console.log([...banned]);

    fs.writeFileSync(`./${Date.now()}.json`, JSON.stringify({
        deleted: [...deleted],
        banned: [...banned],
    }, null, 2))

    await browser.close();
})();
