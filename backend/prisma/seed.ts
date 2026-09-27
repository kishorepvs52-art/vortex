// ═══════════════════════════════════════════════════════════════
// VORTEX seed — real agronomy catalogue (12 crops, ~45 diseases),
// platform settings, demo accounts, and demo analyses whose images
// are generated & stored through the REAL storage pipeline (sharp).
// Idempotent: safe to re-run (npm run seed).
// ═══════════════════════════════════════════════════════════════
import type { PathogenType, Severity } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { env } from '../src/config/env.js';
import { storage } from '../src/storage/local.provider.js';
import { prisma } from '../src/lib/prisma.js';

// ───────────────────────── helpers ─────────────────────────

type DiseaseSeed = {
  name: string;
  pathogenType: PathogenType;
  defaultSeverity: Severity;
  description: string;
  symptoms: string;
  visibleSigns?: string;
  treatment: string;
  prevention: string;
  isCommon?: boolean;
};

const HEALTHY = (crop: string): DiseaseSeed => ({
  name: 'Healthy',
  pathogenType: 'HEALTHY',
  defaultSeverity: 'NONE',
  description: `No disease detected — a healthy ${crop} sample.`,
  symptoms: 'Uniform green colour, firm leaves, no lesions, no wilting.',
  visibleSigns: 'Clean leaf surface with natural sheen and intact margins.',
  treatment: 'No treatment required. Continue routine care.',
  prevention: 'Scout fields weekly.\nMaintain balanced nutrition and irrigation.\nRemove crop debris after harvest.',
});

// ───────────────────────── catalogue ─────────────────────────

