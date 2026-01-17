/**
 * HTML/CSS Validation and Processing Utilities
 * 
 * This file contains shared validation and processing functions
 * used by both HTMLCSSEditor.tsx and HTMLCSSCodeEditor.tsx
 */

import { 
  parseJavaScript, 
  validateVariable, 
  validateFunctionTestCase, 
  validateEvent, 
  executeFunctionTest,
  executeDOMTest,
  validateJSTestCases 
} from './jsValidationUtils';

// Helper function to check if an attribute value matches in HTML
const validateAttributeValue = (key: string, value: any, htmlContent: string): boolean => {
  let attributeFound = false;
  
  if (Array.isArray(value)) {
    // Handle multiple values (like multiple CSS classes)
    if (key === 'class') {
      // For class attribute, check if all required classes are present
      const classRegex = /class\s*=\s*["']([^"']*)["']/i;
      const classMatch = htmlContent.match(classRegex);
      if (!classMatch) {
        attributeFound = false;
      } else {
        const actualClasses = classMatch[1].split(/\s+/).filter(cls => cls.trim() !== '');
        const requiredClasses = value.map(cls => String(cls).trim()).filter(cls => cls !== '');
        attributeFound = requiredClasses.every(requiredClass => 
          actualClasses.includes(requiredClass)
        );
      }
    } else {
      // For other array attributes, check for specific value
      const escapedValue = String(value[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const attributeRegex = new RegExp(`${key}\\s*=\\s*["']${escapedValue}["']`, 'i');
      attributeFound = attributeRegex.test(htmlContent);
    }
  } else if (value === true) {
    // Handle boolean attributes (like readonly, disabled, etc.)
    const attributeRegex = new RegExp(`${key}(?:\\s|>|$)`, 'i');
    attributeFound = attributeRegex.test(htmlContent);
  } else if (value === "") {
    // Handle empty string as boolean attribute
    const attributeRegex = new RegExp(`${key}(?:\\s|>|$)`, 'i');
    attributeFound = attributeRegex.test(htmlContent);
  } else {
    // Check for attribute with specific value
    const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const attributeRegex = new RegExp(`${key}\\s*=\\s*["']${escapedValue}["']`, 'i');
    attributeFound = attributeRegex.test(htmlContent);
  }
  
  return attributeFound;
};

// HTML Structure Validation using regex
export const validateHTMLStructure = (htmlCode: string, tag: string, attributes: any, parentTag?: string, content?: string, parentAttributes?: any): boolean => {
  // Special handling for DOCTYPE declarations
  if (tag === '!DOCTYPE') {
    const doctypePattern = /<!DOCTYPE\s+html\s*>/i;
    return doctypePattern.test(htmlCode);
  }
  
  // Remove DOCTYPE and normalize whitespace
  const cleanHTML = htmlCode.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/\s+/g, ' ').trim();
  
  // Find the parent tag boundaries if specified
  if (parentTag) {
    // Find parent tag with flexible attribute ordering
    const parentTagRegex = new RegExp(`<${parentTag}\\b[^>]*>`, 'gi');
    const parentMatches = cleanHTML.match(parentTagRegex);
    
    if (!parentMatches) return false; // Parent not found
    
    // If no parent attributes to validate, check all parent instances
    if (!parentAttributes || Object.keys(parentAttributes).length === 0) {
      // Check each parent tag instance for the child using regex positions
      const parentTagRegex = new RegExp(`<${parentTag}\\b[^>]*>`, 'gi');
      let match: RegExpExecArray | null;
      
      while ((match = parentTagRegex.exec(cleanHTML)) !== null) {
        const parentStartIndex = match.index;
        
        // Find the matching closing tag by counting opening and closing tags
        let parentEndIndex = -1;
        let openTagCount = 0;
        let searchIndex = parentStartIndex + match[0].length;
        
        while (searchIndex < cleanHTML.length) {
          const nextOpenTag = cleanHTML.indexOf(`<${parentTag}`, searchIndex);
          const nextCloseTag = cleanHTML.indexOf(`</${parentTag}>`, searchIndex);
          
          // If we find a closing tag before any opening tag, this is our match
          if (nextCloseTag !== -1 && (nextOpenTag === -1 || nextCloseTag < nextOpenTag)) {
            if (openTagCount === 0) {
              parentEndIndex = nextCloseTag;
              break;
            } else {
              openTagCount--;
              searchIndex = nextCloseTag + `</${parentTag}>`.length;
            }
          } else if (nextOpenTag !== -1) {
            // Found another opening tag, increment counter
            openTagCount++;
            searchIndex = nextOpenTag + `<${parentTag}`.length;
          } else {
            // No more tags found
            break;
          }
        }
        
        if (parentEndIndex !== -1) {
          const parentStartContentIndex = parentStartIndex + match[0].length;
          const parentContent = cleanHTML.substring(parentStartContentIndex, parentEndIndex);
          
          // Check if the tag exists within this parent content
          if (checkTagInContent(parentContent, tag, attributes, content)) {
            return true;
          }
        }
      }
      return false;
    }
    
    // Check each parent tag instance to see if it has all required attributes
    for (const parentMatch of parentMatches) {
      let hasAllParentAttributes = true;
      
      if (parentAttributes && Object.keys(parentAttributes).length > 0) {
        for (const [key, value] of Object.entries(parentAttributes)) {
          const attributeFound = validateAttributeValue(key, value, parentMatch);
          
          if (!attributeFound) {
            hasAllParentAttributes = false;
            break;
          }
        }
      }
      
      if (hasAllParentAttributes) {
        // Found a parent tag with all required attributes, now find its content
        const parentStartIndex = cleanHTML.indexOf(parentMatch);
        const parentEndRegex = new RegExp(`</${parentTag}>`, 'gi');
        parentEndRegex.lastIndex = parentStartIndex;
        const parentEndMatch = parentEndRegex.exec(cleanHTML);
        
        if (parentEndMatch) {
          const parentStartContentIndex = parentStartIndex + parentMatch.length;
          const parentEndIndex = parentEndMatch.index;
          const parentContent = cleanHTML.substring(parentStartContentIndex, parentEndIndex);
          
          // Check if the tag exists within the parent content with correct content
          if (checkTagInContent(parentContent, tag, attributes, content)) {
            return true;
          }
        }
      }
    }
    
    return false; // No valid parent found
  } else {
    // Check if tag exists anywhere in the HTML with correct content
    return checkTagInContent(cleanHTML, tag, attributes, content);
  }
};

// Helper function to check if a tag with attributes and content exists
export const checkTagInContent = (content: string, tag: string, attributes: any, expectedContent?: string): boolean => {
  // First, find all instances of the tag
  const tagRegex = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const tagMatches = content.match(tagRegex);
  
  if (!tagMatches) return false;
  
  // Check each tag instance to see if it has all required attributes
  for (let i = 0; i < tagMatches.length; i++) {
    const tagMatch = tagMatches[i];
    let hasAllAttributes = true;
    
    if (attributes && Object.keys(attributes).length > 0) {
      for (const [key, value] of Object.entries(attributes)) {
        const attributeFound = validateAttributeValue(key, value, tagMatch);
        
        if (!attributeFound) {
          hasAllAttributes = false;
          break;
        }
      }
    }
    
    if (hasAllAttributes) {
      // Check if this is a self-closing tag
      const isSelfClosing = isSelfClosingTag(tag);
      
      if (expectedContent) {
        if (isSelfClosing) {
          // Self-closing tags cannot have content
          continue; // Try next tag instance
        } else {
          // Find the content between opening and closing tags for THIS specific tag instance
          let searchStartIndex = 0;
          for (let j = 0; j < i; j++) {
            // Find where the previous tag ended
            const prevTagMatch = tagMatches[j];
            const prevTagStartIndex = content.indexOf(prevTagMatch, searchStartIndex);
            const prevTagEndIndex = content.indexOf(`</${tag}>`, prevTagStartIndex);
            if (prevTagEndIndex !== -1) {
              searchStartIndex = prevTagEndIndex + `</${tag}>`.length;
            }
          }
          
          const tagStartIndex = content.indexOf(tagMatch, searchStartIndex);
          const tagEndIndex = content.indexOf(`</${tag}>`, tagStartIndex);
          if (tagEndIndex !== -1) {
            const tagContent = content.substring(tagStartIndex + tagMatch.length, tagEndIndex);
            // Special handling for style tags
            if (tag === 'style') {
              if (validateStyleContent(tagContent, expectedContent)) {
                return true;
              }
            } else if (tag === 'script') {
              if (validateScriptContent(tagContent, expectedContent)) {
                return true;
              }
            } else {
              if (tagContent.includes(expectedContent)) {
                return true;
              }
            }
          }
        }
      } else {
        // For self-closing tags, accept both forms: <tag /> and <tag>
        if (isSelfClosing) {
          return true;
        } else {
          // Check if there's a corresponding closing tag
          const tagStartIndex = content.indexOf(tagMatch);
          const tagEndIndex = content.indexOf(`</${tag}>`, tagStartIndex);
          return tagEndIndex !== -1;
        }
      }
    }
  }
  
  return false;
};

// Helper function to validate style tag content with CSS normalization
export const validateStyleContent = (actualContent: string, expectedContent: string): boolean => {
  // Simple check: ensure CSS has balanced braces
  if (!hasBalancedBraces(actualContent)) {
    return false;
  }  
  const normalizeCSS = (css: string) => {
    return css
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\s*{\s*/g, '{') // Remove spaces around opening braces
      .replace(/\s*}\s*/g, '}') // Remove spaces around closing braces
      .replace(/\s*;\s*/g, ';') // Remove spaces around semicolons
      .replace(/\s*:\s*/g, ':') // Remove spaces around colons
      .trim(); // Remove leading/trailing whitespace
  };
  const normalizedActual = normalizeCSS(actualContent);
  const normalizedExpected = normalizeCSS(expectedContent);
  return normalizedActual.includes(normalizedExpected);
};
export const hasBalancedBraces = (css: string): boolean => {
  let braceCount = 0;
  for (const char of css) {
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount < 0) {
        return false; 
      }
    }
  }
  return braceCount === 0;
};

