// ==UserScript==
// @name         Carsales - Search results
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Fetch and display price history during search
// @author       davesc63
// @match        https://www.carsales.com.au/cars/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Helper function for delay
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Function to fetch price history and update the listing
    async function fetchAndDisplayPriceHistory(sseId, priceAnchorElement) {
        const apiUrl = `https://www.carsales.com.au/mobiapi/carsales/v1/insights/${sseId}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`[CAR SALES HACKS] - Failed to fetch for SSE ID: ${sseId}. Status: ${response.status}`);
                return;
            }

            const data = await response.json();
            const priceChangeSection = data.items.find(item => item.sectionType === "priceChangeHistoryDetail");

            if (priceChangeSection) {
                // Check if price history is already added
                const existingPriceHistory = priceAnchorElement.parentNode.querySelector(`[data-sse-id="${sseId}-price-history"]`);
                if (existingPriceHistory) {
                    console.log(`[CAR SALES HACKS] - Price history already displayed for SSE ID: ${sseId}`);
                    return;
                }

                const priceHistoryDiv = document.createElement("div");
                priceHistoryDiv.setAttribute("data-sse-id", `${sseId}-price-history`);
                priceHistoryDiv.style.marginTop = "10px";
                priceHistoryDiv.style.padding = "10px";
                priceHistoryDiv.style.backgroundColor = "#f9f9f9"; // Optional: Background color
                priceHistoryDiv.style.border = "1px solid #ddd"; // Optional: Border for visibility

                let contentHtml = `<ul>`;
                if (priceChangeSection.priceTimeLine?.items) {
                    // Add total price reduction with styling
                    let totalReductionTitle = priceChangeSection.priceTimeLine.title || "No price info.";
                    totalReductionTitle = totalReductionTitle.replace("Total price", "").trim(); // Strip "Total price"

                    // Extract the next word and format
                    const [direction, ...rest] = totalReductionTitle.split(" "); // Split the string
                    let styledDirection = direction;

                    // Style "increase" or "decrease"
                    if (direction.toLowerCase() === "increase") {
                        styledDirection = `<strong style="color: red;">Increase</strong>`;
                    } else if (direction.toLowerCase() === "decrease") {
                        styledDirection = `<strong style="color: green;">Decrease</strong>`;
                    }

                    // Highlight the dollar value (begins with "$")
                    const restWithBoldDollars = rest.map(word =>
                                                         word.startsWith("$") ? `<strong>${word}</strong>` : word
                                                        ).join(" ");

                    // Rebuild the styled string
                    contentHtml += `<li>${styledDirection} ${restWithBoldDollars}</li>`;

                    // Add individual price history items
                    priceChangeSection.priceTimeLine.items.forEach(item => {
                        contentHtml += `<li>${item.key}: ${item.value}</li>`;
                    });
                } else {
                    contentHtml += `<li>${priceChangeSection.priceUpdate?.subtitle || "No updates."}</li>`;
                }
                contentHtml += `</ul>`;

                priceHistoryDiv.innerHTML = contentHtml;

                // Append the price history just after the anchor element
                priceAnchorElement.parentNode.insertBefore(priceHistoryDiv, priceAnchorElement.nextSibling);
            }
        } catch (err) {
            console.error(`[CAR SALES HACKS] - Error fetching price history for SSE ID: ${sseId}`, err);
        }
    }

    // Main function to process all listings with rate limiting
    async function processListings() {
        const listings = document.querySelectorAll("[class*='_listing-card']");
        console.log(`[CAR SALES HACKS] - Found ${listings.length} listings on the page.`);

        for (const listing of listings) {
            // Find the first valid anchor for price-guide
            const priceAnchorElement = listing.querySelector("a[href*='price-guide']");
            if (!priceAnchorElement) {
                console.log(`[CAR SALES HACKS] - No price anchor found for a listing.`);
                continue;
            }

            // Extract a single SSE ID (only the first match)
            const sseIdMatch = priceAnchorElement.href.match(/SSE-AD-\d+/);
            if (!sseIdMatch) {
                console.log(`[CAR SALES HACKS] - No SSE ID found in anchor href: ${priceAnchorElement.href}`);
                continue;
            }

            const sseId = sseIdMatch[0]; // Use the first match only
            if (listing.getAttribute("data-sse-id") === sseId) {
                console.log(`[CAR SALES HACKS] - SSE ID already processed: ${sseId}`);
                continue;
            }

            // Mark the listing as processed
            listing.setAttribute("data-sse-id", sseId);

            // Fetch and display price history for the SSE ID
            await fetchAndDisplayPriceHistory(sseId, priceAnchorElement);

            // Rate limit: wait for 5 seconds between requests
            await delay(5000);
        }
    }

    // Run the script after the DOM is fully loaded
    window.addEventListener("load", processListings);
})();