const CATALOGUE: { name: string; scientificName: string; family: string; emoji: string; description: string; diseases: DiseaseSeed[] }[] = [
  {
    name: 'Rice', scientificName: 'Oryza sativa', family: 'Poaceae', emoji: '🌾',
    description: 'India’s staple cereal — Kharif & Samba seasons across Tamil Nadu.',
    diseases: [
      { name: 'Rice Blast', pathogenType: 'FUNGAL', defaultSeverity: 'HIGH', isCommon: true,
        description: 'Caused by Magnaporthe oryzae; the most destructive rice disease worldwide.',
        symptoms: 'Diamond-shaped spindle lesions on leaves with grey centres and brown margins; neck blast blackens the panicle base.',
        visibleSigns: 'Spindle-shaped leaf lesions, white/grey centres, reddish-brown borders; dying panicle necks.',
        treatment: 'Spray tricyclazole 75% WP @ 0.6 g/L of water.\nApply at first lesion sighting and repeat after 10 days.\nDrain excess water and avoid excess urea.',
        prevention: 'Grow resistant varieties (e.g. CO 51, ADT 45).\nBalanced NPK — avoid excess nitrogen.\nSeed treatment with carbendazim @ 2 g/kg.' },
      { name: 'Brown Spot', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Bipolaris oryzae — thrives in nutrient-poor, water-stressed fields.',
        symptoms: 'Oval brown spots the size of sesame seeds scattered on leaves; seedlings may wilt.',
        visibleSigns: 'Uniform oval brown lesions with yellow halos, worst on older leaves.',
        treatment: 'Spray mancozeb 75% WP @ 2.5 g/L.\nCorrect potassium and micronutrient deficiency.\nImprove water management.',
        prevention: 'Use certified disease-free seed.\nMaintain soil fertility, especially potash.\nAvoid moisture stress at seedling stage.' },
      { name: 'Bacterial Leaf Blight', pathogenType: 'BACTERIAL', defaultSeverity: 'HIGH', isCommon: true,
        description: 'Xanthomonas oryzae — spreads fast in flooded, humid, high-nitrogen fields.',
        symptoms: 'Water-soaked streaks from leaf tips turning straw-yellow; whole leaves dry out (kresek).',
        visibleSigns: 'Yellow wavy stripes along leaf margins, milky bacterial ooze in morning humidity.',
        treatment: 'Drain the field for 2-3 days.\nSpray copper oxychloride @ 2.5 g/L + streptocycline 0.5 g/L.\nStop top-dressing nitrogen until recovery.',
        prevention: 'Plant resistant varieties (ADT 43, TKM 9).\nAvoid clipping seedling tips at transplanting.\nKeep bunds weed-free; balanced fertilisation.' },
      { name: 'Tungro', pathogenType: 'VIRAL', defaultSeverity: 'HIGH',
        description: 'Virus complex spread by green leafhoppers.',
        symptoms: 'Young leaves turn yellow-orange, plants stunted with fewer tillers.',
        visibleSigns: 'Orange-yellow discoloration starting from leaf tip, stunted plants, leafhopper presence.',
        treatment: 'No cure — remove and destroy infected plants.\nControl green leafhoppers with imidacloprid 17.8% SL @ 0.3 ml/L.',
        prevention: 'Grow tolerant varieties.\nSynchronous planting in the region.\nNursery protection with insecticide; rogue infected seedlings.' },
      HEALTHY('rice'),
    ],
  },
  {
    name: 'Tomato', scientificName: 'Solanum lycopersicum', family: 'Solanaceae', emoji: '🍅',
    description: 'Major vegetable crop of Coimbatore, Madurai & Theni belts.',
    diseases: [
      { name: 'Early Blight', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE', isCommon: true,
        description: 'Alternaria solani — classic target-board leaf spots on older foliage.',
        symptoms: 'Dark concentric-ring spots on lower leaves; yellowing and premature leaf drop.',
        visibleSigns: 'Target-board lesions with concentric rings, yellow halo, starting on older leaves.',
        treatment: 'Spray mancozeb @ 2.5 g/L or azoxystrobin @ 1 ml/L.\nRemove lower infected leaves.\nRepeat at 10-day intervals during humid weather.',
        prevention: 'Rotate with non-solanaceous crops (2-3 years).\nStake plants and mulch to reduce soil splash.\nAvoid overhead irrigation in evenings.' },
      { name: 'Late Blight', pathogenType: 'FUNGAL', defaultSeverity: 'CRITICAL', isCommon: true,
        description: 'Phytophthora infestans — explosive in cool, wet weather; can destroy a crop in days.',
        symptoms: 'Large water-soaked grey-green patches on leaves turning brown-black; white mould ring underneath; fruit shows greasy brown lesions.',
        visibleSigns: 'Irregular dark lesions with pale green border, white sporulation on leaf underside, stem cankers.',
        treatment: 'Spray metalaxyl 8% + mancozeb 64% WP @ 2.5 g/L immediately.\nDestroy severely infected plants.\nFollow-up spray with cymoxanil after 7 days.',
        prevention: 'Use certified seed and resistant hybrids.\nWide spacing for airflow.\nScout daily in cool humid weather; remove volunteer plants.' },
      { name: 'Leaf Mold', pathogenType: 'FUNGAL', defaultSeverity: 'LOW',
        description: 'Passalora fulva — greenhouse and humid-field mould on leaf undersides.',
        symptoms: 'Pale yellow spots on upper leaf surface; olive-green velvety mould below.',
        visibleSigns: 'Yellowish upper-leaf blotches with matching fuzzy olive mould on the underside.',
        treatment: 'Improve air circulation.\nSpray chlorothalonil @ 2 g/L or difenoconazole @ 0.5 ml/L.',
        prevention: 'Reduce humidity; prune lower leaves.\nGrow resistant varieties.\nSanitise greenhouse structures.' },
      { name: 'Tomato Yellow Leaf Curl Virus', pathogenType: 'VIRAL', defaultSeverity: 'HIGH',
        description: 'Whitefly-transmitted begomovirus — severe in Tamil Nadu dry seasons.',
        symptoms: 'Leaves curl upward with yellow margins, plants stunted, flowers drop.',
        visibleSigns: 'Upward cupping and curling of young leaves, bright yellow margins, tiny whiteflies on shaking.',
        treatment: 'No cure — rogue infected plants.\nControl whiteflies: spiromesifen @ 1 ml/L or yellow sticky traps @ 10/acre.',
        prevention: 'Raise seedlings under 40-mesh insect-proof net.\nRemove weeds (virus reservoirs).\nReflective mulches deter whiteflies.' },
      HEALTHY('tomato'),
    ],
  },
  {
    name: 'Potato', scientificName: 'Solanum tuberosum', family: 'Solanaceae', emoji: '🥔',
    description: 'Winter crop of the Nilgiris and plains; tuber quality is market-critical.',
    diseases: [
      { name: 'Late Blight', pathogenType: 'FUNGAL', defaultSeverity: 'CRITICAL', isCommon: true,
        description: 'Phytophthora infestans — the historic famine pathogen; thrives in Nilgiri mist.',
        symptoms: 'Water-soaked dark leaf patches with pale halo; white mould below; tubers show reddish-brown dry rot.',
        visibleSigns: 'Rapidly expanding brown-black leaf lesions, white sporulation at margins in humidity.',
        treatment: 'Spray metalaxyl + mancozeb @ 2.5 g/L at first sign.\nDestroy haulms before harvest if infected.\nStore tubers only after surface drying.',
        prevention: 'Plant certified blight-free seed tubers.\nEarth up well to shield tubers.\nAvoid overhead irrigation; forecast-based spray programs.' },
      { name: 'Early Blight', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Alternaria solani — target spots on senescing foliage.',
        symptoms: 'Concentric-ring brown spots on older leaves; premature defoliation.',
        visibleSigns: 'Target-board lesions with yellow halos, mostly on lower canopy.',
        treatment: 'Mancozeb @ 2.5 g/L or azoxystrobin sprays at 10-14 day intervals.\nMaintain nutrition to delay senescence.',
        prevention: 'Crop rotation (non-solanaceous).\nMulching; balanced potassium.\nRemove infected debris after harvest.' },
      { name: 'Black Scurf', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Rhizoctonia solani — hard black crusts on tubers, sprout death.',
        symptoms: 'Black hard sclerotia on tubers that do not wash off; wilting and purple top leaves.',
        visibleSigns: 'Dark brown-black crusty patches on tuber skin; reddish-brown stem cankers at soil line.',
        treatment: 'Seed tuber treatment with pencycuron or boric acid dip.\nSoil drench with validamycin @ 2 ml/L at planting.',
        prevention: 'Use certified seed tubers.\n2-year rotation.\nDelay harvest until skins set; proper curing.' },
      HEALTHY('potato'),
    ],
  },
  {
    name: 'Maize', scientificName: 'Zea mays', family: 'Poaceae', emoji: '🌽',
    description: 'Erode & Perambalur maize belts — feed and food grain.',
    diseases: [
      { name: 'Common Rust', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE', isCommon: true,
        description: 'Puccinia sorghi — cinnamon pustules bursting on both leaf surfaces.',
        symptoms: 'Small reddish-brown pustules scattered on leaves; severe cases yellow and dry foliage.',
        visibleSigns: 'Cinnamon-brown powdery pustules on both leaf sides that rub off rusty.',
        treatment: 'Spray propiconazole 25% EC @ 1 ml/L or tebuconazole @ 1 ml/L.\nRepeat after 12-15 days if weather stays humid.',
        prevention: 'Grow resistant hybrids.\nEarly planting avoids peak humidity.\nBalanced nitrogen; avoid dense planting.' },
      { name: 'Northern Leaf Blight', pathogenType: 'FUNGAL', defaultSeverity: 'HIGH',
        description: 'Exserohilum turcicum — long cigar-shaped grey-green lesions.',
        symptoms: 'Elongated cigar-shaped lesions 3-15 cm, first on lower leaves moving up.',
        visibleSigns: 'Cigar-shaped grey-green to tan lesions; dark olive sporulation in humid weather.',
        treatment: 'Mancozeb @ 2.5 g/L or azoxystrobin at first appearance.\nTwo sprays 10 days apart in conducive weather.',
        prevention: 'Resistant hybrids.\nRotate and bury residue.\nAdequate plant spacing.' },
      { name: 'Gray Leaf Spot', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Cercospora zeae-maydis — rectangular grey lesions bounded by leaf veins.',
        symptoms: 'Long narrow rectangular grey-tan spots, vein-limited, lower leaves first.',
        visibleSigns: 'Rectangular grey lesions with dark margins held within veins.',
        treatment: 'Difenoconazole + azoxystrobin @ 1 ml/L at tasselling if lesions climb 3 leaves above ear.',
        prevention: 'Residue management (plough in).\nRotation with non-host crops.\nResistant hybrids.' },
      HEALTHY('maize'),
    ],
  },
  {
    name: 'Cotton', scientificName: 'Gossypium hirsutum', family: 'Malvaceae', emoji: '🌿',
    description: 'White gold of Tamil Nadu — Coimbatore, Tiruppur & Erode districts.',
    diseases: [
      { name: 'Cotton Leaf Curl Virus', pathogenType: 'VIRAL', defaultSeverity: 'HIGH', isCommon: true,
        description: 'Whitefly-transmitted begomovirus; heavy losses in irrigated cotton tracts.',
        symptoms: 'Leaves curl upward, thickened small dark-green veins, leafy enations on undersides, plants stunted.',
        visibleSigns: 'Upward leaf curling, vein thickening/darkening, small leaf-like outgrowths (enations).',
        treatment: 'No cure — remove infected plants early.\nControl whiteflies with spiromesifen @ 1 ml/L or diafenthiuron; rotate molecules to avoid resistance.',
        prevention: 'Grow tolerant hybrids.\nErect 40-mesh nursery protection.\nYellow sticky traps @ 5/acre; weed-free bunds.' },
      { name: 'Bacterial Blight', pathogenType: 'BACTERIAL', defaultSeverity: 'MODERATE',
        description: 'Xanthomonas citri pv. malvacearum — angular leaf spots and black arm.',
        symptoms: 'Angular water-soaked spots turning reddish-brown, restricted by veins; stem cankers blacken.',
        visibleSigns: 'Angular vein-bounded lesions; blackened stems ("black arm"); boll rot spots.',
        treatment: 'Spray streptocycline 0.5 g/L + copper oxychloride 2.5 g/L.\nAvoid working in the field when foliage is wet.',
        prevention: 'Acid-delinted certified seed.\n2-year rotation; destroy stubble.\nResistant varieties.' },
      { name: 'Fusarium Wilt', pathogenType: 'FUNGAL', defaultSeverity: 'HIGH',
        description: 'Soil-borne wilt — vascular browning, plant collapse in patches.',
        symptoms: 'Yellowing and drooping of leaves from the base upward; brown streaks in split stems; patchy field wilt.',
        visibleSigns: 'Wilting with intact leaves, dark brown vascular bundles inside stem.',
        treatment: 'No curative spray — drench healthy border plants with carbendazim @ 1 g/L.\nCorrect waterlogging.',
        prevention: 'Resistant cultivars (the only reliable control).\nLong rotations; avoid injury to roots.\nTrichoderma-enriched farmyard manure.' },
      { name: 'Alternaria Leaf Spot', pathogenType: 'FUNGAL', defaultSeverity: 'LOW',
        description: 'Alternaria macrospora — brown concentric spots during humid spells.',
        symptoms: 'Round brown spots with concentric rings and yellow halo on lower leaves; defoliation in severe attacks.',
        visibleSigns: 'Target-like brown lesions, worst after rain on nutrient-stressed plants.',
        treatment: 'Mancozeb @ 2.5 g/L spray; correct potassium deficiency.',
        prevention: 'Balanced nutrition; avoid dense canopies.\nRotate crops; manage residue.' },
      HEALTHY('cotton'),
    ],
  },
  {
    name: 'Sugarcane', scientificName: 'Saccharum officinarum', family: 'Poaceae', emoji: '🎋',
    description: 'Cauvery-delta cane; red rot is the crop’s biggest threat.',
    diseases: [
      { name: 'Red Rot', pathogenType: 'FUNGAL', defaultSeverity: 'CRITICAL', isCommon: true,
        description: 'Colletotrichum falcatum — "cane cancer"; collapses whole clumps.',
        symptoms: 'Reddening of internal tissue with sour smell, drying of crown leaves, rind shows red patches.',
        visibleSigns: 'Split canes reveal sour-smelling red tissue with white patches; withered crowns.',
        treatment: 'No chemical cure — rogue out infected clumps with roots.\nSoil drench carbendazim around affected patch.',
        prevention: 'Plant resistant varieties (Co 86032 alternatives).\nHot-water seed treatment 52°C for 30 min.\nAvoid ratoon crops in infected fields; canal water hygiene.' },
      { name: 'Sugarcane Wilt', pathogenType: 'FUNGAL', defaultSeverity: 'HIGH',
        description: 'Fusarium/Cephalosporium complex in waterlogged soils.',
        symptoms: 'Pale yellow leaves, canes shrink and lose weight, pith hollow with reddish tinge.',
        visibleSigns: 'Wilted clumps with shrivelled canes; internal hollowing and red-brown discoloration.',
        treatment: 'Improve drainage immediately.\nDrench with carbendazim + Trichoderma around clumps.',
        prevention: 'Wilt-tolerant varieties.\nTreat setts before planting.\nAvoid waterlogging; rotate with rice.' },
      { name: 'Yellow Leaf Virus', pathogenType: 'VIRAL', defaultSeverity: 'MODERATE',
        description: 'Aphid-borne SCYLV — yield drag and leaf yellowing.',
        symptoms: 'Midrib yellowing spreading to full leaf, stunted cane, reduced sugar.',
        visibleSigns: 'Bright yellow midrib and lamina on mature leaves; shortened internodes.',
        treatment: 'Control aphids (imidacloprid 0.3 ml/L).\nRemove infected stools at roguing rounds.',
        prevention: 'Virus-free seed cane from nurseries.\nHot air treatment of setts.\nAphid monitoring.' },
      HEALTHY('sugarcane'),
    ],
  },
  {
    name: 'Banana', scientificName: 'Musa paradisiaca', family: 'Musaceae', emoji: '🍌',
    description: 'Theni & Tiruchy banana belt; Nendran, Robusta and Poovan varieties.',
    diseases: [
      { name: 'Panama Wilt', pathogenType: 'FUNGAL', defaultSeverity: 'CRITICAL', isCommon: true,
        description: 'Fusarium oxysporum f.sp. cubense — soil-borne vascular wilt; Race 1 hits Poovan.',
        symptoms: 'Older leaves yellow and collapse downward forming a "skirt"; split pseudostem shows discoloured vascular strands.',
        visibleSigns: 'Yellowing from oldest leaf upward, drooping skirt of leaves, reddish-brown streaks in split pseudostem.',
        treatment: 'No cure — destroy infected mats.\nDrench neighbouring mats with carbendazim 1 g/L + Trichoderma.',
        prevention: 'Tissue-cultured disease-free suckers only.\nResistant varieties; avoid flood-prone heavy soils.\nCrop rotation with paddy floods out the fungus.' },
      { name: 'Sigatoka Leaf Spot', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Pseudocercospora musae — yellow and brown leaf streaks reducing photosynthesis.',
        symptoms: 'Yellow streaks on leaves turning brown with grey centres and yellow halo; premature leaf death.',
        visibleSigns: 'Elliptical streaks with dark borders and grey centres parallel to veins.',
        treatment: 'Spray difenoconazole 0.5 ml/L or chlorothalonil 2 g/L monthly.\nDefoliate and destroy infected leaves.',
        prevention: 'Good drainage and wider spacing.\nRemove weed hosts.\nDesucker regularly for airflow.' },
      { name: 'Banana Bunchy Top', pathogenType: 'VIRAL', defaultSeverity: 'HIGH',
        description: 'Aphid-transmitted BBTV — the most feared banana virus.',
        symptoms: 'Severely stunted plants, narrow upright leaves with dark-green "Morse-code" streaks, no bunching.',
        visibleSigns: 'Bunched upright leaves of decreasing size, dark green dashes along midribs, severe stunting.',
        treatment: 'Rogue infected mats including rhizome; inject mats with insecticide before removal to stop aphid flight.',
        prevention: 'Certified tissue-culture planting material.\nAphid control with imidacloprid.\nIsolate new plantings from old infected fields.' },
      HEALTHY('banana'),
    ],
  },
  {
    name: 'Coconut', scientificName: 'Cocos nucifera', family: 'Arecaceae', emoji: '🥥',
    description: 'Coimbatore & Pollachi coconut country — perennial livelihood crop.',
    diseases: [
      { name: 'Coconut Root Wilt', pathogenType: 'PHYSIOLOGICAL', defaultSeverity: 'HIGH', isCommon: true,
        description: 'Phytoplasma-associated decline disease endemic to Kerala-TN belt.',
        symptoms: 'Gradual yellowing of outer fronds, flaccidity, nut size drops; feeder roots decay.',
        visibleSigns: 'Yellowed drooping outer fronds, reduced crown, brown decayed root tips.',
        treatment: 'No cure — improve nutrition (Mg, K, micronutrients) to sustain yield.\nApply neem cake around root zone; control leaf-eating insects as vectors.',
        prevention: 'Grow tolerant progenies.\nGreen manure cover crops.\nRemove severely declined palms; avoid stress from drought/waterlogging.' },
      { name: 'Leaf Rot', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Complex of fungi attacking spindle leaves of young palms.',
        symptoms: 'Speckled brown lesions on emerging spindle leaves; fronds shred and crowns thin out.',
        visibleSigns: 'Brown-black rot at leaf bases within the crown; ragged emerging fronds.',
        treatment: 'Clean out rotten spindle tissue.\nPour 1% Bordeaux mixture into leaf bases.\nRepeat monthly during monsoon.',
        prevention: 'Good crown hygiene every quarter.\nAvoid nursery crowding; provide drainage.\nPre-monsoon prophylactic Bordeaux pours.' },
      { name: 'Stem Bleeding', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Thielaviopsis paradoxa — reddish exudate from trunk cracks.',
        symptoms: 'Reddish-brown liquid bleeding from cracks and wounds on the trunk; fronds shrink over years.',
        visibleSigns: 'Dark red sap exuding from trunk fissures, internal reddish streaks in removed tissue.',
        treatment: 'Remove bleeding tissue and chisel-apply 0.1% carbendazim.\nPaint wounds with coal-tar + kerosene (1:2).',
        prevention: 'Avoid trunk injury.\nAdequate potash nutrition.\nRough-bark removal (bark shaving) yearly.' },
      HEALTHY('coconut'),
    ],
  },
  {
    name: 'Groundnut', scientificName: 'Arachis hypogaea', family: 'Fabaceae', emoji: '🥜',
    description: 'Rain-fed groundnut of Dharmapuri & Salem.',
    diseases: [
      { name: 'Tikka Leaf Spot', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE', isCommon: true,
        description: 'Cercospora leaf spots (early & late) — biggest yield robber in groundnut.',
        symptoms: 'Round dark spots with yellow halo; heavily spotted leaves dry and fall; poor pegging.',
        visibleSigns: 'Circular dark-brown spots on upper leaf surface, blackish lower-surface spots with grey sporulation.',
        treatment: 'Spray chlorothalonil 2 g/L or carbendazim 1 g/L at first spotting; repeat 2-3 times at 10-day intervals.',
        prevention: 'Deep summer ploughing; crop rotation.\nBalanced gypsum/potash.\nAvoid very dense canopies.' },
      { name: 'Groundnut Rust', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Puccinia arachidis — orange pustules, often with leaf spot.',
        symptoms: 'Orange-brown powdery pustules on leaf undersides; premature defoliation.',
        visibleSigns: 'Rusty pustules bursting through the lower epidermis.',
        treatment: 'Spray hexaconazole 1 ml/L or chlorothalonil 2 g/L.',
        prevention: 'Resistant varieties (e.g. ICGV lines).\nRotate with cereals.\nDestroy volunteer plants.' },
      { name: 'Bud Necrosis', pathogenType: 'VIRAL', defaultSeverity: 'HIGH',
        description: 'Thrips-transmitted tospovirus (GBNV) — terminal bud death.',
        symptoms: 'Dark streaks on petioles, necrotic terminal buds, stunted plants with rosette appearance.',
        visibleSigns: 'Brown-black necrosis of growing tip, ring spots on leaves, thrips presence in flowers.',
        treatment: 'Control thrips: fipronil 0.3 ml/L or spinosad; blue sticky traps @ 10/acre.\nRemove necrotic plants.',
        prevention: 'Early sowing escapes thrips peak.\nBorder rows of maize as barrier.\nDeep summer tillering exposes pupae.' },
      HEALTHY('groundnut'),
    ],
  },
  {
    name: 'Chilli', scientificName: 'Capsicum annuum', family: 'Solanaceae', emoji: '🌶️',
    description: 'Ramnad & Guntur-type chilli grown widely across TN dry districts.',
    diseases: [
      { name: 'Chilli Leaf Curl', pathogenType: 'VIRAL', defaultSeverity: 'HIGH', isCommon: true,
        description: 'Thrips/whitefly-mediated complex ("murda") — upward or downward leaf curling.',
        symptoms: 'Leaves curl and thicken, nodes shorten, plants bushy and stunted, fruit set drops.',
        visibleSigns: 'Upward/downward curling with leathery leaves, tiny thrips/whiteflies on shaking leaves.',
        treatment: 'Spray fipronil 0.3 ml/L (thrips) or spiromesifen (whiteflies); add 1% neem oil.\nRogue severely curled plants.',
        prevention: 'Raised nursery under insect net.\nBlue + yellow sticky traps @ 10/acre.\nBorder crop of maize; weed-free field.' },
      { name: 'Anthracnose Fruit Rot', pathogenType: 'FUNGAL', defaultSeverity: 'HIGH',
        description: 'Colletotrichum spp. — die-back and ripe-fruit rot ruining market grade.',
        symptoms: 'Sunken black spots with pink spore masses on ripe fruit; twig die-back from top.',
        visibleSigns: 'Circular sunken lesions with concentric spore rings on red pods; dried twig tips.',
        treatment: 'Spray azoxystrobin 1 ml/L or carbendazim + mancozeb at fruit ripening.\nHarvest promptly; sun-dry on clean tarpaulin.',
        prevention: 'Hot-water seed treatment 52°C/30 min.\nAvoid overhead irrigation at fruiting.\nRemove fallen fruit and infected twigs.' },
      { name: 'Mosaic Virus', pathogenType: 'VIRAL', defaultSeverity: 'MODERATE',
        description: 'Aphid-transmitted CMV/PVY — mottled distorted foliage.',
        symptoms: 'Light and dark green mosaic patches, distorted narrowed leaves, stunted growth.',
        visibleSigns: 'Green-yellow mottling, shoe-string leaves, aphid colonies on tender shoots.',
        treatment: 'Control aphids (imidacloprid 0.3 ml/L); rogue infected plants early.',
        prevention: 'Virus-free nursery; silver mulch repels aphids.\nWeed control around fields.' },
      HEALTHY('chilli'),
    ],
  },
  {
    name: 'Wheat', scientificName: 'Triticum aestivum', family: 'Poaceae', emoji: '🌾',
    description: 'Limited but growing rabi acreage in TN irrigated belts.',
    diseases: [
      { name: 'Yellow Rust', pathogenType: 'FUNGAL', defaultSeverity: 'HIGH', isCommon: true,
        description: 'Puccinia striiformis — cool-climate stripe rust in yellow rows along leaf veins.',
        symptoms: 'Yellow-orange powdery stripes along veins; leaves dry in severe attacks.',
        visibleSigns: 'Linear pustule stripes rubbing off bright yellow powder.',
        treatment: 'Spray propiconazole 1 ml/L or tebuconazole immediately; repeat in 15 days.',
        prevention: 'Timely sowing; resistant varieties.\nAvoid excess nitrogen and dense canopy.' },
      { name: 'Leaf Blight', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Bipolaris sorokiniana spot blotch — warm humid rabi damage.',
        symptoms: 'Oval brown blotches merging and scorching leaves; blackened nodes.',
        visibleSigns: 'Irregular dark-brown blotches without rings; sooty spore layer in humidity.',
        treatment: 'Propiconazole + azoxystrobin spray at boot stage.\nFoliar potassium to slow senescence.',
        prevention: 'Seed treatment with carbendazim + trichoderma.\nEarly sowing escapes heat-humidity peak.\nResidue management.' },
      { name: 'Powdery Mildew', pathogenType: 'FUNGAL', defaultSeverity: 'LOW',
        description: 'Blumeria graminis — white talcum-like leaf coating.',
        symptoms: 'White powdery patches on leaves and sheaths turning grey-brown.',
        visibleSigns: 'Talcum-powder fungal growth scraping off to reveal yellow tissue.',
        treatment: 'Sulphur 80% WDG @ 2 g/L (avoid above 30°C) or hexaconazole 1 ml/L.',
        prevention: 'Balanced nitrogen; wider rows for airflow.\nGrow tolerant varieties.' },
      HEALTHY('wheat'),
    ],
  },
  {
    name: 'Mango', scientificName: 'Mangifera indica', family: 'Anacardiaceae', emoji: '🥭',
    description: 'Salem-Malgova & Krishnagiri-Alphonso orchards.',
    diseases: [
      { name: 'Mango Anthracnose', pathogenType: 'FUNGAL', defaultSeverity: 'HIGH', isCommon: true,
        description: 'Colletotrichum gloeosporioides — panicle blight and fruit rot from flowering to shelf.',
        symptoms: 'Black spots on panicles causing flower drop; dark sunken fruit lesions after harvest.',
        visibleSigns: 'Necrotic panicle tips, tear-stain black lesions on fruit, pink spore masses in wet weather.',
        treatment: 'Three sprays: at panicle emergence, flowering and pea-stage fruit with azoxystrobin 1 ml/L or carbendazim 1 g/L.\nPost-harvest hot water dip 52°C for 5 min.',
        prevention: 'Prune to open canopy after harvest.\nRemove mummified fruit and twigs.\nAvoid overhead irrigation during flowering.' },
      { name: 'Powdery Mildew', pathogenType: 'FUNGAL', defaultSeverity: 'MODERATE',
        description: 'Oidium mangiferae — white coating on panicles in cool dry mornings.',
        symptoms: 'Whitish powdery growth on flowers and young fruit; heavy flower shed; fruit russeting.',
        visibleSigns: 'Talcum-white leaf/panicle coating, distorted young fruit with brown patches.',
        treatment: 'Sulphur dust or wettable sulphur 2 g/L at panicle emergence; repeat 15 days.\n(Hexaconazole 1 ml/L as alternative.)',
        prevention: 'Open canopy pruning.\nMonitor from bud-burst; dry-season alert sprays.' },
      HEALTHY('mango'),
    ],
  },
];