// Helper function to validate script tag content with JavaScript normalization
export const validateScriptContent = (actualContent: string, expectedContent: string): boolean => {
  const normalizeJavaScript = (js: string) => {
    return js
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\s*;\s*/g, ';') // Normalize spaces around semicolons
      .replace(/;\s*$/, '') // Remove trailing semicolons (optional in JS)
      .replace(/\s*{\s*/g, '{') // Remove spaces around opening braces
      .replace(/\s*}\s*/g, '}') // Remove spaces around closing braces
      .replace(/\s*\(\s*/g, '(') // Remove spaces around opening parentheses
      .replace(/\s*\)\s*/g, ')') // Remove spaces around closing parentheses
      .trim(); // Remove leading/trailing whitespace
  };
  
  const normalizedActual = normalizeJavaScript(actualContent);
  const normalizedExpected = normalizeJavaScript(expectedContent);
  
  // After normalization, both should match (trailing semicolons are removed)
  // Check if normalized actual includes normalized expected or vice versa
  return normalizedActual === normalizedExpected ||
         normalizedActual.includes(normalizedExpected) ||
         normalizedExpected.includes(normalizedActual);
};

// CSS Parser
export const parseCSS = (cssCode: string) => {
  try {
    const result: any = {};
    
    // Extract CSS rules using regex
    const rules = cssCode.match(/([^{}]+)\s*\{([^{}]*)\}/g);
    
    if (rules) {
      rules.forEach(rule => {
        const [selectorPart, properties] = rule.split('{');
        const cleanProperties = properties.replace('}', '').trim();
        
        // Handle multiple selectors (comma-separated)
        const selectors = selectorPart.split(',').map(s => s.trim());
        
        // Parse properties
        const props: any = {};
        const propPairs = cleanProperties.split(';');
        
        propPairs.forEach(prop => {
          const [key, value] = prop.split(':');
          if (key && value) {
            props[key.trim()] = value.trim();
          }
        });
        
        // Apply properties to all selectors
        selectors.forEach(selector => {
          if (!result[selector]) {
            result[selector] = {};
          }
          // Merge properties (later rules override earlier ones)
          Object.assign(result[selector], props);
        });
      });
    }
    
    return result;
  } catch (error) {
    return null;
  }
};

