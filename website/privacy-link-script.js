// Privacy Link Handler for Icumbi Website
// Add this script to your existing website to handle privacy link clicks

document.addEventListener('DOMContentLoaded', function() {
    // Find the footer element
    const footer = document.querySelector('footer') || document.querySelector('.footer');
    
    if (footer) {
        // Create privacy link
        const privacyLink = document.createElement('a');
        privacyLink.href = '/privacy';
        privacyLink.textContent = 'Privacy';
        privacyLink.className = 'privacy-link';
        privacyLink.style.cssText = `
            color: #007bff;
            text-decoration: none;
            margin-left: 15px;
            font-size: 14px;
            font-weight: 500;
        `;
        
        // Add hover effect
        privacyLink.addEventListener('mouseenter', function() {
            this.style.textDecoration = 'underline';
        });
        
        privacyLink.addEventListener('mouseleave', function() {
            this.style.textDecoration = 'none';
        });
        
        // Find the existing footer text and add the privacy link after it
        const footerText = footer.querySelector('div') || footer;
        footerText.appendChild(privacyLink);
    }
});

// Alternative: If you want to add it directly to existing footer text
function addPrivacyLinkToFooter() {
    const footerElements = document.querySelectorAll('footer, .footer, [class*="footer"]');
    
    footerElements.forEach(footer => {
        // Look for the existing footer text
        const textNodes = Array.from(footer.childNodes).filter(node => 
            node.nodeType === Node.TEXT_NODE && 
            node.textContent.includes('Easy rentals, better life')
        );
        
        if (textNodes.length > 0) {
            const textNode = textNodes[0];
            const privacyLink = document.createElement('a');
            privacyLink.href = '/privacy';
            privacyLink.textContent = ' Privacy';
            privacyLink.style.cssText = `
                color: #007bff;
                text-decoration: none;
                font-weight: 500;
            `;
            
            // Insert the link after the text
            textNode.parentNode.insertBefore(privacyLink, textNode.nextSibling);
        }
    });
}

// Call the function when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addPrivacyLinkToFooter);
} else {
    addPrivacyLinkToFooter();
} 