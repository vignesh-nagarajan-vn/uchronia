import type { Dial, Lens, Mechanism } from '@uchronia/schemas'

/** F1/v2-M16 - the curated gallery: 60+ divergences spanning eras, regions, mechanisms. */
export interface GalleryEntry {
  slug: string
  yearLabel: string
  region: string
  mechanism: Mechanism
  title: string
  line: string
  podText: string
  dial: Dial
  horizonYears: number
  lenses?: Lens[]
  /** Intake hints (v2/M16): prefill the interpretation card with no API call. */
  hint: {
    statement: string
    year: number
    dateLabel: string
    baselineContext: string
  }
}

export const GALLERY: GalleryEntry[] = [
  {
    slug: 'bronze-age',
    yearLabel: '1177 BC',
    region: 'Mediterranean',
    mechanism: 'politics',
    title: 'The Bronze Age holds',
    line: 'The palace economies weather the storm of the Sea Peoples; no dark centuries follow.',
    podText:
      'The Bronze Age Collapse is averted in 1177 BC and the palace economies of the eastern Mediterranean survive',
    dial: 35,
    horizonYears: 250,
    hint: {
      statement:
        'The palace states of the eastern Mediterranean survive the crisis of the twelfth century BC intact.',
      year: -1177,
      dateLabel: '1177 BC',
      baselineContext:
        'Within about fifty years either side of 1200 BC the Hittite capital Hattusa, Ugarit, Mycenae, and dozens of other centres burned or were abandoned. Ramesses III recorded repelling a coalition he called the Sea Peoples in his eighth year, around 1177 BC. Long-distance trade, palace bureaucracy, and writing in Greece and Anatolia contracted for centuries.',
    },
  },
  {
    slug: 'salamis',
    yearLabel: '480 BC',
    region: 'Mediterranean',
    mechanism: 'politics',
    title: 'Persia wins at Salamis',
    line: 'The narrows go the other way, and the Aegean becomes an imperial lake.',
    podText:
      'The Persian fleet destroys the allied Greek ships at Salamis in 480 BC and Xerxes completes his conquest of the Greek mainland',
    dial: 45,
    horizonYears: 250,
    lenses: ['political', 'cultural'],
    hint: {
      statement:
        'Xerxes wins the sea battle at Salamis and Persian rule closes over the Greek mainland.',
      year: -480,
      dateLabel: 'September 480 BC',
      baselineContext:
        'In September 480 BC the allied Greek fleet, drawn into the narrows off Salamis on Themistocles’ urging, wrecked a much larger Persian armada. Xerxes withdrew to Asia with part of his forces and left Mardonius behind; a Greek coalition destroyed that army at Plataea the next summer. Athens itself was evacuated and burned twice in those two years, then went on to build its maritime league.',
    },
  },
  {
    slug: 'alexander-lives',
    yearLabel: '323 BC',
    region: 'Middle East',
    mechanism: 'politics',
    title: 'Alexander survives Babylon',
    line: 'The fever breaks, and an empire gets the twenty years it needed to become a state.',
    podText:
      'Alexander recovers from his illness at Babylon in 323 BC and rules his empire for another two decades',
    dial: 50,
    horizonYears: 200,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Alexander recovers from the illness that killed him at Babylon and rules for another twenty years.',
      year: -323,
      dateLabel: 'June 323 BC',
      baselineContext:
        'Alexander died at Babylon in June 323 BC, aged thirty-two, after a march that reached the Indus and a fever that lasted about ten days. He left no adult heir and no settled succession. His generals divided the conquests in the Wars of the Diadochi, producing the Seleucid, Ptolemaic, and Antigonid kingdoms.',
    },
  },
  {
    slug: 'meroe-iron',
    yearLabel: '300 BC',
    region: 'Africa',
    mechanism: 'technology',
    title: 'Meroë multiplies its furnaces',
    line: 'Kushite iron travels with Kushite traders, and the Nile corridor stops being the edge of the technique.',
    podText:
      'The iron industry of Meroë expands into an export trade after 300 BC and Kushite metallurgy spreads widely along the Nile and into the Sahel',
    dial: 40,
    horizonYears: 300,
    lenses: ['technological', 'economic'],
    hint: {
      statement:
        'Meroë turns its ironworking into a large export industry that carries the technique far beyond Kush.',
      year: -300,
      dateLabel: '300 BC',
      baselineContext:
        'By the third century BC Meroë, the Kushite capital on the middle Nile, was smelting iron on a substantial scale; slag heaps still ring the site. Its output armed Kushite forces and supplied local tools, and its trade reached the Red Sea, but claims that Meroë was an industrial hub for the continent are now treated as overstated. Ironworking elsewhere in Africa, including the Nok region, developed on its own timetable.',
    },
  },
  {
    slug: 'ashoka-endures',
    yearLabel: '232 BC',
    region: 'South Asia',
    mechanism: 'culture',
    title: 'The dhamma state endures',
    line: 'Ashoka’s edicts outlive Ashoka, and the subcontinent keeps one law and one conscience.',
    podText:
      'The Mauryan empire holds together after Ashoka’s death in 232 BC and his dhamma administration becomes a durable institution',
    dial: 40,
    horizonYears: 250,
    lenses: ['political', 'cultural'],
    hint: {
      statement:
        'The Mauryan empire survives Ashoka’s death and his dhamma administration hardens into a lasting institution.',
      year: -232,
      dateLabel: '232 BC',
      baselineContext:
        'After the Kalinga war of about 261 BC, Ashoka had edicts cut into rock and pillars across the subcontinent, endowed Buddhist institutions, and sent missions abroad, including to Sri Lanka. He died around 232 BC. The empire fragmented within decades, and the last Mauryan ruler was displaced by Pushyamitra Shunga around 185 BC.',
    },
  },
  {
    slug: 'qin-fails',
    yearLabel: '221 BC',
    region: 'East Asia',
    mechanism: 'politics',
    title: 'The Qin unification fails',
    line: 'No single script, no single road gauge, and the warring states go on warring.',
    podText:
      'The Qin conquest of the warring states fails in 221 BC and China remains a system of competing kingdoms',
    dial: 40,
    horizonYears: 250,
    lenses: ['political', 'cultural'],
    hint: {
      statement:
        'Qin fails to complete its conquest in 221 BC and China remains a plural system of rival kingdoms.',
      year: -221,
      dateLabel: '221 BC',
      baselineContext:
        'In 221 BC the Qin king took the title Shi Huangdi after defeating the last of the rival states, then standardised script, weights, measures, and axle widths and drove a road and canal programme with conscript labour. The dynasty itself collapsed in rebellion by 206 BC, but the Han inherited its unified imperial model, which set the template for two millennia.',
    },
  },
  {
    slug: 'cannae',
    yearLabel: '216 BC',
    region: 'Mediterranean',
    mechanism: 'politics',
    title: 'Hannibal marches on Rome',
    line: 'The victory at Cannae is cashed in, and the Mediterranean gets a Carthaginian century.',
    podText:
      'Hannibal marches on Rome after Cannae in 216 BC and forces a settlement that leaves Carthage dominant in the western Mediterranean',
    dial: 45,
    horizonYears: 200,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Hannibal follows up Cannae by moving on Rome itself and dictates terms that leave Carthage dominant.',
      year: -216,
      dateLabel: 'August 216 BC',
      baselineContext:
        'On 2 August 216 BC Hannibal enveloped and destroyed the largest army Rome had yet fielded near Cannae in Apulia. He did not besiege Rome, which refused to negotiate and raised fresh legions; several southern Italian cities defected to him. Rome ground the war out for fourteen more years, invaded Africa, and defeated him at Zama in 202 BC.',
    },
  },
  {
    slug: 'alexandria',
    yearLabel: '48 BC',
    region: 'Mediterranean',
    mechanism: 'knowledge',
    title: 'The library never burns',
    line: 'Caesar’s fire spares the dockside stacks; the ancient world keeps its memory.',
    podText: 'The Library of Alexandria never burns in 48 BC',
    dial: 40,
    horizonYears: 200,
    hint: {
      statement:
        'The fire of the Alexandrian war spares the library and its collections pass on intact.',
      year: -48,
      dateLabel: '48 BC',
      baselineContext:
        'In 48 BC Caesar, besieged in Alexandria during the dynastic war between Cleopatra and Ptolemy XIII, burned ships in the harbour; ancient writers report the blaze spread to dockside buildings and destroyed books. The library as an institution declined over centuries through lost patronage, expelled scholars, and later conflicts rather than in one night.',
    },
  },
  {
    slug: 'varus',
    yearLabel: 'AD 9',
    region: 'Europe',
    mechanism: 'politics',
    title: 'Rome keeps Germania',
    line: 'The legions come out of the forest, and the frontier moves to the Elbe.',
    podText:
      'Varus survives the ambush in the Teutoburg Forest in AD 9 and Rome annexes Germania to the Elbe',
    dial: 45,
    horizonYears: 250,
    lenses: ['political', 'cultural'],
    hint: {
      statement:
        'Varus escapes the Teutoburg ambush and Rome carries its province east to the Elbe.',
      year: 9,
      dateLabel: 'AD 9',
      baselineContext:
        'In AD 9 Arminius, a Cheruscan officer trained in Roman service, led three legions under Publius Quinctilius Varus into a running ambush in northern Germany and annihilated them. Augustus abandoned the project of holding Germania beyond the Rhine, and later punitive campaigns under Germanicus did not restore the province. The Rhine and Danube stayed the frontier for four centuries.',
    },
  },
  {
    slug: 'hero-steam',
    yearLabel: 'AD 62',
    region: 'Mediterranean',
    mechanism: 'technology',
    title: 'Hero’s engine does work',
    line: 'The toy on the temple bench turns a mill, and antiquity finds a use for pressure.',
    podText:
      'Hero of Alexandria’s steam device is developed into practical machinery around AD 62 and steam power enters use in the Roman world',
    dial: 55,
    horizonYears: 200,
    lenses: ['technological', 'economic'],
    hint: {
      statement:
        'Hero’s steam device is developed into working machinery and steam power enters Roman industry.',
      year: 62,
      dateLabel: 'AD 62',
      baselineContext:
        'Around AD 62 Hero of Alexandria described the aeolipile in his Pneumatica, a sphere spun by escaping steam, alongside siphons, automata, and a coin-operated dispenser. It stayed a demonstration piece: there were no pressure vessels, no precision boring, no coal industry, and abundant animal and enslaved labour. Hero’s writings did preserve real advances in gearing and water-lifting.',
    },
  },
  {
    slug: 'gan-ying',
    yearLabel: 'AD 97',
    region: 'the wider world',
    mechanism: 'knowledge',
    title: 'Gan Ying reaches Rome',
    line: 'The Han envoy takes the ship anyway, and two empires stop being each other’s rumour.',
    podText:
      'The Han envoy Gan Ying completes his journey to Rome in AD 97 and permanent direct contact is established between the Han and Roman empires',
    dial: 45,
    horizonYears: 250,
    lenses: ['political', 'economic', 'cultural'],
    hint: {
      statement:
        'Gan Ying crosses to Rome in AD 97 and the Han and Roman empires open direct, continuing contact.',
      year: 97,
      dateLabel: 'AD 97',
      baselineContext:
        'In AD 97 the general Ban Chao sent his officer Gan Ying west from the Han protectorates toward the land the Chinese called Daqin. Gan Ying reached the Persian Gulf and turned back after Parthian intermediaries warned him the sea passage could take years. Silk moved between the two empires through Parthian and Indian middlemen, and each knew the other mainly by report.',
    },
  },
  {
    slug: 'antonine-plague',
    yearLabel: 'AD 165',
    region: 'Mediterranean',
    mechanism: 'disease',
    title: 'The Antonine plague never lands',
    line: 'The legions come home from Parthia carrying only loot; the empire keeps its people.',
    podText:
      'The Antonine Plague never reaches the Roman world after AD 165 and the empire keeps its population and its armies intact',
    dial: 40,
    horizonYears: 200,
    lenses: ['political', 'economic', 'daily-life'],
    hint: {
      statement: 'The epidemic that spread through the Roman world from AD 165 never takes hold.',
      year: 165,
      dateLabel: 'AD 165',
      baselineContext:
        'From AD 165 an epidemic, most often identified as smallpox, spread through armies returning from the Parthian war and then through the provinces, recurring for a generation. Estimates of the death toll range widely, commonly from a few million upward. Lucius Verus died in 169 and Marcus Aurelius in 180, and the empire faced simultaneous frontier pressure with thinned ranks and revenues.',
    },
  },
  {
    slug: 'justinian-plague',
    yearLabel: '541',
    region: 'Mediterranean',
    mechanism: 'disease',
    title: 'Justinian keeps his reconquest',
    line: 'No plague ship at Pelusium, and the Mediterranean stays a Roman lake a little longer.',
    podText:
      'The plague of 541 never reaches the Roman Mediterranean and Justinian’s reconquest of the west is consolidated',
    dial: 40,
    horizonYears: 200,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The plague of 541 never reaches the empire and Justinian consolidates his western reconquest.',
      year: 541,
      dateLabel: '541',
      baselineContext:
        'Plague was reported at Pelusium in Egypt in 541 and reached Constantinople in 542, in the middle of Justinian’s campaigns to retake North Africa and Italy. It returned in waves for two centuries. The Gothic war dragged to 554 and left Italy wrecked; imperial manpower and finances never again stretched to holding the whole Mediterranean rim.',
    },
  },
  {
    slug: 'tours',
    yearLabel: '732',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The Franks lose at Tours',
    line: 'The Loire is not the limit, and Latin Christendom negotiates from a much shorter table.',
    podText:
      'The Umayyad army defeats Charles Martel near Tours in 732 and Muslim rule extends north of the Loire',
    dial: 45,
    horizonYears: 200,
    lenses: ['political', 'cultural'],
    hint: {
      statement:
        'Charles Martel is beaten near Tours in 732 and Umayyad authority extends north of the Loire.',
      year: 732,
      dateLabel: 'October 732',
      baselineContext:
        'In October 732 a Frankish force under Charles Martel held its ground against an Umayyad column near Poitiers and killed its commander, Abd al-Rahman al-Ghafiqi. Raiding from al-Andalus continued for decades, and historians now read the battle as one episode in a longer contest rather than a single turning point. Martel’s prestige helped his family replace the Merovingians and found the Carolingian line.',
    },
  },
  {
    slug: 'vinland',
    yearLabel: '1000',
    region: 'North America',
    mechanism: 'economics',
    title: 'Vinland takes root',
    line: 'The Greenland colony holds its western outpost, and the Atlantic is crossed both ways for centuries.',
    podText:
      'The Norse settlement in Vinland survives past 1000 as a paying timber and fur station, and permanent contact is maintained between Europe and North America',
    dial: 50,
    horizonYears: 250,
    lenses: ['political', 'economic', 'daily-life'],
    hint: {
      statement:
        'The Norse settlement in North America survives and keeps a permanent link across the Atlantic.',
      year: 1000,
      dateLabel: 'around 1000',
      baselineContext:
        'Around the year 1000 Norse voyagers from Greenland built a small base at L’Anse aux Meadows in Newfoundland; tree-ring dating places wood cutting there in 1021. The camp was used briefly and abandoned amid conflict with local peoples, a supply line thousands of kilometres long, and no cargo worth the passage. The Greenland colonies themselves died out in the fifteenth century.',
    },
  },
  {
    slug: 'hastings',
    yearLabel: '1066',
    region: 'Europe',
    mechanism: 'politics',
    title: 'Harold holds at Hastings',
    line: 'England stays a North Sea kingdom, and its lords keep speaking English.',
    podText:
      'Harold Godwinson defeats William of Normandy at Hastings in 1066 and the English kingdom survives the invasion',
    dial: 55,
    horizonYears: 200,
    lenses: ['political', 'cultural'],
    hint: {
      statement: 'Harold Godwinson beats William of Normandy at Hastings and keeps his crown.',
      year: 1066,
      dateLabel: 'October 1066',
      baselineContext:
        'On 14 October 1066, three weeks after destroying a Norwegian invasion at Stamford Bridge and marching south, Harold’s army was defeated near Hastings and Harold was killed. William was crowned that Christmas and spent years suppressing revolts. Norman rule replaced almost the entire English landholding class, reshaped the church, and pushed French into law, court, and government.',
    },
  },
  {
    slug: 'baghdad-1258',
    yearLabel: '1258',
    region: 'Middle East',
    mechanism: 'knowledge',
    title: 'Baghdad is spared',
    line: 'The city negotiates instead of burning, and its libraries keep their shelves.',
    podText:
      'Baghdad negotiates its surrender to the Mongols in 1258 and the city, its libraries, and the Abbasid caliphate survive',
    dial: 45,
    horizonYears: 200,
    lenses: ['political', 'cultural'],
    hint: {
      statement:
        'Baghdad comes to terms with Hulagu in 1258 and the city, its libraries, and the caliphate survive.',
      year: 1258,
      dateLabel: 'February 1258',
      baselineContext:
        'In February 1258 Hulagu’s Mongol army took Baghdad after a short siege, killed the last Abbasid caliph al-Musta‘sim, and put much of the city to the sword; canals, colleges, and collections were destroyed. Chroniclers’ death tolls vary from tens of thousands to hundreds of thousands. Five centuries of Abbasid rule ended, and Cairo became the centre of Sunni learning.',
    },
  },
  {
    slug: 'polynesian-voyaging',
    yearLabel: '1300',
    region: 'Oceania',
    mechanism: 'knowledge',
    title: 'The voyaging never stops',
    line: 'The sailing directions stay in use, and the largest ocean keeps one conversation going.',
    podText:
      'Polynesian long-distance voyaging continues after 1300 instead of declining, keeping the whole Pacific triangle in regular contact',
    dial: 45,
    horizonYears: 300,
    lenses: ['cultural', 'economic', 'technological'],
    hint: {
      statement:
        'Polynesian long-distance voyaging continues after 1300 and keeps the whole ocean in regular contact.',
      year: 1300,
      dateLabel: 'around 1300',
      baselineContext:
        'By about 1300 Polynesian navigators had settled the far corners of the triangle, from Hawaii to Rapa Nui to Aotearoa, sailing double-hulled canoes by stars, swells, and birds. Over the following centuries regular long-distance voyaging fell away as populations settled into island groups, and some communities, including Rapa Nui and the Chathams, lost contact with the rest of the ocean.',
    },
  },
  {
    slug: 'mansa-musa',
    yearLabel: '1324',
    region: 'Africa',
    mechanism: 'economics',
    title: 'Mali banks its gold',
    line: 'The pilgrimage buys institutions instead of astonishment, and Timbuktu outlasts its dynasty.',
    podText:
      'Mansa Musa converts Mali’s gold revenues after 1324 into permanent institutions, and the empire and its scholarly centres survive as a durable Sahelian power',
    dial: 45,
    horizonYears: 250,
    lenses: ['economic', 'cultural', 'political'],
    hint: {
      statement:
        'Mansa Musa turns Mali’s gold into lasting institutions and the empire holds together for centuries.',
      year: 1324,
      dateLabel: '1324',
      baselineContext:
        'In 1324 Mansa Musa of Mali travelled to Cairo and Mecca with a caravan whose gold spending, Egyptian writers reported, depressed prices in Cairo for years. He returned with scholars and the architect al-Sahili, and Timbuktu and Djenné grew as centres of learning and trade. Mali’s succession disputes and tributary revolts fragmented the empire over the following century, and Songhai displaced it.',
    },
  },
  {
    slug: 'black-death',
    yearLabel: '1347',
    region: 'Europe',
    mechanism: 'disease',
    title: 'The Black Death is contained',
    line: 'The Messina galleys are turned back, and Europe keeps its crowded, cheap-labour century.',
    podText:
      'The Black Death is contained at the Mediterranean ports in 1347 and Europe is spared the great mortality',
    dial: 35,
    horizonYears: 200,
    lenses: ['economic', 'daily-life', 'cultural'],
    hint: {
      statement:
        'The plague of 1347 is stopped at the Mediterranean ports and never sweeps Europe.',
      year: 1347,
      dateLabel: 'October 1347',
      baselineContext:
        'In October 1347 Genoese ships arriving at Messina from the Black Sea carried plague, which spread along trade routes across Europe by 1351 and killed perhaps a third to a half of the population. Labour scarcity raised wages and loosened serfdom in the west, land use shifted toward pasture, and the church’s authority took lasting damage. Outbreaks recurred into the eighteenth century.',
    },
  },
  {
    slug: 'majapahit',
    yearLabel: '1389',
    region: 'Southeast Asia',
    mechanism: 'politics',
    title: 'Majapahit holds the straits',
    line: 'The succession is settled quietly, and the Java Sea keeps its own customs house.',
    podText:
      'Majapahit survives the succession crisis after Hayam Wuruk’s death in 1389 and remains the dominant power in the Java Sea trade',
    dial: 45,
    horizonYears: 200,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Majapahit survives the succession crisis of 1389 and keeps command of the Java Sea trade.',
      year: 1389,
      dateLabel: '1389',
      baselineContext:
        'Under Hayam Wuruk and his minister Gajah Mada, who died in 1364, Majapahit drew tribute and trade from ports across the archipelago. Hayam Wuruk died in 1389 and a war of succession, the Paregreg, broke out in 1404. Over the following century Islamic port sultanates, Demak above all, took over the trade routes, and Majapahit faded by the early sixteenth century.',
    },
  },
  {
    slug: 'timur-ming',
    yearLabel: '1405',
    region: 'East Asia',
    mechanism: 'politics',
    title: 'Timur lives to march east',
    line: 'The campaign against the Ming actually happens, and two enormous armies find each other.',
    podText: 'Timur does not die in 1405 and carries out his planned invasion of Ming China',
    dial: 55,
    horizonYears: 150,
    lenses: ['political', 'economic'],
    hint: {
      statement: 'Timur survives to launch the eastern campaign against Ming China he had planned.',
      year: 1405,
      dateLabel: 'February 1405',
      baselineContext:
        'Timur died in February 1405 at Otrar, at the start of a winter march east against the Ming; his army turned back. His conquests from Delhi to Anatolia were divided among quarrelling heirs, and the Timurid realm shrank to Iran and Central Asia, where it produced the Samarkand and Herat renaissance. The Yongle emperor meanwhile turned Ming attention to the sea and to Annam.',
    },
  },
  {
    slug: 'angkor-water',
    yearLabel: '1431',
    region: 'Southeast Asia',
    mechanism: 'environment',
    title: 'Angkor keeps its water',
    line: 'The reservoirs are dredged in time, and the greatest city of its age does not move south.',
    podText:
      'Angkor’s hydraulic network is repaired and adapted to the monsoon failures of the fifteenth century, and the Khmer capital is never abandoned',
    dial: 40,
    horizonYears: 200,
    lenses: ['technological', 'economic', 'daily-life'],
    hint: {
      statement:
        'Angkor repairs its reservoirs and canals through the monsoon failures and never abandons the capital.',
      year: 1431,
      dateLabel: '1431',
      baselineContext:
        'Angkor’s reservoirs and canals watered one of the largest pre-industrial urban areas in the world. Tree-ring records show severe droughts broken by intense monsoons in the fourteenth and fifteenth centuries, which silted and breached parts of the network. After an Ayutthayan attack traditionally dated to 1431 the Khmer court shifted toward the Phnom Penh area and the maritime trade.',
    },
  },
  {
    slug: 'zheng-he',
    yearLabel: '1433',
    region: 'East Asia',
    mechanism: 'politics',
    title: 'The treasure fleets sail on',
    line: 'The Ming keep their ocean; the age of discovery speaks Chinese first.',
    podText:
      "Zheng He's treasure fleets are never scrapped after 1433 and Ming China keeps its ocean-going navy",
    dial: 45,
    horizonYears: 200,
    hint: {
      statement:
        'The Ming keep their ocean-going fleets in service after 1433 instead of dismantling them.',
      year: 1433,
      dateLabel: '1433',
      baselineContext:
        'The seventh and last of the Ming treasure voyages returned in 1433; Zheng He died around that time. The court, pressed by Mongol threats in the north, the cost of the fleets, and officials hostile to eunuch-run enterprises, ended the expeditions, restricted private overseas trade, and let the shipyards decay. Chinese merchants kept trading in Southeast Asia without state fleets behind them.',
    },
  },
  {
    slug: 'constantinople',
    yearLabel: '1453',
    region: 'Mediterranean',
    mechanism: 'politics',
    title: 'Constantinople holds',
    line: 'The Theodosian walls break the assault; the Eastern Roman Empire lives past May.',
    podText: 'Constantinople does not fall in 1453; the Theodosian walls hold against Mehmed II',
    dial: 55,
    horizonYears: 150,
    hint: {
      statement: 'The walls of Constantinople hold against Mehmed II and the city is not taken.',
      year: 1453,
      dateLabel: 'May 1453',
      baselineContext:
        'Mehmed II besieged Constantinople from early April 1453 with heavy cannon and a fleet dragged past the boom; the city, defended by perhaps seven thousand men, fell on 29 May and Constantine XI died in the fighting. The Ottomans made it their capital, and the eastern Roman state, already reduced to the city and a few enclaves, ended.',
    },
  },
  {
    slug: 'gutenberg',
    yearLabel: '1455',
    region: 'Europe',
    mechanism: 'technology',
    title: 'The press is suppressed',
    line: 'Mainz’s creditors and clergy smother movable type for a century.',
    podText:
      'Gutenberg’s printing press is suppressed by church and guild for a century after 1455',
    dial: 50,
    horizonYears: 180,
    hint: {
      statement:
        'Movable-type printing is suppressed in Europe for a century after Gutenberg’s first Bibles.',
      year: 1455,
      dateLabel: '1455',
      baselineContext:
        'Gutenberg’s forty-two-line Bible was finished around 1455, the same year a lawsuit gave his financier Johann Fust control of the workshop. Printers trained at Mainz spread the craft across Europe within two decades, and by 1500 hundreds of towns had presses and millions of books were in circulation. Censorship came later and never caught up with the technology.',
    },
  },
  {
    slug: 'al-andalus',
    yearLabel: '1492',
    region: 'Middle East',
    mechanism: 'culture',
    title: 'Al-Andalus endures',
    line: 'Granada negotiates survival; convivencia gets another act.',
    podText:
      'Al-Andalus endures past 1492; Granada negotiates a lasting settlement instead of surrendering',
    dial: 45,
    horizonYears: 200,
    hint: {
      statement:
        'Granada secures a durable settlement in 1492 and Muslim Iberia survives as a polity.',
      year: 1492,
      dateLabel: 'January 1492',
      baselineContext:
        'Granada capitulated to Ferdinand and Isabella on 2 January 1492 after a decade of war, on terms promising religious freedom. Those terms were abandoned within a decade: the Alhambra Decree of March 1492 expelled Jews who would not convert, forced conversions of Muslims followed from 1500, and the Moriscos were expelled between 1609 and 1614.',
    },
  },
  {
    slug: 'luther-recants',
    yearLabel: '1521',
    region: 'Europe',
    mechanism: 'culture',
    title: 'Luther recants at Worms',
    line: 'One retraction, and the reform stays inside the church that resisted it.',
    podText:
      'Luther recants before Charles V at the Diet of Worms in 1521 and the reform movement is contained within the Catholic church',
    dial: 55,
    horizonYears: 200,
    lenses: ['cultural', 'political'],
    hint: {
      statement:
        'Luther recants before Charles V at Worms and the reform is absorbed back into the church.',
      year: 1521,
      dateLabel: 'April 1521',
      baselineContext:
        'Summoned before Charles V at the Diet of Worms in April 1521, Luther refused to retract his writings. The Edict of Worms outlawed him; Frederick the Wise of Saxony hid him at the Wartburg, where he translated the New Testament into German. Printing carried the dispute across the empire, and the resulting split ran through a century of religious war ending in 1648.',
    },
  },
  {
    slug: 'tenochtitlan',
    yearLabel: '1521',
    region: 'North America',
    mechanism: 'disease',
    title: 'Tenochtitlan holds the causeways',
    line: 'Without the epidemic, the siege lines are the ones that starve.',
    podText: 'Smallpox never reaches central Mexico and Tenochtitlan withstands the siege of 1521',
    dial: 45,
    horizonYears: 200,
    lenses: ['political', 'daily-life'],
    hint: {
      statement:
        'Smallpox never reaches central Mexico and Tenochtitlan survives the siege of 1521.',
      year: 1521,
      dateLabel: '1521',
      baselineContext:
        'Smallpox reached central Mexico in 1520, killing the ruler Cuitláhuac and a large share of the city’s population and fighting men. Cortés besieged Tenochtitlan from May 1521 with tens of thousands of Tlaxcalan and other allied troops and a fleet of small ships on the lake; Cuauhtémoc surrendered in August. Successive epidemics through the century reduced the population of Mexico catastrophically.',
    },
  },
  {
    slug: 'cajamarca',
    yearLabel: '1532',
    region: 'South America',
    mechanism: 'politics',
    title: 'Atahualpa holds Cajamarca',
    line: 'The ambush fails, and the Andes keep their own accounts.',
    podText:
      'Atahualpa is not captured at Cajamarca in 1532 and the Inca state destroys Pizarro’s expedition',
    dial: 45,
    horizonYears: 200,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Atahualpa avoids the trap at Cajamarca and the Inca state destroys Pizarro’s expedition.',
      year: 1532,
      dateLabel: 'November 1532',
      baselineContext:
        'On 16 November 1532 Pizarro’s force of about 168 men seized Atahualpa in the square at Cajamarca and killed much of his entourage. The Inca had just won a civil war against his brother Huáscar, and an earlier epidemic had killed their father Huayna Capac and his heir. Atahualpa was executed in 1533; resistance continued from Vilcabamba until 1572.',
    },
  },
  {
    slug: 'ethiopia-adal',
    yearLabel: '1543',
    region: 'Africa',
    mechanism: 'politics',
    title: 'Adal keeps the highlands',
    line: 'The horn of Africa is unified from the lowlands up, and the Christian kingdom does not return.',
    podText:
      'The forces of Adal defeat Emperor Gelawdewos in 1543 and consolidate control over the Ethiopian highlands',
    dial: 45,
    horizonYears: 200,
    lenses: ['political', 'cultural'],
    hint: {
      statement:
        'Adal wins the campaign of 1543 and consolidates its rule over the Ethiopian highlands.',
      year: 1543,
      dateLabel: 'February 1543',
      baselineContext:
        'From 1529 Imam Ahmad ibn Ibrahim al-Ghazi of Adal overran much of the Ethiopian highlands, and Emperor Lebna Dengel died a fugitive in 1540. A Portuguese musketeer contingent arrived in 1541; its commander Cristóvão da Gama was captured and killed, but the survivors joined Emperor Gelawdewos, who defeated and killed Ahmad at Wayna Daga in February 1543. The wars left both states exhausted before the Oromo migrations.',
    },
  },
  {
    slug: 'armada',
    yearLabel: '1588',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The Armada gets through',
    line: 'The fireships miss, the junction holds, and Parma’s veterans land in Kent.',
    podText:
      'The Spanish Armada makes its junction with Parma’s army in 1588 and lands an invasion force in England',
    dial: 50,
    horizonYears: 150,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The Armada joins Parma’s army in 1588 and puts a Spanish invasion force ashore in England.',
      year: 1588,
      dateLabel: 'August 1588',
      baselineContext:
        'In August 1588 English fireships scattered the Armada from its anchorage off Calais before it could embark Parma’s troops in Flanders, and the running fight at Gravelines pushed it into the North Sea. Storms wrecked many ships on the Irish and Scottish coasts on the voyage home, and about half the fleet was lost. The Anglo-Spanish war continued inconclusively until 1604.',
    },
  },
  {
    slug: 'tondibi',
    yearLabel: '1591',
    region: 'Africa',
    mechanism: 'technology',
    title: 'Songhai answers the muskets',
    line: 'The Niger empire buys its own firearms in time, and the Sahara stays a Songhai road.',
    podText:
      'Songhai adopts firearms and defeats the Moroccan expedition at Tondibi in 1591, preserving the empire and its control of the trans-Saharan trade',
    dial: 45,
    horizonYears: 200,
    lenses: ['technological', 'economic', 'political'],
    hint: {
      statement:
        'Songhai fields firearms of its own and defeats the Moroccan invasion at Tondibi in 1591.',
      year: 1591,
      dateLabel: 'March 1591',
      baselineContext:
        'In March 1591 a Moroccan expedition sent by Ahmad al-Mansur across the Sahara, equipped with muskets and light cannon under Judar Pasha, routed the much larger army of Askia Ishaq II at Tondibi and then took Gao and Timbuktu. Songhai broke into successor states, scholars including Ahmad Baba were deported to Marrakesh, and the gold and salt trade shifted toward the Atlantic coast.',
    },
  },
  {
    slug: 'sakoku',
    yearLabel: '1639',
    region: 'East Asia',
    mechanism: 'economics',
    title: 'Japan never closes',
    line: 'The shogunate keeps its ports open, and Japanese ships stay in the China seas.',
    podText:
      'The Tokugawa shogunate does not close the country in 1639 and Japan remains open to foreign trade and overseas voyaging',
    dial: 45,
    horizonYears: 200,
    lenses: ['economic', 'technological', 'cultural'],
    hint: {
      statement:
        'The Tokugawa shogunate declines to close the country in 1639 and Japan stays open to trade and voyaging.',
      year: 1639,
      dateLabel: '1639',
      baselineContext:
        'Between 1633 and 1639 the shogunate banned Japanese from going abroad or returning, expelled the Portuguese, and suppressed Christianity after the Shimabara rebellion of 1637 to 1638. Foreign trade was confined to the Dutch post at Dejima, Chinese merchants at Nagasaki, and channels through Tsushima, Satsuma, and Matsumae. The arrangement held for more than two centuries.',
    },
  },
  {
    slug: 'ming-1644',
    yearLabel: '1644',
    region: 'East Asia',
    mechanism: 'politics',
    title: 'The Ming survive 1644',
    line: 'Beijing holds through the spring, and the pass at Shanhai stays shut.',
    podText:
      'The Ming dynasty survives the rebellion of 1644, Beijing does not fall, and the Qing are kept beyond the Great Wall',
    dial: 50,
    horizonYears: 200,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Beijing does not fall in 1644, the Ming survive the rebellion, and the Qing stay outside the wall.',
      year: 1644,
      dateLabel: 'April 1644',
      baselineContext:
        'In April 1644 the rebel Li Zicheng entered Beijing and the Chongzhen emperor hanged himself. The Ming general Wu Sangui, holding Shanhai Pass, allied with the Qing rather than the rebels; combined forces beat Li Zicheng and the Qing occupied Beijing that June. Southern Ming claimants resisted for decades, and the conquest was not complete until the 1680s.',
    },
  },
  {
    slug: 'dutch-brazil',
    yearLabel: '1654',
    region: 'South America',
    mechanism: 'economics',
    title: 'Dutch Brazil holds',
    line: 'Recife stays with the Company, and the sugar Atlantic answers to Amsterdam.',
    podText:
      'The Dutch hold Pernambuco in 1654 and Dutch Brazil survives as the centre of the Atlantic sugar economy',
    dial: 45,
    horizonYears: 180,
    lenses: ['economic', 'political'],
    hint: {
      statement: 'The Dutch keep Pernambuco in 1654 and Dutch Brazil survives.',
      year: 1654,
      dateLabel: 'January 1654',
      baselineContext:
        'The Dutch West India Company held Pernambuco from 1630 and ran it as a sugar colony, with Johan Maurits as governor from 1637 to 1644. Portuguese and Luso-Brazilian planters revolted from 1645, and the Company surrendered Recife in January 1654 with no fleet able to relieve it. Sugar expertise and capital moved on to the Caribbean, and Portugal kept Brazil.',
    },
  },
  {
    slug: 'vienna-1683',
    yearLabel: '1683',
    region: 'Europe',
    mechanism: 'politics',
    title: 'Vienna falls before the relief',
    line: 'The relief army arrives a week late, and the Danube becomes an Ottoman river to its source.',
    podText:
      'Vienna falls to the Ottoman siege in 1683 before the relief army arrives, and Ottoman power is established in central Europe',
    dial: 50,
    horizonYears: 150,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Vienna falls to the Ottoman siege of 1683 before Sobieski’s relief army can reach it.',
      year: 1683,
      dateLabel: 'September 1683',
      baselineContext:
        'Kara Mustafa Pasha besieged Vienna from July 1683 and had mined the walls when a relief army under Jan III Sobieski and Charles of Lorraine broke the siege on 12 September. The Habsburgs and their allies then took Buda in 1686 and most of Hungary, confirmed at Karlowitz in 1699. Kara Mustafa was executed that December.',
    },
  },
  {
    slug: 'aurangzeb-deccan',
    yearLabel: '1707',
    region: 'South Asia',
    mechanism: 'politics',
    title: 'The Mughals leave the Deccan',
    line: 'The empire stops spending itself on the south, and Delhi still has a treasury in 1739.',
    podText:
      'Aurangzeb ends the Deccan wars by settlement rather than attrition and the Mughal empire retains its fiscal strength after 1707',
    dial: 45,
    horizonYears: 150,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Aurangzeb settles with the Marathas instead of fighting on, and the Mughal empire keeps its finances intact after 1707.',
      year: 1707,
      dateLabel: 'March 1707',
      baselineContext:
        'Aurangzeb spent his final twenty-five years campaigning in the Deccan against the Marathas and the Deccan sultanates, and died in March 1707 with the treasury drained and the army worn out. His successors lost effective control to provincial governors and to Maratha, Sikh, and Afghan power; Nadir Shah sacked Delhi in 1739, and Company armies filled the vacuum after 1757.',
    },
  },
  {
    slug: 'isfahan-1722',
    yearLabel: '1722',
    region: 'Middle East',
    mechanism: 'politics',
    title: 'Isfahan holds out',
    line: 'The siege is broken, and Persia keeps a dynasty instead of inheriting a warlord century.',
    podText: 'Isfahan withstands the Afghan siege of 1722 and the Safavid state survives intact',
    dial: 45,
    horizonYears: 150,
    lenses: ['political', 'economic'],
    hint: {
      statement: 'Isfahan holds against the siege of 1722 and the Safavid state survives.',
      year: 1722,
      dateLabel: '1722',
      baselineContext:
        'Mahmud Hotak’s Afghan army from Kandahar besieged Isfahan for months in 1722; famine killed a large part of the population and Shah Sultan Husayn abdicated in October. Safavid authority collapsed as Ottoman and Russian forces took western and northern provinces. Nader Shah restored the frontiers by force in the 1730s, but his assassination in 1747 opened another half-century of contested rule.',
    },
  },
  {
    slug: 'tupac-amaru',
    yearLabel: '1781',
    region: 'South America',
    mechanism: 'politics',
    title: 'Tupac Amaru II prevails',
    line: 'The Andean rising takes Cusco, and the viceroyalty negotiates with the highlands.',
    podText:
      'The rebellion of Tupac Amaru II succeeds in 1781 and an Andean state is established in the Peruvian highlands',
    dial: 50,
    horizonYears: 150,
    lenses: ['political', 'economic', 'cultural'],
    hint: {
      statement:
        'The rising led by Tupac Amaru II succeeds and an Andean government is established in the highlands.',
      year: 1781,
      dateLabel: '1781',
      baselineContext:
        'In November 1780 José Gabriel Condorcanqui, who took the name Tupac Amaru II, led a mass rebellion in the southern Peruvian highlands against the labour drafts, tribute, and trade taxes of colonial rule. The revolt spread to Upper Peru but failed to take Cusco. He was captured in April 1781 and executed in Cusco that May, and reprisals ran for years.',
    },
  },
  {
    slug: 'yorktown',
    yearLabel: '1781',
    region: 'North America',
    mechanism: 'politics',
    title: 'The colonies stay British',
    line: 'The French fleet misses the Chesapeake, and North America keeps one flag a while longer.',
    podText:
      'The French fleet fails to reach the Chesapeake in 1781, Cornwallis is relieved, and Britain retains its North American colonies',
    dial: 50,
    horizonYears: 150,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Cornwallis is relieved at Yorktown in 1781 and Britain keeps its North American colonies.',
      year: 1781,
      dateLabel: 'October 1781',
      baselineContext:
        'In September 1781 de Grasse’s French fleet held the Chesapeake against the Royal Navy, letting Washington and Rochambeau trap Cornwallis at Yorktown; he surrendered on 19 October. The defeat brought down the North ministry, and Britain recognised American independence at Paris in 1783 while keeping Canada and the West Indies.',
    },
  },
  {
    slug: 'haiti-1804',
    yearLabel: '1804',
    region: 'North America',
    mechanism: 'politics',
    title: 'Haiti is not isolated',
    line: 'The new republic is recognised instead of quarantined, and abolition arrives on a different schedule.',
    podText:
      'Haiti is recognised and admitted to trade after independence in 1804 instead of being isolated and indemnified',
    dial: 50,
    horizonYears: 120,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Haiti wins diplomatic recognition and open trade after 1804 rather than isolation and indemnity.',
      year: 1804,
      dateLabel: 'January 1804',
      baselineContext:
        'After the 1791 uprising in Saint-Domingue and the defeat of Leclerc’s expedition by combined resistance and yellow fever, Dessalines declared independence on 1 January 1804. Slaveholding states withheld recognition; the United States waited until 1862. France demanded 150 million francs in 1825 in exchange for recognition, a debt whose servicing burdened Haitian finances for over a century.',
    },
  },
  {
    slug: 'napoleon-1812',
    yearLabel: '1812',
    region: 'Europe',
    mechanism: 'politics',
    title: 'Napoleon stops at the Niemen',
    line: 'The Grande Armée never marches east, and the empire keeps the army it spent on Moscow.',
    podText:
      'Napoleon does not invade Russia in 1812 and consolidates his empire in western and central Europe instead',
    dial: 55,
    horizonYears: 120,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Napoleon calls off the Russian campaign in 1812 and consolidates the empire he already holds.',
      year: 1812,
      dateLabel: 'June 1812',
      baselineContext:
        'Napoleon crossed the Niemen in June 1812 with an army of roughly six hundred thousand, fought a bloody draw at Borodino in September, and occupied a burning Moscow without obtaining terms. The retreat destroyed the army through cold, hunger, and disease. Prussia and Austria changed sides, the allies won at Leipzig in 1813, and Paris fell in 1814.',
    },
  },
  {
    slug: 'gran-colombia',
    yearLabel: '1830',
    region: 'South America',
    mechanism: 'politics',
    title: 'Gran Colombia holds',
    line: 'The union survives its founder, and northern South America speaks with one voice.',
    podText: 'Gran Colombia does not break apart in 1830 and survives as a single federal republic',
    dial: 45,
    horizonYears: 150,
    lenses: ['political', 'economic'],
    hint: {
      statement: 'Gran Colombia survives the crisis of 1830 as a single federal republic.',
      year: 1830,
      dateLabel: '1830',
      baselineContext:
        'Bolívar’s union of present-day Colombia, Venezuela, Ecuador, and Panama was undone by disputes between centralists and federalists, regional military commanders, and debts from the wars of independence. Venezuela and Ecuador separated in 1830, and Bolívar died at Santa Marta in December of that year after resigning the presidency.',
    },
  },
  {
    slug: 'waitangi',
    yearLabel: '1840',
    region: 'Oceania',
    mechanism: 'politics',
    title: 'Waitangi is honoured',
    line: 'The Maori text governs, and the settler colony has to buy what it wants.',
    podText:
      'The Treaty of Waitangi is enforced as written in Maori after 1840 and Maori land and authority are protected in practice',
    dial: 45,
    horizonYears: 150,
    lenses: ['political', 'economic', 'cultural'],
    hint: {
      statement:
        'The guarantees in the Maori text of the Treaty of Waitangi are enforced from 1840 onward.',
      year: 1840,
      dateLabel: 'February 1840',
      baselineContext:
        'The Treaty of Waitangi was first signed on 6 February 1840 and eventually by more than five hundred rangatira. Its Maori and English texts differ: the Maori text cedes kawanatanga, governorship, while promising rangatiratanga over lands and treasures. Settler demand, the wars of the 1860s, and confiscations under the New Zealand Settlements Act of 1863 stripped most Maori land within two generations.',
    },
  },
  {
    slug: 'opium-war',
    yearLabel: '1842',
    region: 'East Asia',
    mechanism: 'economics',
    title: 'The Qing refuse Nanjing',
    line: 'The trade is not forced open, and the treaty ports are never signed away.',
    podText:
      'The Qing defeat the British expedition of 1839 to 1842 and no treaty ports or opium concessions are granted',
    dial: 55,
    horizonYears: 120,
    lenses: ['economic', 'political', 'technological'],
    hint: {
      statement:
        'The Qing turn back the British expedition and sign no treaty opening ports or the opium trade.',
      year: 1842,
      dateLabel: 'August 1842',
      baselineContext:
        'Britain’s campaign of 1839 to 1842, fought with steam gunboats along the coast and up the Yangzi, forced the Treaty of Nanjing in August 1842: an indemnity of twenty-one million silver dollars, five ports opened, and Hong Kong ceded. A second war from 1856 to 1860 widened the concessions, legalised the opium trade, and ended with the sacking of the Summer Palace.',
    },
  },
  {
    slug: 'irish-famine',
    yearLabel: '1846',
    region: 'Europe',
    mechanism: 'economics',
    title: 'Ireland is fed',
    line: 'Relief outlasts the doctrine, and a million people stay alive and at home.',
    podText:
      'Britain mounts sustained famine relief in Ireland from 1846, keeping food in the country through the blight years',
    dial: 50,
    horizonYears: 120,
    lenses: ['economic', 'daily-life', 'political'],
    hint: {
      statement:
        'Britain funds sustained famine relief in Ireland from 1846 and keeps food in the country through the blight.',
      year: 1846,
      dateLabel: '1846',
      baselineContext:
        'Potato blight struck Ireland in 1845 and returned worse in 1846, destroying the staple of a cottier population. Relief ran through public works, soup kitchens, and workhouses, then was shifted onto Irish poor rates in 1847 on the argument that markets and local property should carry the burden. About a million people died and a million more emigrated, and the population kept falling for decades.',
    },
  },
  {
    slug: '1848',
    yearLabel: '1848',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The revolutions succeed',
    line: 'The spring of peoples survives its winter; the crowns concede for good.',
    podText: 'The 1848 revolutions succeed across Europe and the constitutions hold',
    dial: 40,
    horizonYears: 120,
    hint: {
      statement:
        'The revolutions of 1848 hold their gains and constitutional government becomes permanent across Europe.',
      year: 1848,
      dateLabel: '1848',
      baselineContext:
        'Risings spread from Palermo and Paris through Vienna, Berlin, Milan, Budapest, and dozens of other cities in 1848, winning constitutions, parliaments, and the abolition of serfdom in the Habsburg lands. Within eighteen months the armies had recovered: the Frankfurt parliament dissolved, Hungary was crushed with Russian help, and France elected an emperor within four years.',
    },
  },
  {
    slug: 'taiping',
    yearLabel: '1853',
    region: 'East Asia',
    mechanism: 'culture',
    title: 'The Taiping take Beijing',
    line: 'The Heavenly Kingdom finishes its northern march, and the Qing century ends early.',
    podText:
      'The Taiping northern expedition takes Beijing after 1853 and the Heavenly Kingdom replaces the Qing dynasty',
    dial: 50,
    horizonYears: 120,
    lenses: ['political', 'cultural', 'economic'],
    hint: {
      statement:
        'The Taiping northern expedition takes Beijing and the Heavenly Kingdom supplants the Qing.',
      year: 1853,
      dateLabel: 'March 1853',
      baselineContext:
        'Hong Xiuquan’s movement, built on a heterodox Christian teaching and on Hakka grievance, rose in Guangxi in 1851 and took Nanjing in March 1853, holding the lower Yangzi for a decade. Its northern expedition failed, its leadership split violently in 1856, and Qing provincial armies with Western-officered contingents retook Nanjing in 1864. Estimates of the war’s death toll run into the tens of millions.',
    },
  },
  {
    slug: 'sepoy-1857',
    yearLabel: '1857',
    region: 'South Asia',
    mechanism: 'politics',
    title: 'The 1857 rising holds',
    line: 'Delhi is not retaken, and the Company’s successor never gets its empire.',
    podText:
      'The Indian rebellion of 1857 succeeds, Delhi is held, and Company rule is expelled from northern India',
    dial: 50,
    horizonYears: 120,
    lenses: ['political', 'economic', 'cultural'],
    hint: {
      statement: 'The rebellion of 1857 holds Delhi and expels Company rule from northern India.',
      year: 1857,
      dateLabel: 'May 1857',
      baselineContext:
        'The mutiny that began at Meerut on 10 May 1857 spread across the Ganges plain and rallied around the aged Mughal Bahadur Shah Zafar in Delhi, joined by dispossessed rulers and peasant grievance. Coordination was poor and much of India stayed quiet or loyal. British and allied forces retook Delhi in September, and in 1858 the Crown replaced the East India Company as ruler.',
    },
  },
  {
    slug: 'origin-unpublished',
    yearLabel: '1859',
    region: 'Europe',
    mechanism: 'knowledge',
    title: 'The Origin stays in the drawer',
    line: 'Selection waits for the geneticists, and biology spends fifty years without its spine.',
    podText:
      'Darwin never publishes On the Origin of Species in 1859 and natural selection is not established as a scientific theory for decades',
    dial: 55,
    horizonYears: 120,
    lenses: ['technological', 'cultural'],
    hint: {
      statement:
        'Darwin never publishes the Origin and natural selection goes unestablished for decades.',
      year: 1859,
      dateLabel: 'November 1859',
      baselineContext:
        'Darwin published On the Origin of Species in November 1859, after twenty years of private work and after Alfred Russel Wallace independently sent him the same idea in 1858. The book sold out immediately and made common descent a working assumption across the sciences within a generation, though the mechanism was only reconciled with genetics in the 1930s and 1940s.',
    },
  },
  {
    slug: 'us-civil-war',
    yearLabel: '1863',
    region: 'North America',
    mechanism: 'politics',
    title: 'The Confederacy survives',
    line: 'Two states share the continent, and one of them keeps slavery on its statute books.',
    podText:
      'The Confederacy wins its independence after 1863 and North America is divided between two rival republics',
    dial: 50,
    horizonYears: 120,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The Confederacy secures its independence and the United States is permanently divided.',
      year: 1863,
      dateLabel: 'July 1863',
      baselineContext:
        'Lee’s second invasion of the north ended at Gettysburg on 3 July 1863, and Vicksburg surrendered the next day, giving the Union the Mississippi and splitting the Confederacy. The Emancipation Proclamation had taken effect that January. The war ended with Lee’s surrender in April 1865, and the Thirteenth Amendment abolished slavery that December.',
    },
  },
  {
    slug: 'paraguay-1865',
    yearLabel: '1865',
    region: 'South America',
    mechanism: 'politics',
    title: 'Paraguay avoids the war',
    line: 'The river country stays out of the alliance’s way, and keeps its generation.',
    podText:
      'Paraguay avoids war with the Triple Alliance in 1865 and survives as an independent developing state',
    dial: 45,
    horizonYears: 120,
    lenses: ['political', 'economic', 'daily-life'],
    hint: {
      statement:
        'Paraguay stays out of the war with Brazil, Argentina, and Uruguay and keeps its people and territory.',
      year: 1865,
      dateLabel: '1865',
      baselineContext:
        'From 1864 Paraguay under Francisco Solano López fought Brazil, Argentina, and Uruguay over navigation rights and influence in the Plata basin. The war ended with his death at Cerro Corá in March 1870. Paraguay lost large territories and a devastating share of its population, with the proportion still disputed by historians, and remained occupied until 1876.',
    },
  },
  {
    slug: 'meiji-fails',
    yearLabel: '1868',
    region: 'East Asia',
    mechanism: 'politics',
    title: 'The shogunate survives',
    line: 'Edo keeps its name, and modernisation happens slowly and from the top of a different pyramid.',
    podText:
      'The Tokugawa shogunate defeats the Satsuma and Choshu alliance in 1868 and survives as a reforming military government',
    dial: 50,
    horizonYears: 120,
    lenses: ['political', 'technological', 'economic'],
    hint: {
      statement:
        'The Tokugawa win the Boshin War of 1868 and the shogunate survives as a reforming government.',
      year: 1868,
      dateLabel: '1868',
      baselineContext:
        'After Perry’s squadron arrived in 1853 and the unequal treaties followed, domains led by Satsuma and Choshu turned on the shogunate and won the Boshin War of 1868 to 1869 in the emperor’s name. The new government abolished the domains in 1871 and the samurai stipends soon after, built conscript armies, railways, and state industry, and by 1899 had revised the treaties.',
    },
  },
  {
    slug: 'penicillin',
    yearLabel: '1875',
    region: 'Europe',
    mechanism: 'disease',
    title: 'Penicillin, fifty years early',
    line: 'A curious assistant follows the mold; the germ century arrives armed.',
    podText: 'Penicillin is isolated and put to clinical use in 1875, fifty years early',
    dial: 50,
    horizonYears: 120,
    hint: {
      statement:
        'Penicillin is isolated and brought into clinical use in 1875, half a century early.',
      year: 1875,
      dateLabel: '1875',
      baselineContext:
        'In the 1870s John Tyndall and others recorded that Penicillium moulds suppressed bacteria, and Joseph Lister noted a trial of the observation on a patient; nobody isolated or stabilised the agent. Fleming’s 1928 observation likewise sat unused until the Oxford group led by Florey and Chain purified penicillin in 1940 and 1941 and American plants scaled production for the war.',
    },
  },
  {
    slug: 'isandlwana',
    yearLabel: '1879',
    region: 'Africa',
    mechanism: 'politics',
    title: 'The Zulu kingdom holds',
    line: 'The invasion is not repeated, and one southern African state keeps its own frontier.',
    podText:
      'Britain abandons the invasion of Zululand after Isandlwana in 1879 and the Zulu kingdom retains its independence',
    dial: 45,
    horizonYears: 120,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Britain gives up the invasion of Zululand after Isandlwana and the kingdom keeps its independence.',
      year: 1879,
      dateLabel: 'January 1879',
      baselineContext:
        'On 22 January 1879 a Zulu army destroyed a British and colonial column at Isandlwana, killing more than 1,300 men, on the same day a small garrison held Rorke’s Drift. Britain reinforced heavily, burned the royal capital at Ulundi in July, captured King Cetshwayo, and broke the kingdom into thirteen chiefdoms; Zululand was annexed in 1887.',
    },
  },
  {
    slug: 'berlin-conference',
    yearLabel: '1884',
    region: 'Africa',
    mechanism: 'politics',
    title: 'The partition is not agreed',
    line: 'No rules for the scramble, and the coasts stay a bargaining table instead of a map.',
    podText:
      'The Berlin Conference of 1884 to 1885 collapses without agreement and the colonial partition of Africa is never coordinated',
    dial: 40,
    horizonYears: 120,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The Berlin Conference breaks up without agreement and the partition of Africa is never coordinated.',
      year: 1884,
      dateLabel: 'November 1884',
      baselineContext:
        'Fourteen states met at Berlin from November 1884 to February 1885 and signed a General Act setting free navigation on the Congo and Niger and a notification and effective-occupation rule for coastal claims. No African ruler was represented. Leopold II obtained the Congo Free State as a personal possession, and the powers occupied most of the continent over the next two decades.',
    },
  },
  {
    slug: 'konbaung-burma',
    yearLabel: '1885',
    region: 'Southeast Asia',
    mechanism: 'politics',
    title: 'Burma keeps its king',
    line: 'The teak dispute is settled by lawyers, and Mandalay is never annexed.',
    podText:
      'The Konbaung kingdom avoids British annexation in 1885 and Burma retains its independence as a buffer state',
    dial: 45,
    horizonYears: 120,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Upper Burma escapes annexation in 1885 and the Konbaung kingdom survives as an independent buffer state.',
      year: 1885,
      dateLabel: 'November 1885',
      baselineContext:
        'A dispute over a fine imposed on the Bombay Burmah Trading Corporation, and Burmese contacts with France, gave Britain its pretext in 1885. The invasion took Mandalay within two weeks, King Thibaw was exiled to India, and Upper Burma was annexed to British India on 1 January 1886. Guerrilla resistance continued in the hills for years.',
    },
  },
  {
    slug: 'hawaii-1893',
    yearLabel: '1893',
    region: 'Oceania',
    mechanism: 'politics',
    title: 'The Hawaiian Kingdom survives',
    line: 'The queen is not deposed, and the mid-Pacific keeps a sovereign of its own.',
    podText:
      'The overthrow of Queen Liliuokalani fails in 1893 and the Hawaiian Kingdom remains independent',
    dial: 50,
    horizonYears: 120,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The 1893 overthrow of Queen Liliuokalani fails and the Hawaiian Kingdom stays independent.',
      year: 1893,
      dateLabel: 'January 1893',
      baselineContext:
        'In January 1893 a committee of mostly American residents, backed by US marines landed from the Boston with the minister John L. Stevens’ approval, deposed Queen Liliuokalani. President Cleveland declined to annex and called the action wrongful, but the provisional government held on, declared a republic in 1894, and secured annexation by congressional resolution in 1898.',
    },
  },
  {
    slug: 'haber',
    yearLabel: '1909',
    region: 'Europe',
    mechanism: 'technology',
    title: 'The Haber process fails',
    line: 'Nitrogen stays stubborn; fertilizer and explosives keep their old ceilings.',
    podText:
      'The Haber process fails in 1909 and synthetic nitrogen fixation proves impractical for decades',
    dial: 55,
    horizonYears: 120,
    hint: {
      statement:
        'Ammonia synthesis fails in 1909 and synthetic nitrogen stays impractical for decades.',
      year: 1909,
      dateLabel: '1909',
      baselineContext:
        'Fritz Haber demonstrated the catalytic synthesis of ammonia from air in 1909, and Carl Bosch scaled it at BASF into the Oppau plant by 1913. It freed agriculture from mined nitrates and Germany from Chilean imports, which also sustained its munitions through the war. A large share of the nitrogen in the modern food supply comes from the process.',
    },
  },
  {
    slug: 'july-crisis',
    yearLabel: '1914',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The July Crisis is defused',
    line: 'The machinery of alliance stalls at the brink; the long peace limps on.',
    podText: 'The July Crisis of 1914 is defused and the great powers step back from general war',
    dial: 60,
    horizonYears: 110,
    hint: {
      statement:
        'The July Crisis of 1914 is settled diplomatically and the great powers avoid a general war.',
      year: 1914,
      dateLabel: 'July 1914',
      baselineContext:
        'After the assassination of Franz Ferdinand at Sarajevo on 28 June 1914, Austria-Hungary sent Serbia an ultimatum on 23 July with German backing. Mobilisation timetables and alliance obligations then outran negotiation: declarations followed from 28 July, and the German advance through Belgium on 4 August brought Britain in. Four years of war killed some seventeen million people.',
    },
  },
  {
    slug: 'sykes-picot',
    yearLabel: '1916',
    region: 'Middle East',
    mechanism: 'politics',
    title: 'The Arab kingdom is kept',
    line: 'The promises made in the desert are honoured, and the borders are drawn from inside.',
    podText:
      'The Sykes-Picot agreement is abandoned in 1916 and the promises of an independent Arab kingdom are honoured after the Ottoman collapse',
    dial: 50,
    horizonYears: 110,
    lenses: ['political', 'economic', 'cultural'],
    hint: {
      statement:
        'The Anglo-French partition plan is abandoned and an independent Arab state follows the Ottoman collapse.',
      year: 1916,
      dateLabel: '1916',
      baselineContext:
        'Mark Sykes and François Georges-Picot agreed in 1916 to divide the Ottoman Arab provinces into British and French zones, while the McMahon correspondence had encouraged Sharif Hussein to expect an Arab kingdom for revolting. The Bolsheviks published the agreement in 1917. Faisal’s Damascus government was removed by France in 1920, and the mandates were confirmed at San Remo.',
    },
  },
  {
    slug: 'russia-1917',
    yearLabel: '1917',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The Provisional Government holds',
    line: 'Petrograd keeps its republic, and the twentieth century loses one of its poles.',
    podText:
      'The Russian Provisional Government survives 1917, makes peace, and consolidates a constitutional republic',
    dial: 50,
    horizonYears: 110,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The Provisional Government survives 1917, leaves the war, and consolidates a republic.',
      year: 1917,
      dateLabel: 'October 1917',
      baselineContext:
        'The February revolution ended the monarchy, and the Provisional Government chose to stay in the war; the failed summer offensive and food shortages destroyed its standing. The Bolsheviks took Petrograd in late October 1917, dissolved the Constituent Assembly in January 1918, and signed Brest-Litovsk. Civil war, famine, and epidemic followed until 1922, and the USSR was formed that December.',
    },
  },
  {
    slug: 'influenza-1918',
    yearLabel: '1918',
    region: 'the wider world',
    mechanism: 'disease',
    title: 'The 1918 influenza stays mild',
    line: 'The autumn wave never sharpens, and a generation is not thinned twice.',
    podText:
      'The influenza of 1918 never becomes unusually lethal and the pandemic passes as an ordinary flu season',
    dial: 40,
    horizonYears: 100,
    lenses: ['daily-life', 'political', 'economic'],
    hint: {
      statement: 'The influenza of 1918 never turns lethal and passes as an ordinary season.',
      year: 1918,
      dateLabel: '1918',
      baselineContext:
        'The influenza pandemic of 1918 to 1920 infected perhaps a third of the world’s people and killed tens of millions, with estimates commonly ranging from twenty-five to fifty million. Mortality was unusually high among healthy young adults. Wartime censorship, troop movements, and crowded camps sped its spread, and public-health responses varied from city to city.',
    },
  },
  {
    slug: 'versailles',
    yearLabel: '1919',
    region: 'Europe',
    mechanism: 'politics',
    title: 'A moderate peace at Paris',
    line: 'The terms are survivable, and the 1920s are not a waiting room.',
    podText:
      'The Paris peace of 1919 imposes moderate terms on Germany with no war-guilt clause and manageable reparations',
    dial: 45,
    horizonYears: 100,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The 1919 peace settles on moderate terms for Germany, without war guilt or crushing reparations.',
      year: 1919,
      dateLabel: 'June 1919',
      baselineContext:
        'The Treaty of Versailles, signed on 28 June 1919, assigned Germany and its allies responsibility for the war, transferred territory and all colonies, capped the army at 100,000 men, and left reparations to a commission that set 132 billion gold marks in 1921. The US Senate refused ratification and the United States stayed out of the League of Nations.',
    },
  },
  {
    slug: 'wall-street-1929',
    yearLabel: '1929',
    region: 'North America',
    mechanism: 'economics',
    title: 'The Depression is contained',
    line: 'The banks are backstopped in 1930, and the slump stays a recession.',
    podText:
      'The crash of 1929 is contained by monetary and banking intervention and no global depression follows',
    dial: 50,
    horizonYears: 100,
    lenses: ['economic', 'political', 'daily-life'],
    hint: {
      statement:
        'Banking and monetary intervention contains the 1929 crash and no global depression follows.',
      year: 1929,
      dateLabel: 'October 1929',
      baselineContext:
        'American share prices collapsed in late October 1929. Thousands of bank failures, a contracting money supply, gold-standard rigidity, and the Smoot-Hawley tariff of 1930 with its retaliation turned recession into a decade-long global depression; about a quarter of American workers were unemployed by 1933. The politics of the slump reshaped governments across Europe and Asia.',
    },
  },
  {
    slug: 'spain-1936',
    yearLabel: '1936',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The Spanish Republic holds',
    line: 'The rising fails in its first week, and the democracies learn a different lesson about intervention.',
    podText:
      'The military rising of July 1936 fails and the Spanish Republic survives the coup attempt',
    dial: 50,
    horizonYears: 100,
    lenses: ['political', 'cultural'],
    hint: {
      statement: 'The military rising of July 1936 fails and the Spanish Republic survives.',
      year: 1936,
      dateLabel: 'July 1936',
      baselineContext:
        'The rising of 17 and 18 July 1936 split the army and the country, and the war ran for nearly three years. Germany and Italy supplied the Nationalists and the Soviet Union the Republic, while Britain and France embargoed both sides through a non-intervention committee. Madrid surrendered in March 1939, and Franco governed Spain until his death in 1975.',
    },
  },
  {
    slug: 'allies-lose-ww2',
    yearLabel: '1940',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The Allies lose the Second World War',
    line: 'The war ends on the aggressors’ terms, and the postwar order is written by them.',
    podText:
      'The Allies lose the Second World War: Britain is forced out of the war after the fall of France in 1940 and the Axis powers dictate the peace',
    dial: 55,
    horizonYears: 90,
    lenses: ['political', 'economic', 'cultural'],
    hint: {
      statement:
        'Britain is forced out of the war after the fall of France in 1940 and the Axis powers dictate the peace.',
      year: 1940,
      dateLabel: 'June 1940',
      baselineContext:
        'Germany overran the Low Countries and France between 10 May and 22 June 1940, and Britain evacuated about 338,000 men from Dunkirk. Britain fought on alone, held in the air that summer, and was joined by the Soviet Union and the United States in 1941. The war in Europe ended in May 1945 and in the Pacific in September, after some sixty million deaths, including the industrialised murder of six million Jews.',
    },
  },
  {
    slug: 'midway',
    yearLabel: '1942',
    region: 'East Asia',
    mechanism: 'knowledge',
    title: 'Midway goes the other way',
    line: 'The carriers survive the morning, and the Pacific war runs on a longer clock.',
    podText:
      'The Japanese naval cipher is not broken before Midway in 1942; Japan wins the battle, keeps its carrier fleet, and holds the initiative in the Pacific war',
    dial: 60,
    horizonYears: 90,
    lenses: ['political', 'technological'],
    hint: {
      statement:
        'Japanese codes go unread before Midway, and Japan wins the battle and keeps its carriers.',
      year: 1942,
      dateLabel: 'June 1942',
      baselineContext:
        'American codebreakers read enough of the Japanese naval cipher to anticipate the Midway operation. Between 4 and 7 June 1942 US carrier aircraft sank four Japanese fleet carriers and lost the Yorktown. Japan lost irreplaceable aircrew and deck capacity, and the initiative in the Pacific passed to the United States, which then out-built its opponent many times over.',
    },
  },
  {
    slug: 'manhattan-late',
    yearLabel: '1945',
    region: 'North America',
    mechanism: 'technology',
    title: 'The bomb comes late',
    line: 'The war ends without it, and deterrence has to be invented from scratch in the 1960s.',
    podText:
      'The atomic bomb is not completed in 1945 and no state fields nuclear weapons until the 1960s',
    dial: 55,
    horizonYears: 90,
    lenses: ['technological', 'political'],
    hint: {
      statement:
        'The atomic bomb is not ready in 1945 and no state fields nuclear weapons until the 1960s.',
      year: 1945,
      dateLabel: 'July 1945',
      baselineContext:
        'The Manhattan Project spent about two billion dollars and employed well over a hundred thousand people before the Trinity test in New Mexico on 16 July 1945. Bombs were dropped on Hiroshima on 6 August and Nagasaki on 9 August, killing well over a hundred thousand people, most of them civilians. The Soviet Union tested its own device in August 1949.',
    },
  },
  {
    slug: 'vietnam-1945',
    yearLabel: '1945',
    region: 'Southeast Asia',
    mechanism: 'politics',
    title: 'Hanoi’s declaration is recognised',
    line: 'The colonial return is called off, and thirty years of war do not happen.',
    podText:
      'Vietnamese independence declared in September 1945 is recognised, France does not return by force, and no Indochina wars follow',
    dial: 50,
    horizonYears: 80,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The Vietnamese declaration of independence in 1945 is recognised and France does not return by force.',
      year: 1945,
      dateLabel: 'September 1945',
      baselineContext:
        'Ho Chi Minh declared Vietnamese independence in Hanoi on 2 September 1945, after the Japanese surrender and a famine that had killed perhaps a million people in the north. France returned with British and American acquiescence, and war began in 1946. After Dien Bien Phu fell in May 1954 the Geneva accords partitioned the country, and fighting continued until 1975.',
    },
  },
  {
    slug: 'pacific-tests',
    yearLabel: '1946',
    region: 'Oceania',
    mechanism: 'environment',
    title: 'The Pacific is not a range',
    line: 'The atolls are never cleared for testing, and the islands keep their home reefs.',
    podText:
      'The Pacific islands are never used as nuclear testing grounds after 1946 and no communities are displaced for weapons trials',
    dial: 45,
    horizonYears: 80,
    lenses: ['political', 'daily-life'],
    hint: {
      statement:
        'The Pacific atolls are never used for nuclear testing and no island communities are displaced for trials.',
      year: 1946,
      dateLabel: '1946',
      baselineContext:
        'The United States began testing at Bikini in July 1946 and continued in the Marshall Islands into 1958, including the Castle Bravo shot of 1954 whose fallout contaminated Rongelap and a Japanese fishing boat. Britain tested at Christmas and Malden Islands and in Australia, and France at Moruroa and Fangataufa from 1966 to 1996. Communities were relocated, some permanently.',
    },
  },
  {
    slug: 'india-partition',
    yearLabel: '1947',
    region: 'South Asia',
    mechanism: 'politics',
    title: 'India is not partitioned',
    line: 'One federation takes the transfer of power, and the borders are administrative.',
    podText:
      'British India is transferred to a single federal state in 1947 instead of being partitioned',
    dial: 50,
    horizonYears: 80,
    lenses: ['political', 'economic', 'cultural'],
    hint: {
      statement:
        'Power is transferred to one federal Indian state in 1947 rather than to two partitioned dominions.',
      year: 1947,
      dateLabel: 'August 1947',
      baselineContext:
        'British India was divided into India and Pakistan on 15 August 1947, with the Radcliffe boundary awards published two days later. Perhaps twelve to fifteen million people were displaced across the new lines in Punjab and Bengal, and hundreds of thousands died in the violence. Kashmir was contested within months, and the two states have fought several wars since.',
    },
  },
  {
    slug: 'china-1949',
    yearLabel: '1949',
    region: 'East Asia',
    mechanism: 'politics',
    title: 'The Nationalists hold China',
    line: 'Nanjing keeps the mainland, and East Asia’s Cold War has a different geometry.',
    podText:
      'The Nationalist government wins the Chinese civil war and retains control of the mainland after 1949',
    dial: 50,
    horizonYears: 80,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The Nationalist government wins the civil war and keeps the Chinese mainland after 1949.',
      year: 1949,
      dateLabel: 'October 1949',
      baselineContext:
        'The Communists won the civil war in 1949 after decisive campaigns in Manchuria and north China, hyperinflation ruined the Nationalist currency, and Chiang Kai-shek’s government withdrew to Taiwan. The People’s Republic was proclaimed in Beijing on 1 October 1949, and the United States held to recognising Taipei until 1979.',
    },
  },
  {
    slug: 'suez-1956',
    yearLabel: '1956',
    region: 'Middle East',
    mechanism: 'politics',
    title: 'Suez is not reversed',
    line: 'Washington does not intervene, and the old empires get one more decade of leverage.',
    podText:
      'The Anglo-French intervention at Suez in 1956 succeeds without American opposition and control of the canal is restored',
    dial: 55,
    horizonYears: 80,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'The 1956 intervention at Suez succeeds and Anglo-French control of the canal is restored.',
      year: 1956,
      dateLabel: 'November 1956',
      baselineContext:
        'Nasser nationalised the Suez Canal Company in July 1956. Israel attacked at the end of October and Britain and France followed in early November under a pretext of separating the combatants. American financial pressure on sterling and Soviet threats forced a ceasefire within days and withdrawal by the end of the year; Eden resigned, and the episode ended British and French primacy in the region.',
    },
  },
  {
    slug: 'fusion-1958',
    yearLabel: '1958',
    region: 'the wider world',
    mechanism: 'technology',
    title: 'Fusion arrives on time',
    line: 'The optimism of 1958 turns out to be right, and electricity stops being a fuel problem.',
    podText:
      'Controlled fusion is solved within two decades of the 1958 declassification and fusion power stations enter service in the 1970s',
    dial: 60,
    horizonYears: 80,
    lenses: ['technological', 'economic'],
    hint: {
      statement:
        'Controlled fusion is solved soon after 1958 and fusion power stations enter service in the 1970s.',
      year: 1958,
      dateLabel: '1958',
      baselineContext:
        'Fusion research was declassified and shared at the second Atoms for Peace conference in Geneva in 1958, amid confident predictions of power within a couple of decades. Tokamaks improved steadily after the Soviet T-3 results of 1968, but confinement proved far harder than expected. Laboratory ignition was reached at the National Ignition Facility in 2022, and no plant has yet delivered net electricity.',
    },
  },
  {
    slug: 'lumumba',
    yearLabel: '1961',
    region: 'Africa',
    mechanism: 'politics',
    title: 'The Congo keeps its premier',
    line: 'The first government survives its first year, and the mineral provinces answer to it.',
    podText:
      'Patrice Lumumba is not removed or killed and his government consolidates control of an independent Congo after 1961',
    dial: 50,
    horizonYears: 80,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'Lumumba survives and his government consolidates control of an independent Congo.',
      year: 1961,
      dateLabel: 'January 1961',
      baselineContext:
        'The Congo became independent in June 1960 with Patrice Lumumba as prime minister; within weeks the army mutinied and Katanga seceded with Belgian backing. He was dismissed in September, detained, and killed in January 1961 with Belgian and Katangese involvement. UN forces fought to end the secession, and Mobutu took full power in 1965 and held it for over thirty years.',
    },
  },
  {
    slug: 'cuba-1962',
    yearLabel: '1962',
    region: 'North America',
    mechanism: 'politics',
    title: 'October 1962 goes wrong',
    line: 'One misread signal in the quarantine line, and the crisis does not end in thirteen days.',
    podText:
      'The Cuban missile crisis of October 1962 escalates into direct armed conflict between the United States and the Soviet Union',
    dial: 60,
    horizonYears: 60,
    lenses: ['political', 'daily-life'],
    hint: {
      statement:
        'The Cuban missile crisis escalates into direct armed conflict rather than being settled.',
      year: 1962,
      dateLabel: 'October 1962',
      baselineContext:
        'US reconnaissance photographed Soviet medium-range missile sites in Cuba on 14 October 1962. Thirteen days of blockade, back-channel messages, and near-accidents at sea ended with Khrushchev withdrawing the missiles in exchange for a public American pledge not to invade Cuba and a private undertaking to remove missiles from Turkey. A direct hotline followed in 1963.',
    },
  },
  {
    slug: 'green-revolution',
    yearLabel: '1965',
    region: 'South Asia',
    mechanism: 'knowledge',
    title: 'The Green Revolution fails',
    line: 'The new seed does not take in the monsoon belt, and the 1970s arrive hungry.',
    podText:
      'The high-yield cereal varieties fail in South Asia after 1965 and no green revolution raises regional food production',
    dial: 50,
    horizonYears: 70,
    lenses: ['economic', 'daily-life', 'technological'],
    hint: {
      statement:
        'The high-yield cereals fail in South Asia after 1965 and no green revolution raises food production.',
      year: 1965,
      dateLabel: '1965',
      baselineContext:
        'Semi-dwarf wheats bred by Norman Borlaug’s programme reached India and Pakistan from the mid-1960s, and IRRI released the rice variety IR8 in 1966. With fertiliser, irrigation, and price support, Indian wheat output more than doubled within fifteen years and the widely forecast South Asian famines did not occur. The costs included groundwater depletion, fertiliser dependence, and widening regional inequality.',
    },
  },
  {
    slug: 'apollo',
    yearLabel: '1972',
    region: 'North America',
    mechanism: 'technology',
    title: 'Apollo doesn’t stop',
    line: 'The program survives the budget knife; the Moon becomes a place of work.',
    podText:
      'The Apollo program does not stop at 17; lunar missions continue through the 1970s and beyond',
    dial: 45,
    horizonYears: 80,
    hint: {
      statement:
        'The Apollo programme continues past 1972 and lunar missions carry on through the decade.',
      year: 1972,
      dateLabel: 'December 1972',
      baselineContext:
        'Apollo 17 left the Moon in December 1972, the last of six landings. Apollo 18 to 20 had already been cancelled in 1970 and 1971 as budgets fell from their mid-1960s peak and public interest waned; the remaining hardware went to Skylab and the 1975 Apollo-Soyuz flight. No human returned to the Moon in the following half-century.',
    },
  },
  {
    slug: 'moores-law',
    yearLabel: '1975',
    region: 'North America',
    mechanism: 'technology',
    title: 'Silicon scaling stalls',
    line: 'The doubling stops at the drawing board, and computing stays expensive and institutional.',
    podText:
      'Semiconductor scaling stalls in 1975 and transistor densities improve only slowly thereafter',
    dial: 55,
    horizonYears: 70,
    lenses: ['technological', 'economic', 'daily-life'],
    hint: {
      statement:
        'Semiconductor scaling stalls after 1975 and transistor density improves only slowly.',
      year: 1975,
      dateLabel: '1975',
      baselineContext:
        'Gordon Moore observed in 1965 that transistor counts per chip were doubling annually, and revised the rate to roughly every two years in 1975. The industry sustained that pace for decades through advances in photolithography, materials, and design, taking chips from a few thousand transistors to billions and driving the cost per operation down by orders of magnitude.',
    },
  },
  {
    slug: 'smallpox-1977',
    yearLabel: '1977',
    region: 'the wider world',
    mechanism: 'disease',
    title: 'Smallpox is not eradicated',
    line: 'The last chains are never broken, and vaccination stays a permanent obligation.',
    podText:
      'The smallpox eradication campaign fails in the late 1970s and the disease remains endemic in parts of the world',
    dial: 45,
    horizonYears: 70,
    lenses: ['daily-life', 'political', 'economic'],
    hint: {
      statement:
        'The eradication campaign fails and smallpox remains endemic in parts of the world.',
      year: 1977,
      dateLabel: 'October 1977',
      baselineContext:
        'The last naturally occurring case of smallpox was recorded in Somalia in October 1977, after a decade of WHO surveillance and ring vaccination that traced and encircled outbreaks rather than vaccinating everyone. Eradication was certified in 1980, the only human disease so removed. A laboratory accident in Birmingham caused the last death in 1978.',
    },
  },
  {
    slug: 'arpanet-closed',
    yearLabel: '1983',
    region: 'North America',
    mechanism: 'technology',
    title: 'The network stays proprietary',
    line: 'The protocols are licensed instead of published, and every network is somebody’s product.',
    podText:
      'An open internetworking standard is never adopted after 1983 and computer networks develop as competing proprietary systems',
    dial: 50,
    horizonYears: 60,
    lenses: ['technological', 'economic', 'cultural'],
    hint: {
      statement:
        'No open internetworking standard is adopted after 1983 and networks grow as rival proprietary systems.',
      year: 1983,
      dateLabel: 'January 1983',
      baselineContext:
        'On 1 January 1983 the ARPANET switched to TCP/IP, an unpatented protocol suite that any vendor could implement. Proprietary stacks such as IBM’s SNA and DECnet, and the state-backed OSI effort, competed for years. The open stack plus the web, proposed in 1989 and released publicly in 1991, made global interconnection cheap enough to become universal.',
    },
  },
  {
    slug: 'carrington',
    yearLabel: '1989',
    region: 'the wider world',
    mechanism: 'environment',
    title: 'A Carrington-class storm, 1989',
    line: 'The sky catches fire over an electrified planet; the grids do not come back quickly.',
    podText:
      'A Carrington-class geomagnetic storm hits Earth in 1989, collapsing power grids across the northern hemisphere',
    dial: 50,
    horizonYears: 60,
    hint: {
      statement:
        'A geomagnetic storm on the scale of 1859 strikes in 1989 and collapses northern power grids.',
      year: 1989,
      dateLabel: 'March 1989',
      baselineContext:
        'A geomagnetic storm in March 1989 collapsed the Hydro-Québec grid in about ninety seconds and left six million people without power for roughly nine hours, while transformers elsewhere were damaged. The Carrington event of September 1859 was far larger but struck a world whose only long conductors were telegraph lines.',
    },
  },
  {
    slug: 'soviet-1991',
    yearLabel: '1991',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The Union does not dissolve',
    line: 'A looser federation signs instead of shattering, and the 1990s have two centres again.',
    podText:
      'The Soviet Union is not dissolved in 1991; a reformed union treaty is signed and the federation survives',
    dial: 50,
    horizonYears: 60,
    lenses: ['political', 'economic'],
    hint: {
      statement:
        'A reformed union treaty is signed in 1991 and the Soviet federation survives in looser form.',
      year: 1991,
      dateLabel: 'December 1991',
      baselineContext:
        'A new union treaty was due to be signed in August 1991 when hardliners attempted a coup against Gorbachev; its collapse in three days discredited the centre. Republics declared independence through the autumn, the Belovezha accords were signed in December, and the USSR was formally dissolved on 26 December 1991, leaving fifteen states and a decade of severe economic contraction in Russia.',
    },
  },
]
