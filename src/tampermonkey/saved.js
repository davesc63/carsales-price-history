// ==UserScript==
// @name         Carsales - Saved Items
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Fetch and display price history while viewing saved items
// @author       davesc63
// @match        https://www.carsales.com.au/saved-items
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Helper function for delay
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Function to fetch price history and update the listing
    async function fetchAndDisplayPriceHistory(sseId, containerElement) {
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
                // Create a new div for the full-width price history
                let fullWidthDiv = document.createElement("div");
                fullWidthDiv.style.width = "100%";
                fullWidthDiv.style.padding = "10px";
                fullWidthDiv.style.marginTop = "10px";
                fullWidthDiv.style.backgroundColor = "#f9f9f9"; // Optional: Background color
                fullWidthDiv.style.border = "1px solid #ddd"; // Optional: Border for better visibility

                // Construct the price history content
                let contentHtml = `<ul>`;
                if (priceChangeSection.priceTimeLine && priceChangeSection.priceTimeLine.items) {
                    // Extract and process total price reduction title
                    let totalReductionTitle = priceChangeSection.priceTimeLine.title || "No price info.";
                    totalReductionTitle = totalReductionTitle.replace("Total price", "").trim(); // Strip "Total price"

                    // Split the title into words
                    const words = totalReductionTitle.split(" ");
                    if (words.length > 1) {
                        const actionWord = words[0].charAt(0).toUpperCase() + words[0].slice(1); // Capitalize first letter
                        const restOfTitle = words.slice(1).join(" "); // Join remaining words
                        let styledActionWord = "";

                        // Style the action word based on its value
                        if (words[0].toLowerCase() === "decrease") {
                            styledActionWord = `<strong style="color: green;">${actionWord}</strong>`;
                        } else if (words[0].toLowerCase() === "increase") {
                            styledActionWord = `<strong style="color: red;">${actionWord}</strong>`;
                        } else {
                            styledActionWord = `<strong>${actionWord}</strong>`;
                        }

                        totalReductionTitle = `${styledActionWord} ${restOfTitle}`;
                    }

                    // Add total price reduction
                    contentHtml += `<li>${totalReductionTitle}</li>`;

                    // Add individual price history items
                    priceChangeSection.priceTimeLine.items.forEach(item => {
                        contentHtml += `<li>${item.key}: ${item.value}</li>`;
                    });
                } else {
                    contentHtml += `<li>${priceChangeSection.priceUpdate.subtitle || "No updates."}</li>`;
                }
                contentHtml += `</ul>`;

                // Add the constructed HTML to the full-width div
                fullWidthDiv.innerHTML = contentHtml;

                // Append the full-width div to the container element
                containerElement.appendChild(fullWidthDiv);
            }
        } catch (err) {
            console.error(`Error fetching price history for SSE ID: ${sseId}`, err);
        }
    }

    // Main function to process all listings with rate limiting
    async function processListings() {
        const listings = document.querySelectorAll(".listing-item.card.topspot");

        for (const listing of listings) {
            const sseId = listing.id;
            const containerElement = listing.querySelector(".row"); // Use the row container for full-width injection

            if (sseId && containerElement) {
                await fetchAndDisplayPriceHistory(sseId, containerElement);

                // Rate limit: wait for 5 seconds before the next request
                await delay(5000);
            }
        }
    }

    // Run the script after the DOM is fully loaded
    window.addEventListener("load", processListings);
})();

