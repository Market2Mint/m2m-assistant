/*
 * The service menu used to live here as a 250-line CSV string, parsed at runtime by a
 * hand-rolled parser in App.tsx. It moved to `src/serviceMenu.ts` on 2026-08-06 — typed,
 * generated, and joined to the authoritative pricing sheet, so a price change is a data
 * change and a malformed row is a build error rather than a service silently vanishing
 * from the kiosk. This file keeps only the customer-facing legal and policy copy.
 */
/*
 * Rendered at checkout, above the "I acknowledge and agree" checkbox that gates Complete
 * Order. Liability copy belongs at the point of commitment, not on the attract screen —
 * so every line here is covered by an affirmative action rather than being fine print.
 *
 * The last two lines are the minimum-grade terms (brief §5.2c / §5.3 item 3). They sit
 * here as well as at the control itself because they do different jobs: the inline copy
 * reaches the customer at the moment they can still act on it, and these reach the
 * customer who never expanded the control at all. Do not add a second checkbox or a
 * confirmation dialog for them — a modal on a kiosk gets dismissed without reading.
 */
/**
 * WHICH policy text the customer's acknowledgement refers to.
 *
 * Sent with every order as `policyVersion`, beside `policyAcknowledged` and
 * `policyAcknowledgedAt`. "They agreed" is worth very little without proof of WHAT
 * they agreed to — when the policy text changes, this changes, and old orders stay
 * tied to the text that was actually on screen the day they were placed.
 *
 * ISO date form. It changes when the acknowledged TEXT changes, and ONLY then —
 * `policyVersion.test.ts` hashes the acknowledged copy and fails if the text moves
 * without this moving with it (or vice versa). Do not bump it for code changes.
 */
export const POLICY_VERSION = '2026-08-09';

export const POLICY = [
  "Turnaround times begin upon induction at grading facilities and are not guaranteed.",
  "Market2Mint is not affiliated with this card shop. We take full responsibility for your items while they are in our possession.",
  "Unclaimed items will be considered abandoned after 120 days and three notification attempts.",
  "Inspect returned items at pickup. Claims must be filed within 7 days of shop return notification.",
  "Grading company upcharges will be invoiced as applicable.",
  "If you set a minimum grade and the item does not reach it, the item is returned ungraded and the grading fee is not refunded.",
  "If no minimum grade is entered, your order will be submitted without one. Customers are responsible for the accuracy of their order details and photos."
];

export const RECOMMENDATIONS = [
  "Take cell photos of your cards before packaging.",
  "Use the provided boxes/envelopes (No One-Touches).",
  "Hand your order directly to a shop attendant."
];

