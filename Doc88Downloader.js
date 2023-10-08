// ==UserScript==
// @name         Doc88Downloader
// @namespace    https://github.com/lomexicano/Doc88Downloader
// @version      1.0
// @description  Download screenshots from all pages from a Doc88 file in one PDF
// @author       lomexicano
// @match        https://www.doc88.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.11.1/pdf-lib.js
// ==/UserScript==

async function downloadPagesAsPDF(from, to) {
    'use strict';
    const pdfDoc = await window.PDFLib.PDFDocument.create();

    for (let i = from; i <= to; i++) {
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

    const pdfBytes = await pdfDoc.save();

    const anchor = document.createElement('a');
    anchor.download = 'merged_pages.pdf';
    anchor.href = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    anchor.click();
    URL.revokeObjectURL(anchor.href);
}



function createDownloadButton() {
    const button = document.createElement('button');
    button.textContent = 'Download PDF';
    button.style.position = 'fixed';
    button.style.top = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';

    // Add a click event listener to call your function when the button is clicked
    button.addEventListener('click', async () => {
        await downloadPagesAsPDF(1, 9999);
    });

    document.body.appendChild(button);
}

// Call the function to create the button when the page loads
window.addEventListener('load', createDownloadButton);