// Helper function to normalize CSS function values (rgba, rgb, hsl, hsla, calc, etc.)
// Efficient approach: processes all functions, handling nested parentheses correctly
const normalizeCSSFunctions = (value: string): string => {
  if (!value) return '';
  
  // First normalize general whitespace (multiple spaces/newlines to single space)
  let normalized = value.replace(/[\s\n\r\t]+/g, ' ').trim();
  
  // Process functions iteratively, handling nested parentheses
  // Find all function calls and process them from innermost to outermost
  let result = normalized;
  let hasFunctions = true;
  let iterations = 0;
  const maxIterations = 20; // Safety limit for deeply nested functions
  
  while (hasFunctions && iterations < maxIterations) {
    iterations++;
    hasFunctions = false;
    
    // Find innermost function (content has no parentheses)
    const match = result.match(/(\w+)\s*\(([^()]*)\)/);
    
    if (match) {
      hasFunctions = true;
      const [fullMatch, funcName, content] = match;
      
      // Remove spaces after commas in function parameters
      const normalizedContent = content.replace(/,\s+/g, ',');
      const replacement = `${funcName}(${normalizedContent})`;
      
      // Replace first occurrence
      result = result.replace(fullMatch, replacement);
    }
  }
  
  return result;
};

// Helper function to normalize grid-template-areas values
const normalizeGridTemplateAreas = (value: string): string => {
  if (!value) return '';
  
  // Remove escaped quotes first (handle JSON-escaped quotes)
  let normalized = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
  
  // Remove trailing semicolons and trim
  normalized = normalized.replace(/;+$/, '').trim();
  
  // Extract all quoted strings in order (handle both single and double quotes)
  const quotedStrings: string[] = [];
  
  // Match quoted strings - handles both "..." and '...' formats
  // This pattern matches: quote, content (non-greedy), same quote
  const doubleQuotePattern = /"([^"]*)"/g;
  const singleQuotePattern = /'([^']*)'/g;
  
  // Find all double-quoted strings
  let match;
  while ((match = doubleQuotePattern.exec(normalized)) !== null) {
    quotedStrings.push(`"${match[1]}"`);
  }
  
  // If no double quotes found, try single quotes
  if (quotedStrings.length === 0) {
    singleQuotePattern.lastIndex = 0; // Reset regex
    while ((match = singleQuotePattern.exec(normalized)) !== null) {
      quotedStrings.push(`"${match[1]}"`); // Normalize to double quotes
    }
  }
  
  // If we found quoted strings, join them with single spaces
  if (quotedStrings.length > 0) {
    return quotedStrings.join(' ');
  }
  
  // Fallback: if no quoted strings found, normalize whitespace and return as-is
  return normalized.replace(/[\s\n\r\t]+/g, ' ').trim();
};

