// ==UserScript==
// @name         Carsales - Consolidated with Stop/Start and Donation Modal
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Fetch and display price history for Carsales listings with a stop/start toggle button and donation modal.
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

    // Create donation modal
function createDonationModal() {
    const modalOverlay = document.createElement("div");
    modalOverlay.id = "donation-modal-overlay";
    modalOverlay.style.position = "fixed";
    modalOverlay.style.top = "0";
    modalOverlay.style.left = "0";
    modalOverlay.style.width = "100%";
    modalOverlay.style.height = "100%";
    modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modalOverlay.style.display = "flex";
    modalOverlay.style.alignItems = "center";
    modalOverlay.style.justifyContent = "center";
    modalOverlay.style.zIndex = "10001";

    const modal = document.createElement("div");
    modal.id = "donation-modal";
    modal.style.backgroundColor = "white";
    modal.style.padding = "20px";
    modal.style.borderRadius = "10px";
    modal.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
    modal.style.textAlign = "center";
    modal.style.width = "300px";

    const modalTitle = document.createElement("h2");
    modalTitle.textContent = "Support This Script";
    modal.appendChild(modalTitle);

    const modalText = document.createElement("p");
    modalText.textContent = "Enjoying the functionality? Consider buying me a beer!";
    modal.appendChild(modalText);

   // Buy me a beer button
    const buyMeABeerLink = document.createElement("a");
    buyMeABeerLink.href = "https://www.buymeacoffee.com/davesc63";
    buyMeABeerLink.target = "_blank"; // Opens the link in a new tab
    const buyMeABeerButton = document.createElement("img");
    buyMeABeerButton.src = "https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20beer&emoji=🍺&slug=davesc63&button_colour=FFDD00&font_family=Poppins&font_colour=000000&outline_colour=000000&coffee_colour=ffffff";
    buyMeABeerButton.alt = "Buy me a beer";
    buyMeABeerButton.style.display = "block"; // Centering the button
    buyMeABeerButton.style.margin = "0 auto"; // Center the image button
    buyMeABeerLink.appendChild(buyMeABeerButton);
    modal.appendChild(buyMeABeerLink);


    // Close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.backgroundColor = "#f44336";
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.padding = "10px 20px";
    closeButton.style.fontSize = "16px";
    closeButton.style.cursor = "pointer";
    closeButton.style.borderRadius = "5px";
    closeButton.style.marginTop = "10px";
    closeButton.addEventListener("click", () => {
        modalOverlay.remove();
    });

    modal.appendChild(closeButton);
    modalOverlay.appendChild(modal);

    document.body.appendChild(modalOverlay);
}