export const TERMS_OF_USE_SECTIONS = [
  {
    title: "Market2Mint – Kiosk Terms of Use",
    content: "These Terms of Use (“Terms”) govern your access to and use of Market2Mint’s kiosk ordering system, website, and related services (collectively, the “Services”). By submitting items through the kiosk or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms."
  },
  {
    title: "Use of Services",
    content: "You agree to use Market2Mint Services only for lawful purposes. You may not:\n\n• Violate any applicable law or regulation\n• Submit items you do not legally own or have authority to submit\n• Interfere with or disrupt our systems or services\n• Attempt unauthorized access to Market2Mint systems or networks\n• Upload or transmit malicious code, malware, or viruses\n\nMarket2Mint reserves the right to refuse service to anyone for any reason permitted by law."
  },
  {
    title: "Submission Authorization",
    content: "By submitting items, you represent and warrant that:\n\n• You are the lawful owner of the items submitted or have authority to submit them\n• The information provided about the items is accurate to the best of your knowledge\n• Items submitted do not violate any laws or intellectual property rights"
  },
  {
    title: "Role of Market2Mint",
    content: "Market2Mint acts solely as a submission facilitator and logistics intermediary for third-party grading services such as PSA, BGS, SGC, CGC, and others.\n\nMarket2Mint:\n• Does not determine grading results\n• Does not guarantee authentication outcomes\n• Does not control grading company turnaround times\n\nAll grading decisions are made solely by the grading company."
  },
  {
    title: "Turnaround Times",
    content: "Estimated turnaround times are determined by grading companies and begin only once items are inducted into the grading company’s system. Turnaround times are estimates and are not guaranteed.\n\nMarket2Mint is not responsible for delays caused by grading companies, shipping carriers, customs inspections, or other external factors."
  },
  {
    title: "Declared Value and Service Level Limits",
    content: "Each grading service offered through Market2Mint includes a maximum declared value limit, which is displayed to the customer at the time of service selection. By selecting a service tier, the customer confirms that the declared value of the submitted item does not exceed the maximum value permitted for that service level.\n\nThe declared value selected by the customer determines:\n• eligibility for the grading service tier\n• insurance coverage during shipment (if applicable)\n• the maximum liability limit for Market2Mint\n\nCustomers are responsible for selecting the appropriate service tier based on the estimated market value of their item. Market2Mint is not responsible for incorrect service selection.\n\nIf a grading company determines that an item exceeds the declared value associated with the selected service tier, the grading company may assess an upcharge or service adjustment. Customers agree to pay any such upcharges prior to release or return of the graded item."
  },
  {
    title: "Clause for Services With No Declared Value Limit (Example: BGS)",
    content: "Some grading services may not impose a maximum declared value limit. In these cases, the value entered by the customer during submission will be treated as the official declared value for insurance and liability purposes.\n\nFor submissions without a predefined service value limit:\n• The customer must provide a reasonable declared value at the time of submission.\n• Market2Mint’s maximum liability for any loss or damage claim will not exceed the declared value entered by the customer or the amount of service fees paid, whichever is lower.\n• Market2Mint reserves the right to request reasonable proof of value in the event of a claim.\n• Failure to provide an accurate declared value may limit or void any claim for loss or damage."
  },
  {
    title: "Excess Value Limitation",
    content: "If the actual market value of a submitted item exceeds the declared value provided during submission, Market2Mint’s liability shall remain strictly limited to the declared value selected by the customer, regardless of the item’s actual market value.\n\nCustomers are responsible for ensuring declared values accurately reflect the value of their items."
  },
  {
    title: "Limitation of Liability",
    content: "To the fullest extent permitted by law, Market2Mint shall not be liable for:\n\n• grading outcomes\n• grading company determinations\n• delays in grading services\n• market value fluctuations\n• lost profits or consequential damages\n\nMarket2Mint’s total liability for any claim shall not exceed the declared value of the submitted item or the amount of service fees paid, whichever is lower."
  },
  {
    title: "Shipping and Transit Risk",
    content: "Submitted items may be transported between:\n\n• partner shops\n• Market2Mint facilities\n• grading company facilities\n• shipping carriers\n\nMarket2Mint uses reasonable care in packaging and handling items. However, shipping carriers are independent third parties, and Market2Mint is not responsible for carrier delays or carrier negligence.\n\nInsurance coverage, if applicable, is limited to declared value."
  },
  {
    title: "Force Majeure",
    content: "Market2Mint shall not be responsible for delays or losses caused by events beyond its reasonable control, including but not limited to:\n\n• natural disasters\n• fire\n• theft\n• labor disputes\n• shipping carrier failures\n• government actions\n• grading company operational disruptions"
  },
  {
    title: "Intellectual Property",
    content: "All trademarks, logos, content, and materials displayed on our Services are the property of Market2Mint or their respective owners. No content may be reproduced or distributed without prior written consent."
  },
  {
    title: "Changes to Terms",
    content: "Market2Mint reserves the right to update these Terms at any time. Continued use of our Services constitutes acceptance of updated Terms."
  }
];

export const TERMS_OF_USE = TERMS_OF_USE_SECTIONS.map(s => `${s.title}\n\n${s.content}`).join('\n\n');


