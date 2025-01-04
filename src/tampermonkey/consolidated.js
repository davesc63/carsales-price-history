// ==UserScript==
// @name         Carsales - Consolidated with Stop/Start
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Fetch and display price history for Carsales listings with a stop/start toggle button.
// @author       davesc63
// @match        https://www.carsales.com.au/cars/*
// @match        https://www.carsales.com.au/saved-items
// @match        https://www.carsales.com.au/cars/details/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let isRunning = true; // Script runs by default

    // Helper function for delay
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Create stop/start button
    function createToggleButton() {
        const bannerDiv = document.createElement("div");
        bannerDiv.id = "price-history-toggle-banner";
        bannerDiv.style.position = "relative";
        bannerDiv.style.width = "100%";
        bannerDiv.style.backgroundColor = "#f9f9f9";
        bannerDiv.style.padding = "10px 0";
        bannerDiv.style.textAlign = "center";
        bannerDiv.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        bannerDiv.style.zIndex = "10000";

        const toggleButton = document.createElement("button");
        toggleButton.id = "price-history-toggle-button";
        toggleButton.textContent = "Stop Price History";
        toggleButton.style.backgroundColor = "#ff4d4d";
        toggleButton.style.color = "white";
        toggleButton.style.border = "none";
        toggleButton.style.padding = "10px 20px";
        toggleButton.style.fontSize = "16px";
        toggleButton.style.cursor = "pointer";
        toggleButton.style.borderRadius = "5px";

        toggleButton.addEventListener("click", () => {
            isRunning = !isRunning;
            if (isRunning) {
                toggleButton.textContent = "Stop Price History";
                toggleButton.style.backgroundColor = "#ff4d4d";
                console.log("[ CARSALES PRICE HISTORY ] - Resuming script.");
                main();
            } else {
                toggleButton.textContent = "Start Price History";
                toggleButton.style.backgroundColor = "#4caf50";
                console.log("[ CARSALES PRICE HISTORY ] - Pausing script.");
            }
        });

        bannerDiv.appendChild(toggleButton);
        document.body.prepend(bannerDiv);
    }

    async function fetchAndDisplayPriceHistory(sseId, targetElement, isFullWidth = false) {
        if (!isRunning) return; // Stop if the script is paused

        const apiUrl = `https://www.carsales.com.au/mobiapi/carsales/v1/insights/${sseId}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`[ CARSALES PRICE HISTORY ] - Error fetching price history for SSE ID: ${sseId}. Status: ${response.status}`);
                return;
            }

            const data = await response.json();
            const priceChangeSection = data.items.find(item => item.sectionType === "priceChangeHistoryDetail");

            if (priceChangeSection) {
                const existingPriceHistory = targetElement.querySelector(`[data-sse-id="${sseId}-price-history"]`);
                if (existingPriceHistory) {
                    console.log(`[ CARSALES PRICE HISTORY ] - Price history already displayed for SSE ID: ${sseId}`);
                    return;
                }

                const priceHistoryDiv = document.createElement("div");
                priceHistoryDiv.setAttribute("data-sse-id", `${sseId}-price-history`);
                priceHistoryDiv.style.marginTop = "10px";
                priceHistoryDiv.style.padding = "10px";
                priceHistoryDiv.style.backgroundColor = "#f9f9f9";
                priceHistoryDiv.style.border = "1px solid #ddd";
                if (isFullWidth) {
                    priceHistoryDiv.style.width = "100%";
                }

                let contentHtml = `<ul>`;
                if (priceChangeSection.priceTimeLine?.items) {
                    let totalReductionTitle = priceChangeSection.priceTimeLine.title || "No price info.";
                    totalReductionTitle = totalReductionTitle.replace("Total price", "").trim();

                    const [direction, ...rest] = totalReductionTitle.split(" ");
                    let styledDirection = direction;

                    if (direction.toLowerCase() === "increase") {
                        styledDirection = `<strong style="color: red;">Increase</strong>`;
                    } else if (direction.toLowerCase() === "decrease") {
                        styledDirection = `<strong style="color: green;">Decrease</strong>`;
                    }

                    const restWithBoldDollars = rest.map(word =>
                        word.startsWith("$") ? `<strong>${word}</strong>` : word).join(" ");

                    contentHtml += `<li>${styledDirection} ${restWithBoldDollars}</li>`;

                    priceChangeSection.priceTimeLine.items.forEach(item => {
                        contentHtml += `<li>${item.key}: ${item.value}</li>`;
                    });
                } else {
                    contentHtml += `<li>${priceChangeSection.priceUpdate?.subtitle || "No updates."}</li>`;
                }
                contentHtml += `</ul>`;

                priceHistoryDiv.innerHTML = contentHtml;
                targetElement.appendChild(priceHistoryDiv);
            }
        } catch (err) {
            console.error(`[ CARSALES PRICE HISTORY ] - Error fetching price history for SSE ID: ${sseId}`, err);
        }
    }

    async function processSearchResultsListings() {
        if (!isRunning) return; // Stop if the script is paused

        const listings = document.querySelectorAll("[class*='_listing-card']");
        console.log(`[ CARSALES PRICE HISTORY ] - Found ${listings.length} listings on the search results page.`);

        for (const listing of listings) {
            if (!isRunning) return; // Stop if the script is paused

            const priceAnchorElement = listing.querySelector("a[href*='price-guide']");
            if (!priceAnchorElement) continue;

            const sseIdMatch = priceAnchorElement.href.match(/SSE-AD-\d+/);
            if (!sseIdMatch) continue;

            const sseId = sseIdMatch[0];
            if (listing.getAttribute("data-sse-id") === sseId) continue;

            listing.setAttribute("data-sse-id", sseId);

            const existingPriceHistory = listing.querySelector(`[data-sse-id="${sseId}-price-history"]`);
            if (existingPriceHistory) {
                console.log(`[ CARSALES PRICE HISTORY ] - Price history already displayed for SSE ID: ${sseId}`);
                continue;
            }

            const targetElement = listing.querySelector("[class*='_listing-card-container']");
            if (!targetElement) {
                console.warn(`[ CARSALES PRICE HISTORY ] - Target container not found for SSE ID: ${sseId}`);
                continue;
            }

            const galleryElement = listing.querySelector("[class*='_listing-card-gallery-container']");
            const cardBodyElement = listing.querySelector("[class*='_listing-card-body']");

            if (!galleryElement || !cardBodyElement) {
                console.warn(`[ CARSALES PRICE HISTORY ] - Could not find gallery or card body elements for SSE ID: ${sseId}`);
                continue;
            }

            console.log(`[ CARSALES PRICE HISTORY ] - Injecting price history for SSE ID: ${sseId} into second position of container`);

            const priceHistoryDiv = document.createElement("div");
            priceHistoryDiv.setAttribute("data-sse-id", `${sseId}-price-history`);
            priceHistoryDiv.style.backgroundColor = "#f9f9f9";

            targetElement.insertBefore(priceHistoryDiv, cardBodyElement);

            await fetchAndDisplayPriceHistory(sseId, priceHistoryDiv, true);
            await delay(5000); // Rate limiting
        }
    }

    async function processSavedItemsListings() {
        if (!isRunning) return; // Stop if the script is paused

        const listings = document.querySelectorAll(".listing-item.card.topspot");
        console.log(`[ CARSALES PRICE HISTORY ] - Found ${listings.length} listings on the saved items page.`);

        for (const listing of listings) {
            if (!isRunning) return; // Stop if the script is paused

            const sseId = listing.id;
            const containerElement = listing.querySelector(".row");
            if (sseId && containerElement) {
                await fetchAndDisplayPriceHistory(sseId, containerElement, true);
                await delay(5000);
            }
        }
    }

    async function processIndividualListing() {
        if (!isRunning) return; // Stop if the script is paused

        const sseIdMatch = window.location.href.match(/SSE-AD-\d+/);
        if (!sseIdMatch) {
            console.error(`[ CARSALES PRICE HISTORY ] - SSE ID not found in URL.`);
            return;
        }

        const sseId = sseIdMatch[0];
        const priceOuterLayout = document.querySelector("[id='details:body:hero-image']");

        if (!priceOuterLayout) {
            console.error(`[ CARSALES PRICE HISTORY ] - Price outer layout container not found.`);
            return;
        }

        await fetchAndDisplayPriceHistory(sseId, priceOuterLayout);
    }

    function main() {
        if (!isRunning) return; // Stop if the script is paused

        if (window.location.pathname.includes("/cars/details/")) {
            processIndividualListing();
        } else if (window.location.pathname.includes("/cars/")) {
            processSearchResultsListings();
        } else if (window.location.pathname === "/saved-items") {
            processSavedItemsListings();
        }
    }

    createToggleButton();
    window.addEventListener("load", main);
})();
