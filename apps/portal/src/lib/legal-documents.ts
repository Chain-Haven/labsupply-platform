/**
 * Legal Documents for Peptide Tech LLC
 *
 * Comprehensive Terms of Service / Merchant Agreement and Privacy Policy.
 * These constants are used by:
 *   - /terms and /privacy static pages
 *   - Onboarding Step 6 (Agreement & Signature)
 *   - Server-side PDF generation for executed copies
 *
 * IMPORTANT: Changes to these documents should be reviewed by legal counsel.
 * Last updated: 2026-02-17
 */

export interface LegalSection {
  title: string;
  content: string; // HTML-safe plain text with \n for line breaks
}

// ---------------------------------------------------------------------------
// Company Details
// ---------------------------------------------------------------------------
export const COMPANY = {
  name: 'Peptide Tech LLC',
  address: '1309 Coffeen Ave, Ste 14346, Sheridan, Wyoming 82801',
  state: 'Wyoming',
  email: 'legal@peptidetech.co',
  supportEmail: 'support@peptidetech.co',
  website: 'https://peptidetech.co',
} as const;

export const EFFECTIVE_DATE = 'February 17, 2026';

// ---------------------------------------------------------------------------
// TERMS OF SERVICE / MERCHANT AGREEMENT
// ---------------------------------------------------------------------------
export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  // ---- ARTICLE I ----
  {
    title: 'ARTICLE I — INTRODUCTION AND ACCEPTANCE',
    content: `PEPTIDE TECH LLC MERCHANT AGREEMENT AND TERMS OF SERVICE

Effective Date: ${EFFECTIVE_DATE}

This Merchant Agreement and Terms of Service ("Agreement") is entered into by and between Peptide Tech LLC, a Wyoming limited liability company, with its principal place of business at 1309 Coffeen Ave, Ste 14346, Sheridan, Wyoming 82801 ("Company," "Peptide Tech," "we," "us," or "our"), and the entity or individual ("Merchant," "you," or "your") who registers for, accesses, or uses the Company's platform, services, products, APIs, websites, or any related technology (collectively, the "Platform" or "Services").

BY REGISTERING FOR AN ACCOUNT, ACCESSING THE PLATFORM, PLACING AN ORDER, OR OTHERWISE USING ANY OF OUR SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE LEGALLY BOUND BY ALL OF THE TERMS AND CONDITIONS SET FORTH IN THIS AGREEMENT, INCLUDING THE PRIVACY POLICY, ALL POLICIES INCORPORATED HEREIN BY REFERENCE, AND ANY FUTURE AMENDMENTS.

IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE PLATFORM OR SERVICES. YOUR CONTINUED USE OF THE PLATFORM CONSTITUTES YOUR ONGOING ACCEPTANCE OF THIS AGREEMENT AND ANY MODIFICATIONS THERETO.

YOU REPRESENT AND WARRANT THAT YOU HAVE THE LEGAL AUTHORITY TO BIND THE ENTITY ON WHOSE BEHALF YOU ARE ENTERING INTO THIS AGREEMENT. IF YOU ARE REGISTERING ON BEHALF OF A BUSINESS, ORGANIZATION, OR OTHER LEGAL ENTITY, YOU REPRESENT THAT YOU ARE DULY AUTHORIZED TO BIND SUCH ENTITY TO THIS AGREEMENT.

This Agreement supersedes all prior or contemporaneous agreements, representations, warranties, and understandings, whether written, oral, or implied, relating to the subject matter hereof.`,
  },

  // ---- ARTICLE II ----
  {
    title: 'ARTICLE II — DEFINITIONS',
    content: `For purposes of this Agreement, the following terms shall have the meanings ascribed to them below:

2.1 "Affiliate" means any entity that directly or indirectly controls, is controlled by, or is under common control with Peptide Tech LLC, including but not limited to any parent company, subsidiary, or related entity.

2.2 "Authorized Representative" means any individual who is authorized by the Merchant to access and use the Platform on the Merchant's behalf.

2.3 "Certificate of Analysis" or "COA" means a document issued by a qualified laboratory that confirms the identity, purity, potency, and composition of a Product.

2.4 "Confidential Information" means all non-public information disclosed by either party to the other, whether orally, in writing, or by any other means, including but not limited to business plans, customer data, financial information, technical data, trade secrets, product formulations, pricing, marketing strategies, and any other information that a reasonable person would understand to be confidential.

2.5 "FDA" means the United States Food and Drug Administration.

2.6 "Good Manufacturing Practices" or "GMP" means the quality assurance standards and guidelines established by the FDA and other regulatory authorities for the manufacture, processing, packing, and holding of products.

2.7 "Intellectual Property" means all patents, copyrights, trademarks, service marks, trade names, trade dress, trade secrets, know-how, inventions, designs, domain names, software, and all other intellectual property rights, whether registered or unregistered.

2.8 "Know Your Business" or "KYB" means the verification process conducted by Peptide Tech to confirm the identity, legitimacy, and compliance status of a Merchant.

2.9 "Merchant" means any individual, business, institution, laboratory, or other entity that registers for and maintains an account on the Platform for the purpose of purchasing, distributing, or otherwise engaging with Products.

2.10 "Merchant Account" means the account created by the Merchant on the Platform, including all associated credentials, settings, and data.

2.11 "Order" means a request by the Merchant to purchase one or more Products through the Platform.

2.12 "Platform" means the Peptide Tech LLC website, web application, APIs, mobile applications (if any), and all related software, tools, and services provided by Peptide Tech.

2.13 "Products" means all research-use-only peptides, compounds, reagents, chemicals, reference materials, and any other items offered for sale or distribution through the Platform.

2.14 "Research Use Only" or "RUO" means products that are intended solely for research purposes and are not intended for use in diagnostic procedures, therapeutic applications, human consumption, animal consumption, or any clinical application, in accordance with 21 CFR § 809.10(c) and all applicable FDA guidance documents.

2.15 "Services" means all services provided by Peptide Tech through the Platform, including but not limited to product fulfillment, inventory management, order processing, shipping, compliance scanning, wallet management, and any ancillary services.

2.16 "Subsidiary" means any entity in which Peptide Tech LLC, directly or indirectly, owns more than fifty percent (50%) of the equity interests or has the power to direct or cause the direction of the management and policies of such entity.

2.17 "Third-Party Services" means any products, services, applications, or platforms provided by entities other than Peptide Tech, including but not limited to payment processors, shipping carriers, banking partners, and integration services.

2.18 "Wallet" means the prepaid balance account maintained by the Merchant on the Platform for the purpose of funding Orders and related transactions.`,
  },

  // ---- ARTICLE III ----
  {
    title: 'ARTICLE III — RESEARCH USE ONLY COMPLIANCE',
    content: `3.1 STRICT RESEARCH USE ONLY DESIGNATION. ALL PRODUCTS AVAILABLE THROUGH THE PLATFORM ARE DESIGNATED AS "RESEARCH USE ONLY" (RUO) IN ACCORDANCE WITH TITLE 21 OF THE CODE OF FEDERAL REGULATIONS, SECTION 809.10(c) (21 CFR § 809.10(c)), AND ALL APPLICABLE FDA GUIDANCE DOCUMENTS. PRODUCTS ARE NOT INTENDED FOR HUMAN OR ANIMAL CONSUMPTION, DIAGNOSTIC PROCEDURES, THERAPEUTIC APPLICATIONS, OR ANY CLINICAL USE WHATSOEVER.

3.2 Regulatory Framework. The Merchant acknowledges and agrees that:

(a) Under 21 CFR § 809.10(c), products labeled "For Research Use Only. Not for use in diagnostic procedures" are exempt from certain FDA requirements applicable to in vitro diagnostic products, provided they are not actually used for diagnostic purposes and are properly labeled.

(b) The FDA has issued guidance documents, including "Distribution of In Vitro Diagnostic Products Labeled for Research Use Only or Investigational Use Only" (November 25, 2013), which provide additional clarification on the proper labeling, distribution, and marketing of RUO products.

(c) Under the Federal Food, Drug, and Cosmetic Act (FDCA), 21 U.S.C. §§ 301 et seq., products that are misbranded or adulterated may be subject to enforcement actions, including seizure, injunction, and criminal prosecution.

(d) The Merchant is solely responsible for ensuring that all Products purchased from the Platform are used exclusively for bona fide research purposes, in compliance with 21 CFR § 809.10(c) and all other applicable federal, state, and local regulations.

3.3 Merchant RUO Obligations. The Merchant agrees to the following obligations regarding RUO compliance:

(a) The Merchant shall not market, advertise, promote, sell, distribute, or otherwise make available any Product for human consumption, animal consumption, diagnostic use, therapeutic use, or any clinical application.

(b) The Merchant shall not remove, alter, deface, or obscure any "Research Use Only" labeling, warnings, or disclaimers on any Product or Product packaging.

(c) The Merchant shall include appropriate RUO disclaimers on all websites, marketing materials, product listings, invoices, packaging, and communications related to the Products, including the statement: "For Research Use Only. Not for human or animal consumption. Not for diagnostic or therapeutic use."

(d) The Merchant shall not make any health claims, therapeutic claims, dosage recommendations, or efficacy statements regarding any Product, whether express or implied, on any website, social media platform, marketplace listing, or other communication channel.

(e) The Merchant shall not suggest, imply, or indicate that any Product is intended for, suitable for, or safe for human or animal consumption, injection, ingestion, inhalation, or any route of administration.

(f) The Merchant shall maintain records of all Product purchases, sales, and distributions, and shall make such records available to Peptide Tech upon request.

(g) The Merchant shall immediately notify Peptide Tech of any actual or suspected misuse of Products, any regulatory inquiry or enforcement action, or any communication from any governmental authority regarding Products purchased through the Platform.

3.4 Compliance Monitoring. Peptide Tech reserves the right to:

(a) Conduct periodic and unannounced compliance reviews of Merchant websites, social media accounts, marketplace listings, and other public-facing communications.

(b) Utilize automated compliance scanning tools to detect potential RUO violations.

(c) Request and review Merchant records related to Product usage, storage, and distribution.

(d) Suspend or terminate the Merchant's account, withhold funds, and/or halt shipments if any compliance violation is detected or reasonably suspected.

(e) Report any suspected violations to the FDA, DEA, or other applicable regulatory authorities.

3.5 Consequences of Non-Compliance. In the event that the Merchant violates any provision of this Article III:

(a) Peptide Tech may immediately suspend or terminate the Merchant's account without prior notice.

(b) Peptide Tech may withhold, freeze, or forfeit any funds in the Merchant's Wallet.

(c) Peptide Tech may halt all pending and future Orders.

(d) The Merchant shall be solely responsible for all fines, penalties, costs, damages, and legal fees arising from such violation.

(e) The Merchant shall indemnify, defend, and hold harmless Peptide Tech and its Affiliates from any and all claims, liabilities, damages, costs, and expenses arising from the Merchant's non-compliance.

(f) Peptide Tech may report the violation to applicable regulatory authorities, including but not limited to the FDA, DEA, FTC, and state attorneys general.`,
  },

  // ---- ARTICLE IV ----
  {
    title: 'ARTICLE IV — MERCHANT ACCOUNT AND ELIGIBILITY',
    content: `4.1 Account Registration. To access and use the Platform, the Merchant must complete the registration process, including providing accurate and complete business information, submitting required documentation for KYB verification, and agreeing to this Agreement.

4.2 Eligibility Requirements. The Merchant represents and warrants that:

(a) The Merchant is a bona fide business entity, research institution, laboratory, or individual researcher engaged in legitimate scientific research.

(b) The Merchant is duly organized, validly existing, and in good standing under the laws of its jurisdiction of formation or organization.

(c) The individual registering the account is at least eighteen (18) years of age and has the legal authority to bind the Merchant to this Agreement.

(d) All information provided during registration and at any time thereafter is true, accurate, complete, and current.

(e) The Merchant has all necessary licenses, permits, and authorizations required to purchase, possess, use, store, and distribute the Products in its jurisdiction.

(f) The Merchant is not located in, and does not operate from, any jurisdiction where the purchase, possession, use, or distribution of the Products is prohibited by law.

4.3 KYB Verification. The Merchant agrees to:

(a) Submit all required documentation for KYB verification, including but not limited to business licenses, articles of incorporation, tax identification numbers, government-issued identification, and research credentials.

(b) Cooperate fully with Peptide Tech's verification process and respond promptly to any requests for additional information or documentation.

(c) Notify Peptide Tech immediately of any changes to its business information, ownership, organizational structure, or compliance status.

4.4 Account Security. The Merchant is solely responsible for:

(a) Maintaining the confidentiality and security of its account credentials, including usernames, passwords, API keys, and access tokens.

(b) All activities that occur under its Merchant Account, whether or not authorized by the Merchant.

(c) Immediately notifying Peptide Tech of any unauthorized access to or use of its account.

(d) Ensuring that all Authorized Representatives comply with this Agreement.

4.5 Account Suspension and Termination. Peptide Tech reserves the right to suspend, restrict, or terminate any Merchant Account at any time, with or without cause, and with or without prior notice. Grounds for suspension or termination include, but are not limited to:

(a) Violation of any provision of this Agreement.
(b) Failure to maintain compliance with applicable laws and regulations.
(c) Fraudulent, deceptive, or misleading conduct.
(d) Failure to complete or pass KYB verification.
(e) Inactivity for a period of ninety (90) or more consecutive days.
(f) Non-payment or insufficient Wallet balance.
(g) Any conduct that Peptide Tech, in its sole discretion, determines to be harmful to the Platform, other Merchants, or the Company's reputation or interests.`,
  },

  // ---- ARTICLE V ----
  {
    title: 'ARTICLE V — ORDERS, PRICING, AND PAYMENT',
    content: `5.1 Order Placement. All Orders placed through the Platform are subject to acceptance by Peptide Tech. Peptide Tech reserves the right to refuse, cancel, or limit any Order at any time, for any reason, including but not limited to product availability, pricing errors, suspected fraud, or compliance concerns.

5.2 Pricing. All prices displayed on the Platform are in United States Dollars (USD) and are subject to change without notice. Peptide Tech makes no guarantee that prices will remain constant. Prices do not include taxes, duties, shipping charges, or other fees, which shall be the Merchant's responsibility.

5.3 Wallet System. The Merchant agrees that:

(a) All purchases must be funded through the Merchant's Wallet, which operates as a prepaid balance system.

(b) Wallet funds are loaded via invoices issued through the Platform's banking partner.

(c) Wallet funds are non-refundable except as expressly provided in this Agreement or as required by applicable law.

(d) Peptide Tech reserves the right to place holds on Wallet funds for pending Orders, compliance investigations, or suspected violations.

(e) In the event of account termination for cause, any remaining Wallet balance may be forfeited.

5.4 Taxes. The Merchant is solely responsible for determining and paying all applicable taxes, including but not limited to sales tax, use tax, value-added tax, excise tax, and any other taxes or duties imposed by any federal, state, local, or international taxing authority in connection with the Merchant's purchase, possession, use, sale, or distribution of Products.

5.5 Order Acceptance. Peptide Tech's confirmation of an Order does not constitute acceptance. Acceptance occurs only upon shipment of the Products. Peptide Tech may cancel any Order prior to shipment without liability.

5.6 Product Availability. Peptide Tech does not guarantee the availability of any Product. Products may be discontinued, modified, or temporarily unavailable without notice.

5.7 Payment Disputes. Any disputes regarding charges or Wallet transactions must be submitted in writing to Peptide Tech within thirty (30) days of the transaction date. Failure to dispute a charge within this period constitutes acceptance of the charge.`,
  },

  // ---- ARTICLE VI ----
  {
    title: 'ARTICLE VI — SHIPPING, DELIVERY, AND RISK OF LOSS',
    content: `6.1 Shipping Terms. Unless otherwise agreed in writing, all Products are shipped FOB Origin (Free on Board, Origin). Title to and risk of loss for the Products passes to the Merchant upon delivery of the Products to the shipping carrier at Peptide Tech's facility.

6.2 Shipping Carriers. Peptide Tech selects shipping carriers in its sole discretion. The Merchant may request specific carriers or shipping methods, subject to availability and additional charges.

6.3 Delivery Estimates. Any delivery estimates provided by Peptide Tech are approximate and are not guaranteed. Peptide Tech shall not be liable for any delays in delivery caused by the shipping carrier, weather, acts of God, regulatory holds, or any other circumstances beyond Peptide Tech's reasonable control.

6.4 Inspection and Acceptance. The Merchant shall inspect all Products promptly upon receipt. Any claims for damage, shortage, or non-conformity must be submitted in writing to Peptide Tech within forty-eight (48) hours of delivery. Failure to submit a claim within this period constitutes acceptance of the Products as delivered.

6.5 Shipping Address. The Merchant is solely responsible for providing accurate and complete shipping addresses. Peptide Tech shall not be liable for any loss, damage, or delay resulting from an incorrect or incomplete shipping address provided by the Merchant.

6.6 Hazardous Materials. Certain Products may be classified as hazardous materials under applicable law. The Merchant is responsible for ensuring that it has the appropriate facilities, training, licenses, and permits to receive, handle, store, and use such Products.

6.7 International Shipments. For shipments outside the United States, the Merchant is solely responsible for:

(a) Compliance with all export control laws and regulations, including the Export Administration Regulations (EAR) and International Traffic in Arms Regulations (ITAR).

(b) Obtaining all necessary import licenses, permits, and approvals.

(c) Payment of all customs duties, taxes, and fees.

(d) Compliance with all applicable laws and regulations of the destination country.

6.8 Signature Requirement. Peptide Tech may require a signature upon delivery for certain Orders. The Merchant agrees to make arrangements for signature acceptance.`,
  },

  // ---- ARTICLE VII ----
  {
    title: 'ARTICLE VII — PRODUCT QUALITY AND CERTIFICATES OF ANALYSIS',
    content: `7.1 Product Quality. Peptide Tech endeavors to supply Products that meet or exceed the specifications stated in the applicable Certificate of Analysis (COA). However, PEPTIDE TECH MAKES NO WARRANTIES REGARDING PRODUCT QUALITY, PURITY, POTENCY, COMPOSITION, OR FITNESS FOR ANY PARTICULAR PURPOSE, EXCEPT AS EXPRESSLY STATED IN THIS SECTION.

7.2 Certificates of Analysis. Peptide Tech will provide a COA for each Product lot. The COA constitutes the sole and exclusive specification for the Product. The Merchant acknowledges that:

(a) COAs are provided for informational and research reference purposes only.

(b) The Merchant is responsible for independently verifying the identity, purity, and suitability of any Product for the Merchant's intended research application.

(c) Peptide Tech does not guarantee that the Product will be suitable for the Merchant's specific research application.

7.3 Product Storage. The Merchant is solely responsible for the proper storage, handling, and preservation of Products after delivery. Peptide Tech shall not be liable for any degradation, contamination, or loss of efficacy resulting from improper storage or handling by the Merchant.

7.4 Product Returns. Peptide Tech does not accept returns except for Products that are demonstrably defective or materially non-conforming to the specifications stated in the applicable COA, as determined by Peptide Tech in its sole discretion. Any authorized return must be approved in writing by Peptide Tech prior to shipment of the return.

7.5 Remedies for Defective Products. If Peptide Tech determines, in its sole discretion, that a Product is defective or materially non-conforming, Peptide Tech's sole obligation and the Merchant's exclusive remedy shall be, at Peptide Tech's option: (a) replacement of the defective Product, or (b) issuance of a credit to the Merchant's Wallet in the amount of the purchase price of the defective Product. IN NO EVENT SHALL PEPTIDE TECH'S LIABILITY FOR A DEFECTIVE PRODUCT EXCEED THE PURCHASE PRICE PAID BY THE MERCHANT FOR THAT SPECIFIC PRODUCT.`,
  },

  // ---- ARTICLE VIII ----
  {
    title: 'ARTICLE VIII — INTELLECTUAL PROPERTY',
    content: `8.1 Ownership. All Intellectual Property rights in and to the Platform, Services, and all related technology, content, data, documentation, and materials are and shall remain the exclusive property of Peptide Tech and its licensors. Nothing in this Agreement grants the Merchant any ownership interest in or to the Platform, Services, or any Intellectual Property of Peptide Tech.

8.2 Limited License. Subject to the Merchant's compliance with this Agreement, Peptide Tech grants the Merchant a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Platform solely for the purposes contemplated by this Agreement.

8.3 Restrictions. The Merchant shall not:

(a) Copy, modify, adapt, translate, reverse-engineer, decompile, disassemble, or create derivative works based on the Platform or any component thereof.

(b) Remove, alter, or obscure any copyright, trademark, or other proprietary notices on the Platform.

(c) Use the Platform for any purpose other than as expressly permitted by this Agreement.

(d) Access or use the Platform to build a competing product or service.

(e) Use any automated means, including robots, crawlers, scrapers, or data mining tools, to access, monitor, or copy any content from the Platform without Peptide Tech's prior written consent.

(f) Use Peptide Tech's name, logo, trademarks, or other Intellectual Property without prior written consent.

8.4 Merchant Content. The Merchant retains ownership of any content, data, or materials that it submits to the Platform ("Merchant Content"). By submitting Merchant Content, the Merchant grants Peptide Tech a worldwide, non-exclusive, royalty-free, sublicensable, transferable license to use, store, reproduce, modify, display, and distribute such Merchant Content solely for the purpose of providing the Services.

8.5 Feedback. Any feedback, suggestions, recommendations, or ideas provided by the Merchant regarding the Platform or Services ("Feedback") shall become the exclusive property of Peptide Tech. The Merchant hereby assigns to Peptide Tech all right, title, and interest in and to any Feedback.

8.6 DMCA Compliance. Peptide Tech respects the intellectual property rights of others and expects Merchants to do the same. Peptide Tech will respond to notices of alleged copyright infringement that comply with the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512.`,
  },

  // ---- ARTICLE IX ----
  {
    title: 'ARTICLE IX — DISCLAIMER OF WARRANTIES',
    content: `9.1 AS-IS BASIS. THE PLATFORM, SERVICES, AND PRODUCTS ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.

9.2 DISCLAIMER. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, PEPTIDE TECH EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO:

(a) ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

(b) ANY WARRANTIES ARISING FROM COURSE OF DEALING, USAGE, OR TRADE PRACTICE.

(c) ANY WARRANTIES THAT THE PLATFORM OR SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.

(d) ANY WARRANTIES REGARDING THE ACCURACY, RELIABILITY, COMPLETENESS, OR TIMELINESS OF ANY CONTENT, DATA, OR INFORMATION PROVIDED THROUGH THE PLATFORM.

(e) ANY WARRANTIES THAT THE PRODUCTS WILL MEET THE MERCHANT'S REQUIREMENTS OR EXPECTATIONS, OR WILL BE SUITABLE FOR ANY PARTICULAR RESEARCH APPLICATION.

(f) ANY WARRANTIES REGARDING THE RESULTS THAT MAY BE OBTAINED FROM THE USE OF THE PLATFORM, SERVICES, OR PRODUCTS.

9.3 No Advice. Nothing in the Platform, Services, or any communication from Peptide Tech constitutes professional, legal, medical, scientific, financial, or regulatory advice. The Merchant is solely responsible for seeking and obtaining appropriate professional advice regarding the use of Products and compliance with applicable laws and regulations.

9.4 Third-Party Services. Peptide Tech makes no warranties regarding any Third-Party Services, including but not limited to payment processors, shipping carriers, banking partners, and integration services. The Merchant's use of Third-Party Services is at the Merchant's own risk and subject to the terms and conditions of the applicable third-party provider.

9.5 Regulatory Compliance. PEPTIDE TECH DOES NOT WARRANT THAT THE PRODUCTS COMPLY WITH ANY SPECIFIC REGULATORY REQUIREMENTS IN THE MERCHANT'S JURISDICTION. THE MERCHANT IS SOLELY RESPONSIBLE FOR DETERMINING AND ENSURING COMPLIANCE WITH ALL APPLICABLE LAWS AND REGULATIONS.`,
  },

  // ---- ARTICLE X ----
  {
    title: 'ARTICLE X — LIMITATION OF LIABILITY',
    content: `10.1 EXCLUSION OF CONSEQUENTIAL DAMAGES. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL PEPTIDE TECH, ITS AFFILIATES, SUBSIDIARIES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUCCESSORS, OR ASSIGNS BE LIABLE TO THE MERCHANT OR ANY THIRD PARTY FOR ANY:

(a) INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES;

(b) LOSS OF PROFITS, REVENUE, BUSINESS, GOODWILL, OR ANTICIPATED SAVINGS;

(c) LOSS OF DATA OR DATA BREACH;

(d) COST OF PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;

(e) PERSONAL INJURY, PROPERTY DAMAGE, OR BODILY HARM;

(f) ANY OTHER LOSSES OR DAMAGES ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT, THE PLATFORM, THE SERVICES, OR THE PRODUCTS, REGARDLESS OF THE THEORY OF LIABILITY (WHETHER IN CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, WARRANTY, OR OTHERWISE), AND EVEN IF PEPTIDE TECH HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

10.2 AGGREGATE LIABILITY CAP. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PEPTIDE TECH'S TOTAL CUMULATIVE LIABILITY TO THE MERCHANT FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THIS AGREEMENT, THE PLATFORM, THE SERVICES, OR THE PRODUCTS SHALL NOT EXCEED THE LESSER OF: (A) THE TOTAL AMOUNT PAID BY THE MERCHANT TO PEPTIDE TECH DURING THE THREE (3) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE THOUSAND UNITED STATES DOLLARS ($1,000.00 USD).

10.3 ESSENTIAL BASIS OF THE BARGAIN. THE MERCHANT ACKNOWLEDGES AND AGREES THAT THE LIMITATIONS OF LIABILITY SET FORTH IN THIS ARTICLE X REFLECT A FAIR AND REASONABLE ALLOCATION OF RISK BETWEEN THE PARTIES, THAT SUCH LIMITATIONS ARE AN ESSENTIAL BASIS OF THE BARGAIN BETWEEN THE PARTIES, AND THAT PEPTIDE TECH WOULD NOT HAVE ENTERED INTO THIS AGREEMENT WITHOUT SUCH LIMITATIONS.

10.4 APPLICABILITY. THE LIMITATIONS OF LIABILITY SET FORTH IN THIS ARTICLE X SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY LAW, EVEN IF ANY REMEDY SPECIFIED IN THIS AGREEMENT IS DEEMED TO HAVE FAILED OF ITS ESSENTIAL PURPOSE.

10.5 NO LIABILITY FOR THIRD-PARTY ACTIONS. PEPTIDE TECH SHALL NOT BE LIABLE FOR ANY ACTS OR OMISSIONS OF THIRD PARTIES, INCLUDING BUT NOT LIMITED TO SHIPPING CARRIERS, PAYMENT PROCESSORS, BANKING PARTNERS, AND INTEGRATION SERVICES.

10.6 NO LIABILITY FOR PRODUCT MISUSE. PEPTIDE TECH SHALL HAVE ABSOLUTELY NO LIABILITY WHATSOEVER FOR ANY INJURY, ILLNESS, DEATH, PROPERTY DAMAGE, ECONOMIC LOSS, OR ANY OTHER HARM OR DAMAGE OF ANY KIND ARISING FROM OR RELATED TO THE MISUSE, ABUSE, IMPROPER HANDLING, IMPROPER STORAGE, HUMAN CONSUMPTION, ANIMAL CONSUMPTION, INJECTION, INGESTION, INHALATION, OR ANY OTHER USE OF PRODUCTS THAT IS NOT IN STRICT ACCORDANCE WITH THE RESEARCH USE ONLY DESIGNATION AND ALL APPLICABLE LAWS AND REGULATIONS.

10.7 MERCHANT ASSUMES ALL RISK. THE MERCHANT EXPRESSLY ASSUMES ALL RISK ASSOCIATED WITH THE PURCHASE, POSSESSION, STORAGE, HANDLING, USE, SALE, DISTRIBUTION, AND DISPOSAL OF PRODUCTS. THE MERCHANT ACKNOWLEDGES THAT PEPTIDE TECH SHALL HAVE NO LIABILITY FOR ANY CONSEQUENCES ARISING FROM THE MERCHANT'S ACTIONS OR OMISSIONS REGARDING THE PRODUCTS.`,
  },

  // ---- ARTICLE XI ----
  {
    title: 'ARTICLE XI — INDEMNIFICATION',
    content: `11.1 Merchant Indemnification. The Merchant agrees to indemnify, defend, and hold harmless Peptide Tech LLC, its Affiliates, Subsidiaries, and their respective officers, directors, employees, agents, successors, and assigns (collectively, the "Indemnified Parties") from and against any and all claims, demands, lawsuits, actions, proceedings, investigations, liabilities, damages, losses, costs, and expenses (including but not limited to reasonable attorneys' fees, expert witness fees, court costs, and settlement amounts) arising out of or relating to:

(a) The Merchant's use, misuse, or inability to use the Platform, Services, or Products.

(b) The Merchant's breach or alleged breach of any provision of this Agreement.

(c) The Merchant's violation or alleged violation of any applicable law, regulation, ordinance, or order, including but not limited to FDA regulations, FTC regulations, DEA regulations, state controlled substance laws, and any other federal, state, local, or international laws.

(d) Any claim that the Merchant's use, sale, distribution, marketing, or advertising of Products causes or contributes to any injury, illness, death, property damage, or economic loss to any person or entity.

(e) Any claim arising from the Merchant's failure to comply with the Research Use Only designation, including but not limited to claims related to human or animal consumption, diagnostic use, or therapeutic use of Products.

(f) The Merchant's negligence, willful misconduct, fraud, or misrepresentation.

(g) Any product liability claim, personal injury claim, wrongful death claim, or property damage claim related to Products purchased by the Merchant.

(h) Any claim arising from the Merchant's employees, agents, contractors, customers, or end users.

(i) Any regulatory enforcement action, investigation, or inquiry directed at or involving the Merchant.

(j) The Merchant's violation of any third party's intellectual property rights, privacy rights, or other legal rights.

(k) Any breach of data security or data privacy obligations by the Merchant.

11.2 Indemnification Procedures. The Indemnified Parties shall:

(a) Promptly notify the Merchant of any claim for which indemnification is sought (provided that failure to provide timely notice shall not relieve the Merchant of its indemnification obligations except to the extent the Merchant is materially prejudiced by such delay).

(b) Grant the Merchant reasonable cooperation in the defense of such claim at the Merchant's expense.

(c) Retain the right to participate in the defense of any claim with counsel of their own choosing, at the Indemnified Parties' expense.

(d) Not settle any claim without the Merchant's prior written consent, which shall not be unreasonably withheld, conditioned, or delayed; provided, however, that the Merchant shall not settle any claim without the prior written consent of the Indemnified Parties.

11.3 Survival. The Merchant's indemnification obligations under this Article XI shall survive the termination or expiration of this Agreement for a period of five (5) years.`,
  },

  // ---- ARTICLE XII ----
  {
    title: 'ARTICLE XII — PRODUCT LIABILITY AND ASSUMPTION OF RISK',
    content: `12.1 MERCHANT ASSUMES ALL PRODUCT LIABILITY. THE MERCHANT EXPRESSLY ACKNOWLEDGES AND AGREES THAT UPON DELIVERY OF PRODUCTS TO THE MERCHANT (OR TO THE SHIPPING CARRIER, AS APPLICABLE), THE MERCHANT ASSUMES ALL LIABILITY, RISK, AND RESPONSIBILITY FOR THE PRODUCTS, INCLUDING BUT NOT LIMITED TO:

(a) ALL PRODUCT LIABILITY CLAIMS, WHETHER BASED ON NEGLIGENCE, STRICT LIABILITY, BREACH OF WARRANTY, OR ANY OTHER THEORY OF LIABILITY.

(b) ALL CLAIMS ARISING FROM THE MERCHANT'S STORAGE, HANDLING, USE, SALE, DISTRIBUTION, MARKETING, OR ADVERTISING OF THE PRODUCTS.

(c) ALL CLAIMS ARISING FROM ANY END USER'S USE OR MISUSE OF THE PRODUCTS.

(d) ALL CLAIMS ARISING FROM CONTAMINATION, DEGRADATION, OR ALTERATION OF THE PRODUCTS AFTER DELIVERY.

(e) ALL FINES, PENALTIES, AND COSTS IMPOSED BY ANY GOVERNMENTAL AUTHORITY IN CONNECTION WITH THE PRODUCTS.

12.2 No Agency. The Merchant is not an agent, employee, franchisee, or joint venture partner of Peptide Tech. The Merchant has no authority to bind Peptide Tech to any obligation or commitment. The relationship between Peptide Tech and the Merchant is solely that of an independent contractor.

12.3 Downstream Liability. The Merchant acknowledges that if the Merchant resells, distributes, or otherwise transfers Products to any third party, the Merchant shall be solely and exclusively responsible for:

(a) Ensuring that the recipient is a bona fide researcher or research institution.

(b) Including all required RUO labeling and disclaimers.

(c) Complying with all applicable laws and regulations regarding the sale and distribution of Products.

(d) Any and all claims, liabilities, damages, and expenses arising from the third party's use or misuse of the Products.

12.4 Insurance. The Merchant shall maintain, at its own expense, adequate insurance coverage, including but not limited to general liability insurance and product liability insurance, with coverage limits sufficient to cover the Merchant's obligations under this Agreement. Upon request, the Merchant shall provide Peptide Tech with evidence of such insurance coverage.

12.5 Recalls. In the event of a product recall initiated by Peptide Tech or any regulatory authority, the Merchant shall:

(a) Immediately cease all sales and distribution of the affected Products.

(b) Cooperate fully with Peptide Tech and any regulatory authority in effecting the recall.

(c) Provide all records and information requested by Peptide Tech regarding the distribution and disposition of the affected Products.

(d) Bear all costs associated with the recall to the extent caused by the Merchant's actions or omissions.`,
  },

  // ---- ARTICLE XIII ----
  {
    title: 'ARTICLE XIII — CONFIDENTIALITY',
    content: `13.1 Confidentiality Obligations. Each party agrees to:

(a) Maintain the confidentiality of the other party's Confidential Information using at least the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care.

(b) Use the other party's Confidential Information solely for the purposes contemplated by this Agreement.

(c) Not disclose the other party's Confidential Information to any third party without the prior written consent of the disclosing party, except as permitted by this Agreement or required by law.

13.2 Exclusions. Confidential Information does not include information that:

(a) Is or becomes publicly available through no fault of the receiving party.

(b) Was known to the receiving party prior to disclosure by the disclosing party.

(c) Is independently developed by the receiving party without use of the disclosing party's Confidential Information.

(d) Is rightfully obtained by the receiving party from a third party without restriction on disclosure.

13.3 Compelled Disclosure. If either party is compelled by law, regulation, or legal process to disclose the other party's Confidential Information, the compelled party shall, to the extent legally permitted, provide prompt written notice to the other party so that such party may seek a protective order or other appropriate remedy.

13.4 Merchant Data. Peptide Tech may use aggregated, anonymized, or de-identified data derived from the Merchant's use of the Platform for any lawful purpose, including but not limited to improving the Platform, conducting research, and creating industry benchmarks.

13.5 Trade Secrets. The parties acknowledge that certain Confidential Information may constitute trade secrets under the Defend Trade Secrets Act of 2016 (18 U.S.C. § 1836 et seq.) and applicable state trade secret laws. Nothing in this Agreement shall be construed to limit any rights or remedies available under such laws.`,
  },

  // ---- ARTICLE XIV ----
  {
    title: 'ARTICLE XIV — COMPLIANCE WITH LAWS',
    content: `14.1 General Compliance. The Merchant shall comply with all applicable federal, state, local, and international laws, regulations, ordinances, and orders in connection with its use of the Platform, Services, and Products, including but not limited to:

(a) The Federal Food, Drug, and Cosmetic Act (FDCA), 21 U.S.C. §§ 301 et seq.

(b) FDA regulations, including 21 CFR Part 809 (In Vitro Diagnostic Products for Human Use).

(c) The Federal Trade Commission Act (FTC Act), 15 U.S.C. §§ 41-58.

(d) The Controlled Substances Act (CSA), 21 U.S.C. §§ 801 et seq., and all applicable DEA regulations.

(e) The Anti-Kickback Statute, 42 U.S.C. § 1320a-7b(b).

(f) The False Claims Act, 31 U.S.C. §§ 3729-3733.

(g) The Health Insurance Portability and Accountability Act (HIPAA), to the extent applicable.

(h) State consumer protection laws and unfair business practice statutes.

(i) State pharmacy laws and controlled substance regulations.

(j) Environmental protection laws related to the storage, handling, and disposal of chemical products and laboratory waste.

(k) Occupational health and safety laws, including OSHA regulations.

(l) Export control laws, including the Export Administration Regulations (EAR) and ITAR.

(m) Anti-money laundering laws and regulations.

(n) Sanctions programs administered by the U.S. Department of the Treasury's Office of Foreign Assets Control (OFAC).

14.2 Anti-Corruption. The Merchant shall not, directly or indirectly, offer, promise, give, or authorize the giving of any bribe, kickback, or other improper payment to any government official, employee, or agent in connection with this Agreement or the Products.

14.3 Record Keeping. The Merchant shall maintain complete and accurate records of all transactions, product distributions, and compliance activities for a minimum period of seven (7) years from the date of each transaction.

14.4 Regulatory Changes. The Merchant is solely responsible for monitoring and complying with any changes to applicable laws and regulations. Peptide Tech shall not be liable for any failure by the Merchant to comply with new or amended laws or regulations.`,
  },

  // ---- ARTICLE XV ----
  {
    title: 'ARTICLE XV — DISPUTE RESOLUTION AND GOVERNING LAW',
    content: `15.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of Wyoming, without regard to its conflict of law principles.

15.2 Mandatory Binding Arbitration. EXCEPT FOR CLAIMS THAT MAY BE BROUGHT IN SMALL CLAIMS COURT, ANY DISPUTE, CONTROVERSY, OR CLAIM ARISING OUT OF OR RELATING TO THIS AGREEMENT, OR THE BREACH, TERMINATION, OR VALIDITY THEREOF, SHALL BE FINALLY RESOLVED BY BINDING ARBITRATION IN ACCORDANCE WITH THE RULES OF THE AMERICAN ARBITRATION ASSOCIATION ("AAA").

15.3 Arbitration Procedures:

(a) The arbitration shall be conducted by a single arbitrator selected in accordance with the AAA rules.

(b) The seat of arbitration shall be Sheridan County, Wyoming.

(c) The arbitration shall be conducted in the English language.

(d) The arbitrator shall apply the substantive law of the State of Wyoming.

(e) The arbitrator's decision shall be final and binding upon both parties and may be entered as a judgment in any court of competent jurisdiction.

(f) The arbitrator shall not have the power to award punitive, consequential, or exemplary damages, except where expressly authorized by statute.

(g) Each party shall bear its own costs and expenses, including attorneys' fees, unless the arbitrator determines that a party has brought a frivolous claim or defense.

15.4 CLASS ACTION WAIVER. THE MERCHANT AGREES THAT ANY ARBITRATION OR LEGAL PROCEEDING SHALL BE CONDUCTED ON AN INDIVIDUAL BASIS AND NOT AS A CLASS ACTION, CONSOLIDATED ACTION, OR REPRESENTATIVE ACTION. THE MERCHANT HEREBY WAIVES ANY RIGHT TO PARTICIPATE IN OR BRING A CLASS ACTION, CLASS ARBITRATION, OR ANY OTHER REPRESENTATIVE PROCEEDING AGAINST PEPTIDE TECH.

15.5 JURY TRIAL WAIVER. TO THE FULLEST EXTENT PERMITTED BY LAW, EACH PARTY HEREBY IRREVOCABLY WAIVES ANY RIGHT TO A TRIAL BY JURY IN ANY ACTION, PROCEEDING, OR COUNTERCLAIM ARISING OUT OF OR RELATING TO THIS AGREEMENT.

15.6 Injunctive Relief. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent irreparable harm, including but not limited to the unauthorized use of Confidential Information or Intellectual Property.

15.7 Limitation Period. Any claim arising out of or related to this Agreement must be filed within one (1) year after the date on which the cause of action accrued. Any claim not filed within this period shall be permanently barred.

15.8 Venue. For any dispute not subject to arbitration, the exclusive venue shall be the state or federal courts located in Sheridan County, Wyoming, and the parties hereby consent to the personal jurisdiction of such courts.`,
  },

  // ---- ARTICLE XVI ----
  {
    title: 'ARTICLE XVI — TERMINATION',
    content: `16.1 Termination by Peptide Tech. Peptide Tech may terminate this Agreement and the Merchant's access to the Platform at any time, with or without cause, and with or without prior notice, in Peptide Tech's sole discretion.

16.2 Termination by Merchant. The Merchant may terminate this Agreement by providing written notice to Peptide Tech at legal@peptidetech.co. Termination shall be effective thirty (30) days after receipt of such notice.

16.3 Effect of Termination. Upon termination of this Agreement:

(a) The Merchant's access to the Platform and Services shall be immediately suspended or revoked.

(b) All outstanding Orders may be cancelled at Peptide Tech's discretion.

(c) Any remaining Wallet balance shall be refunded to the Merchant, less any amounts owed to Peptide Tech, within ninety (90) days of termination, unless the termination was for cause (including but not limited to compliance violations, fraud, or breach of this Agreement), in which case the Wallet balance may be forfeited.

(d) The Merchant shall immediately cease all use of Peptide Tech's Intellectual Property, including any trademarks, logos, or materials.

(e) The Merchant shall return or destroy all Confidential Information of Peptide Tech in its possession.

16.4 Survival. The following provisions shall survive the termination or expiration of this Agreement: Articles II, III, VII (Section 7.1 disclaimer), VIII, IX, X, XI, XII, XIII, XIV, XV, XVI (Section 16.3 and 16.4), XVII, XVIII, XIX, XX, XXI, XXII, and any other provisions that by their nature are intended to survive termination.`,
  },

  // ---- ARTICLE XVII ----
  {
    title: 'ARTICLE XVII — DATA PROCESSING AND PRIVACY',
    content: `17.1 Privacy Policy. The Merchant acknowledges that it has read and agrees to Peptide Tech's Privacy Policy, which is incorporated into this Agreement by reference. The Privacy Policy describes how Peptide Tech collects, uses, stores, and discloses personal information and business data.

17.2 Data Security. Peptide Tech implements reasonable administrative, technical, and physical security measures to protect the data stored on the Platform. However, PEPTIDE TECH DOES NOT GUARANTEE THE ABSOLUTE SECURITY OF ANY DATA AND SHALL NOT BE LIABLE FOR ANY UNAUTHORIZED ACCESS, DATA BREACH, OR DATA LOSS.

17.3 Merchant Data Responsibilities. The Merchant is solely responsible for:

(a) The accuracy, quality, and legality of all data it provides to Peptide Tech.

(b) Obtaining all necessary consents and authorizations for the collection, use, and disclosure of personal information.

(c) Complying with all applicable data protection laws and regulations, including but not limited to the California Consumer Privacy Act (CCPA), the General Data Protection Regulation (GDPR) to the extent applicable, and all other state and federal privacy laws.

17.4 Data Retention. Peptide Tech may retain Merchant data for as long as necessary to fulfill the purposes described in this Agreement and the Privacy Policy, or as required by applicable law.

17.5 Data Portability. Upon written request, Peptide Tech will provide the Merchant with a copy of the Merchant's data in a commonly used, machine-readable format, subject to applicable legal restrictions and technical feasibility.`,
  },

  // ---- ARTICLE XVIII ----
  {
    title: 'ARTICLE XVIII — ELECTRONIC SIGNATURES AND COMMUNICATIONS',
    content: `18.1 Electronic Signatures. The Merchant agrees that this Agreement may be executed electronically and that electronic signatures shall have the same legal force and effect as original ink signatures, in accordance with the Electronic Signatures in Global and National Commerce Act (E-SIGN Act), 15 U.S.C. §§ 7001-7006, and the Uniform Electronic Transactions Act (UETA) as adopted in the State of Wyoming (Wyo. Stat. §§ 40-21-101 et seq.).

18.2 Consent to Electronic Communications. By registering for an account on the Platform, the Merchant consents to receive all communications from Peptide Tech electronically, including but not limited to:

(a) This Agreement and any amendments thereto.
(b) Notices, disclosures, and other communications required by law.
(c) Order confirmations, invoices, and receipts.
(d) Compliance notices and enforcement actions.
(e) Marketing and promotional communications (subject to opt-out rights).

18.3 Electronic Records. The Merchant agrees that all agreements, notices, disclosures, and other communications that Peptide Tech provides electronically satisfy any legal requirement that such communications be in writing.

18.4 Binding Effect. The Merchant's electronic signature on this Agreement constitutes the Merchant's binding agreement to all terms and conditions herein. The Merchant acknowledges that it has had the opportunity to review this Agreement in its entirety prior to signing.`,
  },

  // ---- ARTICLE XIX ----
  {
    title: 'ARTICLE XIX — PROHIBITED USES',
    content: `19.1 The Merchant shall not use the Platform or Products for any of the following prohibited purposes:

(a) Human consumption, injection, ingestion, inhalation, topical application, or any other route of administration to humans.

(b) Animal consumption, injection, ingestion, or any veterinary application.

(c) Diagnostic procedures, including in vitro diagnostic testing for clinical purposes.

(d) Therapeutic or clinical applications of any kind.

(e) Any use that violates applicable laws, regulations, or this Agreement.

(f) Manufacturing, compounding, or formulating products intended for human or animal use.

(g) Marketing, advertising, or promoting Products in a manner that suggests they are suitable for human consumption, therapeutic use, or any use other than bona fide research.

(h) Reselling Products to end users who intend to use them for non-research purposes.

(i) Using the Platform to engage in fraudulent, deceptive, or misleading practices.

(j) Attempting to circumvent or disable any security feature of the Platform.

(k) Uploading or transmitting viruses, malware, or other harmful code to the Platform.

(l) Interfering with or disrupting the integrity or performance of the Platform.

(m) Using the Platform to violate the rights of any third party, including intellectual property rights and privacy rights.

(n) Using the Platform in any manner that could damage, disable, overburden, or impair the Platform.

19.2 Peptide Tech reserves the right to investigate and take appropriate action against any Merchant that it believes, in its sole discretion, has engaged in any prohibited use, including but not limited to account suspension or termination, fund forfeiture, and reporting to applicable authorities.`,
  },

  // ---- ARTICLE XX ----
  {
    title: 'ARTICLE XX — FORCE MAJEURE',
    content: `20.1 Neither party shall be liable for any failure or delay in performing its obligations under this Agreement if such failure or delay results from circumstances beyond the party's reasonable control, including but not limited to:

(a) Acts of God, including earthquakes, floods, hurricanes, tornadoes, wildfires, and other natural disasters.

(b) Epidemics, pandemics, or public health emergencies.

(c) War, terrorism, civil unrest, insurrection, or armed conflict.

(d) Government actions, including sanctions, embargoes, import/export restrictions, and regulatory changes.

(e) Strikes, lockouts, or other labor disputes.

(f) Power outages, internet or telecommunications failures, or infrastructure disruptions.

(g) Supply chain disruptions, raw material shortages, or manufacturing difficulties.

(h) Acts or omissions of third-party service providers, including shipping carriers and payment processors.

20.2 The affected party shall provide prompt written notice to the other party of the force majeure event and shall use commercially reasonable efforts to mitigate the effects of the event and resume performance as soon as practicable.

20.3 If the force majeure event continues for more than ninety (90) consecutive days, either party may terminate this Agreement upon written notice to the other party.`,
  },

  // ---- ARTICLE XXI ----
  {
    title: 'ARTICLE XXI — MISCELLANEOUS',
    content: `21.1 Entire Agreement. This Agreement, together with the Privacy Policy and all policies incorporated by reference, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior or contemporaneous agreements, representations, warranties, and understandings, whether written, oral, or implied.

21.2 Amendments. Peptide Tech reserves the right to modify, amend, or update this Agreement at any time by posting the revised Agreement on the Platform. The Merchant's continued use of the Platform after such modification constitutes acceptance of the modified Agreement. Material changes will be communicated to the Merchant via email or through the Platform.

21.3 Severability. If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court or arbitrator of competent jurisdiction, the remaining provisions shall remain in full force and effect. The invalid, illegal, or unenforceable provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable while preserving the intent of the parties.

21.4 Waiver. The failure of either party to enforce any right or provision of this Agreement shall not constitute a waiver of such right or provision. A waiver of any provision shall be effective only if it is in writing and signed by the waiving party.

21.5 Assignment. The Merchant may not assign, transfer, or delegate this Agreement or any rights or obligations hereunder without the prior written consent of Peptide Tech. Peptide Tech may freely assign this Agreement to any Affiliate, Subsidiary, or successor in connection with a merger, acquisition, reorganization, or sale of all or substantially all of its assets.

21.6 No Third-Party Beneficiaries. This Agreement is for the sole benefit of the parties and their respective successors and permitted assigns. Nothing in this Agreement shall confer any rights, remedies, obligations, or liabilities upon any third party.

21.7 Notices. All notices under this Agreement shall be in writing and shall be deemed effective upon: (a) personal delivery; (b) one (1) business day after deposit with a nationally recognized overnight courier; (c) three (3) business days after deposit in the United States mail, certified, return receipt requested; or (d) upon sending by email to the addresses specified in this Agreement or as otherwise provided by the parties.

Notices to Peptide Tech shall be sent to:
Peptide Tech LLC
1309 Coffeen Ave, Ste 14346
Sheridan, Wyoming 82801
Email: legal@peptidetech.co

21.8 Headings. The headings used in this Agreement are for convenience of reference only and shall not affect the interpretation of this Agreement.

21.9 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original, and all of which together shall constitute one and the same agreement.

21.10 Construction. This Agreement shall be construed without regard to any presumption or rule requiring construction or interpretation against the party drafting or causing any instrument to be drafted.

21.11 Relationship of the Parties. Nothing in this Agreement shall be construed to create a partnership, joint venture, agency, or employment relationship between the parties. Each party is an independent contractor.

21.12 Cumulative Remedies. The rights and remedies of the parties under this Agreement are cumulative and are in addition to, and not in substitution for, any other rights and remedies available at law or in equity.`,
  },

  // ---- ARTICLE XXII ----
  {
    title: 'ARTICLE XXII — SPECIAL PROVISIONS FOR PEPTIDE RESEARCH PRODUCTS',
    content: `22.1 Nature of Products. The Merchant acknowledges that the Products offered through the Platform are synthetic peptides, research chemicals, reference standards, and related reagents that are manufactured and distributed exclusively for in vitro research use.

22.2 Not a Drug or Supplement. The Merchant expressly acknowledges and agrees that:

(a) THE PRODUCTS ARE NOT DRUGS, PHARMACEUTICALS, DIETARY SUPPLEMENTS, FOOD ADDITIVES, COSMETICS, OR MEDICAL DEVICES AS THOSE TERMS ARE DEFINED UNDER THE FEDERAL FOOD, DRUG, AND COSMETIC ACT OR ANY STATE LAW.

(b) THE PRODUCTS HAVE NOT BEEN EVALUATED, APPROVED, OR CLEARED BY THE FDA FOR ANY USE, INCLUDING BUT NOT LIMITED TO DIAGNOSTIC, THERAPEUTIC, PREVENTIVE, OR CURATIVE PURPOSES.

(c) THE PRODUCTS ARE NOT INTENDED TO DIAGNOSE, TREAT, CURE, MITIGATE, OR PREVENT ANY DISEASE OR MEDICAL CONDITION.

(d) NO REPRESENTATION OR CLAIM IS MADE BY PEPTIDE TECH REGARDING THE SAFETY, EFFICACY, OR SUITABILITY OF THE PRODUCTS FOR ANY USE OTHER THAN BONA FIDE IN VITRO RESEARCH.

22.3 Laboratory and Safety Requirements. The Merchant represents and warrants that:

(a) It maintains appropriate laboratory facilities and equipment for handling research chemicals and peptides.

(b) Its personnel are trained in the safe handling, storage, and disposal of research chemicals.

(c) It maintains current Safety Data Sheets (SDS) for all Products.

(d) It complies with all applicable OSHA, EPA, and state environmental and safety regulations.

(e) It has appropriate personal protective equipment (PPE) and emergency response procedures in place.

22.4 Disposal. The Merchant is solely responsible for the proper disposal of Products and any waste generated from the use of Products, in compliance with all applicable federal, state, and local environmental laws and regulations, including but not limited to the Resource Conservation and Recovery Act (RCRA), 42 U.S.C. §§ 6901 et seq.

22.5 Controlled Substances. If any Product contains or is derived from a controlled substance, the Merchant represents and warrants that it holds all necessary DEA registrations, licenses, and permits required to purchase, possess, and use such Product. The Merchant shall not use any Product containing a controlled substance for any purpose not authorized by its DEA registration.

22.6 Export Controls. The Merchant shall not export or re-export any Product, or any technical data related thereto, in violation of any applicable export control laws or regulations, including the Export Administration Regulations (EAR), 15 CFR Parts 730-774, and the International Traffic in Arms Regulations (ITAR), 22 CFR Parts 120-130.`,
  },

  // ---- ARTICLE XXIII ----
  {
    title: 'ARTICLE XXIII — ACKNOWLEDGMENT AND SIGNATURE',
    content: `BY SIGNING THIS AGREEMENT, THE MERCHANT ACKNOWLEDGES AND AGREES TO THE FOLLOWING:

1. THE MERCHANT HAS READ THIS AGREEMENT IN ITS ENTIRETY AND UNDERSTANDS ALL TERMS AND CONDITIONS.

2. THE MERCHANT VOLUNTARILY AND KNOWINGLY AGREES TO BE BOUND BY ALL TERMS AND CONDITIONS OF THIS AGREEMENT.

3. THE MERCHANT UNDERSTANDS THAT ALL PRODUCTS ARE DESIGNATED AS "RESEARCH USE ONLY" AND ARE NOT INTENDED FOR HUMAN OR ANIMAL CONSUMPTION OR ANY CLINICAL OR THERAPEUTIC USE.

4. THE MERCHANT ASSUMES ALL LIABILITY AND RISK ASSOCIATED WITH THE PURCHASE, POSSESSION, STORAGE, HANDLING, USE, SALE, AND DISTRIBUTION OF PRODUCTS.

5. THE MERCHANT AGREES TO INDEMNIFY AND HOLD HARMLESS PEPTIDE TECH LLC AND ITS AFFILIATES, SUBSIDIARIES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS FROM ANY AND ALL CLAIMS, DAMAGES, LOSSES, AND EXPENSES ARISING FROM THE MERCHANT'S USE OR MISUSE OF PRODUCTS.

6. THE MERCHANT WAIVES ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS ARBITRATION AGAINST PEPTIDE TECH LLC.

7. THE MERCHANT AGREES TO MANDATORY BINDING ARBITRATION IN SHERIDAN COUNTY, WYOMING FOR ALL DISPUTES.

8. THE MERCHANT WAIVES ANY RIGHT TO A TRIAL BY JURY.

9. THE INDIVIDUAL SIGNING THIS AGREEMENT IS AUTHORIZED TO BIND THE MERCHANT ENTITY TO THIS AGREEMENT.

10. THE MERCHANT UNDERSTANDS THAT THIS AGREEMENT IS LEGALLY BINDING AND ENFORCEABLE.

This Agreement is effective as of the date of the Merchant's electronic signature below.

Peptide Tech LLC
1309 Coffeen Ave, Ste 14346
Sheridan, Wyoming 82801
legal@peptidetech.co`,
  },
];

