import { GoogleGenAI } from "@google/genai";
import { CSV_DATA } from "../data";

const KNOWLEDGE_BASE = `
MARKET 2 MINT — FINAL MASTER KNOWLEDGE BASE
Version 5.0

Purpose:
This document is intended for AI retrieval and customer-support assistance inside the Market 2 Mint app experience. It combines Market 2 Mint FAQ content, grading education, service-tier references, up-to-date official company service snapshots, item-format notes, and an expanded glossary. This file includes the official Market 2 Mint service table for pricing, turnaround times, and maximum declared value information.

CRITICAL DATA SOURCE RULE:
When providing information regarding pricing, service options, turnaround times, or max declared value/insurance, you MUST EXCLUSIVELY use the data provided in the "MARKET 2 MINT SERVICE TABLE" section below. You are STRICTLY FORBIDDEN from using external or online information regarding PSA, BGS, CGC, or SGC pricing, services, or turnaround times. If the information is not in the provided table, you must state that you do not have that information and direct the user to contact Market 2 Mint.

SECTION 1 — MARKET 2 MINT CUSTOMER FAQ

1. How can I check the status of my order?
To check the status of a submission, navigate to the Order Status section of the Market 2 Mint website and enter the submission number from the invoice or confirmation email. Once a submission reaches the grading stage, it may also be trackable through the grading company's tracking system. Tracking availability may vary by company and service type.

2. What does "Finalizing" mean?
Finalizing means Market 2 Mint is preparing the completed submission for pickup or return shipment. This usually includes verification, organizing the order, and preparing the cards or items for the next pickup or delivery run.

3. Why is my order taking so long?
Processing times can vary based on the grading company and service level selected. Please contact Market 2 Mint for current status updates or turnaround estimates.

4. Why does my submission seem stuck in one stage?
Grading stages do not always move in fixed intervals. It is common for an order to remain in one stage for a while and then move quickly through several later stages. This is especially common for submissions involving authentication or multiple internal departments.

5. Can an incorrect label be fixed?
Yes. If a grading company mislabels a card, ticket, or other item, a correction request can usually be submitted. This generally applies to submissions originally made through Market 2 Mint.

6. How do I remove Sports Illustrated for Kids cards from a sheet?
Use a straight edge to support the surrounding area, flex the perforation gently several times, and tear slowly along the perforated line. The goal is to preserve natural perforation and avoid edge damage.

7. Why should I pregrade before submitting?
Pregrading helps identify cards with the strongest grading potential, avoid unnecessary grading fees on weaker candidates, and set realistic expectations before submission.

8. Why didn't my card get a 10?
Cards often miss a top grade because of small flaws that are easy to miss without strong lighting or magnification, such as print lines, surface scratches, tiny dents, edge chipping, corner wear, or centering issues.

9. What does "Declared Value" mean?
Declared value is the estimated market value of the item after grading.

10. What is the difference between grading and authentication?
Grading evaluates authenticity plus condition. Authentication confirms legitimacy but does not necessarily assign a numerical condition grade.

11. What is the difference between pack-pulled and aftermarket autographs?
Pack-pulled autographs were signed and inserted by the manufacturer during production. Aftermarket autographs were signed later, usually at an event or private signing.

12. What is dual grading?
Dual grading means both the card and the autograph receive grades or evaluation within the same overall submission flow.

SECTION 2 — CORE GRADING EDUCATION

A. What grading companies look at
Cards are generally evaluated on centering, corners, edges, surface, and overall eye appeal. Tickets, packs, comics, magazines, and memorabilia use similar condition concepts adapted to the item type.

B. Common defects that reduce grades
Common grade-lowering defects include print lines, micro-scratches, dents, dimples, pressure marks, edge chipping, frayed corners, paper loss, stains, roller marks, fingerprints, and centering imbalance.

C. Why modern cards can still grade poorly
Modern cards often use glossy, chrome, foil, refractor, holo, or premium-stock finishes that reveal defects more easily than standard cardboard. A card can come directly from a pack with visible print or surface flaws.

D. Why grades can differ between companies
Each grading company uses its own standards, holder systems, research processes, and internal tolerances. Similar cards can receive different grades at different companies.

E. Should I grade this card?
Grading is most useful for cards or items that are valuable, rare, highly desired, historically important, frequently counterfeited, or central to a collection.

F. Preparing cards for grading
Use clean penny sleeves and semi-rigid holders when appropriate, handle cards by the edges, avoid aggressive cleaning, and package items securely.

SECTION 3 — PSA GRADING SCALE, NO-GRADE CODES, AND QUALIFIERS

PSA scale:
10 = Gem Mint
9 = Mint
8 = Near Mint-Mint
7 = Near Mint
6 = Excellent-Mint
5 = Excellent
4 = Very Good-Excellent
3 = Very Good
2 = Good
1 = Poor

Common PSA no-grade designations:
N1 = Evidence of trimming
N2 = Evidence of restoration
N3 = Evidence of recoloring
N4 = Questionable authenticity
N5 = Altered stock
N6 = Minimum size requirement not met
N7 = Evidence of cleaning
N8 = Miscut
N9 = Ineligible for grading / not suitable for encapsulation / outside holder or issue requirements

Common qualifiers:
OC = Off Center
MC = Miscut
ST = Stain
PD = Print Defect
MK = Marks or writing
OF = Out of Focus

SECTION 4 — CARD ERA DEFINITIONS

General hobby shorthand commonly used by collectors:
Pre-War = before 1945
Vintage = roughly 1945 to 1980
Modern = roughly 1980 to 2000
Ultra-Modern = 2000 to present

Important note for PSA and many submission workflows:
PSA commonly distinguishes modern as 1980-present and vintage as 1979-older for submission-routing purposes. That is why collectors will often see 1979-older and 1980-present used as operational service buckets rather than broad hobby-history labels.

SECTION 5 — CURRENT OFFICIAL SERVICE SNAPSHOT (NO PRICING)

PSA card services:
Value Bulk
Value
Value Plus
Value Max
Regular
Express
Super Express
Walk-Through
Premium+
Reholder

PSA service notes:
- PSA's trading-card service page distinguishes Value Bulk by era using 1980-present OR 1979-older buckets.

BGS card services:
Base
Standard
Express
Priority

CGC card services:
Bulk
Economy
Standard
Express
WalkThrough
Unlimited Value
Jumbo Card
TCG, sports and non-sports coin

CGC add-on / related services:
Pedigree.
CrossOver.
Error designation support for printing errors.
Custom label options.
ReHolder service.

SGC card services:
Standard raw card grading, crossovers, and reviews are offered in a Standard lane and an Expedited lane.

SECTION 6 — ITEM TYPES, DIMENSIONS, HOLDERS, AND ACCEPTANCE NOTES

Common graded item categories:
- Trading cards
- Sports cards
- TCG cards
- Non-sports cards
- Unopened packs
- Event tickets
- Comic books
- Magazines
- Memorabilia
- Autographs
- Photos / documents / oversized encapsulation items (company-specific)

Standard trading-card size:
2.5 x 3.5 inches (63.5 mm x 88.9 mm)

PSA holder notes:
- PSA states standard trading-card size is 2.5 x 3.5 x 0.04 inches, with 40pt max thickness for its standard-size holder format.
- Cards from 25pt to 40pt may use the thinner new thick-card holder style; cards above 40pt go into PSA's thick slabs.
- PSA says holder choice is determined by PSA based on the safest fit.

BGS size note:
- Beckett's submission form states it accepts and grades most licensed cards up to 8.5 x 11 inches, with additional fees applying to items larger than 3 x 5 inches.

CGC size notes:
- CGC has explicit Jumbo Card and coin-sized add-on handling categories in its current service matrix.
- CGC also offers CrossOver and ReHolder workflows.

PSA oversized / jumbo-holder note:
- PSA launched jumbo holders with outer dimensions 9.73 x 13.21 x 0.322 inches and insert sizes including 8.5 x 11, 8.5 x 10.5, 7.5 x 9.5, and 6.25 x 8.25 inches.

General thickness shorthand used by collectors:
- Standard cards: often discussed as up to about 35-55pt.
- Premium / thick cards: often discussed around 55-130pt.
- Ultra-thick cards: above that range may require special holders or may be ineligible depending on the company and item.

SECTION 7 — SUBMISSION AND SERVICE-TYPE DEFINITIONS

Card Grade Only:
The card receives condition evaluation and encapsulation without autograph grading.

Authenticate Only:
The item is checked for authenticity without receiving a numerical card grade.

Autograph Grade Only:
The autograph receives evaluation without full card-condition grading.

Card & Autograph Grade / Dual:
Both the card and autograph are evaluated in the same overall service flow.

Crossover:
A card already inside another grading company's holder is submitted to a new grading company for evaluation, usually with a minimum-grade or cross-at-any-grade option.

Review:
A previously graded card is resubmitted to the same company for possible upgrade or reassessment.

Reholder / ReHolder:
The item is placed into a new holder while the assigned grade remains the same unless the company identifies another issue requiring conversion or correction.

Quick Opinion / Quick Review:
A preliminary expert opinion service, often used for autograph likelihood or early submission guidance, but not the same as a final full certification.

SECTION 8 — TCG, SPORTS, AND COLLECTOR EDUCATION

Pokémon TCG:
A large global TCG with highly collectible modern and vintage eras. Common collector terms include holo, reverse holo, full art, alternate art, illustration rare, secret rare, promo, and pack-fresh.

Magic: The Gathering:
A strategy-heavy TCG with many collectible categories including alpha/beta, reserved-list interest, foils, etched foils, serialized cards, showcase cards, and specialty printings.

One Piece Card Game:
A modern TCG based on the manga/anime franchise. Common questions include rarity levels, manga cards, parallels, pack condition, and surface sensitivity.

Sports cards:
Often organized by rookie-card status, flagship issues, chrome issues, refractors, autographs, memorabilia, serial-numbered parallels, and set popularity. Collector questions often focus on rookie importance, patch authenticity language, and print-run scarcity.

Non-sports cards:
Can include entertainment, comic, historical, gaming, and pop-culture issues. Surface sensitivity and print-line frequency can vary dramatically by product and manufacturer.

SECTION 9 — GLOSSARY APPENDIX

The following glossary appendix is derived from the user's uploaded glossary resource and is included to expand retrieval coverage for hobby terms, acronyms, collecting slang, and submission language.

Term,Definition
1/1,"A unique, one-of-a-kind card, often serial numbered as /1; highly valuable due to scarcity."
3-D Card,"A card designed to appear three-dimensional when viewed or tilted, common in sets like
Kellogg's or Sportflics."
Acetate,"A clear, transparent plastic card stock used instead of traditional paper or cardboard,
often seen in premium inserts."
Aftermarket,"A signature added to a trading card or collectible by the signer after its initial
release and distribution (not pack-pulled)."
Aggro,"In TCGs like Magic: The Gathering, a fast-paced deck strategy focused on early aggression and
quick wins."
Airbrush,"A technique to alter a card's photo (e.g., changing team logos/colors) before official
photos are available."
All-Star Card,"A card featuring players selected for an All-Star game, often as inserts or subsets
in major sets."
Altered,"A card intentionally modified (e.g., trimmed, recolored, or restored) to improve appearance
or deceive buyers; considered fraudulent in the hobby."
American Card Catalog (ACC),"The foundational catalog by Jefferson Burdick classifying all known
trading cards; used for historical reference."
Artist Proof,"A limited parallel card, often with unique markings, originally popularized by
Pinnacle in the 1990s."
AU / AUTO,"Abbreviation for autographed or autograph card featuring a genuine signature."
Authenticate Only,"A submission option where an item (e.g., card, autograph, or memorabilia) is
evaluated strictly for authenticity, without a numerical condition grade."
Authentication,"The process of verifying the legitimacy of a card, autograph, or memorabilia item,
typically by third-party services like PSA/DNA or Beckett."
Autographed,"Refers to a trading card, memorabilia item, or collectible bearing the signature of a
player, celebrity, or notable figure."
Autograph Quick Opinion,"A preliminary assessment by an authentication company on whether a
signature appears likely genuine, without full in-depth authentication."
Auto Grade Only,"A submission option where a card or collectible is evaluated and graded solely for
the autograph quality, without grading the card's condition."
Basic Cleaning,"A service for video collectibles (e.g., DVDs, Blu-rays, VHS) involving cleaning and
inspection to remove minor dirt and improve presentation."
BCCG,"Beckett Collectors Club Grading; an affordable, often more lenient grading service for modern
cards."
BGS,"Beckett Grading Services; a leading grading company known for sub-grades (centering, corners,
edges, surface) on a 10-point scale."
Binder,"A protective album or folder used to store and organize trading cards, often with plastic
sleeves."
BIN / OBO,"Buy It Now (fixed price) or Or Best Offer; common eBay/auction listing formats."
Black Box,"A premium, limited gift box distributed by Panini to industry insiders or high-volume
buyers, often containing exclusive cards."
Blank Back,"A card with no printing on the reverse side, either intentional or as a manufacturing
error."
Blaster Box,"A retail product box containing 4–10 packs, typically sold at big-box stores with
exclusive or bonus content."
Blister Pack,"Retail packaging with cards sealed in a plastic bubble on cardboard backing, often
including extras."
Book Card,"A hinged, book-style card containing multiple panels, frequently with autographs or
memorabilia."
Book Value (BV),"Estimated value from traditional price guides; largely outdated—use recent sold
comps instead."
Booklet Card,"Synonym for book card; multi-panel folded card often featuring memorabilia or
signatures."
Booster Pack,"A sealed pack of additional cards (typically 8–15) used to expand a TCG collection or
deck."
Border,"The colored or white frame around a card's image; critical for grading centering."
Bowman,"A Topps brand specializing in prospect and rookie cards, especially in baseball."
Box Break,"The act of opening a sealed box; also refers to the expected hits per box."
Box-Topper,"A bonus card or item (e.g., oversized or exclusive) included inside the sealed box."
Breaker,"A seller who purchases sealed products, opens them live (often streamed), and sells singles
by player or team."
Brick,"A bundled stack of 50 or more identical cards, common in older wholesale lots."
Business Days,"Standard working days (Monday–Friday, excluding holidays) used for calculating
turnaround times in grading and shipping."
BVG,"Beckett Vintage Grading; specialized service for pre-1981 cards."
Buyback,"A card repurchased by the manufacturer and re-inserted (often signed/numbered); or a
raffle-style promotion."
Cabinet Card,"Oversized vintage card (typically 5x7 to 8x10 inches) from early tobacco-era issues."
Card & Autograph Grade,"A submission option where both the card's physical condition and the
autograph's authenticity/quality are evaluated and graded."
Card Grade Only,"A submission option where a card is graded solely for condition, without autograph
authentication or memorabilia verification."
Card Stock,"The material used to print the card (e.g., cardboard, acetate, metal, or plastic)."
Case,"A master shipping unit containing multiple boxes (quantity varies by product)."
Case Hit,"A rare, high-value card guaranteed to appear once per case."
CCG,"Collectible Card Game; an older term for TCG, emphasizing collection over gameplay."
Cello Pack,"Sealed retail pack wrapped in cellophane, popular in 1970s–1990s products."
Centering,"The evenness of borders around the image; measured as ratios (e.g., 50/50 is perfect)."
Certificate of Authenticity (COA),"Official document verifying an item's genuineness, often
accompanying autographs or relics."
CGC,"Certified Guaranty Company; originally for comics, now grades trading cards, memorabilia, and
more."
Chase Card,"A highly sought-after, limited card that collectors actively pursue."
Checklist (CL),"A list of all cards in a set or product, sometimes printed as a card itself."
Chipping,"Damage along edges showing fraying or layering of the card stock."
Chrome,"A popular metallic, shiny finish on cards (e.g., Topps Chrome, Donruss Optic)."
Clubhouse Signature,"A signature obtained by clubhouse staff (not the athlete), often considered
less desirable."
Collation,"The arrangement and insertion sequence of cards into packs/boxes."
Comics & Magazines,"Serialized publications (comics) or periodicals (magazines) featuring stories,
art, or pop culture; collectible for vintage issues or covers."
Common,"A non-star, low-value base card from a set."
Comps,"Comparable sold listings (e.g., on eBay) used to determine current market value."
Condition,"Overall physical state of a card, evaluated by corners, edges, surface, and centering."
Counterfeit,"A fraudulent reproduction made to imitate a genuine card."
Crossover,"Submitting a slabbed card from one grading company to another for a new grade, without
removing it from the original holder."
Cut Signature,"An authentic signature cut from a document or photo and embedded into a modern card."
Dealer,"A person or business that buys and sells cards/memorabilia as a primary income source."
Diamond Cut,"A manufacturing cut error causing slanted or misaligned edges/images."
Die Cut (DC),"A card intentionally cut into a non-rectangular shape during production."
Ding,"Minor damage or dent, especially to a corner."
Doctored,"A card that has been altered or restored in a way that misrepresents its original
condition, often undetected without expertise."
Donruss,"A Panini brand known for Rated Rookies and classic designs since 1981."
Donruss Optic,"The chrome-finished parallel version of Donruss sets."
eBay 1/1,"Misleading term for a unique eBay listing; not a true serial-numbered 1/1 card."
Encapsulated,"A card sealed in a protective plastic holder (slab) after grading."
Error (ERR),"A manufacturing mistake on a card (e.g., wrong photo, stats, or text)."
Event Tickets,"Physical passes granting access to events (e.g., sports, concerts); often graded or
collected."
Event Worn,"Memorabilia from a non-game event (e.g., photo shoot or practice), less valuable than
game-used."
EX,"Excellent condition (typically PSA grade 5)."
EX-MT,"Excellent-Mint condition (typically PSA grade 6)."
Extended Rookie Card (XRC),"A player's rookie-era card from an update/traded set, not the primary
RC."
Facsimile,"A printed or stamped replica signature, not authentic."
Factory Set,"A complete base set packaged and sold directly by the manufacturer, often with extras."
Fine 9,"A BGS-graded card with all four sub-grades at 9 or higher."
Fleer,"Historic trading card brand (1980s–1990s), known for challenging Topps' monopoly and iconic
sets like 1986 Fleer (Michael Jordan RC)."
Flip,"The removable label inside a graded slab with card details."
Foil,"Metallic or shiny texture on cards; prone to scratching."
FOMO,"Fear Of Missing Out; the anxiety driving impulse buys during hype."
Full Art,"A TCG card where the artwork extends across the entire surface, often rarer and more
visually striking."
Full Bleed,"Card design extending to the edges with no borders."
Game Used (GU),"A relic card containing material actually used in a professional game."
Gem Mint (GEM-MT),"Near-perfect condition (PSA 9.5–10 or BGS 9.5–10); pristine with no visible
flaws."
Glossy,"A shiny finish layer, often on premium parallels or sets."
Grade,"Numerical assessment of condition on a 1–10 scale by grading companies."
Graded,"A card professionally evaluated, authenticated, and encased by a third-party service."
Group Break,"A shared box break where participants claim specific teams/players."
Gum Card,"Vintage card originally issued with chewing gum in the pack."
Gum Stain,"Discoloration or residue from gum in vintage wax packs."
Heavy Cleaning,"Intensive deep cleaning and minor restoration for video collectibles (e.g., DVDs,
VHS) to improve condition."
High End,"Premium products with low print runs, heavy autographs, and relics."
High Numbers,"Cards from the later series of a set, often printed in smaller quantities."
Hit,"A desirable pull from a pack (e.g., autograph, relic, or numbered parallel)."
Hobby,"Product format sold exclusively through card shops and hobby distributors."
Hobby Box,"A sealed box distributed to hobby shops, typically with better odds for hits than retail
versions."
Holo,"Short for holographic; a shiny, reflective parallel variant common in TCGs and sports cards."
Insert,"Non-base card (e.g., parallel, autograph, relic) inserted at lower odds."
JSA,"James Spence Authentication; a leading autograph authentication service for sports memorabilia
and cards."
Ludex,"A popular card scanning and valuation app with glossary features."
M2M,"Market 2 Mint; a professional grading submission and pregrading company."
Manufactured Relic (MANU),"Relic material created specifically for cards, not game-worn."
Master Set,"A complete collection including base set, parallels, inserts, and variations."
MEM,"Abbreviation for memorabilia card (contains a relic piece)."
Memorabilia,"Collectible items tied to people, events, or moments (e.g., game-used jerseys, movie
props); holds historical or financial value."
Mint (M),"High-grade condition (typically PSA 9); excellent with minor imperfections allowed."
Movies & Videos,"Collectibles like DVDs, VHS tapes, promotional reels, or signed clips from
films/shows."
NM,"Near Mint condition (typically PSA 7); light wear visible."
NM-MT,"Near Mint-Mint condition (typically PSA 8); very minor flaws."
Notching,"Indents or cuts along edges, often from storage (e.g., rubber bands)."
N1 (Trimming),"PSA qualifier: Card shows evidence of trimming; results in ""No Grade"" or
qualifier."
N2 (Restoration),"PSA qualifier: Card has restoration work; results in ""No Grade."""
N3 (Recoloring),"PSA qualifier: Card has recoloring; results in ""No Grade."""
N4 (Questionable Authenticity),"PSA qualifier: Authenticity issues; results in ""No Grade."""
N5 (Altered Stock),"PSA qualifier: Card stock altered; results in ""No Grade."""
N6 (Size Requirement),"PSA qualifier: Does not meet minimum size; results in ""No Grade."""
N7 (Cleaning),"PSA qualifier: Excessive cleaning; results in ""No Grade."""
N8 (Miscut),"PSA qualifier: Severe manufacturer miscut; results in ""No Grade."""
N9 (Don't Grade),"PSA qualifier: Obscure issue, oversized, or ineligible for encapsulation; results
in ""No Grade."""
On-Card Auto,"An autograph signed directly on the card surface, preferred over sticker autos for
authenticity feel."
One Piece TCG,"Popular TCG based on the One Piece manga/anime, featuring keywords like Rush,
Blocker, and Double Attack."
Pack-pulled,"An autograph officially inserted into a sealed pack by the manufacturer (hand-signed
and pack-inserted)."
Parallel,"A variant of a base card with different colors, foil, or numbering."
Patch,"A larger, desirable piece of jersey or equipment in a memorabilia card."
Personal Collection (PC),"A collector's private holdings, often focused on favorites and not
intended for sale or trade."
Player Collecting,"Strategy of focusing on all cards of a single athlete, including rookies,
parallels, and memorabilia."
Pokémon TCG,"Trading Card Game featuring Pokémon; terms include Ability, Energy Card, and EX/GX/V
cards."
Population Report,"A grading company's report showing how many cards of a specific type have been
graded at each level."
PR,"Poor condition (typically PSA 1); heavily damaged."
Pregrading,"Evaluating a card's condition before professional submission to estimate grade and
decide if worth grading fees."
Pressing,"Professional service to flatten creases/bends in comics to improve appearance and
potential grade."
PSA,"Professional Sports Authenticator; the most widely recognized grading company for cards,
memorabilia, and more."
Rainbow,"Collecting every parallel/version of a specific base card."
Raw,"An ungraded, uncertified card in its natural state, without a slab."
RC,"Rookie Card; a player's first major licensed card."
Redemption Card,"A placeholder card that can be redeemed with the manufacturer for a special item,
like an autograph or relic."
Refractor,"A shiny, prism-like parallel finish (e.g., Topps Chrome Refractors)."
Reholder,"Service to place a previously graded card into a new slab without changing the grade
(unless holder damage affected card)."
Relic,"A card containing an embedded piece of game-used or player-worn material."
Retail,"Product format sold at big-box stores (often with different odds/packs)."
Rookie Card (RC),"Officially recognized first card of a player in a major licensed set."
Secret Rare,"A TCG card rarer than the set's standard numbering, often with unique artwork or
foiling."
Serial Numbered (SN),"A card with a printed limitation (e.g., /99, /25)."
Short Print (SP),"A card printed in lower quantities than standard base cards."
Slab Cracking,"Carefully opening a graded slab to remove the card; risks damage and voids original
grade."
Slab,"The protective plastic case used for graded cards."
Soft Corner,"Slightly rounded or frayed corner from wear or poor storage."
SGC,"Sportscard Guaranty Corporation; specializes in trading cards, especially vintage and high-end
sports."
SSP,"Super Short Print; extremely limited production."
Sticker Auto,"An autograph signed on a sticker and then affixed to the card, common in modern sets
for efficiency."
T.C.G.,"Abbreviation for Topps Chewing Gum Company, the original name of the Topps brand."
TCG,"Trading Card Game (e.g., Pokémon, Magic: The Gathering, One Piece, Yu-Gi-Oh!)."
Team Card,"A card featuring an entire team photo, often included in base sets."
The Hobby,"Common term for the entire sports/trading card collecting community and market."
Tiffany,"A glossy, premium parallel set (e.g., Topps Tiffany factory sets)."
Topps,"Leading trading card manufacturer, known for flagship baseball sets, Chrome, and Bowman
products."
Traded Set,"Update series featuring players in new teams/uniforms after trades."
UER,"Uncorrected Error; a mistake that was never fixed in production."
Unopened Packs,"Sealed packs of trading cards untouched since leaving the manufacturer; often graded
for wrapper condition."
Upcharge,"Additional fee when post-grading assessed value exceeds declared level; can be declined,
but original fees apply (often beneficial)."
VAR,"Variation; a card with minor differences (e.g., photo, text) from the standard."
Vending Box,"Sealed box intended for vending machines, often containing complete sets."
Vintage,"Generally cards from pre-1980s (or pre-1970s); subjective cutoff."
Want List,"A collector's curated list of desired cards or items to acquire."
Wardrobe Card,"Memorabilia card with fabric from costumes (e.g., non-sports/TV/movie)."
Warping,"Bending or distortion in cards, often due to humidity or manufacturing issues in chrome
stocks."
Wax Pack,"Traditional sealed pack wrapped in wax paper, common in vintage products."
Whale,"A high-volume spender or top customer at a shop/breaker."
White Whale,"A rare, elusive card long sought by a collector."
XRC,"Extended Rookie Card; from update or secondary sets."
Young Guns,"Upper Deck's signature hockey rookie subset."

SECTION 10 — MARKET 2 MINT SERVICE-LOGIC APPENDIX (PRICES REMOVED)

The following appendix is derived from the user's uploaded service-menu decision tree. Pricing, turnaround times, and maximum-value references have been removed. The raw logic text is preserved as an additional retrieval layer for service names and option combinations. Because the original source was exported from a sheet PDF, formatting is compact and not always human-perfect, but it is useful for AI retrieval.

DECISION TREE (Left to Right)Ignore all cells with an "X" and move to the next cell to the right
insteadRecommended Service NamesQuestion 1 Question 2 Question 3 Question 4 Question 5 Final Options
to DisplayPregrading (2000 - Newer Only)X X X 2000 - Newer OnlyM2M Pregrading (2000 - Newer
Only)[price omitted] [price omitted]Trading Cards PSA No X Card Grade OnlyPSA Value Bulk (1980 -
Newer)[price omitted] [price omitted]Trading Cards PSA Yes Pack-pulled Card Grade OnlyPSA Value
Bulk (1980 - Newer)[price omitted] [price omitted]Trading Cards PSA No X Card Grade OnlyPSA
Value (1980 - Newer)[price omitted] [price omitted]Trading Cards PSA Yes Pack-pulled Card Grade
OnlyPSA Value (1980 - Newer)[price omitted] [price omitted]Trading Cards PSA No X Authenticate
OnlyPSA Value (Auth Only)[price omitted] [price omitted]Trading Cards PSA Yes Pack-pulled
Authenticate OnlyPSA Value (Auth Only)[price omitted] [price omitted]Trading Cards PSA Yes Pack-
PulledCard & Autograph GradePSA Value (Dual)[price omitted] [price omitted]Trading Cards PSA Yes
AftermarketCard & Autograph GradePSA Value (Dual)[price omitted] [price omitted]Trading Cards PSA
Yes Pack-pulled Auto Only PSA Value (Auth Only)[price omitted] [price omitted]Trading Cards PSA
Yes Aftermarket Auto Only PSA Value (Auth Only)[price omitted] [price omitted]Trading Cards PSA
No X Card Grade OnlyPSA Vintage (1979 - Older)[price omitted] [price omitted]Trading Cards PSA No
X Authenticate OnlyPSA Vintage (1979 - Older) (Auth Only)[price omitted] [price omitted]Trading
Cards PSA Yes AftermarketCard & Autograph GradePSA Vintage (1979 - Older) (Dual)[price omitted]
[price omitted]Trading Cards PSA Yes Aftermarket Auto OnlyPSA Vintage (1979 - Older) (Auto
Only)[price omitted] [price omitted]Trading Cards PSA Yes Aftermarket Authenticate OnlyPSA
Vintage (1979 - Older) (Auth Only)[price omitted] [price omitted]Trading Cards PSA Yes Pack-
pulled Card Grade OnlyPSA Value Plus[price omitted] [price omitted]Trading Cards PSA No X Card
Grade OnlyPSA Value Plus[price omitted] [price omitted]Trading Cards PSA Yes Pack-pulled
Authenticate OnlyPSA Value Plus (Auth)[price omitted] [price omitted]Trading Cards PSA No X
Authenticate OnlyPSA Value Plus (Auth)[price omitted] [price omitted]Trading Cards PSA Yes Pack-
pulledCard & Autograph GradePSA Value Plus (Dual)[price omitted] [price omitted]Trading Cards PSA
Yes Pack-pulledAutograph Grade OnlyPSA Value Plus (Auto)[price omitted] [price omitted]Trading
Cards PSA Yes Pack-pulled Authenticate OnlyPSA Value Plus (Auth)[price omitted] [price
omitted]Trading Cards PSA Yes AftermarketCard & Autograph GradePSA Value Plus (Dual)[price omitted]
[price omitted]Trading Cards PSA Yes AftermarketAutograph Grade OnlyPSA Value Plus (Auto)[price
omitted] [price omitted]Trading Cards PSA Yes Aftermarket Authenticate OnlyPSA Value Plus
(Auth)[price omitted] [price omitted]Trading Cards PSA Yes Pack-pulledCard & Autograph GradePSA
Value Max (Dual)[price omitted] [price omitted]Trading Cards PSA Yes Pack-pulledAutograph Grade
OnlyPSA Value Max (Auto)[price omitted] [price omitted]Trading Cards PSA Yes Pack-pulled
Authenticate OnlyPSA Value Max (Auth)[price omitted] [price omitted]Trading Cards PSA Yes
AftermarketCard & Autograph GradePSA Value Max (Dual)[price omitted] [price omitted]Trading Cards
PSA Yes AftermarketAutograph Grade OnlyPSA Value Max (Auto)[price omitted] [price omitted]Trading
Cards PSA Yes Aftermarket Authenticate OnlyPSA Value Max (Auth)[price omitted] [price
omitted]Trading Cards PSA Yes Pack-pulled Card Grade OnlyPSA Regular [price omitted] [price
omitted]Trading Cards PSA No X Card Grade OnlyPSA Regular [price omitted] [price omitted]Trading
Cards PSA Yes Pack-pulled Authenticate OnlyPSA Regular (Auth)[price omitted] [price
omitted]Trading Cards PSA No X Authenticate OnlyPSA Regular (Auth)[price omitted] [price
omitted]Trading Cards PSA Yes Pack-pulledCard & Autograph GradePSA Regular (Dual)[price omitted]
[price omitted]Trading Cards PSA Yes Pack-pulledAutograph Grade OnlyPSA Regular (Auto)[price
omitted] [price omitted]Trading Cards PSA Yes Pack-pulled Authenticate OnlyPSA Regular
(Auth)[price omitted] [price omitted]Trading Cards PSA Yes AftermarketCard & Autograph GradePSA
Regular (Dual)[price omitted] [price omitted]Trading Cards PSA Yes AftermarketAutograph Grade
OnlyPSA Regular (Auto)[price omitted] [price omitted]Trading Cards PSA Yes Aftermarket
Authenticate OnlyPSA Regular (Auth)[price omitted] [price omitted]Trading Cards PSA Yes Pack-
pulled Card Grade OnlyPSA Express [price omitted] [price omitted]Trading Cards PSA No X Card
Grade OnlyPSA Express [price omitted] [price omitted]Trading Cards PSA Yes Pack-pulled
Authenticate OnlyPSA Express (Auth)[price omitted] [price omitted]Trading Cards PSA No X
Authenticate OnlyPSA Express (Auth)[price omitted] [price omitted]Trading Cards PSA Yes Pack-
pulledCard & Autograph GradePSA Express (Dual)[price omitted] [price omitted]Trading Cards PSA
Yes Pack-pulledAutograph Grade OnlyPSA Express (Auto)[price omitted] [price omitted]Trading Cards
PSA Yes Pack-pulled Authenticate OnlyPSA Express (Auth)[price omitted] [price omitted]Trading
Cards PSA Yes AftermarketCard & Autograph GradePSA Express (Dual)[price omitted] [price
omitted]Trading Cards PSA Yes AftermarketAutograph Grade OnlyPSA Express (Auto)[price omitted]
[price omitted]Trading Cards PSA Yes Aftermarket Authenticate OnlyPSA Express (Auth)[price omitted]
[price omitted]Trading Cards PSA Yes Pack-pulled Card Grade OnlyPSA Super Express[price omitted]
[price omitted]Trading Cards PSA No X Card Grade OnlyPSA Super Express[price omitted] [price
omitted]Trading Cards PSA Yes Pack-pulled Authenticate OnlyPSA Super Express (Auth)[price omitted]
[price omitted]Trading Cards PSA No X Authenticate OnlyPSA Super Express (Auth)[price omitted]
[price omitted]Trading Cards BGS No X X BGS Base [price omitted] [price omitted]Trading Cards BGS
Yes Pack-pulled X BGS Base w/Auto[price omitted] [price omitted]Trading Cards BGS No X X BGS
Standard[price omitted] [price omitted]Trading Cards BGS Yes Pack-pulled X BGS Standard
w/Auto[price omitted] [price omitted] Trading Cards BGS No X X BGS Express [price omitted]
[price omitted]Trading Cards BGS Yes Pack-pulled X BGS Express w/Auto[price omitted] [price
omitted]Trading Cards CGC No X X CGC Economy[price omitted] [price omitted]Trading Cards CGC Yes
Pack-pulled X CGC Economy w/Auto[price omitted] [price omitted]Trading Cards CGC No X X CGC
Standard[price omitted] [price omitted]Trading Cards CGC Yes Pack-pulled X CGC Standard
w/Auto[price omitted] [price omitted]Trading Cards CGC No X X CGC Express[price omitted]
[price omitted]Trading Cards CGC Yes Pack-pulled X CGC Express w/Auto[price omitted] [price
omitted]Trading Cards SGC No X X SGC <1500 [price omitted] [price omitted]Trading Cards SGC Yes
Pack-pulled X SGC <1500 w/Auto[price omitted] [price omitted]Trading Cards SGC No X X SGC <3500
[price omitted] [price omitted]Trading Cards SGC Yes Pack-pulled X SGC <3500 w/Auto[price
omitted] [price omitted]Trading Cards SGC No X X SGC <7500 [price omitted] [price
omitted]Trading Cards SGC Yes Pack-pulled X SGC <7500 w/Auto[price omitted] [price
omitted]Autograph Quick OpinionX X X X BGS Auto Quick Opinion[price omitted] Not
applicableMemorabilia JSA X X X JSA Memorabilia Certification[price omitted] Not
applicableMemorabilia PSA X X X PSA/DNA Memorabilia Certification[price omitted] Not
applicableSlab Cracking X X X X M2M Slab Cracking Service[price omitted] [price omitted]Slab
Cracking X X X X M2M Slab Cracking Service[price omitted] [price omitted]Slab Cracking X X X X M2M
Slab Cracking Service[price omitted] [price omitted]Crossover PSA No X Card Grade OnlyPSA
Crossover Plus[price omitted] [price omitted]Crossover PSA Yes Pack-pulledCard & Autograph
GradePSA Crossover Plus (Dual)[price omitted] [price omitted]Crossover PSA Yes Pack-
pulledAutograph Grade OnlyPSA Crossover Plus (Auto)[price omitted] [price omitted]Crossover PSA
Yes Pack-pulled Authenticate OnlyPSA Crossover Plus (Auth)[price omitted] [price
omitted]Crossover PSA No X Card Grade OnlyPSA Crossover Express[price omitted] [price
omitted]Crossover PSA Yes Pack-pulledCard & Autograph GradePSA Crossover Express (Dual)[price
omitted] [price omitted]Crossover PSA Yes Pack-pulledAutograph Grade OnlyPSA Crossover Express
(Auto)[price omitted] [price omitted]Crossover PSA Yes Pack-pulled Authenticate OnlyPSA Crossover
Express (Auth)[price omitted] [price omitted]Crossover BGS No X Card Grade OnlyBGS Crossover
Standard[price omitted] Not applicableCrossover BGS Yes Pack-pulled Card Grade OnlyBGS Crossover
Standard[price omitted] Not applicableReholder PSA X X X PSA Reholder <[price omitted][price
omitted] [price omitted]Reholder PSA X X X PSA Reholder <[price omitted][price omitted] [price
omitted]Reholder PSA X X X PSA Reholder <[price omitted][price omitted] [price omitted]Reholder
BGS X X X BGS Reholder[price omitted] Not applicableReholder CGC X X X CGC Reholder[price
omitted] Not applicableEvent Tickets BGS No X Ticket Grade BGS Ticket [price omitted] [price
omitted]Event Tickets BGS No X Authenticate OnlyBGS Ticket (Auth)[price omitted] [price
omitted]Event Tickets BGS Yes Pack-pulledTicket Grade & Auto AuthenticationBGS Ticket w/Auto[price
omitted] [price omitted]Event Tickets BGS Yes AftermarketTicket Grade & Auto AuthenticationBGS
Ticket w/Auto[price omitted] [price omitted]Event Tickets BGS Yes Pack-pulled Authenticate
OnlyBGS Ticket w/Auto (Auth)[price omitted] [price omitted]Event Tickets BGS Yes Aftermarket
Authenticate OnlyBGS Ticket w/Auto (Auth)[price omitted] [price omitted]Event Tickets BGS No X
Ticket Grade BGS Ticket Standard[price omitted] [price omitted]Event Tickets BGS No X
Authenticate OnlyBGS Ticket Standard (Auth)[price omitted] [price omitted]Event Tickets BGS Yes
Pack-pulledTicket Grade & Auto AuthenticationBGS Ticket Standard w/Auto[price omitted] [price
omitted]Event Tickets BGS Yes AftermarketTicket Grade & Auto AuthenticationBGS Ticket Standard
w/Auto[price omitted] [price omitted]Event Tickets BGS Yes Pack-pulled Authenticate OnlyBGS
Ticket Standard w/Auto (Auth)[price omitted] [price omitted]Event Tickets BGS Yes Aftermarket
Authenticate OnlyBGS Ticket Standard w/Auto (Auth)[price omitted] [price omitted]Unopened Packs
PSA No X X PSA Economy Pack[price omitted] [price omitted]Unopened Packs PSA No X X PSA Express
Pack[price omitted] [price omitted]Movies & Videos CGC X X Grade Item CGC Movies & Videos[price
omitted] [price omitted]Movies & Videos CGC X X Grade + Basic CleaningCGC Movies & Videos[price
omitted] [price omitted]Movies & Videos CGC X X Grade + Heavy CleaningCGC Movies & Videos[price
omitted] [price omitted]Comics & MagazinesPSA No X Grade Item 1975 - Newer [price omitted]
[price omitted]Comics & MagazinesPSA No X Authenticate Item Only1975 - Newer (Auth)[price omitted]
[price omitted]Comics & MagazinesPSA Yes X Grade Item & Auth Auto1975 - Newer [price omitted]
[price omitted]Comics & MagazinesPSA No X Grade Item 1974 - Older [price omitted] [price
omitted]Comics & MagazinesPSA No X Authenticate Item Only1974 - Older (Auth)[price omitted]
[price omitted]Comics & MagazinesPSA No X Grade Item + Pressing1974 - Older [price omitted]
[price omitted]Comics & MagazinesPSA No X Grade Item High Value (All Era's)[price omitted] [price
omitted]Comics & MagazinesPSA No X Grade + PressingHigh Value (All Era's)[price omitted] [price
omitted]Comics & MagazinesPSA Yes X Grade + Auto AuthenticationHigh Value (All Era's)[price omitted]
[price omitted]Comics & MagazinesPSA Yes X Grade + Auto Auth + PressingHigh Value (All
Era's)[price omitted] [price omitted]Comics & MagazinesPSA No X Grade Item Super Express (All
Era's)[price omitted] [price omitted]Comics & MagazinesPSA No X Grade Item Walk-Through (All
Era's)[price omitted] [price omitted]
`;

