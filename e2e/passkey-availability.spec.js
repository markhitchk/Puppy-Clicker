import {test,expect} from "@playwright/test";

test("signed-out account shows safe passkey fallback on a preview/local origin",async({page})=>{
 await page.goto("/account?signedout");
 const panel=page.getByTestId("pup-auth-form");
 await expect(panel.getByRole("button",{name:/Sign in with passkey/i})).toBeVisible();
 await expect(panel.getByRole("button",{name:/Sign in with passkey/i})).toBeDisabled();
 await expect(panel.getByRole("textbox",{name:/Pup username/i})).toBeVisible();
 await expect(panel.getByRole("button",{name:/Sign in to Pup Account/i})).toBeVisible();
});

test("passkey enrollment is not offered on preview/local hosts",async({page})=>{
 await page.goto("/account");
 // The signed-in E2E fixture has an account; never enroll a real WebAuthn key on localhost.
 const panel=page.locator(".pup-passkey-panel");
 await expect(panel).toBeVisible();
 await expect(panel.getByRole("button",{name:/Add passkey/})).toHaveCount(0);
 await expect(panel.getByText(/official Puppy Clicker website/)).toBeVisible();
});
