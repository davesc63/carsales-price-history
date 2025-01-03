// ==UserScript==
// @name         Carsales - Consolidated
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Fetch and display price history for Carsales listings on search results and saved items pages, with rate limiting.
// @author       davesc63
// @match        https://www.carsales.com.au/cars/*
// @match        https://www.carsales.com.au/saved-items
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Helper function for delay
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Function to fetch price history and update the listing
    async function fetchAndDisplayPriceHistory(sseId, targetElement, isFullWidth = false) {
        const apiUrl = `https://www.carsales.com.au/mobiapi/carsales/v1/insights/${sseId}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`Error fetching price history for SSE ID: ${sseId}. Status: ${response.status}`);
                return;
            }

            const data = await response.json();
            const priceChangeSection = data.items.find(item => item.sectionType === "priceChangeHistoryDetail");

            if (priceChangeSection) {
                const existingPriceHistory = targetElement.querySelector(`[data-sse-id="${sseId}-price-history"]`);
                if (existingPriceHistory) {
                    console.log(`Price history already displayed for SSE ID: ${sseId}`);
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
            console.error(`Error fetching price history for SSE ID: ${sseId}`, err);
        }
    }

    // Process search results listings
    async function processSearchResultsListings() {
        const listings = document.querySelectorAll("[class*='_listing-card']");
        console.log(`Found ${listings.length} listings on the search results page.`);

        for (const listing of listings) {
            const priceAnchorElement = listing.querySelector("a[href*='price-guide']");
            if (!priceAnchorElement) continue;

            const sseIdMatch = priceAnchorElement.href.match(/SSE-AD-\d+/);
            if (!sseIdMatch) continue;

            const sseId = sseIdMatch[0];
            if (listing.getAttribute("data-sse-id") === sseId) continue;

            listing.setAttribute("data-sse-id", sseId);
            await fetchAndDisplayPriceHistory(sseId, priceAnchorElement.parentNode);
            await delay(5000);
        }
    }

    // Process saved items listings
    async function processSavedItemsListings() {
        const listings = document.querySelectorAll(".listing-item.card.topspot");
        console.log(`Found ${listings.length} listings on the saved items page.`);

        for (const listing of listings) {
            const sseId = listing.id;
            const containerElement = listing.querySelector(".row");
            if (sseId && containerElement) {
                await fetchAndDisplayPriceHistory(sseId, containerElement, true);
                await delay(5000);
            }
        }
    }

    // Main function to determine which page to process
    function main() {
        if (window.location.pathname.includes("/cars/")) {
            processSearchResultsListings();
        } else if (window.location.pathname === "/saved-items") {
            processSavedItemsListings();
        }
    }

    window.addEventListener("load", main);
})();
