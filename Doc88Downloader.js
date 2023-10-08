// ==UserScript==
// @name         Doc88Downloader
// @namespace    https://github.com/lomexicano/Doc88Downloader
// @version      2.0
// @description  Download screenshots from all pages from a Doc88 file in one PDF
// @author       lomexicano
// @match        https://www.doc88.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.11.1/pdf-lib.js
// ==/UserScript==

// Function to extract the page title from the HTML
function extractPageTitle() {
    const pageTitleElement = document.querySelector('h1[title]');
    if (pageTitleElement) {
        return pageTitleElement.getAttribute('title').trim();
    }
    return 'merged_pages'; // Default title if not found
}

// Function to download the current page's "page_i" elements in a PDF file;
async function downloadPagesAsPDF(from, to) {
    'use strict';

    const pageTitle = extractPageTitle();

    const pdfDoc = await window.PDFLib.PDFDocument.create();

    for (let i = from; i <= to; i++) {
        ongoingProcess = true;
        if (cancelProcess) {
            break;
        }
        const pageCanvas = document.getElementById('page_' + i);
        if (pageCanvas === null) {
            break;
        }
        const blob = await new Promise((resolve) => {
            pageCanvas.toBlob((blob) => resolve(blob));
        });

        // Convert the blob to a Uint8Array
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const image = await pdfDoc.embedPng(uint8Array);

        // Add a new page with the same dimensions as the image
        const page = pdfDoc.addPage([image.width, image.height]);

        // Draw the image onto the page
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const imageWidth = image.width;
        const imageHeight = image.height;

        const scaleFactor = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);

        page.drawImage(image, {
            x: 0,
            y: 0,
            width: imageWidth * scaleFactor,
            height: imageHeight * scaleFactor,
        });
    }

    if (!cancelProcess) {
        const pdfBytes = await pdfDoc.save();
        const anchor = document.createElement('a');
        anchor.download = pageTitle + '.pdf';
        anchor.href = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
        anchor.click();
        URL.revokeObjectURL(anchor.href);

        cancelButton.textContent = "Cancel";
        cancelButton.disabled = true;
    }
    ongoingProcess = false;
}

function displayAllPages() {
    // Check if the 'continue_page' element exists
    const continuePage = document.getElementById('continue_page');
    if (continuePage) {
        // Find the button with class 'iconfont more' inside 'continue_page'
        const moreButton = continuePage.querySelector('.iconfont.more');
        if (moreButton) {
            // Trigger a click event on the button
            moreButton.click();

            // Wait for 2 seconds (2000 milliseconds) after clicking, so it loads the other pages HTML, at least;
            setTimeout(() => {
            }, 2000);
        }
    }
}


async function scrollToPagesWithPercentage() {
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (true) {
        ongoingProcess = true;
        let pagesWithPercentage = document.querySelectorAll('div.page_pb[id^="pagepb_"]');
        let percentageRemoved = true;

        for (let i = 0; i < pagesWithPercentage.length; i++) {
            if (cancelProcess) {
                break;
            }
            const page = pagesWithPercentage[i];
            const text = page.textContent.trim();
            if (text.endsWith('%')) {
                // Scroll to the page
                page.scrollIntoView({ behavior: 'smooth' });

                // Wait for a moment (you can adjust the delay as needed)
                await waitFor(100);

                // Check again if the percentage is still there
                pagesWithPercentage = document.querySelectorAll('div.page_pb[id^="pagepb_"]');
                percentageRemoved = false;
                break; // Exit the loop to scroll to the next page
            }
        }

        // If all pages have had their percentage removed, exit the loop
        if (percentageRemoved) {
            break;
        }
        if (cancelProcess) {
            break;
        }
    }
    ongoingProcess = false;
}

let cancelProcess = false; // Flag to indicate if the processes should be canceled
let ongoingProcess = false; // Flag to indicate if there is an ongoing process

function createDownloadButton() {
    const container = document.createElement('div'); // Container for the buttons
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.width = '160px'; // Adjust the width as needed

    // Create the white rectangle with black outline
    container.style.backgroundColor = 'white';
    container.style.border = '2px solid black';
    container.style.padding = '10px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'loadAllPagesCheckbox'; // Set the checkbox ID
    checkbox.checked = true; // Default value is true

    const checkboxLabel = document.createElement('label');
    checkboxLabel.textContent = 'Load all pages';
    checkboxLabel.htmlFor = 'loadAllPagesCheckbox'; // Associate the label with the checkbox

    const button = document.createElement('button');
    button.textContent = 'Download PDF';
    button.style.marginTop = '5px';

    const cancelButton = document.createElement('button'); // Cancel button
    cancelButton.textContent = 'Cancel';
    cancelButton.style.marginTop = '7px'; // Add margin to separate from other buttons
    cancelButton.disabled = true; // Initially disable the Cancel button

    // Function to update cancel button text and enable/disable it
    function updateCancelButton(text, isEnabled) {
        cancelButton.textContent = text;
        cancelButton.disabled = !isEnabled;
    }

    // Add a click event listener to the cancel button
    cancelButton.addEventListener('click', async () => {
        cancelProcess = true; // Set the cancel flag to true
        updateCancelButton('OK. Canceled.', false); // Disable the Cancel button

        setTimeout(() => {
            updateCancelButton('Cancel', false);
            cancelProcess = true;
        }, 1500);

        console.log('Canceled ongoing processes.');
        cancelProcess = false; // Set the cancel flag to true
    });

    // Add a click event listener to the download button
    button.addEventListener('click', async () => {
        const shouldLoadAllPages = document.getElementById('loadAllPagesCheckbox').checked;
        updateCancelButton('Cancel', true); // Enable the Cancel button

        if (shouldLoadAllPages) {
            ongoingProcess = true; // There is an ongoing process
            await displayAllPages();

            if (cancelProcess) {
                console.log('Download canceled.');
                ongoingProcess = false; // No ongoing process
                cancelProcess = false; // Reset the cancel flag
                return; // Exit the function if canceled
            }

            await scrollToPagesWithPercentage();

            if (cancelProcess) {
                console.log('Download canceled.');
                ongoingProcess = false; // No ongoing process
                cancelProcess = false; // Reset the cancel flag
                return; // Exit the function if canceled
            }
        }

        if (cancelProcess) {
            console.log('Download canceled.');
            ongoingProcess = false; // No ongoing process
            cancelProcess = false; // Reset the cancel flag
            return; // Exit the function if canceled
        }

        await downloadPagesAsPDF(1, 9999);
        ongoingProcess = false; // No ongoing process
    });

    const buttonContainer = document.createElement('div'); // Container for the buttons
    buttonContainer.style.display = 'flex'; // Use flex to align checkbox and button horizontally

    buttonContainer.appendChild(checkbox); // Append checkbox to container
    buttonContainer.appendChild(checkboxLabel); // Append label to container

    container.appendChild(buttonContainer); // Append checkbox container to main container
    container.appendChild(button); // Append button to main container
    container.appendChild(cancelButton); // Append cancel button to main container

    document.body.appendChild(container); // Append the main container to the page
}

// Call the function to create the buttons when the page loads
window.addEventListener('load', createDownloadButton);
