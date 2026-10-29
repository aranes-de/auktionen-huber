const fs = require("node:fs");
const path = require("node:path");

const read = (relPath) => fs.readFileSync(path.join(__dirname, relPath), "utf-8");

module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ "src/images": "images" });
    eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
    eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
    eleventyConfig.addWatchTarget("src/css/");
    eleventyConfig.addWatchTarget("src/js/");

    // CSS und JS werden ins HTML eingebettet: Der Draft-Server komprimiert nur
    // HTML (gzip), separate CSS/JS-Dateien kämen unkomprimiert und blockierend an.
    // {% inlineCss "src/css/style.css" %}
    eleventyConfig.addShortcode("inlineCss", (relPath) =>
        read(relPath)
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\s+/g, " ")
            .replace(/\s*([{}:;,>])\s*/g, "$1")
            .replace(/;}/g, "}")
            .trim()
    );

    // {% inlineJs "src/js/main.js" %}
    eleventyConfig.addShortcode("inlineJs", (relPath) =>
        read(relPath)
            .replace(/^\s*\/\/.*$/gm, "")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\n\s+/g, "\n")
            .replace(/\n+/g, "\n")
            .trim()
    );

    // Wörter für die Einblend-Animation schon beim Build in <span> zerlegen,
    // damit nichts aufblitzt: {{ "Text" | words | safe }}
    eleventyConfig.addFilter("words", (text) =>
        String(text).trim().split(/\s+/)
            .map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`)
            .join(" ")
    );

    return {
        dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    };
};
