const sharp = require("sharp");
const fs = require("fs");

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" rx="256" fill="#3B82F6"/>
    
    <!-- Map icon design -->
    <g transform="translate(256, 256) scale(2)">
        <!-- Base map shape -->
        <path d="M168 72L84 120L84 408L168 360L252 408L336 360V72L252 120L168 72Z" 
              fill="white" fillRule="evenodd"/>
        
        <!-- Map fold lines -->
        <path d="M168 72V360M252 120V408" 
              stroke="#3B82F6" strokeWidth="8" strokeLinecap="round"/>
    </g>
</svg>`;

async function generateIcon() {
    // Ensure assets directory exists
    if (!fs.existsSync("assets")) {
        fs.mkdirSync("assets");
    }

    try {
        // Generate main icon
        await sharp(Buffer.from(svgContent))
            .resize(1024, 1024)
            .png()
            .toFile("assets/icon.png");

        console.log("✅ Generated icon.png");

        // Generate adaptive icon background
        await sharp(Buffer.from(svgContent))
            .resize(1024, 1024)
            .png()
            .toFile("assets/adaptive-icon.png");

        console.log("✅ Generated adaptive-icon.png");

        // Generate favicon
        await sharp(Buffer.from(svgContent))
            .resize(192, 192)
            .png()
            .toFile("assets/favicon.png");

        console.log("✅ Generated favicon.png");

    } catch (error) {
        console.error("Error generating icons:", error);
    }
}

generateIcon().catch(console.error);

