import type { SupportedLanguage } from "../i18n/supported-languages";

/** Category of a changelog entry; surfaced as a localized badge on the page. */
export type WhatsNewType = "stack" | "feature" | "fix";

/**
 * A single curated changelog entry. Copy is clean, rewritten prose (never a raw
 * `feat:`/`fix:` commit subject) and is translated into every supported language
 * at compile time via `Record<SupportedLanguage, string>`.
 */
export type WhatsNewEntry = {
  /** Stable, unique slug. Siblings key the "new since last seen" state on this. */
  id: string;
  /** ISO 8601 instant. Rendered in the viewer's locale and local timezone. */
  releasedAt: string;
  type: WhatsNewType;
  /** Short headline, shown bold on the card. */
  title: Record<SupportedLanguage, string>;
  /** Optional one-line description, shown in regular weight under the title. */
  body?: Record<SupportedLanguage, string>;
};

/**
 * The curated changelog, newest first. Authored pre-sorted by `releasedAt` desc;
 * `whats-new.test.ts` enforces the ordering, uniqueness, and full-locale coverage.
 *
 * Entries dated before 2026-05-09 (when git history starts) are foundational
 * milestones, so their dates are approximate.
 */
export const WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
  {
    id: "whats-new-page",
    releasedAt: "2026-06-09T09:00:00Z",
    type: "feature",
    title: {
      en: "What's New page",
      fr: "La page Nouveautés",
      es: "La página Novedades",
      de: "Die Seite „Neuigkeiten“",
      it: "La pagina Novità",
      nl: 'De pagina "Wat is er nieuw"',
      pt: "A página Novidades",
    },
    body: {
      en: 'See recent updates at a glance, with a "New" badge in the menu when there\'s something fresh.',
      fr: "Voyez les dernières mises à jour en un coup d'œil, avec un badge « Nouveau » dans le menu dès qu'il y a du neuf.",
      es: "Mira las últimas actualizaciones de un vistazo, con una insignia «Nuevo» en el menú cuando hay novedades.",
      de: "Sieh dir aktuelle Updates auf einen Blick an, mit einem „Neu“-Badge im Menü, sobald es Neuigkeiten gibt.",
      it: "Guarda gli ultimi aggiornamenti a colpo d'occhio, con un badge «Nuovo» nel menu quando ci sono novità.",
      nl: 'Bekijk recente updates in één oogopslag, met een "Nieuw"-badge in het menu zodra er iets nieuws is.',
      pt: "Veja as atualizações recentes num relance, com um distintivo «Novo» no menu quando há novidades.",
    },
  },
  {
    id: "stats-exploration",
    releasedAt: "2026-06-05T09:00:00Z",
    type: "feature",
    title: {
      en: 'New Stats "Exploration" view',
      fr: "Nouvelle vue « Exploration » des statistiques",
      es: "Nueva vista «Exploración» en las estadísticas",
      de: "Neue Statistik-Ansicht „Erkundung“",
      it: "Nuova vista «Esplorazione» nelle statistiche",
      nl: 'Nieuwe statistiekweergave "Verkenning"',
      pt: "Nova vista «Exploração» nas estatísticas",
    },
    body: {
      en: "See which modes and variants you've tried.",
      fr: "Voyez quels modes et variantes vous avez essayés.",
      es: "Mira qué modos y variantes has probado.",
      de: "Sieh, welche Modi und Varianten du ausprobiert hast.",
      it: "Scopri quali modalità e varianti hai provato.",
      nl: "Zie welke modi en varianten je hebt geprobeerd.",
      pt: "Veja que modos e variantes já experimentou.",
    },
  },
  {
    id: "guided-discovery",
    releasedAt: "2026-06-04T09:00:00Z",
    type: "feature",
    title: {
      en: "Guided Discovery",
      fr: "Découverte guidée",
      es: "Descubrimiento guiado",
      de: "Geführte Entdeckung",
      it: "Scoperta guidata",
      nl: "Begeleide ontdekking",
      pt: "Descoberta guiada",
    },
    body: {
      en: 'Personalized "New challenge" suggestions, post-session prompts, and timed-session nudges.',
      fr: "Suggestions « Nouveau défi » personnalisées, invitations après chaque session et rappels de sessions chronométrées.",
      es: "Sugerencias personalizadas de «Nuevo reto», avisos tras la sesión y recordatorios de sesiones cronometradas.",
      de: "Personalisierte Vorschläge „Neue Herausforderung“, Hinweise nach der Sitzung und Tipps für Sitzungen auf Zeit.",
      it: "Suggerimenti personalizzati «Nuova sfida», avvisi dopo la sessione e spunti per sessioni a tempo.",
      nl: 'Gepersonaliseerde suggesties voor "Nieuwe uitdaging", meldingen na de sessie en tips voor sessies met tijdslimiet.',
      pt: "Sugestões personalizadas de «Novo desafio», avisos pós-sessão e lembretes de sessões cronometradas.",
    },
  },
  {
    id: "a11y-reliability",
    releasedAt: "2026-05-26T09:00:00Z",
    type: "fix",
    title: {
      en: "Accessibility and reliability",
      fr: "Accessibilité et fiabilité",
      es: "Accesibilidad y fiabilidad",
      de: "Barrierefreiheit und Zuverlässigkeit",
      it: "Accessibilità e affidabilità",
      nl: "Toegankelijkheid en betrouwbaarheid",
      pt: "Acessibilidade e fiabilidade",
    },
    body: {
      en: "Improvements across the whole app.",
      fr: "Des améliorations dans toute l'application.",
      es: "Mejoras en toda la aplicación.",
      de: "Verbesserungen in der gesamten App.",
      it: "Miglioramenti in tutta l'app.",
      nl: "Verbeteringen in de hele app.",
      pt: "Melhorias em toda a aplicação.",
    },
  },
  {
    id: "intuitiva-santi",
    releasedAt: "2026-05-25T14:00:00Z",
    type: "stack",
    title: {
      en: "Intuitiva Santi",
      fr: "Intuitiva Santi",
      es: "Intuitiva Santi",
      de: "Intuitiva Santi",
      it: "Intuitiva Santi",
      nl: "Intuitiva Santi",
      pt: "Intuitiva Santi",
    },
    body: {
      en: "Added to the collection of memorized decks.",
      fr: "Ajouté à la collection de jeux mémorisés.",
      es: "Añadida a la colección de barajas memorizadas.",
      de: "Zur Sammlung der memorierten Kartendecks hinzugefügt.",
      it: "Aggiunto alla raccolta di mazzi memorizzati.",
      nl: "Toegevoegd aan de verzameling gememoriseerde kaartspellen.",
      pt: "Adicionado à coleção de baralhos memorizados.",
    },
  },
  {
    id: "card-names-spelled",
    releasedAt: "2026-05-25T10:00:00Z",
    type: "feature",
    title: {
      en: "Clearer card names",
      fr: "Noms de cartes plus clairs",
      es: "Nombres de cartas más claros",
      de: "Klarere Kartennamen",
      it: "Nomi delle carte più chiari",
      nl: "Duidelijkere kaartnamen",
      pt: "Nomes de cartas mais claros",
    },
    body: {
      en: "Card names now spell out numeric ranks for clearer reading.",
      fr: "Les noms des cartes affichent désormais les valeurs numériques en toutes lettres pour une lecture plus claire.",
      es: "Los nombres de las cartas ahora muestran los valores numéricos con letras para leerlos mejor.",
      de: "In Kartennamen werden Zahlenwerte jetzt ausgeschrieben — für klareres Lesen.",
      it: "I nomi delle carte ora indicano i valori numerici per esteso, per una lettura più chiara.",
      nl: "Kaartnamen schrijven cijferwaarden nu voluit, zodat ze makkelijker te lezen zijn.",
      pt: "Os nomes das cartas agora escrevem os valores numéricos por extenso para uma leitura mais clara.",
    },
  },
  {
    id: "offline-pwa",
    releasedAt: "2026-05-08T12:00:00Z",
    type: "feature",
    title: {
      en: "Offline app",
      fr: "Application hors ligne",
      es: "App sin conexión",
      de: "Offline-App",
      it: "App offline",
      nl: "Offline-app",
      pt: "Aplicação offline",
    },
    body: {
      en: "Install MemDeck as an app with full offline support.",
      fr: "Installez MemDeck comme une application avec une prise en charge hors ligne complète.",
      es: "Instala MemDeck como una app con soporte completo sin conexión.",
      de: "Installiere MemDeck als App mit vollständiger Offline-Unterstützung.",
      it: "Installa MemDeck come app con supporto offline completo.",
      nl: "Installeer MemDeck als app met volledige offline-ondersteuning.",
      pt: "Instale o MemDeck como uma aplicação com suporte offline completo.",
    },
  },
  {
    id: "seven-languages",
    releasedAt: "2026-05-07T12:00:00Z",
    type: "feature",
    title: {
      en: "Train in seven languages",
      fr: "Entraînez-vous en sept langues",
      es: "Entrena en siete idiomas",
      de: "Trainiere in sieben Sprachen",
      it: "Allenati in sette lingue",
      nl: "Oefen in zeven talen",
      pt: "Treine em sete idiomas",
    },
    body: {
      en: "English, French, Spanish, German, Italian, Dutch, and Portuguese.",
      fr: "Anglais, français, espagnol, allemand, italien, néerlandais et portugais.",
      es: "Inglés, francés, español, alemán, italiano, neerlandés y portugués.",
      de: "Englisch, Französisch, Spanisch, Deutsch, Italienisch, Niederländisch und Portugiesisch.",
      it: "Inglese, francese, spagnolo, tedesco, italiano, olandese e portoghese.",
      nl: "Engels, Frans, Spaans, Duits, Italiaans, Nederlands en Portugees.",
      pt: "Inglês, francês, espanhol, alemão, italiano, neerlandês e português.",
    },
  },
  {
    id: "training-modes",
    releasedAt: "2026-05-06T12:00:00Z",
    type: "feature",
    title: {
      en: "Core training modes",
      fr: "Modes d'entraînement principaux",
      es: "Modos de entrenamiento principales",
      de: "Wichtigste Trainingsmodi",
      it: "Modi di allenamento principali",
      nl: "Belangrijkste oefenmodi",
      pt: "Modos de treino principais",
    },
    body: {
      en: "Flashcard, Spot Check, ACAAN, Distance, and the Toolbox.",
      fr: "Flashcard, Spot Check, ACAAN, Distance et la Boîte à outils.",
      es: "Flashcard, Spot Check, ACAAN, Distancia y la Caja de herramientas.",
      de: "Flashcard, Spot Check, ACAAN, Distanzzahl und der Werkzeugkasten.",
      it: "Flashcard, Spot Check, ACAAN, Distance e gli Strumenti.",
      nl: "Flashcard, Spot Check, ACAAN, Afstand en het Gereedschap.",
      pt: "Flashcard, Spot Check, ACAAN, Distância e as Ferramentas.",
    },
  },
  {
    id: "launch-stacks",
    releasedAt: "2026-05-05T12:00:00Z",
    type: "stack",
    title: {
      en: "Classic stacks",
      fr: "Stacks classiques",
      es: "Stacks clásicos",
      de: "Klassische Stacks",
      it: "Stack classici",
      nl: "Klassieke stacks",
      pt: "Stacks clássicos",
    },
    body: {
      en: "Launched with a collection of classic memorized deck systems to train and maintain.",
      fr: "Lancement avec une collection de systèmes de jeu mémorisé classiques à travailler et entretenir.",
      es: "Lanzado con una colección de sistemas clásicos de baraja memorizada para entrenar y mantener.",
      de: "Zum Start eine Sammlung klassischer memorierter Kartendeck-Systeme zum Trainieren und Frischhalten.",
      it: "Lancio con una raccolta di sistemi classici di mazzo memorizzato da allenare e mantenere.",
      nl: "Gelanceerd met een verzameling klassieke gememoriseerde kaartsystemen om te oefenen en te onderhouden.",
      pt: "Lançamento com uma coleção de sistemas clássicos de baralho memorizado para treinar e manter.",
    },
  },
];