const SYSTEM_PROMPT = `
You are the Market 2 Mint Hobby Reference Assistant (Knowledge Base v5.0).

Your primary role is to serve as a comprehensive reference tool for the collecting hobby overall. You provide expert information on:
- Industry definitions, terminology, and hobby acronyms
- Grading education and condition evaluation concepts
- Card eras (Vintage, Modern, Ultra-Modern) and their significance
- Autograph types (Pack-pulled vs. Aftermarket)
- Grading company standards and holder specifications (PSA, BGS, SGC, CGC)
- Item types including packs, tickets, comics, magazines, and memorabilia
- General Market 2 Mint process information

Important Context:
You are a reference and educational tool. You are NOT a "parsing tool" for submissions. Your goal is to help collectors understand the industry and make informed decisions about their collections.

Rules:
1. Use the uploaded Market 2 Mint master knowledge base (Version 5.0) and the Service Table as your primary sources.
2. Prefer answers found directly in the knowledge base over improvisation.
3. Pricing, service details, turnaround times, and max declared value/insurance information MUST ALWAYS come from the provided Market 2 Mint Service Table. Do NOT use external data for PSA, BGS, CGC, or SGC.
4. If a user asks about a service name such as Value Plus, explain the service level and any relevant details available in the knowledge base or service table.
5. If a user asks what "vintage" means, explain both the broad hobby meaning and the operational submission-routing meaning when both are present.
6. If a user asks about no-grade designations like N6, explain the code clearly and briefly.
7. If a user asks why a card missed a top grade, explain the most common legitimate defects and grading factors.
8. If the answer is not contained in the knowledge base or service table, respond exactly:
   "Please contact Market 2 Mint for assistance with that question."
9. Keep answers concise, factual, and customer-friendly.
10. Do not suggest repair, restoration, alteration, trimming, recoloring, cleaning tricks, or any controversial methods.

Answer style:
- Start with the direct answer.
- Add 1 short explanatory paragraph if helpful.
- Use bullets only when listing codes, tiers, or item types.

MARKET 2 MINT SERVICE TABLE (OFFICIAL DATA):
${CSV_DATA}

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}
`;

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export const sendMessage = async (message: string, history: Message[] = []) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });
  
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));
  
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  return response.text || "I'm sorry, I couldn't generate a response.";
};