// ───────────────────────── demo images ─────────────────────────

function leafSvg(opts: { base: string; spot: string; spots: number; curl?: boolean; label: string }): string {
  const spots = Array.from({ length: opts.spots }, (_, i) => {
    const cx = 120 + ((i * 137) % 520);
    const cy = 90 + ((i * 211) % 380);
    const r = 10 + ((i * 53) % 26);
    return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.75}" fill="${opts.spot}" opacity="0.85" transform="rotate(${i * 23} ${cx} ${cy})"/>`;
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="560" viewBox="0 0 760 560">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#0d2416"/><stop offset="100%" stop-color="#04120a"/>
    </radialGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${opts.base}"/><stop offset="100%" stop-color="#1d5a2a"/>
    </linearGradient>
  </defs>
  <rect width="760" height="560" fill="url(#bg)"/>
  <path d="M60 500 C 140 140, 560 40, 720 60 C 640 340, 380 520, 60 500 Z" fill="url(#leaf)"/>
  <path d="M60 500 C 240 380, 500 200, 720 60" stroke="#0a3a1a" stroke-width="6" fill="none" opacity="0.7"/>
  ${spots}
  ${opts.curl ? '<path d="M400 80 C 520 120, 600 220, 620 340" stroke="#7ecb3f" stroke-width="10" fill="none" opacity="0.5"/>' : ''}
  <text x="38" y="536" font-family="monospace" font-size="20" fill="#39ff88" opacity="0.75">VORTEX-SEED · ${opts.label}</text>
</svg>`;
}

async function makeDemoImage(label: string, opts: { base: string; spot: string; spots: number; curl?: boolean }): Promise<Buffer> {
  const svg = Buffer.from(leafSvg({ ...opts, label }));
  return sharp(svg).jpeg({ quality: 88 }).toBuffer();
}

// ───────────────────────── main seed ─────────────────────────

async function main() {
  console.log('═══ VORTEX seed starting ═══');

  // 1. Catalogue ──
  let cropCount = 0;
  let diseaseCount = 0;
  for (const crop of CATALOGUE) {
    const c = await prisma.cropType.upsert({
      where: { name: crop.name },
      create: {
        name: crop.name,
        scientificName: crop.scientificName,
        family: crop.family,
        emoji: crop.emoji,
        description: crop.description,
      },
      update: {
        scientificName: crop.scientificName,
        family: crop.family,
        emoji: crop.emoji,
        description: crop.description,
        isActive: true,
      },
    });
    cropCount++;
    for (const d of crop.diseases) {
      await prisma.disease.upsert({
        where: { cropTypeId_name: { cropTypeId: c.id, name: d.name } },
        create: {
          cropTypeId: c.id,
          name: d.name,
          pathogenType: d.pathogenType,
          defaultSeverity: d.defaultSeverity,
          description: d.description,
          symptoms: d.symptoms,
          visibleSigns: d.visibleSigns ?? null,
          treatmentSummary: d.treatment,
          preventiveSummary: d.prevention,
          isCommon: d.isCommon ?? false,
        },
        update: {
          pathogenType: d.pathogenType,
          defaultSeverity: d.defaultSeverity,
          description: d.description,
          symptoms: d.symptoms,
          visibleSigns: d.visibleSigns ?? null,
          treatmentSummary: d.treatment,
          preventiveSummary: d.prevention,
          isCommon: d.isCommon ?? false,
          isActive: true,
        },
      });
      diseaseCount++;
    }
  }
  console.log(`✓ Catalogue: ${cropCount} crops, ${diseaseCount} diseases`);

  // 2. Settings ──
  const settings: [string, string, string][] = [
    ['expert_review_threshold', String(env.EXPERT_REVIEW_THRESHOLD), 'AI confidence below this value routes the case to expert review (0-1)'],
    ['platform_announcement', '', 'Optional banner shown to all users (empty = hidden)'],
    ['maintenance_mode', 'false', 'When true, new analyses are paused platform-wide'],
  ];
  for (const [key, value, description] of settings) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, description },
      update: { description },
    });
  }
  console.log('✓ System settings');

  // 3. Users ──
  const hash = (pw: string) => bcrypt.hash(pw, env.BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vortex.app' },
    create: { email: 'admin@vortex.app', passwordHash: await hash('Admin@1234'), fullName: 'Arjun Nair', role: 'ADMIN', phone: '+91 90000 10001', isActive: true },
    update: { isActive: true },
  });

  const expert = await prisma.user.upsert({
    where: { email: 'expert@vortex.app' },
    create: { email: 'expert@vortex.app', passwordHash: await hash('Expert@1234'), fullName: 'Dr. Meera Krishnan', role: 'EXPERT', phone: '+91 90000 10002', isActive: true },
    update: { isActive: true },
  });
  await prisma.expertProfile.upsert({
    where: { userId: expert.id },
    create: {
      userId: expert.id, specialization: 'Plant Pathology', qualification: 'Ph.D. Plant Pathology, TNAU Coimbatore',
      licenseNumber: 'TN-PP-2019-0442', yearsExperience: 12,
      bio: 'Plant pathologist with 12 years of field diagnostics across Tamil Nadu. Special interest in rice and solanaceous crop diseases.',
    },
    update: {},
  });

  const pendingExpert = await prisma.user.upsert({
    where: { email: 'senthil@vortex.app' },
    create: { email: 'senthil@vortex.app', passwordHash: await hash('Expert@1234'), fullName: 'Dr. Senthil Raj', role: 'EXPERT', phone: '+91 90000 10005', isActive: false },
    update: {},
  });
  await prisma.expertProfile.upsert({
    where: { userId: pendingExpert.id },
    create: { userId: pendingExpert.id, specialization: 'Entomology & Viral Diseases', qualification: 'M.Sc. Agricultural Entomology', yearsExperience: 6, bio: 'Awaiting approval — vector-borne disease specialist.' },
    update: {},
  });

  const farmer = await prisma.user.upsert({
    where: { email: 'farmer@vortex.app' },
    create: { email: 'farmer@vortex.app', passwordHash: await hash('Farmer@1234'), fullName: 'Ravi Kumar', role: 'FARMER', phone: '+91 90000 10003', isActive: true },
    update: { isActive: true },
  });
  await prisma.farmerProfile.upsert({
    where: { userId: farmer.id },
    create: { userId: farmer.id, village: 'Sulur', district: 'Coimbatore', state: 'Tamil Nadu', farmSizeAcres: 4.5, preferredLanguage: 'en' },
    update: {},
  });

  const farmer2 = await prisma.user.upsert({
    where: { email: 'lakshmi@vortex.app' },
    create: { email: 'lakshmi@vortex.app', passwordHash: await hash('Farmer@1234'), fullName: 'Lakshmi Devi', role: 'FARMER', phone: '+91 90000 10004', isActive: true },
    update: { isActive: true },
  });
  await prisma.farmerProfile.upsert({
    where: { userId: farmer2.id },
    create: { userId: farmer2.id, village: 'Thirumangalam', district: 'Madurai', state: 'Tamil Nadu', farmSizeAcres: 2.2, preferredLanguage: 'ta' },
    update: {},
  });
  console.log('✓ Users: admin, expert (approved + pending), 2 farmers');

  // 4. Demo analyses (cleared & rebuilt for idempotency) ──
  if (!env.SEED_DEMO) {
    console.log('SEED_DEMO=false → skipping demo analyses');
  } else {
    await prisma.cropAnalysis.deleteMany({ where: { farmerId: { in: [farmer.id, farmer2.id] } } });
    await prisma.uploadedImage.deleteMany({ where: { userId: { in: [farmer.id, farmer2.id] } } });
    await prisma.notification.deleteMany({ where: { userId: { in: [farmer.id, farmer2.id, expert.id, admin.id] } } });

    const cropByName = async (name: string) => prisma.cropType.findUniqueOrThrow({ where: { name }, include: { diseases: true } });
    const diseaseByName = (
      crop: { diseases: { id: string; name: string; treatmentSummary: string; preventiveSummary: string }[] },
      name: string,
    ) => crop.diseases.find((d) => d.name === name)!;

    // ── Demo 1: Tomato early blight — AI completed, high confidence ──
    const tomato = await cropByName('Tomato');
    const img1 = await storage.saveImage({
      buffer: await makeDemoImage('tomato-early-blight', { base: '#2e7d32', spot: '#7a4a12', spots: 22 }),
      originalName: 'demo-tomato-leaf.jpg',
      declaredMimeType: 'image/jpeg',
    });
    const image1 = await prisma.uploadedImage.create({
      data: { userId: farmer.id, storageKey: img1.storageKey, thumbKey: img1.thumbKey, originalName: 'demo-tomato-leaf.jpg', mimeType: img1.mimeType, sizeBytes: img1.sizeBytes, width: img1.width, height: img1.height, sha256: img1.sha256 },
    });
    const earlyBlight = diseaseByName(tomato, 'Early Blight');
    const a1 = await prisma.cropAnalysis.create({
      data: {
        farmerId: farmer.id, cropTypeId: tomato.id, imageId: image1.id, status: 'AI_COMPLETED',
        symptoms: 'Brown round spots with rings on lower leaves, some yellowing',
        locationText: 'Sulur, Coimbatore, Tamil Nadu', latitude: 11.1249, longitude: 77.1241,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        aiResult: {
          create: {
            provider: 'mock', isMock: true, modelVersion: 'vortex-heuristic-v1',
            predictedDiseaseId: earlyBlight.id, predictedLabel: 'Early Blight',
            confidence: 0.93, severity: 'MODERATE', healthy: false,
            indicators: ['Approx. 24% of sampled area shows brown necrotic lesions', 'Concentric target-like patterning consistent with Alternaria', 'Older (lower) canopy leaves most affected'],
            reasoning: 'The lesion pattern with concentric rings and the distribution on older leaves strongly match Early Blight on tomato. Confidence is high; follow the treatment guidance promptly.',
            needsExpertReview: false, processingTimeMs: 1840,
          },
        },
        guidances: {
          create: {
            source: 'AI', title: 'AI treatment guidance',
            steps: {
              treatment: earlyBlight.treatmentSummary.split('\n').map((s) => s.trim()).filter(Boolean),
              prevention: earlyBlight.preventiveSummary.split('\n').map((s) => s.trim()).filter(Boolean),
              safety: ['Wear protective gloves and mask when spraying.', 'Follow pre-harvest interval on product labels.', 'Spray in the evening; avoid rain within 6 hours.'],
              disclaimer: 'AI-generated guidance — consult your local agricultural officer before large-scale application.',
            },
          },
        },
      },
    });
    await prisma.notification.create({
      data: { userId: farmer.id, type: 'ANALYSIS_COMPLETE', title: 'Analysis complete', message: 'Detected: Early Blight — severity MODERATE. View guidance now.', analysisId: a1.id, read: true },
    });

    // ── Demo 2: Rice — low confidence, expert review pending ──
    const rice = await cropByName('Rice');
    const img2 = await storage.saveImage({
      buffer: await makeDemoImage('rice-suspected-blast', { base: '#4a7c2f', spot: '#8a6d1f', spots: 14 }),
      originalName: 'demo-rice-leaf.jpg',
      declaredMimeType: 'image/jpeg',
    });
    const image2 = await prisma.uploadedImage.create({
      data: { userId: farmer.id, storageKey: img2.storageKey, thumbKey: img2.thumbKey, originalName: 'demo-rice-leaf.jpg', mimeType: img2.mimeType, sizeBytes: img2.sizeBytes, width: img2.width, height: img2.height, sha256: img2.sha256 },
    });
    const a2 = await prisma.cropAnalysis.create({
      data: {
        farmerId: farmer.id, cropTypeId: rice.id, imageId: image2.id, status: 'EXPERT_REVIEW_PENDING',
        symptoms: 'Spindle shaped spots appearing on leaves after last week rain',
        locationText: 'Sulur, Coimbatore, Tamil Nadu', latitude: 11.1249, longitude: 77.1241,
        createdAt: new Date(Date.now() - 26 * 3600 * 1000),
        aiResult: {
          create: {
            provider: 'mock', isMock: true, modelVersion: 'vortex-heuristic-v1',
            predictedDiseaseId: diseaseByName(rice, 'Rice Blast').id, predictedLabel: 'Rice Blast',
            confidence: 0.61, severity: 'HIGH', healthy: false,
            indicators: ['About 11% discoloured tissue with spindle-like lesions', 'Humid post-rain conditions favour blast development', 'Lesion borders slightly ambiguous between blast and brown spot'],
            reasoning: 'Lesions suggest Rice Blast but image conditions make Brown Spot possible. Confidence is below the review threshold — an expert will validate.',
            needsExpertReview: true, processingTimeMs: 2210,
          },
        },
        expertReview: {
          create: {
            status: 'PENDING', finalDiseaseId: diseaseByName(rice, 'Rice Blast').id, finalSeverity: 'HIGH',
            confidenceNote: 'AI confidence 61% is below the 75% review threshold.',
          },
        },
      },
    });
    await prisma.notification.createMany({
      data: [
        { userId: farmer.id, type: 'EXPERT_REVIEW_NEEDED', title: 'Expert review in progress', message: 'VORTEX AI flagged your Rice analysis for expert validation (confidence 61%). You will be notified when the review completes.', analysisId: a2.id },
        { userId: expert.id, type: 'EXPERT_REVIEW_ASSIGNED', title: 'New case awaiting review', message: 'Rice — AI suggests "Rice Blast" at 61% confidence. Open the expert queue to claim it.', analysisId: a2.id },
      ],
    });

    // ── Demo 3: Cotton — expert corrected the AI ──
    const cotton = await cropByName('Cotton');
    const img3 = await storage.saveImage({
      buffer: await makeDemoImage('cotton-leaf-curl', { base: '#3f8f3a', spot: '#a8b52f', spots: 8, curl: true }),
      originalName: 'demo-cotton-leaf.jpg',
      declaredMimeType: 'image/jpeg',
    });
    const image3 = await prisma.uploadedImage.create({
      data: { userId: farmer2.id, storageKey: img3.storageKey, thumbKey: img3.thumbKey, originalName: 'demo-cotton-leaf.jpg', mimeType: img3.mimeType, sizeBytes: img3.sizeBytes, width: img3.width, height: img3.height, sha256: img3.sha256 },
    });
    const leafCurl = diseaseByName(cotton, 'Cotton Leaf Curl Virus');
    const a3 = await prisma.cropAnalysis.create({
      data: {
        farmerId: farmer2.id, cropTypeId: cotton.id, imageId: image3.id, status: 'EXPERT_REVIEWED',
        symptoms: 'Leaves curling upward, veins look thick and dark, plants not growing well',
        locationText: 'Thirumangalam, Madurai, Tamil Nadu', latitude: 9.8204, longitude: 77.9811,
        createdAt: new Date(Date.now() - 9 * 24 * 3600 * 1000),
        aiResult: {
          create: {
            provider: 'mock', isMock: true, modelVersion: 'vortex-heuristic-v1',
            predictedDiseaseId: diseaseByName(cotton, 'Alternaria Leaf Spot').id, predictedLabel: 'Alternaria Leaf Spot',
            confidence: 0.58, severity: 'MODERATE', healthy: false,
            indicators: ['Yellow-green mottling across ~15% of the sampled area', 'Leaf margins curling upward', 'Vein thickening visible near midrib'],
            reasoning: 'Discoloration and mild spotting weakly suggest Alternaria leaf spot, but curling symptoms are atypical. Confidence low — expert review recommended.',
            needsExpertReview: true, processingTimeMs: 1975,
          },
        },
        expertReview: {
          create: {
            status: 'COMPLETED', expertId: expert.id, decision: 'CORRECTED',
            finalDiseaseId: leafCurl.id, finalSeverity: 'HIGH',
            confidenceNote: 'AI misread viral curl symptoms as fungal spotting.',
            treatmentGuidance: 'Rogue out severely curled plants immediately.\nSpray spiromesifen 22.9% SC @ 1 ml/L targeting whiteflies on leaf undersides.\nFollow with 1% neem oil after 5 days to suppress re-infestation.',
            preventiveAdvice: 'Install yellow sticky traps @ 5/acre and erect 40-mesh nursery barriers next season.\nKeep bunds weed-free — weeds host whiteflies.\nFor next cycle, choose a leaf-curl-tolerant hybrid.',
            comments: 'Classic upward curling with vein thickening and enations — Cotton Leaf Curl Virus. The farmer should act within a week to protect neighbouring plants.',
            claimedAt: new Date(Date.now() - 8.6 * 24 * 3600 * 1000),
            completedAt: new Date(Date.now() - 8.4 * 24 * 3600 * 1000),
          },
        },
        guidances: {
          create: [
            {
              source: 'AI', title: 'AI treatment guidance',
              steps: { treatment: ['Mancozeb @ 2.5 g/L spray; correct potassium deficiency.'], prevention: ['Balanced nutrition; avoid dense canopies.', 'Rotate crops; manage residue.'], safety: [], disclaimer: 'Superseded by expert review.' },
            },
            {
              source: 'EXPERT', title: 'Expert-validated guidance',
              steps: {
                treatment: ['Rogue out severely curled plants immediately.', 'Spray spiromesifen 22.9% SC @ 1 ml/L targeting whiteflies on leaf undersides.', 'Follow with 1% neem oil after 5 days to suppress re-infestation.'],
                prevention: ['Install yellow sticky traps @ 5/acre and erect 40-mesh nursery barriers next season.', 'Keep bunds weed-free — weeds host whiteflies.', 'For next cycle, choose a leaf-curl-tolerant hybrid.'],
                expertComments: ['Classic upward curling with vein thickening and enations — Cotton Leaf Curl Virus. The farmer should act within a week to protect neighbouring plants.'],
              },
            },
          ],
        },
      },
    });
    await prisma.notification.createMany({
      data: [
        { userId: farmer2.id, type: 'EXPERT_REVIEW_COMPLETED', title: 'Expert review completed', message: 'Dr. Meera Krishnan has reviewed your Cotton analysis. Open it to see the validated diagnosis and treatment plan.', analysisId: a3.id },
        { userId: farmer2.id, type: 'EXPERT_REVIEW_NEEDED', title: 'Expert review in progress', message: 'Your Cotton analysis was flagged for expert validation.', analysisId: a3.id, read: true },
      ],
    });

    console.log('✓ Demo analyses: 3 (AI completed / review pending / expert corrected)');
  }

  // 5. Activity log ──
  await prisma.activityLog.deleteMany({});
  await prisma.activityLog.createMany({
    data: [
      { actorId: admin.id, action: 'USER_REGISTERED', entityType: 'User', entityId: admin.id, meta: { role: 'ADMIN', seed: true } },
      { actorId: expert.id, action: 'USER_REGISTERED', entityType: 'User', entityId: expert.id, meta: { role: 'EXPERT', seed: true } },
      { actorId: admin.id, action: 'EXPERT_APPROVED', entityType: 'User', entityId: expert.id, meta: { seed: true } },
      { actorId: farmer.id, action: 'USER_REGISTERED', entityType: 'User', entityId: farmer.id, meta: { role: 'FARMER', seed: true } },
      { actorId: farmer2.id, action: 'USER_REGISTERED', entityType: 'User', entityId: farmer2.id, meta: { role: 'FARMER', seed: true } },
      { actorId: null, action: 'EXPERT_PENDING_REGISTRATION', entityType: 'User', entityId: pendingExpert.id, meta: { name: 'Dr. Senthil Raj' } },
    ],
  });
  console.log('✓ Activity log');

  console.log('═══ VORTEX seed complete ═══');
  console.log('Demo accounts (development only):');
  console.log('  farmer@vortex.app  / Farmer@1234  (Ravi Kumar, Sulur, Coimbatore)');
  console.log('  expert@vortex.app  / Expert@1234  (Dr. Meera Krishnan, Plant Pathology)');
  console.log('  admin@vortex.app   / Admin@1234   (Arjun Nair, Platform Admin)');
  console.log('  [pending expert awaiting approval: senthil@vortex.app]');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
