#!/usr/bin/env node

// This script checks for duplicate Korean words or romanizations in content.js

const fs = require('fs');
const path = require('path');

// Read and execute the content.js file
const contentPath = process.argv[2] || './content.js';

if (!fs.existsSync(contentPath)) {
    console.error(`Error: File not found: ${contentPath}`);
    console.error('Usage: node check_duplicates.js [path/to/content.js]');
    process.exit(1);
}

// Load the flashcard data
const contentCode = fs.readFileSync(contentPath, 'utf8');

// Extract and execute the content
let flashcardData;
try {
    // Create a new function context to avoid variable conflicts
    const func = new Function('var flashcardData = {}; ' + contentCode + '; return flashcardData;');
    flashcardData = func();
    
    // Check if flashcardData was populated
    if (!flashcardData || typeof flashcardData !== 'object') {
        throw new Error('flashcardData not found or invalid');
    }
} catch (error) {
    console.error('Error loading content.js:', error.message);
    process.exit(1);
}

// Function to find duplicates
function findDuplicates() {
    const koreanMap = new Map(); // Map to track korean words: word -> [{chapter, romanization}]
    const romanizationMap = new Map(); // Map to track romanizations: romanization -> [{chapter, korean}]
    const duplicates = [];

    // Iterate through all chapters
    for (const [chapterName, cards] of Object.entries(flashcardData)) {
        if (!Array.isArray(cards)) continue;
        
        cards.forEach((card, index) => {
            const { korean, romanization } = card;

            // Skip empty entries
            if (!korean || korean === "" || romanization === "None" || romanization === "") {
                return;
            }

            // Check for Korean duplicates
            if (koreanMap.has(korean)) {
                const previous = koreanMap.get(korean);
                duplicates.push({
                    type: 'Korean',
                    word: korean,
                    romanization: romanization,
                    currentChapter: chapterName,
                    previousChapter: previous.chapter,
                    previousRomanization: previous.romanization
                });
            } else {
                koreanMap.set(korean, { chapter: chapterName, romanization });
            }

            // Check for Romanization duplicates
            if (romanizationMap.has(romanization)) {
                const previous = romanizationMap.get(romanization);
                duplicates.push({
                    type: 'Romanization',
                    word: romanization,
                    korean: korean,
                    currentChapter: chapterName,
                    previousChapter: previous.chapter,
                    previousKorean: previous.korean
                });
            } else {
                romanizationMap.set(romanization, { chapter: chapterName, korean });
            }
        });
    }

    return duplicates;
}

// Find and display duplicates
console.log('Checking for duplicates in flashcard data...\n');

const duplicates = findDuplicates();

// Prepare output text
let outputText = 'FLASHCARD DUPLICATE CHECK RESULTS\n';
outputText += 'Generated: ' + new Date().toLocaleString() + '\n';
outputText += '='.repeat(80) + '\n\n';

if (duplicates.length === 0) {
    const message = '✅ No duplicates found!';
    console.log(message);
    outputText += message + '\n';
} else {
    const header = `❌ Found ${duplicates.length} duplicate(s):\n`;
    console.log(header);
    outputText += header + '\n';
    
    console.log('='.repeat(80));
    outputText += '='.repeat(80) + '\n';
    
    duplicates.forEach((dup, index) => {
        const duplicateHeader = `\n${index + 1}. ${dup.type} Duplicate:`;
        const separator = '-'.repeat(80);
        
        console.log(duplicateHeader);
        console.log(separator);
        outputText += duplicateHeader + '\n';
        outputText += separator + '\n';
        
        if (dup.type === 'Korean') {
            const lines = [
                `   Korean Word: ${dup.word}`,
                `   Current Location: ${dup.currentChapter}`,
                `   Current Romanization: ${dup.romanization}`,
                `   Previous Location: ${dup.previousChapter}`,
                `   Previous Romanization: ${dup.previousRomanization}`
            ];
            lines.forEach(line => {
                console.log(line);
                outputText += line + '\n';
            });
        } else {
            const lines = [
                `   Romanization: ${dup.word}`,
                `   Current Location: ${dup.currentChapter}`,
                `   Current Korean: ${dup.korean}`,
                `   Previous Location: ${dup.previousChapter}`,
                `   Previous Korean: ${dup.previousKorean}`
            ];
            lines.forEach(line => {
                console.log(line);
                outputText += line + '\n';
            });
        }
    });
    
    const footer = '\n' + '='.repeat(80) + `\n\nTotal duplicates found: ${duplicates.length}`;
    console.log(footer);
    outputText += footer + '\n';
}

// Save to file
const outputPath = path.join(path.dirname(contentPath), 'duplicate_report.txt');
try {
    fs.writeFileSync(outputPath, outputText, 'utf8');
    console.log(`\n✅ Report saved to: ${outputPath}`);
} catch (error) {
    console.error(`\n⚠️  Could not save report file: ${error.message}`);
}