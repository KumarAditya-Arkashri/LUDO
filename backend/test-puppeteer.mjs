import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page1 = await browser.newPage();
  const page2 = await browser.newPage();
  
  page1.on('console', msg => console.log('PAGE 1 LOG:', msg.text()));
  page2.on('console', msg => console.log('PAGE 2 LOG:', msg.text()));

  await page1.goto('http://localhost:5176/dashboard');
  
  // Actually, I need to log in!
  // It's a demo auth, let's look at how the app authenticates
  // I might need to simulate clicks. 
  console.log("Opened dashboard");
  
  await browser.close();
})();
