// ==UserScript==
// @name         Carsales - Consolidated
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Fetch and display price history for Carsales listings on search results, saved items, and individual car details pages, with rate limiting.
// @author       davesc63
// @match        https://www.carsales.com.au/cars/*
// @match        https://www.carsales.com.au/saved-items
// @match        https://www.carsales.com.au/cars/details/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Helper function for delay
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

   async function fetchAndDisplayPriceHistory(sseId, targetElement, isFullWidth = false) {
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
            // Check if price history is already displayed
            const existingPriceHistory = targetElement.querySelector(`[data-sse-id="${sseId}-price-history"]`);
            if (existingPriceHistory) {
                console.log(`[ CARSALES PRICE HISTORY ] - Price history already displayed for SSE ID: ${sseId}`);
                return;
            }

            // Create and style the price history div
            const priceHistoryDiv = document.createElement("div");
            priceHistoryDiv.setAttribute("data-sse-id", `${sseId}-price-history`);
            priceHistoryDiv.style.marginTop = "10px";
            priceHistoryDiv.style.padding = "10px";
            priceHistoryDiv.style.backgroundColor = "#f9f9f9";
            priceHistoryDiv.style.border = "1px solid #ddd";
            if (isFullWidth) {
                priceHistoryDiv.style.width = "100%";
            }

            // Populate the price history content
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

            // Add the content to the div
            priceHistoryDiv.innerHTML = contentHtml;

            // Append the price history div to the target element
            targetElement.appendChild(priceHistoryDiv);
        }
    } catch (err) {
        console.error(`[ CARSALES PRICE HISTORY ] - Error fetching price history for SSE ID: ${sseId}`, err);
    }
}


async function processSearchResultsListings() {
    const listings = document.querySelectorAll("[class*='_listing-card']");
    console.log(`[ CARSALES PRICE HISTORY ] - Found ${listings.length} listings on the search results page.`);

    for (const listing of listings) {

        const priceAnchorElement = listing.querySelector("a[href*='price-guide']");
        if (!priceAnchorElement) continue;

        const sseIdMatch = priceAnchorElement.href.match(/SSE-AD-\d+/);
        if (!sseIdMatch) continue;

        const sseId = sseIdMatch[0];
        if (listing.getAttribute("data-sse-id") === sseId) continue;

        listing.setAttribute("data-sse-id", sseId);



        // Check if price history is already injected
        const existingPriceHistory = listing.querySelector(`[data-sse-id="${sseId}-price-history"]`);
        if (existingPriceHistory) {
            console.log(`[ CARSALES PRICE HISTORY ] - Price history already displayed for SSE ID: ${sseId}`);
            continue;
        }

                // Locate the target container for injection
        const targetElement = listing.querySelector("[class*='_listing-card-container']");
        if (!targetElement) {
            console.warn(`[ CARSALES PRICE HISTORY ] - Target container not found for SSE ID: ${sseId}`);
            continue;
        }

        // Locate the card gallery and card body elements
        const galleryElement = listing.querySelector("[class*='_listing-card-gallery-container']");
        const cardBodyElement = listing.querySelector("[class*='_listing-card-body']");

        if (!galleryElement || !cardBodyElement) {
            console.warn(`[ CARSALES PRICE HISTORY ] - Could not find gallery or card body elements for SSE ID: ${sseId}`);
            continue;
        }

        console.log(`[ CARSALES PRICE HISTORY ] - Injecting price history for SSE ID: ${sseId} into second position of container`);

        // Fetch and display the price history
        const priceHistoryDiv = document.createElement("div");
        priceHistoryDiv.setAttribute("data-sse-id", `${sseId}-price-history`);
        //priceHistoryDiv.style.margin = "10px 0";
        p//riceHistoryDiv.style.padding = "10px";
        priceHistoryDiv.style.backgroundColor = "#f9f9f9";
        //priceHistoryDiv.style.border = "1px solid #ddd";
        //priceHistoryDiv.innerHTML = `<p>Loading price history...</p>`;

        // Insert the price history div between gallery and card body
        targetElement.insertBefore(priceHistoryDiv, cardBodyElement);

        // Now fetch and populate the price history content
        await fetchAndDisplayPriceHistory(sseId, priceHistoryDiv, true);
        await delay(5000); // Rate limiting

    }
}



    // Process saved items listings
    async function processSavedItemsListings() {
        const listings = document.querySelectorAll(".listing-item.card.topspot");
        console.log(`[ CARSALES PRICE HISTORY ] - Found ${listings.length} listings on the saved items page.`);

        for (const listing of listings) {
            const sseId = listing.id;
            const containerElement = listing.querySelector(".row");
            if (sseId && containerElement) {
                await fetchAndDisplayPriceHistory(sseId, containerElement, true);
                await delay(5000);
            }
        }
    }

    // Process individual car details page
    async function processIndividualListing() {
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

    // Main function to determine which page to process
    function main() {
        if (window.location.pathname.includes("/cars/details/")) {
            processIndividualListing();
        } else if (window.location.pathname.includes("/cars/")) {
            processSearchResultsListings();
        } else if (window.location.pathname === "/saved-items") {
            processSavedItemsListings();
        }
    }

    window.addEventListener("load", main);
})();
