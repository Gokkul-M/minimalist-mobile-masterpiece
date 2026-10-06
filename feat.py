import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True); pg=await b.new_page(viewport={"width":360,"height":740})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto("http://localhost:8080"); await pg.wait_for_timeout(8000)
    await pg.get_by_role("button",name="Continue as guest").click(); await pg.wait_for_timeout(1500)
    await pg.get_by_text("Load demo data instead").click(); await pg.wait_for_timeout(1500)
    try: await pg.get_by_role("button",name="Skip introduction").click(timeout=3000)
    except: pass
    await pg.wait_for_timeout(800)
    await pg.get_by_role("button",name="Open ledgerly · your money details").click(); await pg.wait_for_timeout(700)
    await pg.screenshot(path="f1.png"); await pg.get_by_role("dialog").get_by_role("button",name="Close").click()
    await pg.get_by_role("button",name="Show safe to spend breakdown").click(); await pg.wait_for_timeout(700)
    await pg.screenshot(path="f2.png"); await pg.get_by_role("dialog").get_by_role("button",name="Close").click()
    nav=lambda n: pg.evaluate("n=>[...document.querySelectorAll('nav button')].find(x=>(x.getAttribute('aria-label')||x.innerText)===n).click()",n)
    await nav("Recurring"); await pg.wait_for_timeout(1200)
    await pg.get_by_role("button",name="Mark Rent paid").scroll_into_view_if_needed(); await pg.screenshot(path="f3.png")
    await nav("Settings"); await pg.wait_for_timeout(1200)
    await pg.get_by_role("button",name="Change icon for Groceries").click(); await pg.wait_for_timeout(600); await pg.screenshot(path="f4.png")
    await pg.get_by_role("button",name="Use pizza icon").click()
    await nav("Transactions"); await pg.wait_for_timeout(1200); await pg.screenshot(path="f5.png")
    await nav("Home"); await pg.wait_for_timeout(1000)
    await pg.get_by_role("button",name="Scan a receipt or UPI screenshot").click(); await pg.wait_for_timeout(800); await pg.screenshot(path="f6.png")
    print(errs); await b.close()
asyncio.run(main())
