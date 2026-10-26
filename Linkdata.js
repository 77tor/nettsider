/**
 * Datafil for lenkesamling (linkdata.js)
 * Du kan enkelt legge til nye kategori-objekter eller nye lenker under eksisterende kategorier.
 */

const linkData = {
    "Lesing": [
        {
            title: "Leseplan",
            url: "https://sites.google.com/ikrs.no/leseplan/forside",
            description: "Leseplanen til Hånes skole",
            tags: ["lesing", "norsk", "barneskole"]
        },
        {
            title: "Lesekurs",
            url: "https://sites.google.com/ikrs.no/lesekurs/start",
            description: "Side med ressurser for lesekurs",
            tags: ["lesing", "norsk", "barneskole"]
        },
        {
            title: "Alle må lese mye",
            url: "https://sites.google.com/ikrs.no/allemalesemye/start",
            description: "Les og løs. Ulike oppgaver med 3 nivåer",
            tags: ["lesing", "norsk", "barneskole"]
        },
        {
            title: "Lesestrategier",
            url: "https://sites.google.com/ikrs.no/lesestrategier/start",
            description: "Les og løs. Ulike oppgaver med 3 nivåer",
            tags: ["lesing", "norsk", "barneskole"]
        },
        {
            title: "Les og løs",
            url: "https://sites.google.com/ikrs.no/les-og-los/start",
            description: "Les og løs. Ulike oppgaver med 3 nivåer",
            tags: ["lesing", "norsk", "barneskole"]
        },
        {
            title: "Salaby Lesehule",
            url: "https://www.salaby.no",
            description: "Digitalt læremiddel med fokus på leseforståelse.",
            tags: ["salaby", "tekst", "oppgaver"]
        }
    ],
    "Regning": [
        {
            title: "Mattelist",
            url: "https://www.mattelist.no",
            description: "Matematikkutfordringer og problemløsing for alle trinn.",
            tags: ["matematikk", "oppgaver", "logikk"]
        },
        {
            title: "Kahn Academy Norge",
            url: "https://nb.khanacademy.org",
            description: "Gratis videoer og øvingsoppgaver i matematikk.",
            tags: ["video", "gratis", "matte"]
        }
    ],
    "Andre fag": [
        {
            title: "NRK Skole",
            url: "https://www.nrk.no/skole",
            description: "Klipparkiv tilpasset læreplanen i samfunnsfag, naturfag osv.",
            tags: ["video", "samfunnsfag", "naturfag"]
        },
        {
            title: "Naturfag.no",
            url: "https://www.naturfag.no",
            description: "Ressurser, forsøk og aktiviteter for naturfag.",
            tags: ["forsøk", "naturfag", "aktiviteter"]
        }
    ],
    "Oppg. for utskrift": [
        {
            title: "Oppgavegenerator Math-Drills",
            url: "https://www.math-drills.com",
            description: "Utskriftsvennlige arbeidsark i matematikk (PDF).",
            tags: ["pdf", "print", "arbeidsark"]
        },
        {
            title: "Skrivesider for utskrift",
            url: "https://www.kugoo.no",
            description: "Arbeidsark for bokstavtrening og skriving.",
            tags: ["skriving", "print", "norsk"]
        }
    ],
    "Oppg. for nett": [
        {
            title: "Kahoot!",
            url: "https://kahoot.com",
            description: "Spillbaserte quizer og læringsspill.",
            tags: ["quiz", "interaktiv", "spill"]
        },
        {
            title: "IXL Læring",
            url: "https://no.ixl.com",
            description: "Målrettet ferdighetstrening på nett.",
            tags: ["interaktiv", "øving", "nett"]
        }
    ]
};

// Liste over godkjente admin-eposter
const ADMIN_EMAILS = [
    "77tor@ikrs.no",
    "tor.skarprud@gmail.com"
];