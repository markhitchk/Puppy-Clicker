import React from 'react';
export default function WebPrivacy(){
 return <article className="pup-admin-container"><section className="pup-admin-panel">
  <p className="pup-admin-kicker">PUPPY CLICKER · WEBSITE PRIVACY</p><h1>Account security & website activity</h1>
  <p>We record website connections and account activity to support players, investigate errors, and protect Pup Accounts.</p>
  <h2>What is recorded</h2><p>Your browser sends a random tab identifier, the page name, and presence updates while the page is visible. Our servers record the IP address and browser information supplied with requests. When you sign in, the server links your activity to your registered Pup Account.</p>
  <p>Account security records include sign-in and registration outcomes, error codes, and staff moderation actions. A browser or device name is inferred from browser information; the website does not read hardware identifiers.</p>
  <h2>Who can see it</h2><p>Only authorized Puppy Clicker administrators and developers can view these connection and activity records. Visitors are shown as visitors; browsing does not create a Pup Account. The existing network check may send your IP address to ProxyCheck to identify VPN, proxy, or Tor connections. Its result does not automatically ban or restrict an account.</p>
  <h2>What is kept out</h2><p>These activity records do not contain passwords, access or refresh tokens, OAuth codes, page query strings, or raw browser exception messages. Gameplay saves and Android installation identities are separate from website session records.</p>
  <h2>Manage your privacy rights</h2><p>Request access, a portable copy, correction, restriction, objection or review of account erasure through the <a href="/account/privacy">Privacy Center</a>. Requests are reviewed; submitting an erasure request does not immediately delete a linked Android account or cloud game save.</p>
  <h2>Retention & support</h2><p>Website connection, network-check, and activity records older than 30 days are removed in batches as new activity is recorded. Staff moderation history is kept separately for account support. Contact Harley’s Studios through the game’s official support channels for account or privacy questions.</p>
  <p><a className="pup-admin-link" href="/legal/privacy">Full Privacy Policy</a> · <a className="pup-admin-link" href="/legal/terms">Terms of Use</a> · <a className="pup-admin-link" href="/account">Pup Account</a> · <a className="pup-admin-link" href="/">Return home</a></p>
 </section></article>;
}
