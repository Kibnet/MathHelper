/**
 * Expression Analyzer Module
 * Finds all valid subexpressions and determines frame layout
 */

import { ExpressionParser } from './parser.js';
import { getApplicableRules } from './rules.js';

/**
 * Find all valid subexpressions in an expression string
 * @param {string} exprString - The expression string
 * @returns {Array} Array of subexpression objects
 */
export function findAllSubexpressions(exprString) {
  const subexpressions = [];
  const length = exprString.length;
  
  // Try all possible substrings
  for (let start = 0; start < length; start++) {
    for (let end = start + 1; end <= length; end++) {
      const substring = exprString.substring(start, end);
      const trimmedSubstring = substring.trim();
      
      if (!trimmedSubstring) continue;
      
      // Skip if starts or ends with whitespace (we want exact positions)
      if (substring !== trimmedSubstring) continue;
      
      // Skip individual digits that are part of a larger number
      if (/^\d$/.test(trimmedSubstring)) {
        const charBefore = start > 0 ? exprString[start - 1] : '';
        const charAfter = end < length ? exprString[end] : '';
        if (/\d/.test(charBefore) || /\d/.test(charAfter)) {
          continue; // Skip, this digit is part of a multi-digit number
        }
      }
      
      try {
        const parser = new ExpressionParser(trimmedSubstring);
        const node = parser.parse();
        
        // Check if this is a meaningful expression
        if (node) {
          // Get applicable rules to check if this subexpression is useful
          const rules = getApplicableRules(node);
          
          // Skip if no transformations are available
          if (rules.length === 0) {
            continue;
          }
          
          subexpressions.push({
            text: trimmedSubstring,
            start: start,
            end: end,
            node: node,
            length: end - start,
            rules: rules
          });
        }
      } catch (e) {
        // Not a valid expression, skip silently
      }
    }
  }
  
  // Remove duplicates based on position
  const uniqueSubexpressions = [];
  const seen = new Set();
  
  for (const subexpr of subexpressions) {
    const key = `${subexpr.start}-${subexpr.end}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSubexpressions.push(subexpr);
    }
  }
  
  return uniqueSubexpressions;
}

/**
 * Assign levels to subexpressions to avoid visual overlap
 * @param {Array} subexpressions - Array of subexpression objects
 * @returns {Array} Array of levels, each containing non-overlapping subexpressions
 */
export function assignLevels(subexpressions) {
  const levels = [];
  
  subexpressions.forEach(subexpr => {
    let assignedLevel = -1;
    
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
      const level = levels[levelIndex];
      let hasOverlap = false;
      
      for (const existing of level) {
        if (doRangesOverlap(subexpr.start, subexpr.end, existing.start, existing.end)) {
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) {
        assignedLevel = levelIndex;
        break;
      }
    }
    
    if (assignedLevel === -1) {
      assignedLevel = levels.length;
      levels[assignedLevel] = [];
    }
    
    levels[assignedLevel].push(subexpr);
    subexpr.level = assignedLevel;
  });
  
  return levels;
}

/**
 * Check if two ranges overlap
 * @param {number} start1 - Start of first range
 * @param {number} end1 - End of first range
 * @param {number} start2 - Start of second range
 * @param {number} end2 - End of second range
 * @returns {boolean} True if ranges overlap
 */
export function doRangesOverlap(start1, end1, start2, end2) {
  return !(end1 <= start2 || end2 <= start1);
}

/**
 * Calculate frame positions for subexpressions
 * @param {Array} subexpressions - Array of subexpression objects with levels
 * @param {string} exprString - The full expression string
 * @param {Object} config - Configuration object with LEVEL_HEIGHT, BASE_OFFSET
 * @returns {Array} Array of frame position objects
 */
export function calculateFramePositions(subexpressions, exprString, config = {}) {
  const { LEVEL_HEIGHT = 18, BASE_OFFSET = 5 } = config;
  
  const positions = subexpressions.map(subexpr => {
    const textBefore = exprString.substring(0, subexpr.start);
    const left = measureTextWidth(textBefore);
    const width = measureTextWidth(subexpr.text);
    const top = BASE_OFFSET + (subexpr.level * LEVEL_HEIGHT);
    
    return {
      ...subexpr,
      left,
      width,
      top
    };
  });
  
  return positions;
}

/**
 * Measure text width using monospace font metrics
 * @param {string} text - Text to measure
 * @returns {number} Width in pixels
 */
export function measureTextWidth(text) {
  const span = document.createElement('span');
  span.style.font = '1.3rem "Courier New", monospace';
  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'pre';
  span.textContent = text;
  document.body.appendChild(span);
  const width = span.offsetWidth;
  document.body.removeChild(span);
  return width;
}

/**
 * Get total height needed for all frame levels
 * @param {Array} levels - Array of levels
 * @param {Object} config - Configuration object
 * @returns {number} Total height in pixels
 */
export function calculateTotalHeight(levels, config = {}) {
  const { LEVEL_HEIGHT = 18, BASE_OFFSET = 5 } = config;
  const maxLevel = levels.length - 1;
  return BASE_OFFSET + (maxLevel + 1) * LEVEL_HEIGHT + 5;
}