// Trigger donation modal every 5 minutes
setInterval(() => {
    if (!document.querySelector("#donation-modal-overlay")) {
        createDonationModal();
    }
}, 300000); // 5 minutes in milliseconds 300000

    async function fetchAndDisplayPriceHistory(sseId, targetElement, carURL, isFullWidth = false) {
        if (!isRunning) return; // Stop if the script is paused

        const apiUrl = `https://www.carsales.com.au/mobiapi/carsales/v1/insights/${sseId}`;

        try {



            // Fetch the carURL and log the raw text
            console.log(`[ CARSALES PRICE HISTORY ] - Processing carURL: ${carURL}`);
            const carResponse = await fetch(carURL);
            const carText = await carResponse.text();
            //console.log(`[ CARSALES PRICE HISTORY ] - Response text from carURL: ${carText}`);

            // Parse the carText to extract the lastModifiedDate
            const parser = new DOMParser();
            const doc = parser.parseFromString(carText, "text/html");

            // Find the div containing "Last Modified"
            const lastModifiedLabel = Array.from(doc.querySelectorAll("span.iompba0._1lalutrg0._1lalutr14o._1tlv1fe6n.a6hzxt3.a6hzxt0.a6hzxt0"))
            .find(el => el.textContent.trim() === "Last Modified");

            let lastModifiedDate = "Unknown";
            if (lastModifiedLabel) {
                // Find the parent div and navigate to the sibling containing the date
                const parentDiv = lastModifiedLabel.closest("div");
                const dateSpan = parentDiv?.nextElementSibling?.querySelector("span.iompba0._1lalutrg0._1lalutr14o._1tlv1fe6o.a6hzxt3.a6hzxt0.a6hzxt0");

                if (dateSpan) {
                    lastModifiedDate = dateSpan.textContent.trim();
                }
            }



            console.log(`[ CARSALES PRICE HISTORY ] - Last Modified Date: ${lastModifiedDate}`);


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

                let contentHtml = ``;
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

                    contentHtml += `<p style="margin: 0; padding-left: 20px;">${styledDirection} ${restWithBoldDollars}
                    </p>`;

                    contentHtml += `<ul>`;

                    priceChangeSection.priceTimeLine.items.forEach(item => {
                        contentHtml += `<li>${item.key}: ${item.value}</li>`;
                    });
                } else {
                    contentHtml += `<li>${priceChangeSection.priceUpdate?.subtitle || "No updates."}</li>`;
                }
                contentHtml += `</ul>`;

                // Append the last modified date under the price history content
                contentHtml += `<p style="margin: 0; padding-left: 20px;">
                  <strong>Last Modified:</strong> ${lastModifiedDate}
                </p>`;



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

            const hrefElement = listing.querySelector("a[class*='_listing-card-href']");
            if (!hrefElement) continue;

            const carURL = hrefElement.href;
            console.log("[ CARSALES PRICE HISTORY ] - CarURL: ", carURL);
            if (!carURL) continue;

            const sseIdMatch = carURL.match(/SSE-AD-\d+/);
            console.log("[ CARSALES PRICE HISTORY ] - SSEIDMATCH", sseIdMatch);
            if (!sseIdMatch) continue;

            const sseId = sseIdMatch[0];
            if (listing.getAttribute("data-sse-id") === sseId) continue;
            console.log("[ CARSALES PRICE HISTORY ] - SSE ID:", sseId);

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

            await fetchAndDisplayPriceHistory(sseId, priceHistoryDiv, carURL, true);
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
            const linkElement = listing.querySelector("a[data-href]"); // Find the <a> tag with data-href

            if (sseId && containerElement && linkElement) {
                // Extract carURL from the data-href attribute
                const relativeHref = linkElement.getAttribute("data-href");
                const carURL = `https://www.carsales.com.au${relativeHref}`;

                console.log(`[ CARSALES PRICE HISTORY ] - CarURL: ${carURL}`);
                console.log(`[ CARSALES PRICE HISTORY ] - Processing SSE ID: ${sseId}, URL: ${carURL}`);

                await fetchAndDisplayPriceHistory(sseId, containerElement, carURL, true);
                await delay(5000);
            } else {
                console.warn(`[ CARSALES PRICE HISTORY ] - Missing data for SSE ID: ${sseId}`);
            }
        }
    }


    async function processIndividualListing() {
        if (!isRunning) return; // Stop if the script is paused

        // Use the current page URL
        const carURL = window.location.href;
        console.log(`[ CARSALES PRICE HISTORY ] - CarURL: ${carURL}`);

        // Extract the SSE ID from the URL
        const sseIdMatch = carURL.match(/SSE-AD-\d+/);
        if (!sseIdMatch) {
            console.error(`[ CARSALES PRICE HISTORY ] - SSE ID not found in URL: ${carURL}`);
            return;
        }

        const sseId = sseIdMatch[0];
        console.log(`[ CARSALES PRICE HISTORY ] - Extracted SSE ID: ${sseId}`);

        // Locate the price container on the page
        const priceOuterLayout = document.querySelector("[id='details:body:hero-image']");
        if (!priceOuterLayout) {
            console.error(`[ CARSALES PRICE HISTORY ] - Price outer layout container not found.`);
            return;
        }

        // Fetch and display the price history
        await fetchAndDisplayPriceHistory(sseId, priceOuterLayout, carURL);
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