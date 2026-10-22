
const http = require("http");
const fs = require("fs");
const path = require("path");

const fichier = path.join(__dirname, "links.json");

const server = http.createServer((req, res) => {

    // Autoriser notre interface à communiquer avec le serveur
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Répondre aux vérifications du navigateur
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    // Lire les destinations enregistrées
    function lireDestinations() {
        return JSON.parse(fs.readFileSync(fichier, "utf8"));
    }

    // Enregistrer les destinations
    function enregistrerDestinations(destinations) {
        fs.writeFileSync(
            fichier,
            JSON.stringify(destinations, null, 2),
            "utf8"
        );
    }

    // Demande de modification depuis l'interface
    if (req.method === "POST" && req.url === "/modifier") {

        let corps = "";

        req.on("data", morceau => {
            corps += morceau;
        });

        req.on("end", () => {
            try {
                const donnees = JSON.parse(corps);
                const code = donnees.code;
                const destination = donnees.destination;

                if (
                    typeof code !== "string" ||
                    !/^[a-zA-Z0-9_-]{1,50}$/.test(code) ||
                    typeof destination !== "string"
                ) {
                    res.writeHead(400, {
                        "Content-Type": "application/json; charset=utf-8"
                    });
                    return res.end(JSON.stringify({
                        succes: false,
                        message: "Code ou destination invalide."
                    }));
                }

                const url = new URL(destination);

                if (!["http:", "https:"].includes(url.protocol)) {
                    throw new Error("La destination doit être une URL HTTP ou HTTPS.");
                }

                const destinations = lireDestinations();
                destinations[code] = url.href;
                enregistrerDestinations(destinations);

                res.writeHead(200, {
                    "Content-Type": "application/json; charset=utf-8"
                });
                res.end(JSON.stringify({
                    succes: true,
                    message: "Destination enregistrée avec succès !"
                }));

            } catch (erreur) {
                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });
                res.end(JSON.stringify({
                    succes: false,
                    message: "Impossible d'enregistrer. Vérifie l'URL et links.json."
                }));
            }
        });

        return;
    }

    // Redirection d'un QR dynamique
    if (req.method === "GET") {
        const code = new URL(req.url, "http://localhost").pathname.slice(1);

        if (!code) {
            res.writeHead(200, {
                "Content-Type": "text/plain; charset=utf-8"
            });
            return res.end("Serveur de QR dynamiques opérationnel.");
        }

        try {
            const destinations = lireDestinations();
            const destination = destinations[code];

            if (destination) {
                res.writeHead(302, {
                    "Location": destination,
                    "Cache-Control": "no-store"
                });
                return res.end();
            }

            res.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8"
            });
            return res.end("QR code inconnu.");

        } catch (erreur) {
            res.writeHead(500, {
                "Content-Type": "text/plain; charset=utf-8"
            });
            return res.end("Erreur de lecture des destinations.");
        }
    }

    res.writeHead(404);
    res.end("Route inconnue.");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
});
