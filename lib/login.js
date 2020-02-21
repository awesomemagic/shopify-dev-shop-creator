
class Login {
    constructor(email, password) {
        this.email = email;
        this.password = password;
    }

    __clickButton(page, name) {
        return page.click(this.__buttonSelector(name), { delay: 500 });
    };

    __buttonSelector(name) {
        return `button[type="submit"][name="${name}"]`;
    };

    openShopifyPartnersPage(page) {
        return page.goto('https://partners.shopify.com/organizations', { waitUntil: 'networkidle2' });
    }

    async fetchPartnerAccounts(page) {
        await this.__login(page);

        const [yourPartnerAccounts] = await page.$x('//h1[contains(text(), "Your partner accounts")]');
        if (yourPartnerAccounts) {
            const partnerAccounts = await page.$x('//a[contains(@class, "identity-card")]//span[contains(@class, "text-with-icon__text")]');
            const data = await Promise.all(partnerAccounts.map((account) => page.evaluate(span => span.textContent, account)));
            return data;
        }

        return [];
    }

    async __login(page, partnerAccount) {
        await this.openShopifyPartnersPage(page);

        await page.type('#account_email', this.email, { delay: 100 });
        await page.waitFor(({ button }) => !!document.querySelector(button), {
            timeout: 120000
        }, {
            button: `${this.__buttonSelector('commit')}:not(:disabled)`
        });

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            await this.__clickButton(page, 'commit')
        ]);

        const [ wrongEmail ] = await page.$x('//span[contains(text(), "There\'s no account for this email")]');
        if (wrongEmail) {
            throw new Error('wrong-email');
        }

        await page.waitFor('#account_password', { visible: true });
        await page.type('#account_password', this.password, { delay: 100 });

        await page.waitFor(({ button }) => !!document.querySelector(button), {}, {
            button: `${this.__buttonSelector('commit')}:not(:disabled)`
        });

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            this.__clickButton(page, 'commit')
        ]);

        const [ incorrectPassword ] = await page.$x('//span[contains(text(), "Incorrect password")]');
        if (incorrectPassword) {
            throw new Error('incorrect-password');
        }

        const [yourPartnerAccounts] = await page.$x('//h1[contains(text(), "Your partner accounts")]');
        if (yourPartnerAccounts) {
            const [ specificPartnerAccount ] = await page.$x(`//a[contains(@class, "identity-card")]//span[contains(text(), "${partnerAccount}")]`);
            if (specificPartnerAccount) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2' }),
                    specificPartnerAccount.click({ delay: 500 })
                ]);
            }
        }
    }

    async developersConsole(page, partnerAccount) {
        await this.__login(page, partnerAccount);

        const storesLink = '.ui-nav a[href*="stores"]';
        await page.waitFor(storesLink, { visible: true });
    };

    async toShopDomain(browser, page, shopDomain) {
        await page.click('.ui-nav a[href*="stores"]', { delay: 1000 });

        await page.waitFor('#PolarisTextField1', { visible: true });
        await page.type('#PolarisTextField1', shopDomain);

        await page.waitFor(1000);
        await page.waitForXPath('//a[contains(text(), "Log in")]');

        const [logInButton] = await page.$x('//a[contains(text(), "Log in")]');
        if (!logInButton) {
            throw new Error('Login button not found');
        }


        const pageTarget = page.target(); //save this to know that this was the opener
        await logInButton.click({ delay: 100 });
        const newTarget = await browser.waitForTarget(target => target.opener() === pageTarget); //check that you opened this page, rather than just checking the url
        const newPage = await newTarget.page(); //get the page object
        await newPage.waitForSelector('body'); //wait for page to be loaded

        await page.close();
        return newPage;
    }
}

module.exports = Login;
