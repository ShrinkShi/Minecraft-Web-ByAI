import {test,expect} from '@playwright/test';

test('chat command suggestions keep Tab inside the game and complete slash commands',async({page})=>{
  await page.goto('/?e2e=1');
  const wrap=page.locator('#chat-input-wrap'),input=page.locator('#chat-input');
  await expect(page.locator('.chat-command-suggestions')).toHaveCount(1);
  await wrap.evaluate(element=>element.classList.remove('hidden'));
  await input.focus();await input.fill('/gamemode c');
  const panel=page.locator('.chat-command-suggestions');await expect(panel).not.toHaveClass(/hidden/);await expect(panel).toContainText('creative');
  await page.keyboard.press('Tab');
  await expect(input).toHaveValue('/gamemode creative ');await expect(input).toBeFocused();
  await input.fill('/summon z');await expect(panel).toContainText('zombie');await page.keyboard.press('Tab');await expect(input).toHaveValue('/summon zombie ');
});