// General CSS value normalization function
// Optimized: checks if normalization is needed before processing
const normalizeCSSValue = (value: string, property: string): string => {
  if (!value) return '';
  
  let normalized = value.trim();
  
  // Special handling for grid-template-areas
  if (property === 'grid-template-areas') {
    return normalizeGridTemplateAreas(normalized);
  }
  
  // Early exit: if value is already minimal (no functions, single spaces), return as-is
  // Check for functions with parentheses
  const hasFunctions = /[\w-]+\s*\(/.test(normalized);
  // Check for multiple whitespace or spaces after commas in functions
  const needsNormalization = /[\s\n\r\t]{2,}/.test(normalized) || 
                            (hasFunctions && /,\s+/.test(normalized));
  
  if (!needsNormalization) {
    return normalized;
  }
  
  // Apply normalization (normalizeCSSFunctions handles both functions and whitespace)
  normalized = normalizeCSSFunctions(normalized);
  
  return normalized;
};

// CSS Validation
export const validateCSSRequirement = (cssCode: string, requirementIndex: number, cssStructure: any[]) => {
  const parsed = parseCSS(cssCode);
  if (!parsed) return false;
  
  // Get the requirement from the structure
  const requirement = cssStructure[requirementIndex];
  if (!requirement) return false;
  
  const { selector, properties } = requirement;
  
  // Check if selector exists in CSS
  const selectorRules = parsed[selector];
  if (!selectorRules) {
    return false;
  }
  
  // Check if all required properties exist with correct values
  let allPropertiesValid = true;
  for (const prop of properties) {
    const { property, value } = prop;
    const actualValue = selectorRules[property];
    
    // Early exit: if values match exactly, skip normalization
    if (actualValue === value) {
      continue;
    }
    
    // Normalize both expected and actual values for comparison
    const normalizedExpected = normalizeCSSValue(value, property);
    const normalizedActual = normalizeCSSValue(actualValue || '', property);
    
    if (normalizedExpected !== normalizedActual) {
      console.log(`[CSS Validation Failed] Property: ${property}`);
      console.log(`  Selector: ${selector}`);
      console.log(`  Expected (raw): ${value}`);
      console.log(`  Expected (normalized): ${normalizedExpected}`);
      console.log(`  Actual (raw): ${actualValue || '(not found)'}`);
      console.log(`  Actual (normalized): ${normalizedActual}`);
      allPropertiesValid = false;
    }
  }
  
  return allPropertiesValid;
};

// JavaScript Validation
export const validateJSRequirement = (jsCode: string, requirementIndex: number, jsStructure: any[]) => {
  // Get the requirement from the structure
  const requirement = jsStructure[requirementIndex];
  if (!requirement) return { passed: false, message: 'Requirement not found' };
  
  const { type, value, functionName, variableName, pattern } = requirement;
  
  switch (type) {
    case 'function':
      // Check if function exists
      if (functionName) {
        const functionRegex = new RegExp(`function\\s+${functionName}\\s*\\(|const\\s+${functionName}\\s*=|let\\s+${functionName}\\s*=|var\\s+${functionName}\\s*=|${functionName}\\s*:\\s*function`, 'g');
        const exists = functionRegex.test(jsCode);
        return { 
          passed: exists, 
          message: exists ? `Function '${functionName}' found` : `Function '${functionName}' not found` 
        };
      }
      break;
      
    case 'variable':
      // Check if variable exists
      if (variableName) {
        const variableRegex = new RegExp(`(const|let|var)\\s+${variableName}\\s*=`, 'g');
        const exists = variableRegex.test(jsCode);
        return { 
          passed: exists, 
          message: exists ? `Variable '${variableName}' found` : `Variable '${variableName}' not found` 
        };
      }
      break;
      
    case 'pattern':
      // Check if pattern exists in code
      if (pattern) {
        const patternRegex = new RegExp(pattern, 'g');
        const exists = patternRegex.test(jsCode);
        return { 
          passed: exists, 
          message: exists ? `Pattern '${pattern}' found` : `Pattern '${pattern}' not found` 
        };
      }
      break;
      
    case 'value':
      // Check if specific value exists
      if (value) {
        const exists = jsCode.includes(value);
        return { 
          passed: exists, 
          message: exists ? `Value '${value}' found` : `Value '${value}' not found` 
        };
      }
      break;
      
    case 'syntax':
      // Basic syntax validation (check for common syntax errors)
      const syntaxChecks = [
        /\([^)]*$/, // Unclosed parentheses
        /\[[^\]]*$/, // Unclosed brackets
        /\{[^}]*$/, // Unclosed braces
        /\/\*[^*]*\*\/|\/\/.*$/g // Comments (remove them for validation)
      ];
      
      let cleanCode = jsCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // Remove comments
      
      for (const check of syntaxChecks) {
        if (check.test(cleanCode)) {
          return { passed: false, message: 'Syntax error detected' };
        }
      }
      return { passed: true, message: 'Valid JavaScript syntax' };
      
    default:
      return { passed: false, message: 'Unknown validation type' };
  }
  
  return { passed: false, message: 'Validation failed' };
};

// Validate individual JavaScript element (variable, function, etc.)
export const validateJSElement = async (jsCode: string, element: any) => {
  try {
    if (element.type === 'function') {
      // Use the new validation utilities
      return await validateFunctionTestCase(element, {}, jsCode);
    } else if (element.type === 'variable') {
      // Use the new validation utilities
      return validateVariable(element, jsCode);
    } else if (element.type === 'event') {
      // Use the new validation utilities
      return validateEvent(element, jsCode);
    }

    return { 
      passed: false, 
      message: `Unknown element type: ${element.type}` 
    };
  } catch (error) {
    return { 
      passed: false, 
      message: `Validation error - ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

// Enhanced JavaScript validation for test cases with descriptions
export const validateJSTestCaseWithDescription = async (jsCode: string, element: any, testCase: any) => {
  try {
    // Parse the JavaScript code to extract functions and variables
    const parsed = parseJavaScript(jsCode);
    if (!parsed) {
      return { 
        passed: false, 
        message: `Test Case "${testCase.description || 'Unknown'}": Failed to parse JavaScript code` 
      };
    }

    if (element.type === 'function') {
      // Check if function exists
      const funcInfo = parsed.functions[element.name];
      if (!funcInfo) {
        return { 
          passed: false, 
          message: `Test Case "${testCase.description || 'Unknown'}": Function '${element.name}' not found` 
        };
      }

      // Check function type if specified
      if (element.funcType && funcInfo.type !== element.funcType) {
        return { 
          passed: false, 
          message: `Test Case "${testCase.description || 'Unknown'}": Expected function type '${element.funcType}', found '${funcInfo.type}'` 
        };
      }

      // Check parameters if specified
      if (element.parameters && element.parameters.length > 0) {
        if (funcInfo.parameters.length !== element.parameters.length) {
          return { 
            passed: false, 
            message: `Test Case "${testCase.description || 'Unknown'}": Expected ${element.parameters.length} parameters, found ${funcInfo.parameters.length}` 
          };
        }

        // Check parameter names
        for (let i = 0; i < element.parameters.length; i++) {
          if (funcInfo.parameters[i] !== element.parameters[i].name) {
            return { 
              passed: false, 
              message: `Test Case "${testCase.description || 'Unknown'}": Parameter ${i + 1} expected '${element.parameters[i].name}', found '${funcInfo.parameters[i]}'` 
            };
          }
        }
      }

      // Execute test case if it's a return type test
      if (testCase.testType === 'return') {
        const result = await executeFunctionTest(element.name, testCase, jsCode);
        return {
          passed: result.passed,
          message: result.passed 
            ? `Test Case "${testCase.description || 'Unknown'}": ${result.message}` 
            : `Test Case "${testCase.description || 'Unknown'}": ${result.message}`
        };
      } else if (testCase.testType === 'domManipulation') {
        const result = await executeDOMTest(element.name, testCase, jsCode);
        return {
          passed: result.passed,
          message: result.passed 
            ? `Test Case "${testCase.description || 'Unknown'}": ${result.message}` 
            : `Test Case "${testCase.description || 'Unknown'}": ${result.message}`
        };
      } else if (testCase.testType === 'sideEffect') {
        return { 
          passed: true, 
          message: `Test Case "${testCase.description || 'Unknown'}": Side effect test passed` 
        };
      }

      return { 
        passed: true, 
        message: `Test Case "${testCase.description || 'Unknown'}": Function structure validated successfully` 
      };
    } else if (element.type === 'variable') {
      // Validate variable
      const varInfo = parsed.variables[element.name];
      if (!varInfo) {
        return { 
          passed: false, 
          message: `Test Case "${testCase.description || 'Unknown'}": Variable '${element.name}' not found` 
        };
      }

      // Check declaration type
      if (element.declaration && varInfo.declaration !== element.declaration) {
        return { 
          passed: false, 
          message: `Test Case "${testCase.description || 'Unknown'}": Expected declaration '${element.declaration}', found '${varInfo.declaration}'` 
        };
      }

      // Check value if specified
      if (element.value !== null && element.value !== undefined && element.value !== '') {
        // Normalize quotes for comparison - convert single quotes to double quotes
        const normalizedElementValue = element.value.replace(/'/g, '"');
        const normalizedVarInfoValue = varInfo.value ? varInfo.value.replace(/'/g, '"') : varInfo.value;
        
        if (normalizedVarInfoValue !== normalizedElementValue) {
          return { 
            passed: false, 
            message: `Test Case "${testCase.description || 'Unknown'}": Expected value '${element.value}', found '${varInfo.value}'` 
          };
        }
      } else if (element.value === null && varInfo.value !== null) {
        // If test case expects no value (null) but code has a value
        return { 
          passed: false, 
          message: `Test Case "${testCase.description || 'Unknown'}": Expected no value, but found '${varInfo.value}'` 
        };
      } else if (element.value === '' && varInfo.value !== null) {
        // If test case expects no value (empty string) but code has a value
        return { 
          passed: false, 
          message: `Test Case "${testCase.description || 'Unknown'}": Expected no value, but found '${varInfo.value}'` 
        };
      }

      return { 
        passed: true, 
        message: `Test Case "${testCase.description || 'Unknown'}": Variable '${element.name}' validated successfully` 
      };
    }

    return { 
      passed: false, 
      message: `Test Case "${testCase.description || 'Unknown'}": Unknown element type` 
    };
  } catch (error) {
    return { 
      passed: false, 
      message: `Test Case "${testCase.description || 'Unknown'}": Validation error - ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};




// HTML Validation
export const validateHTMLRequirement = (htmlCode: string, requirementIndex: number, htmlStructure: any[]) => {
  // Get the requirement from the structure
  const requirement = htmlStructure[requirementIndex];
  if (!requirement) return false;
  
  const { tag, attributes, parent, content } = requirement;
  
  // Find parent tag name and attributes if specified
  let parentTag: string | undefined = undefined;
  let parentAttributes: any = undefined;
  if (parent) {
    const parentRequirement = htmlStructure.find((item: any) => item.id === parent);
    if (parentRequirement) {
      parentTag = parentRequirement.tag;
      parentAttributes = parentRequirement.attributes;
    }
  }
  
  // Use raw HTML string validation instead of DOM parsing
  const result = validateHTMLStructure(htmlCode, tag, attributes, parentTag, content, parentAttributes);
  
  return result;
};

// Helper function to build hierarchy path for an element
const buildHierarchyPath = (element: any, structure: any[]): string[] => {
  const path: string[] = [];
  let current = element;
  
  while (current) {
    path.unshift(current.tag);
    if (current.parent) {
      current = structure.find((item: any) => item.id === current.parent);
    } else {
      current = null;
    }
  }
  
  return path;
};

// Helper function to clean HTML content for validation
const cleanHTMLForValidation = (html: string): string => {
  return html
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to find matching closing tag for nested HTML elements
const findMatchingClosingTag = (content: string, tagName: string, startIndex: number): number => {
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let depth = 1;
  let index = startIndex;
  
  while (index < content.length && depth > 0) {
    const nextOpen = content.indexOf(openTag, index);
    const nextClose = content.indexOf(closeTag, index);
    
    if (nextClose === -1) return -1; // No closing tag found
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Found another opening tag before closing tag
      depth++;
      index = nextOpen + openTag.length;
    } else {
      // Found closing tag
      depth--;
      if (depth === 0) return nextClose;
      index = nextClose + closeTag.length;
    }
  }
  
  return -1;
};

// Helper function to validate element exists in correct hierarchy
const validateElementInHierarchy = (code: string, element: any, hierarchyPath: string[]): boolean => {
  const targetTag = hierarchyPath[hierarchyPath.length - 1];
  const expectedContent = element.content;
  
  // Clean the HTML to handle edge cases
  const cleanCode = cleanHTMLForValidation(code);

  const searchLevel = (content: string, level: number): boolean => {
    // Base case: at target level, look for the element itself within current content
    if (level === hierarchyPath.length - 1) {
      if (expectedContent) {
        // Handle both regular and self-closing tags
        const elementRegex = new RegExp(`<${targetTag}[^>]*>([^<]*)</${targetTag}>|<${targetTag}[^>]*/>`, 'gi');
        let match: RegExpExecArray | null;
        while ((match = elementRegex.exec(content)) !== null) {
          // Check if it's a self-closing tag
          if (match[0].endsWith('/>')) {
            // Self-closing tags can't have content, so skip if content is expected
            continue;
          }
          // Regular tag with content
          if (match[1] && match[1].trim() === expectedContent) {
            return true;
          }
        }
        return false;
      }
      // Check for tag existence with attributes
      const attributes = element.attributes || {};
      return checkTagInContent(content, targetTag, attributes);
    }

    // Recursive case: try ALL instances of the current parent tag at this level
    const parentTag = hierarchyPath[level];
    const parentOpenRegex = new RegExp(`<${parentTag}[^>]*>`, 'gi');
    let match: RegExpExecArray | null;
    
    while ((match = parentOpenRegex.exec(content)) !== null) {
      const openTagStart = match.index;
      const openTagEnd = match.index + match[0].length;
      
      // Check if this is a self-closing tag
      if (match[0].endsWith('/>')) {
        // Self-closing tags can't contain children, so skip
        continue;
      }
      
      // Find the matching closing tag using proper nesting logic
      const closeTagStart = findMatchingClosingTag(content, parentTag, openTagEnd);
      
      if (closeTagStart !== -1) {
        const innerContent = content.substring(openTagEnd, closeTagStart);
        if (searchLevel(innerContent, level + 1)) {
          return true;
        }
      }
    }
    return false;
  };

  return searchLevel(cleanCode, 0);
};

// Structure validation function - only checks parent-child relationships
export const validateStructure = async (code: string, fileName: string, questionData: any) => {
  const fileValidation = questionData.Code_Validation[fileName];
  if (!fileValidation) return [];
  
  const structure = fileValidation.structure;
  const type = fileName.endsWith('.html') ? 'HTML' : fileName.endsWith('.css') ? 'CSS' : 'JS';
  
  if (type === 'HTML') {
    // For HTML, validate the complete hierarchy by building expected structure
    return structure.map((requirement: any) => {
      const { tag, parent } = requirement;
      
      if (!parent) {
        // Root element - just check if it exists
        return code.includes(`<${tag}`);
      } else {
        // Child element - check if it's in the correct hierarchical position
        const parentRequirement = structure.find((item: any) => item.id === parent);
        if (!parentRequirement) {
          // Parent ID not found in structure list - skip parent-child validation
          // Just check if the tag exists in the code
          return code.includes(`<${tag}`);
        }
        
        // Use the existing validateHTMLStructure function which handles parent-child relationships
        const parentAttributes = parentRequirement.attributes || {};
        
        return validateHTMLStructure(code, requirement.tag, requirement.attributes, parentRequirement.tag, requirement.content, parentAttributes);
      }
    });
  }
  
  if (type === 'CSS') {
    // For CSS, structure validation is the same as regular validation
    return structure.map((_: any, index: number) => {
      return validateCSSRequirement(code, index, structure);
    });
  }
  
  if (type === 'JS') {
    // For JavaScript, validate each element in the structure
    const results = [];
    for (let index = 0; index < structure.length; index++) {
      const element = structure[index];
      const result = await validateJSElement(code, element);
      results.push(result);
    }
    return results;
  }
  
  return [];
};

// Main validation function - checks all requirements (structure + attributes)
export const validateCode = async (code: string, fileName: string, questionData: any, validateBasicHTMLStructure: (code: string) => any) => {
  const fileValidation = questionData.Code_Validation[fileName];
  if (!fileValidation) return [];
  
  const structure = fileValidation.structure;
  const type = fileName.endsWith('.html') ? 'HTML' : fileName.endsWith('.css') ? 'CSS' : 'JS';
  
  // For HTML files, first check basic structure
  if (type === 'HTML') {
    const basicStructureCheck = validateBasicHTMLStructure(code);
    if (!basicStructureCheck.isValid) {
      // Return all false results if basic structure is missing
      return structure.map(() => false);
    }
  }
  
  // Get structure validation results
  const structureResults = await validateStructure(code, fileName, questionData);
  
  if (type === 'JS') {
    // For JavaScript: use the new validation system with grouped results
    const validationResult = await validateJSTestCases(structure, code);
    return validationResult.groupedResults;
  }
  
  const results = await Promise.all(structure.map(async (_: any, index: number) => {
    if (type === 'HTML') {
      // For HTML: both structure AND attributes must pass
      const structurePass = structureResults[index];
      const attributesPass = validateHTMLRequirement(code, index, structure);
      return structurePass && attributesPass;
    } else if (type === 'CSS') {
      // For CSS: structure validation is the same as regular validation
      return validateCSSRequirement(code, index, structure);
    }
    return false;
  }));
  
  return results;
};

// List of self-closing HTML tags
const SELF_CLOSING_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
  'link', 'meta', 'param', 'source', 'track', 'wbr'
];

// Helper function to check if a tag is self-closing
const isSelfClosingTag = (tag: string): boolean => {
  return SELF_CLOSING_TAGS.includes(tag.toLowerCase());
};

// Helper function to generate expected description
export const getExpectedDescription = (requirement: any, fileType: string) => {
  if (fileType.endsWith('.html')) {
    // For HTML, show only the clean structure without parent references
    if (Array.isArray(requirement)) {
      return buildCleanHTMLStructure(requirement);
    } else {
      // Single element without children
      const { tag, attributes, content } = requirement;
      let expected = `<${tag}`;
      
      if (attributes && Object.keys(attributes).length > 0) {
        Object.entries(attributes).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            expected += ` ${key}="${value[0]}"`;
          } else if (value === true) {
            expected += ` ${key}`;
          } else {
            expected += ` ${key}="${value}"`;
          }
        });
      }
      
      // Special handling for DOCTYPE declarations
      if (tag === '!DOCTYPE') {
        expected += `>`;
        return expected;
      }
      
      // Handle self-closing tags
      if (isSelfClosingTag(tag)) {
        expected += `>`;
        return expected;
      }
      
      // Handle regular tags with content
      if (content) {
        expected += `>${content}</${tag}>`;
      } else {
        expected += `></${tag}>`;
      }
      
      return expected;
    }
  } else if (fileType.endsWith('.css')) {
    const { selector, properties } = requirement;
    const propList = properties.map((prop: any) => `  ${prop.property}: ${prop.value};`).join('\n');
    return `${selector} {\n${propList}\n}`;
  } else if (fileType.endsWith('.js')) {
    const { type, name, testCases } = requirement;
    
    // For JavaScript, show only function name and test case count
    if (type === 'function' && testCases && testCases.length > 0) {
      return `Function: ${name}\nTest Cases: ${testCases.length}`;
    } else if (type === 'function') {
      return `Function: ${name}\nNo test cases defined`;
    } else if (type === 'variable') {
      return `${requirement.declaration} ${name};`;
    } else if (type === 'event') {
      return `Event: ${name}\nExpected Value: ${requirement.value || 'No value specified'}`;
    } else {
      return 'JavaScript element';
    }
  }
  
  return 'Expected result';
};

