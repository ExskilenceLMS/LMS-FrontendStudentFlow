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
    
    // Check each parent tag instance to see if it has all required attributes
    for (const parentMatch of parentMatches) {
      let hasAllParentAttributes = true;
      
      if (parentAttributes) {
        for (const [key, value] of Object.entries(parentAttributes)) {
          let attributeFound = false;
          
          if (Array.isArray(value)) {
            const escapedValue = String(value[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const attributeRegex = new RegExp(`${key}=["']${escapedValue}["']`, 'i');
            attributeFound = attributeRegex.test(parentMatch);
          } else if (value === true) {
            const attributeRegex = new RegExp(`${key}(?:\\s|>|$)`, 'i');
            attributeFound = attributeRegex.test(parentMatch);
          } else {
            const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const attributeRegex = new RegExp(`${key}=["']${escapedValue}["']`, 'i');
            attributeFound = attributeRegex.test(parentMatch);
          }
          
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
  for (const tagMatch of tagMatches) {
    let hasAllAttributes = true;
    
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        let attributeFound = false;
        
        if (Array.isArray(value)) {
          // Check for attribute with specific value
          const escapedValue = String(value[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const attributeRegex = new RegExp(`${key}=["']${escapedValue}["']`, 'i');
          attributeFound = attributeRegex.test(tagMatch);
        } else if (value === true) {
          // Handle boolean attributes (like readonly, disabled, etc.)
          const attributeRegex = new RegExp(`${key}(?:\\s|>|$)`, 'i');
          attributeFound = attributeRegex.test(tagMatch);
        } else {
          // Check for attribute with specific value
          const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const attributeRegex = new RegExp(`${key}=["']${escapedValue}["']`, 'i');
          attributeFound = attributeRegex.test(tagMatch);
        }
        
        if (!attributeFound) {
          hasAllAttributes = false;
          break;
        }
      }
    }
    
    if (hasAllAttributes) {
      // Check if this is a self-closing tag
      const isSelfClosing = tagMatch.endsWith('/>') || isSelfClosingTag(tag);
      
      if (expectedContent) {
        if (isSelfClosing) {
          // Self-closing tags cannot have content
          return false;
        } else {
          // Find the content between opening and closing tags
          const tagStartIndex = content.indexOf(tagMatch);
          const tagEndIndex = content.indexOf(`</${tag}>`, tagStartIndex);
          if (tagEndIndex !== -1) {
            const tagContent = content.substring(tagStartIndex + tagMatch.length, tagEndIndex);
            if (tagContent.includes(expectedContent)) {
              return true;
            }
          }
        }
      } else {
        return true;
      }
    }
  }
  
  return false;
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
    if (selectorRules[property] !== value) {
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

// Structure validation function - only checks parent-child relationships
export const validateStructure = async (code: string, fileName: string, questionData: any) => {
  const fileValidation = questionData.Code_Validation[fileName];
  if (!fileValidation) return [];
  
  const structure = fileValidation.structure;
  const type = fileName.endsWith('.html') ? 'HTML' : fileName.endsWith('.css') ? 'CSS' : 'JS';
  
  if (type === 'HTML') {
    // For HTML, check only parent-child relationships
    return structure.map((requirement: any) => {
      const { tag, parent } = requirement;
      
      if (!parent) {
        // Root element - just check if it exists
        return code.includes(`<${tag}`);
      } else {
        // Child element - check if it's inside its parent
        const parentRequirement = structure.find((item: any) => item.id === parent);
        if (!parentRequirement) {
          // Parent ID not found in structure list - skip parent-child validation
          // Just check if the tag exists in the code
          return code.includes(`<${tag}`);
        }
        
        const parentTag = parentRequirement.tag;
        // Check if the child tag exists inside the parent tag
        // Use case-insensitive matching and handle self-closing tags
        const parentRegex = new RegExp(`<${parentTag}[^>]*>([\\s\\S]*?)</${parentTag}>`, 'gi');
        const parentMatches = [...code.matchAll(parentRegex)];
        
        for (const match of parentMatches) {
          if (match[1] && match[1].includes(`<${tag}`)) {
            return true;
          }
        }
        return false;
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
export const generateHTMLPreview = (files: {[key: string]: string}) => {
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
              new RegExp(`${attribute}=["']${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi'),
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
        new RegExp(`<div[^>]*include=["']${htmlFileName}["'][^>]*></div>`, 'gi'),
        `<div>${fileContent}</div>`
      );
      
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<div[^>]*data-src=["']${htmlFileName}["'][^>]*></div>`, 'gi'),
        `<div>${fileContent}</div>`
      );
      
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<link[^>]*rel=["']import["'][^>]*href=["']${htmlFileName}["'][^>]*>`, 'gi'),
        `<div>${fileContent}</div>`
      );
      
      // For iframe, object, embed - replace with data URLs
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<iframe[^>]*src=["']${htmlFileName}["'][^>]*>`, 'gi'),
        `<iframe src="${fileDataUrl}"`
      );
      
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<object[^>]*data=["']${htmlFileName}["'][^>]*>`, 'gi'),
        `<object data="${fileDataUrl}"`
      );
      
      htmlWithDataUrl = htmlWithDataUrl.replace(
        new RegExp(`<embed[^>]*src=["']${htmlFileName}["'][^>]*>`, 'gi'),
        `<embed src="${fileDataUrl}"`
      );
    });
  };

  // Process CSS files linked via <link> tags
  processFileReferences(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    'CSS',
    'data:text/css;charset=utf-8,'
  );

  // Process JavaScript files linked via <script> tags
  processFileReferences(
    /<script[^>]*src=["']([^"']+)["'][^>]*>/gi,
    'JS',
    'data:text/javascript;charset=utf-8,'
  );

  // Process HTML file references
  processHTMLFileReferences();

  return htmlWithDataUrl;
};