// ---------------------------------------------------------------------------
// PRIVACY POLICY
// ---------------------------------------------------------------------------
export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    title: 'PRIVACY POLICY — INTRODUCTION',
    content: `PEPTIDE TECH LLC PRIVACY POLICY

Effective Date: ${EFFECTIVE_DATE}

Peptide Tech LLC ("Peptide Tech," "Company," "we," "us," or "our") is committed to protecting the privacy and security of the personal information we collect from our merchants, users, and website visitors. This Privacy Policy describes how we collect, use, disclose, store, and protect your personal information when you access or use our website, platform, services, and related technology (collectively, the "Services").

This Privacy Policy applies to all individuals and entities that interact with our Services, including merchants, account holders, authorized representatives, website visitors, and any other users.

By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree to this Privacy Policy, you must not access or use our Services.

This Privacy Policy is incorporated into and forms a part of our Terms of Service and Merchant Agreement. Capitalized terms not defined in this Privacy Policy have the meanings ascribed to them in the Terms of Service.

Peptide Tech LLC
1309 Coffeen Ave, Ste 14346
Sheridan, Wyoming 82801
Email: legal@peptidetech.co`,
  },

  {
    title: 'SECTION 1 — INFORMATION WE COLLECT',
    content: `We collect the following categories of information:

1.1 Information You Provide Directly:

(a) Account Registration Information: Legal business name, doing-business-as (DBA) name, business type, Employer Identification Number (EIN), year of establishment, business website URL, business phone number, and business email address.

(b) Contact Information: First name, last name, job title, email address, phone number, and date of birth of the primary contact and authorized representatives.

(c) Address Information: Business address, shipping address, and billing address, including street address, city, state, ZIP code, and country.

(d) Verification Documents: Business licenses, articles of incorporation, tax exemption certificates, research credentials, government-issued identification, and any other documents submitted during the KYB verification process.

(e) Financial Information: Wallet balance, transaction history, invoice records, and banking information (processed through our banking partners).

(f) Signature Data: Electronic signatures provided during the execution of the Merchant Agreement, including signature images and associated metadata (timestamp, IP address).

(g) Communications: Emails, support tickets, chat messages, and any other communications you send to us.

(h) Order Information: Order details, product selections, quantities, shipping preferences, and order history.

1.2 Information Collected Automatically:

(a) Device Information: Device type, operating system, browser type and version, screen resolution, and device identifiers.

(b) Usage Data: Pages visited, features used, clickstream data, time spent on pages, navigation patterns, and search queries.

(c) Log Data: IP address, access times, referring URLs, error logs, and server response codes.

(d) Cookies and Tracking Technologies: We use cookies, web beacons, pixels, and similar technologies to collect information about your interactions with our Services. See Section 6 for more information about our use of cookies.

(e) Location Data: Approximate geographic location based on your IP address.

1.3 Information from Third Parties:

(a) Verification Services: Information from identity verification services, business verification services, and public records databases used in our KYB process.

(b) Banking Partners: Transaction data and payment information from our banking and payment processing partners.

(c) Analytics Services: Aggregated and anonymized usage data from third-party analytics providers.

(d) Public Sources: Information from public records, government databases, and publicly available sources.`,
  },

  {
    title: 'SECTION 2 — HOW WE USE YOUR INFORMATION',
    content: `We use the information we collect for the following purposes:

2.1 Providing and Improving Our Services:

(a) Processing account registrations and KYB verification.
(b) Fulfilling orders and managing the order lifecycle.
(c) Managing Wallet balances and processing transactions.
(d) Providing customer support and responding to inquiries.
(e) Improving, developing, and enhancing the Platform and Services.
(f) Personalizing your experience on the Platform.
(g) Conducting analytics and research to understand usage patterns.

2.2 Compliance and Legal Purposes:

(a) Complying with applicable laws, regulations, and legal processes.
(b) Enforcing our Terms of Service and Merchant Agreement.
(c) Conducting compliance monitoring and RUO compliance scanning.
(d) Detecting, preventing, and addressing fraud, security breaches, and other harmful activities.
(e) Responding to regulatory inquiries and enforcement actions.
(f) Maintaining records as required by applicable law.

2.3 Communications:

(a) Sending transactional emails, including order confirmations, shipping notifications, and account alerts.
(b) Sending compliance notifications and enforcement notices.
(c) Sending administrative notices, including changes to our Terms of Service or Privacy Policy.
(d) Sending marketing and promotional communications (subject to your opt-out preferences).

2.4 Business Operations:

(a) Managing our business relationships with merchants and partners.
(b) Conducting internal audits and quality assurance.
(c) Analyzing business performance and generating reports.
(d) Protecting our legal rights and interests.`,
  },

  {
    title: 'SECTION 3 — HOW WE SHARE YOUR INFORMATION',
    content: `We may share your information in the following circumstances:

3.1 Service Providers: We share information with third-party service providers that perform services on our behalf, including:

(a) Cloud hosting and infrastructure providers.
(b) Email service providers and communication platforms.
(c) Payment processing and banking partners.
(d) Shipping and logistics carriers.
(e) Identity verification and KYB verification services.
(f) Analytics and monitoring services.
(g) Customer support tools.

These service providers are contractually obligated to use your information only for the purposes of providing services to us and to maintain appropriate security measures.

3.2 Legal Requirements: We may disclose your information when we believe in good faith that disclosure is necessary to:

(a) Comply with applicable laws, regulations, subpoenas, court orders, or legal processes.
(b) Respond to requests from governmental authorities, including the FDA, DEA, FTC, and state regulators.
(c) Protect the rights, property, or safety of Peptide Tech, our merchants, or the public.
(d) Enforce our Terms of Service and Merchant Agreement.
(e) Detect, prevent, or address fraud, security issues, or technical problems.

3.3 Business Transfers: In the event of a merger, acquisition, reorganization, bankruptcy, dissolution, sale of all or substantially all of our assets, or similar transaction, your information may be transferred to the acquiring entity or successor.

3.4 Affiliates and Subsidiaries: We may share information with our Affiliates and Subsidiaries for the purposes described in this Privacy Policy.

3.5 With Your Consent: We may share your information with third parties when you have given us your explicit consent to do so.

3.6 Aggregated and De-Identified Data: We may share aggregated, anonymized, or de-identified data that cannot reasonably be used to identify you with third parties for any lawful purpose, including research, analytics, and marketing.

3.7 We DO NOT Sell Personal Information. Peptide Tech does not sell, rent, or lease your personal information to third parties for their marketing purposes.`,
  },

  {
    title: 'SECTION 4 — DATA SECURITY',
    content: `4.1 Security Measures. We implement and maintain reasonable administrative, technical, and physical security measures designed to protect your personal information from unauthorized access, disclosure, alteration, and destruction. These measures include:

(a) Encryption of data in transit using TLS/SSL protocols.
(b) Encryption of sensitive data at rest.
(c) Access controls and authentication mechanisms.
(d) Regular security assessments and vulnerability testing.
(e) Employee training on data security best practices.
(f) Incident response procedures.
(g) Row-level security (RLS) policies for multi-tenant data isolation.

4.2 No Absolute Security Guarantee. WHILE WE STRIVE TO PROTECT YOUR PERSONAL INFORMATION, NO METHOD OF TRANSMISSION OVER THE INTERNET OR METHOD OF ELECTRONIC STORAGE IS 100% SECURE. WE CANNOT AND DO NOT GUARANTEE THE ABSOLUTE SECURITY OF YOUR INFORMATION. YOU ACKNOWLEDGE THAT YOU PROVIDE YOUR INFORMATION AT YOUR OWN RISK.

4.3 Breach Notification. In the event of a data breach that compromises the security, confidentiality, or integrity of your personal information, we will notify you and applicable regulatory authorities in accordance with applicable data breach notification laws.

4.4 Merchant Responsibilities. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized access to or use of your account.`,
  },

  {
    title: 'SECTION 5 — DATA RETENTION',
    content: `5.1 Retention Periods. We retain your personal information for as long as necessary to fulfill the purposes described in this Privacy Policy, including:

(a) For the duration of your account and our business relationship.
(b) As necessary to comply with our legal obligations (including tax, accounting, and regulatory record-keeping requirements).
(c) As necessary to resolve disputes and enforce our agreements.
(d) As required by applicable law (minimum seven (7) years for financial records and compliance records).

5.2 After Termination. Following the termination of your account:

(a) We may retain certain information as required by applicable law.
(b) We may retain aggregated, anonymized, or de-identified data indefinitely.
(c) We may retain information necessary to comply with legal obligations, resolve disputes, and enforce our agreements.
(d) Backup copies of your information may persist in our backup systems for a reasonable period following deletion.

5.3 Deletion Requests. You may request the deletion of your personal information by contacting us at legal@peptidetech.co. We will process your request in accordance with applicable law, subject to our legal obligations to retain certain information.`,
  },

  {
    title: 'SECTION 6 — COOKIES AND TRACKING TECHNOLOGIES',
    content: `6.1 Types of Cookies We Use:

(a) Strictly Necessary Cookies: Essential for the operation of our Platform, including authentication, security, and session management.

(b) Performance and Analytics Cookies: Used to collect information about how you use our Platform, including pages visited, time spent, and navigation patterns. We use this information to improve our Platform and Services.

(c) Functionality Cookies: Used to remember your preferences and settings, such as language, region, and display preferences.

6.2 Third-Party Cookies. Our Platform may contain cookies and tracking technologies placed by third-party service providers, including analytics providers. These third parties may collect information about your online activities over time and across different websites.

6.3 Managing Cookies. Most web browsers allow you to control cookies through their settings. You can typically set your browser to block or delete cookies, or to alert you when cookies are being sent. However, if you disable cookies, some features of our Platform may not function properly.

6.4 Do Not Track Signals. Some web browsers transmit "Do Not Track" (DNT) signals. At this time, our Platform does not respond to DNT signals. We may update this policy as industry standards for DNT evolve.`,
  },

  {
    title: 'SECTION 7 — YOUR PRIVACY RIGHTS',
    content: `Depending on your jurisdiction, you may have certain rights regarding your personal information:

7.1 California Residents — CCPA/CPRA Rights. If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA), as amended by the California Privacy Rights Act (CPRA):

(a) Right to Know: You have the right to request information about the categories and specific pieces of personal information we have collected about you, the sources of that information, the business purpose for collecting the information, and the categories of third parties with whom we share the information.

(b) Right to Delete: You have the right to request the deletion of your personal information, subject to certain exceptions.

(c) Right to Correct: You have the right to request the correction of inaccurate personal information.

(d) Right to Opt Out of Sale or Sharing: You have the right to opt out of the "sale" or "sharing" of your personal information. As noted above, Peptide Tech does not sell personal information.

(e) Right to Limit Use of Sensitive Personal Information: You have the right to limit the use and disclosure of your sensitive personal information.

(f) Right to Non-Discrimination: We will not discriminate against you for exercising any of your CCPA rights.

7.2 Virginia Residents — VCDPA Rights. If you are a Virginia resident, you have similar rights under the Virginia Consumer Data Protection Act (VCDPA), including the right to access, correct, delete, and obtain a copy of your personal data, and the right to opt out of the processing of your personal data for targeted advertising, sale, or profiling.

7.3 Colorado Residents — CPA Rights. If you are a Colorado resident, you have rights under the Colorado Privacy Act (CPA) similar to those described for California and Virginia residents.

7.4 Connecticut Residents — CTDPA Rights. If you are a Connecticut resident, you have rights under the Connecticut Data Privacy Act (CTDPA) similar to those described above.

7.5 Utah Residents — UCPA Rights. If you are a Utah resident, you have rights under the Utah Consumer Privacy Act (UCPA), including the right to access, delete, and obtain a copy of your personal data.

7.6 Other State Privacy Laws. We comply with all applicable state privacy laws. If your state provides additional privacy rights, we will honor those rights in accordance with applicable law.

7.7 European Economic Area (EEA) / GDPR. If you are located in the European Economic Area, you may have additional rights under the General Data Protection Regulation (GDPR), including:

(a) Right to access your personal data.
(b) Right to rectification of inaccurate data.
(c) Right to erasure ("right to be forgotten").
(d) Right to restriction of processing.
(e) Right to data portability.
(f) Right to object to processing.
(g) Right to withdraw consent.
(h) Right to lodge a complaint with a supervisory authority.

Note: Our Services are primarily directed at businesses and researchers in the United States. If you are located outside the United States, please be aware that your information will be transferred to and processed in the United States.

7.8 Exercising Your Rights. To exercise any of your privacy rights, please contact us at:

Email: legal@peptidetech.co
Mail: Peptide Tech LLC, 1309 Coffeen Ave, Ste 14346, Sheridan, Wyoming 82801

We will verify your identity before processing any request. We will respond to your request within the timeframe required by applicable law (typically 30-45 days).`,
  },

  {
    title: 'SECTION 8 — CHILDREN\'S PRIVACY',
    content: `8.1 Our Services are not directed to individuals under the age of eighteen (18). We do not knowingly collect personal information from children under 18.

8.2 If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information as soon as practicable.

8.3 If you believe that a child under 18 has provided us with personal information, please contact us at legal@peptidetech.co.`,
  },

  {
    title: 'SECTION 9 — INTERNATIONAL DATA TRANSFERS',
    content: `9.1 Our Services are operated from the United States. If you access our Services from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States, where our servers are located.

9.2 By using our Services, you consent to the transfer of your information to the United States and acknowledge that the data protection laws in the United States may differ from those in your country of residence.

9.3 For transfers of personal data from the EEA, UK, or Switzerland, we rely on appropriate legal mechanisms, including Standard Contractual Clauses approved by the European Commission, to ensure adequate protection for your personal data.`,
  },

  {
    title: 'SECTION 10 — THIRD-PARTY LINKS AND SERVICES',
    content: `10.1 Our Platform may contain links to third-party websites, services, or applications that are not operated or controlled by Peptide Tech.

10.2 This Privacy Policy does not apply to third-party websites or services. We are not responsible for the privacy practices of third parties. We encourage you to review the privacy policies of any third-party websites or services that you visit or use.

10.3 The inclusion of a link to a third-party website or service does not imply endorsement or approval by Peptide Tech.`,
  },

  {
    title: 'SECTION 11 — CHANGES TO THIS PRIVACY POLICY',
    content: `11.1 We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.

11.2 When we make material changes to this Privacy Policy, we will:

(a) Update the "Effective Date" at the top of this Privacy Policy.
(b) Post the updated Privacy Policy on our Platform.
(c) Notify you via email or through the Platform of material changes.

11.3 Your continued use of our Services after the posting of a revised Privacy Policy constitutes your acceptance of the revised Privacy Policy.

11.4 We encourage you to review this Privacy Policy periodically to stay informed about how we collect, use, and protect your information.`,
  },

  {
    title: 'SECTION 12 — CONTACT INFORMATION',
    content: `If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:

Peptide Tech LLC
Attn: Privacy Officer
1309 Coffeen Ave, Ste 14346
Sheridan, Wyoming 82801

Email: legal@peptidetech.co
Support Email: support@peptidetech.co
Website: https://peptidetech.co

For privacy-related inquiries, we will respond within thirty (30) days, or within the timeframe required by applicable law.

For California residents, you may also contact the California Attorney General's Office at https://oag.ca.gov/ if you have concerns about our privacy practices.`,
  },
];