export const buildCleanHTMLStructure = (structure: any[]): string => {
  // Build a tree structure from the flat array
  const elementMap = new Map();
  const rootElements: any[] = [];
  
  // First pass: create all elements
  structure.forEach(element => {
    elementMap.set(element.id, { ...element, children: [] });
  });
  
  // Second pass: build parent-child relationships
  structure.forEach(element => {
    const elementObj = elementMap.get(element.id);
    if (element.parent) {
      const parent = elementMap.get(element.parent);
      if (parent) {
        parent.children.push(elementObj);
      }
    } else {
      rootElements.push(elementObj);
    }
  });
  
  // Build clean HTML from tree structure (only show elements that should be visible)
  return rootElements.map(element => buildCleanElementHTML(element, 0)).join('\n');
};

export const buildCleanElementHTML = (element: any, indent: number): string => {
  const spaces = '  '.repeat(indent);
  const { tag, attributes, content, children } = element;
  
  let html = `${spaces}<${tag}`;
  
  // Add attributes
  if (attributes && Object.keys(attributes).length > 0) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        html += ` ${key}="${value[0]}"`;
      } else if (value === true) {
        html += ` ${key}`;
      } else {
        html += ` ${key}="${value}"`;
      }
    });
  }
  
  // Special handling for DOCTYPE declarations
  if (tag === '!DOCTYPE') {
    html += `>`;
    return html;
  }
  
  // Handle self-closing tags
  if (isSelfClosingTag(tag)) {
    html += `>`;
    return html;
  }
  
  // Handle content and children
  if (children && children.length > 0) {
    html += '>\n';
    children.forEach((child: any) => {
      html += buildCleanElementHTML(child, indent + 1) + '\n';
    });
    html += `${spaces}</${tag}>`;
  } else if (content) {
    html += `>${content}</${tag}>`;
  } else {
    html += `></${tag}>`;
  }
  
  return html;
};