export const SUBMISSION_POLICY_SECTIONS = [
  {
    title: "Market2Mint – Submission Policy",
    content: "This policy governs all items submitted through Market2Mint."
  },
  {
    title: "Customer Responsibility",
    content: "Customers are responsible for:\n\n• accurately identifying cards or collectibles submitted\n• declaring accurate item values\n• selecting the appropriate grading service tier\n\nMarket2Mint is not responsible for errors in customer-provided submission information."
  },
  {
    title: "Card Condition",
    content: "Market2Mint does not guarantee the condition of submitted items and does not provide guarantees regarding grading outcomes.\n\nCards may contain defects including but not limited to:\n\n• scratches\n• print lines\n• surface wear\n• edge damage\n• centering issues\n\nGrading companies evaluate these factors independently."
  },
  {
    title: "Grading Company Determinations",
    content: "Authentication, grading, encapsulation, and rejection decisions are made solely by the grading company.\n\nMarket2Mint is not responsible for:\n\n• grading outcomes\n• rejection of items\n• altered or trimmed determinations\n• authentication failures"
  },
  {
    title: "Upcharges",
    content: "Grading companies may assess upcharges if the declared value or service tier does not match the card’s determined value.\n\nCustomers are responsible for paying all grading company upcharges prior to release of graded items."
  },
  {
    // Rewritten 2026-08-05 to match what the software actually charges and what every
    // piece of M2M artwork states. It previously described a "waived when bundled"
    // discount the code never applied, and a $5.00 grader-mix surcharge that was removed
    // from the cart on 2026-08-05 — three different numbers for one fee.
    title: "Shipping & Logistics",
    content: "Shipping and insurance is a flat $24.00 per order. $24.00 covers your whole order, however many cards. It is charged one time per order, never per card, and does not change with the number of services or grading companies included in the order."
  },
  {
    title: "Handling and Packaging",
    content: "Market2Mint handles all items with reasonable care.\n\nHowever, Market2Mint is not responsible for damage caused by:\n\n• pre-existing card defects\n• grading company handling\n• grading company encapsulation\n• shipping carrier handling"
  },
  {
    title: "Liability Cap",
    content: "Market2Mint’s liability for any loss or damage claim shall not exceed the declared value of the item or the amount of service fees paid, whichever is lower.\n\nProof of value may be required for claims."
  },
  {
    title: "Limited Liability & Inspection Period",
    content: "Market2Mint (M2M) and the Host Partner Card Shop are not liable for any discrepancies, damages, or grading errors once the item has been collected by the customer. Customers are required to inspect all graded items at the time of pickup. Any claims regarding item condition or grading errors must be filed within 7 business days of the 'Returned to Shop' notification. M2M maintains video records of all inductions for 30 days; claims made after this window cannot be verified and will not be honored."
  },
  {
    title: "Abandoned Items",
    content: "Items not claimed within 120 days after notification may be considered abandoned.\n\nMarket2Mint will attempt to notify the customer at least three times. After abandonment, Market2Mint reserves the right to:\n\n• charge storage fees\n• liquidate items to recover costs\n• dispose of items in accordance with applicable law"
  },
  {
    title: "Partner Shop Locations",
    content: "Market2Mint may operate submission services through partner shop locations.\n\nPartner shops act only as drop-off and pickup locations and are not responsible for grading outcomes or submission processing."
  }
];

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: "Market2Mint – Privacy Policy",
    content: "Market2Mint respects your privacy and is committed to protecting your personal information."
  },
  {
    title: "Information We Collect",
    content: "We may collect the following types of information:\n\n• Name\n• Email address\n• Phone number\n• Shipping or billing address\n• Submission details\n• Declared item values\n• Payment transaction information\n• Images uploaded through submission systems\n• Device information such as IP address and browser type"
  },
  {
    title: "How We Use Your Information",
    content: "We use collected information to:\n\n• process grading submissions\n• manage customer orders\n• communicate with customers\n• provide customer support\n• improve our services"
  },
  {
    title: "Third-Party Service Providers",
    content: "Market2Mint may share information with trusted third-party providers necessary to operate our services, including:\n\n• payment processors\n• shipping carriers\n• grading companies\n• technology service providers\n\nThese parties may only use information for the purpose of providing services to Market2Mint."
  },
  {
    title: "Data Security",
    content: "We implement reasonable administrative, technical, and physical safeguards to protect personal information against unauthorized access, alteration, disclosure, or destruction."
  },
  {
    title: "Data Retention",
    content: "Market2Mint may retain submission records, order information, and uploaded images for operational purposes, accounting requirements, and dispute resolution."
  },
  {
    title: "Customer Privacy Rights",
    content: "Depending on your location, you may have rights regarding your personal information, including:\n\n• requesting access to your data\n• requesting correction of inaccurate information\n• requesting deletion of personal information where permitted by law"
  },
  {
    title: "Children's Privacy",
    content: "Market2Mint services are not directed toward children under 13 years of age."
  },
  {
    title: "Policy Updates",
    content: "Market2Mint may update this Privacy Policy periodically. Updated policies will be posted on our website and may be displayed on kiosk systems."
  }
];

export const PRIVACY_POLICY = PRIVACY_POLICY_SECTIONS.map(s => `${s.title}\n\n${s.content}`).join('\n\n');