// ---------------------------------------------------------------------------
// END USER LICENSE AGREEMENT (EULA)
// ---------------------------------------------------------------------------
export const EULA_SECTIONS: LegalSection[] = [
  {
    title: 'SECTION 1 — LICENSE GRANT',
    content: `Subject to your compliance with this End User License Agreement ("EULA"), ${COMPANY.name} grants you a limited, non-exclusive, non-transferable, revocable license to access and use the WhiteLabel Peptides platform ("Platform") solely for the purpose of managing your merchant account, browsing the product catalog, placing orders, and managing your white-label business operations.

This license does not include the right to:
(a) Modify, adapt, translate, reverse engineer, decompile, or disassemble any portion of the Platform;
(b) Create derivative works based on the Platform or its content;
(c) Use the Platform for any purpose other than its intended business operations;
(d) Sublicense, rent, lease, or lend your access to any third party;
(e) Use automated tools, bots, scrapers, or similar technology to access the Platform.

This license is effective until terminated by either party in accordance with the terms herein.`,
  },
  {
    title: 'SECTION 2 — ACCOUNT RESPONSIBILITIES',
    content: `You are responsible for maintaining the confidentiality of your account credentials, including your username, password, and any API keys associated with your merchant account. You agree to:

(a) Provide accurate and complete information during registration and keep it updated;
(b) Notify us immediately of any unauthorized access to or use of your account;
(c) Accept responsibility for all activities that occur under your account;
(d) Not share your account credentials with unauthorized individuals.

${COMPANY.name} reserves the right to suspend or terminate accounts that violate these responsibilities or that we reasonably believe have been compromised.`,
  },
  {
    title: 'SECTION 3 — INTELLECTUAL PROPERTY',
    content: `All intellectual property rights in the Platform — including but not limited to software, design, text, graphics, logos, icons, images, audio clips, data compilations, and the arrangement thereof — are owned by or licensed to ${COMPANY.name} and are protected by United States and international copyright, trademark, patent, and trade secret laws.

The WhiteLabel Peptides name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of ${COMPANY.name}. You may not use such marks without our prior written permission.

Your use of the Platform does not grant you ownership of any intellectual property rights in the Platform or its content.`,
  },
  {
    title: 'SECTION 4 — RESTRICTIONS ON USE',
    content: `You agree not to use the Platform to:

(a) Violate any applicable federal, state, local, or international law or regulation;
(b) Distribute products for human consumption, veterinary use, or any purpose other than legitimate research;
(c) Make health claims, medical claims, or therapeutic claims about any products available through the Platform;
(d) Engage in fraudulent, deceptive, or misleading business practices;
(e) Infringe upon or violate the intellectual property rights of ${COMPANY.name} or any third party;
(f) Transmit any viruses, malware, or other malicious code;
(g) Attempt to gain unauthorized access to any systems or networks connected to the Platform;
(h) Interfere with or disrupt the integrity or performance of the Platform.

Violation of these restrictions may result in immediate termination of your license and account.`,
  },
  {
    title: 'SECTION 5 — TERMINATION',
    content: `This EULA is effective until terminated. Your rights under this license will terminate automatically without notice if you fail to comply with any of its terms.

${COMPANY.name} may terminate or suspend your access to the Platform at any time, with or without cause, with or without notice, effective immediately. Reasons for termination may include, but are not limited to:

(a) Breach of this EULA or the Terms of Service;
(b) Non-compliance with applicable laws or regulations;
(c) Fraudulent or illegal activity;
(d) Extended period of inactivity;
(e) Request by law enforcement or government agencies.

Upon termination, you must cease all use of the Platform. Sections relating to intellectual property, warranty disclaimers, limitation of liability, and governing law shall survive termination.`,
  },
  {
    title: 'SECTION 6 — WARRANTY DISCLAIMER',
    content: `THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. ${COMPANY.name.toUpperCase()} SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

${COMPANY.name.toUpperCase()} DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, OR THAT ANY DEFECTS WILL BE CORRECTED. NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED FROM ${COMPANY.name.toUpperCase()} OR THROUGH THE PLATFORM SHALL CREATE ANY WARRANTY NOT EXPRESSLY STATED IN THIS EULA.`,
  },
  {
    title: 'SECTION 7 — LIMITATION OF LIABILITY',
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ${COMPANY.name.toUpperCase()}, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:

(a) YOUR ACCESS TO OR USE OF, OR INABILITY TO ACCESS OR USE, THE PLATFORM;
(b) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE PLATFORM;
(c) ANY CONTENT OBTAINED FROM THE PLATFORM;
(d) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.

IN NO EVENT SHALL ${COMPANY.name.toUpperCase()}'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THIS EULA EXCEED THE AMOUNTS PAID BY YOU TO ${COMPANY.name.toUpperCase()} DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.`,
  },
  {
    title: 'SECTION 8 — GOVERNING LAW AND DISPUTE RESOLUTION',
    content: `This EULA shall be governed by and construed in accordance with the laws of the State of ${COMPANY.state}, without regard to its conflict of law principles.

Any dispute arising out of or relating to this EULA shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. The arbitration shall take place in ${COMPANY.state}, and the arbitrator's decision shall be final and binding.

You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. If for any reason a claim proceeds in court rather than in arbitration, you waive any right to a jury trial.

Contact for legal inquiries: ${COMPANY.email}`,
  },
];