// Generate HTML preview with dynamic file processing
export const generateHTMLPreview = (files: {[key: string]: string}, imageUrls?: Array<{actualUrl: string, expectedUrl: string}>) => {
  // Get the main HTML file (prefer index.html, fallback to first HTML file)
  const htmlFileNames = Object.keys(files).filter(name => name.endsWith('.html'));
  const mainHtmlFile = htmlFileNames.find(name => name === 'index.html') || htmlFileNames[0];
  
  if (!mainHtmlFile) {
    return '';
  }

  let htmlContent = files[mainHtmlFile] || '';

  // If no HTML content, return empty
  if (!htmlContent.trim()) {
    return '';
  }

  // Don't auto-fix missing HTML structure - let validation handle this
  // The preview should show the actual student code as-is

  let htmlWithDataUrl = htmlContent;
  
  // Process all file references dynamically
  const processFileReferences = (pattern: RegExp, fileType: string, dataUrlPrefix: string, attributeName: string | null = null) => {
    const matches = htmlWithDataUrl.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Extract filename from various attribute patterns
        const srcMatch = match.match(/src=["']([^"']+)["']|href=["']([^"']+)["']|data-src=["']([^"']+)["']|include=["']([^"']+)["']|data=["']([^"']+)["']/i);
        if (srcMatch) {
          const fileName = srcMatch[1] || srcMatch[2] || srcMatch[3] || srcMatch[4] || srcMatch[5];
          // Find the corresponding file content
          const referencedFile = Object.keys(files).find(f => f === fileName && f.endsWith(
            fileType === 'CSS' ? '.css' : 
            fileType === 'JS' ? '.js' : 
            '.html'
          ));
          if (referencedFile) {
            const fileContent = files[referencedFile] || '';
            const fileDataUrl = `${dataUrlPrefix}${encodeURIComponent(fileContent)}`;
            
            // Determine which attribute to replace
            let attribute = attributeName;
            if (!attribute) {
              if (srcMatch[1]) attribute = 'src';
              else if (srcMatch[2]) attribute = 'href';
              else if (srcMatch[3]) attribute = 'data-src';
              else if (srcMatch[4]) attribute = 'include';
              else if (srcMatch[5]) attribute = 'data';
            }
            
            // Replace the reference
            htmlWithDataUrl = htmlWithDataUrl.replace(
              new RegExp(`${attribute}\\s*=\\s*["']${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi'),
              `${attribute}="${fileDataUrl}"`
            );
          }
        }
      });
    }
  };

  // Simple HTML file reference processor
  const processHTMLFileReferences = () => {
    // Find all HTML files in the files object
    const htmlFiles = Object.keys(files).filter(f => f.endsWith('.html'));
    
    htmlFiles.forEach(htmlFileName => {
      const fileContent = files[htmlFileName] || '';
      const fileDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(fileContent)}`;
      
      // Simple replacements - replace with actual content
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<div[^>]*include\\s*=\\s*["']${htmlFileName}["'][^>]*></div>`, 'gi'),
        `<div>${fileContent}</div>`
      );
      
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<div[^>]*data-src\\s*=\\s*["']${htmlFileName}["'][^>]*></div>`, 'gi'),
        `<div>${fileContent}</div>`
      );
      
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<link[^>]*rel\\s*=\\s*["']import["'][^>]*href\\s*=\\s*["']${htmlFileName}["'][^>]*>`, 'gi'),
        `<div>${fileContent}</div>`
      );
      
      // For iframe, object, embed - replace with data URLs
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<iframe[^>]*src\\s*=\\s*["']${htmlFileName}["'][^>]*>`, 'gi'),
        `<iframe src="${fileDataUrl}"`
      );
      
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<object[^>]*data\\s*=\\s*["']${htmlFileName}["'][^>]*>`, 'gi'),
        `<object data="${fileDataUrl}"`
      );
      
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<embed[^>]*src\\s*=\\s*["']${htmlFileName}["'][^>]*>`, 'gi'),
        `<embed src="${fileDataUrl}"`
      );
    });
  };

  // Process CSS files linked via <link> tags
  processFileReferences(
    /<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi,
    'CSS',
    'data:text/css;charset=utf-8,'
  );

  // Process JavaScript files linked via <script> tags
  processFileReferences(
    /<script[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi,
    'JS',
    'data:text/javascript;charset=utf-8,'
  );

  // Process HTML file references
  processHTMLFileReferences();

  // Process image URL replacements for output generation
  const processImageUrlReplacements = () => {
    if (imageUrls && imageUrls.length > 0) {
      imageUrls.forEach(imageUrl => {
        if (imageUrl.actualUrl && imageUrl.expectedUrl) {
          const escaped = imageUrl.expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const patterns = [
            // src attributes (allow spaces around =)
            new RegExp(`src\\s*=\\s*["']${escaped}["']`, 'gi'),
            // href attributes (for links)
            new RegExp(`href\\s*=\\s*["']${escaped}["']`, 'gi'),
            // data-src attributes
            new RegExp(`data-src\\s*=\\s*["']${escaped}["']`, 'gi'),
            // background-image in style attributes
            new RegExp(`background-image:\\s*url\\(["']?${escaped}["']?\\)`, 'gi'),
            // url() in CSS
            new RegExp(`url\\(["']?${escaped}["']?\\)`, 'gi')
          ];

          patterns.forEach(pattern => {
            htmlWithDataUrl = htmlWithDataUrl.replace(pattern, (match) => {
              if (match.includes('src=')) {
                return match.replace(imageUrl.expectedUrl, imageUrl.actualUrl);
              } else if (match.includes('href=')) {
                return match.replace(imageUrl.expectedUrl, imageUrl.actualUrl);
              } else if (match.includes('data-src=')) {
                return match.replace(imageUrl.expectedUrl, imageUrl.actualUrl);
              } else if (match.includes('background-image')) {
                return match.replace(imageUrl.expectedUrl, imageUrl.actualUrl);
              } else if (match.includes('url(')) {
                return match.replace(imageUrl.expectedUrl, imageUrl.actualUrl);
              }
              return match;
            });
          });
        }
      });
    }
  };

  processImageUrlReplacements();

  return htmlWithDataUrl;
};
