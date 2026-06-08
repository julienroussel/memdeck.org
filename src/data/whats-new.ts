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
  title: Record<SupportedLanguage, string>;
  body?: Record<SupportedLanguage, string>;
};

/**
 * The curated changelog, newest first. Authored pre-sorted by `releasedAt` desc;
 * `whats-new.test.ts` enforces the ordering, uniqueness, and full-locale coverage.
 *
 * Entries 6–9 are foundational milestones that predate git history (which starts
 * 2026-05-09), so their dates are approximate.
 */
export const WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
  {
    id: "stats-exploration",
    releasedAt: "2026-06-05T09:00:00Z",
    type: "feature",
    title: {
      en: 'New Stats "Exploration" view — see which modes and variants you\'ve tried.',
      fr: "Nouvelle vue « Exploration » des stats — voyez quels modes et variantes vous avez essayés.",
      es: "Nueva vista «Exploración» en las estadísticas — mira qué modos y variantes has probado.",
      de: "Neue Statistik-Ansicht „Erkundung“ — sieh, welche Modi und Varianten du ausprobiert hast.",
      it: "Nuova vista «Esplorazione» nelle statistiche — scopri quali modalità e varianti hai provato.",
      nl: 'Nieuwe statistiekweergave "Verkenning" — zie welke modi en varianten je hebt geprobeerd.',
      pt: "Nova vista «Exploração» nas estatísticas — veja que modos e variantes já experimentou.",
    },
  },
  {
    id: "guided-discovery",
    releasedAt: "2026-06-04T09:00:00Z",
    type: "feature",
    title: {
      en: 'Guided Discovery — personalized "New challenge" suggestions, post-session prompts, and timed-session nudges.',
      fr: "Découverte guidée — suggestions « Nouveau défi » personnalisées, invitations après chaque session et rappels de sessions chronométrées.",
      es: "Descubrimiento guiado — sugerencias personalizadas de «Nuevo reto», avisos tras la sesión y recordatorios de sesiones cronometradas.",
      de: "Geführte Entdeckung — personalisierte Vorschläge „Neue Herausforderung“, Hinweise nach der Sitzung und Tipps für Sitzungen auf Zeit.",
      it: "Scoperta guidata — suggerimenti personalizzati «Nuova sfida», avvisi dopo la sessione e spunti per sessioni a tempo.",
      nl: 'Begeleide ontdekking — gepersonaliseerde suggesties voor "Nieuwe uitdaging", meldingen na de sessie en tips voor sessies met tijdslimiet.',
      pt: "Descoberta guiada — sugestões personalizadas de «Novo desafio», avisos pós-sessão e lembretes de sessões cronometradas.",
    },
  },
  {
    id: "a11y-reliability",
    releasedAt: "2026-05-26T09:00:00Z",
    type: "fix",
    title: {
      en: "Accessibility and reliability improvements across the app.",
      fr: "Améliorations de l'accessibilité et de la fiabilité dans toute l'application.",
      es: "Mejoras de accesibilidad y fiabilidad en toda la aplicación.",
      de: "Verbesserungen bei Barrierefreiheit und Zuverlässigkeit in der gesamten App.",
      it: "Miglioramenti di accessibilità e affidabilità in tutta l'app.",
      nl: "Verbeteringen op het gebied van toegankelijkheid en betrouwbaarheid in de hele app.",
      pt: "Melhorias de acessibilidade e fiabilidade em toda a aplicação.",
    },
  },
  {
    id: "intuitiva-santi",
    releasedAt: "2026-05-25T14:00:00Z",
    type: "stack",
    title: {
      en: "Added the Intuitiva Santi memorized deck.",
      fr: "Ajout du jeu mémorisé Intuitiva Santi.",
      es: "Añadida la baraja memorizada Intuitiva Santi.",
      de: "Das memorierte Kartendeck Intuitiva Santi hinzugefügt.",
      it: "Aggiunto il mazzo memorizzato Intuitiva Santi.",
      nl: "Het gememoriseerde kaartspel Intuitiva Santi toegevoegd.",
      pt: "Adicionado o baralho memorizado Intuitiva Santi.",
    },
  },
  {
    id: "card-names-spelled",
    releasedAt: "2026-05-25T10:00:00Z",
    type: "feature",
    title: {
      en: "Card names now spell out numeric ranks for clearer reading.",
      fr: "Les noms des cartes affichent désormais les valeurs numériques en toutes lettres pour une lecture plus claire.",
      es: "Los nombres de las cartas ahora escriben los valores numéricos con letras para leerlos mejor.",
      de: "Kartennamen schreiben Zahlenwerte jetzt aus, damit sie leichter zu lesen sind.",
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
      en: "Install MemDeck as an app with full offline support.",
      fr: "Installez MemDeck comme une application avec une prise en charge hors ligne complète.",
      es: "Instala MemDeck como una app con soporte completo sin conexión.",
      de: "Installiere MemDeck als App mit vollständiger Offline-Unterstützung.",
      it: "Installa MemDeck come app con pieno supporto offline.",
      nl: "Installeer MemDeck als app met volledige offline-ondersteuning.",
      pt: "Instale o MemDeck como uma aplicação com suporte offline completo.",
    },
  },
  {
    id: "seven-languages",
    releasedAt: "2026-05-07T12:00:00Z",
    type: "feature",
    title: {
      en: "Train in seven languages — English, French, Spanish, German, Italian, Dutch, and Portuguese.",
      fr: "Entraînez-vous en sept langues — anglais, français, espagnol, allemand, italien, néerlandais et portugais.",
      es: "Entrena en siete idiomas — inglés, francés, español, alemán, italiano, neerlandés y portugués.",
      de: "Trainiere in sieben Sprachen — Englisch, Französisch, Spanisch, Deutsch, Italienisch, Niederländisch und Portugiesisch.",
      it: "Allenati in sette lingue — inglese, francese, spagnolo, tedesco, italiano, olandese e portoghese.",
      nl: "Oefen in zeven talen — Engels, Frans, Spaans, Duits, Italiaans, Nederlands en Portugees.",
      pt: "Treine em sete idiomas — inglês, francês, espanhol, alemão, italiano, neerlandês e português.",
    },
  },
  {
    id: "training-modes",
    releasedAt: "2026-05-06T12:00:00Z",
    type: "feature",
    title: {
      en: "Core training modes — Flashcard, Spot Check, ACAAN, Distance, and the Toolbox.",
      fr: "Modes d'entraînement principaux — Flashcard, Spot Check, ACAAN, Distance et la Boîte à outils.",
      es: "Modos de entrenamiento principales — Flashcard, Spot Check, ACAAN, Distancia y la Caja de herramientas.",
      de: "Wichtigste Trainingsmodi — Flashcard, Spot Check, ACAAN, Distanzzahl und der Werkzeugkasten.",
      it: "Modalità di allenamento principali — Flashcard, Spot Check, ACAAN, Distance e gli Strumenti.",
      nl: "Belangrijkste oefenmodi — Flashcard, Spot Check, ACAAN, Afstand en het Gereedschap.",
      pt: "Modos de treino principais — Flashcard, Spot Check, ACAAN, Distância e as Ferramentas.",
    },
  },
  {
    id: "launch-stacks",
    releasedAt: "2026-05-05T12:00:00Z",
    type: "stack",
    title: {
      en: "Launched with a collection of classic memorized deck systems to train and maintain.",
      fr: "Lancement avec une collection de systèmes de jeu mémorisé classiques à travailler et entretenir.",
      es: "Lanzado con una colección de sistemas clásicos de baraja memorizada para entrenar y mantener.",
      de: "Start mit einer Sammlung klassischer memorierter Kartendeck-Systeme zum Trainieren und Aufrechterhalten.",
      it: "Lancio con una raccolta di sistemi classici di mazzo memorizzato da allenare e mantenere.",
      nl: "Gelanceerd met een verzameling klassieke gememoriseerde kaartsystemen om te oefenen en te onderhouden.",
      pt: "Lançamento com uma coleção de sistemas clássicos de baralho memorizado para treinar e manter.",
    },
  },
];