// ---------------------------------------------------------------------------
// DISCLAIMER
// ---------------------------------------------------------------------------
export const DISCLAIMER_SECTIONS: LegalSection[] = [
  {
    title: 'RESEARCH USE ONLY',
    content: `All products available through the WhiteLabel Peptides platform and ${COMPANY.name} are intended strictly for research and laboratory use only (RUO). These products are NOT intended for:

• Human consumption or ingestion
• Veterinary use or animal consumption
• Use as drugs, dietary supplements, or food additives
• Any therapeutic, diagnostic, or clinical application
• Any use that would violate applicable federal, state, or local law

Purchasers and end users are solely responsible for ensuring that their use of these products complies with all applicable laws and regulations in their jurisdiction. By purchasing or using products obtained through our platform, you confirm that you understand and will abide by these restrictions.`,
  },
  {
    title: 'NOT MEDICAL ADVICE',
    content: `Nothing on the WhiteLabel Peptides platform — including product descriptions, educational content, blog posts, documentation, or any other materials — should be construed as medical advice, diagnosis, treatment recommendations, or a substitute for professional medical consultation.

The information provided is for educational and informational purposes only and is intended for qualified researchers, laboratory professionals, and business operators in the research supply industry.

If you have questions about health conditions, medical treatments, or the clinical use of any compound, consult a licensed healthcare professional. ${COMPANY.name} is not a healthcare provider and does not provide medical services.`,
  },
  {
    title: 'FDA COMPLIANCE NOTICE',
    content: `The products available through the WhiteLabel Peptides platform have not been evaluated by the U.S. Food and Drug Administration (FDA). These products are not intended to diagnose, treat, cure, or prevent any disease or medical condition.

${COMPANY.name} operates in compliance with applicable FDA regulations governing the sale and distribution of research chemicals and research-use-only compounds. All products are manufactured in cGMP-certified facilities and tested to cGLP standards.

Merchants and resellers using the WhiteLabel Peptides platform are responsible for ensuring that their own marketing materials, product listings, and customer communications comply with FDA and FTC regulations. This includes, but is not limited to:

• Using appropriate "For Research Use Only" labeling
• Avoiding health claims, therapeutic claims, or medical claims
• Including required disclaimers on all product pages
• Not marketing products for human consumption`,
  },
  {
    title: 'NO WARRANTY ON INFORMATION',
    content: `While ${COMPANY.name} strives to provide accurate, current, and complete information on the Platform, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of any information, products, services, or related graphics contained on the Platform.

Information on the Platform may contain technical inaccuracies or typographical errors. ${COMPANY.name} reserves the right to make changes and corrections at any time without notice. Any reliance you place on information from the Platform is strictly at your own risk.

Product specifications, pricing, availability, and other details are subject to change without notice. Always refer to the Certificate of Analysis (COA) for the most accurate product specifications.`,
  },
  {
    title: 'LIMITATION OF LIABILITY',
    content: `TO THE FULLEST EXTENT PERMITTED BY LAW, ${COMPANY.name.toUpperCase()} SHALL NOT BE LIABLE FOR ANY LOSS OR DAMAGE — INCLUDING WITHOUT LIMITATION, INDIRECT OR CONSEQUENTIAL LOSS OR DAMAGE, OR ANY LOSS OR DAMAGE WHATSOEVER ARISING FROM LOSS OF DATA OR PROFITS — ARISING OUT OF, OR IN CONNECTION WITH, THE USE OF THE PLATFORM OR THE PRODUCTS OBTAINED THROUGH THE PLATFORM.

${COMPANY.name.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INJURY, ILLNESS, DAMAGE, OR LOSS RESULTING FROM THE MISUSE, IMPROPER HANDLING, IMPROPER STORAGE, OR UNAUTHORIZED USE OF ANY PRODUCT OBTAINED THROUGH THE PLATFORM.

Users assume all risk associated with the handling, storage, and use of research chemicals and peptides. It is the user's responsibility to follow proper laboratory safety protocols and comply with all institutional safety requirements.`,
  },
  {
    title: 'THIRD-PARTY LINKS AND CONTENT',
    content: `The Platform may contain links to third-party websites, services, or content that are not owned or controlled by ${COMPANY.name}. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services.

The inclusion of any link does not imply endorsement, approval, or recommendation by ${COMPANY.name}. You acknowledge and agree that ${COMPANY.name} shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with the use of or reliance on any third-party content, goods, or services.`,
  },
  {
    title: 'REGULATORY COMPLIANCE',
    content: `${COMPANY.name} is committed to operating in compliance with all applicable federal, state, and local laws and regulations. As a merchant or user of the Platform, you are equally responsible for ensuring your compliance with:

• Federal laws governing the sale and distribution of research chemicals
• State and local regulations regarding business licensing and operations
• FTC regulations regarding advertising and marketing claims
• FDA regulations regarding product labeling and claims
• Any industry-specific regulations applicable to your business

${COMPANY.name} provides compliance guidance and tools through the Platform, but this does not constitute legal advice. We recommend consulting with a qualified attorney to ensure your specific business operations comply with all applicable laws.

For compliance questions, contact: ${COMPANY.supportEmail}`,
  },
  {
    title: 'CHANGES TO THIS DISCLAIMER',
    content: `${COMPANY.name} reserves the right to update or modify this Disclaimer at any time without prior notice. Changes will be effective immediately upon posting to the Platform. Your continued use of the Platform following the posting of changes constitutes your acceptance of such changes.

We encourage you to review this Disclaimer periodically to stay informed of any updates.

This Disclaimer was last updated on ${EFFECTIVE_DATE}.

If you have questions about this Disclaimer, please contact us at ${COMPANY.email}.`,
  },
];

// ---------------------------------------------------------------------------
// Helper: Get all text content (for PDF generation)
// ---------------------------------------------------------------------------
export function getAllTermsText(): string {
  const lines: string[] = [];
  for (const section of TERMS_OF_SERVICE_SECTIONS) {
    lines.push(section.title);
    lines.push('');
    lines.push(section.content);
    lines.push('');
    lines.push('');
  }
  return lines.join('\n');
}

export function getAllPrivacyText(): string {
  const lines: string[] = [];
  for (const section of PRIVACY_POLICY_SECTIONS) {
    lines.push(section.title);
    lines.push('');
    lines.push(section.content);
    lines.push('');
    lines.push('');
  }
  return lines.join('\n');
}

export function getAllLegalText(): string {
  return getAllTermsText() + '\n\n--- PRIVACY POLICY ---\n\n' + getAllPrivacyText();
}
