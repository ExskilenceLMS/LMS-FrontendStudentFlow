// JavaScript Validation Utilities
// Extracted from JSForm.js for reuse in HTML/CSS editors

// Parse JavaScript code to extract variables, functions, and events
export const parseJavaScript = (jsCode: string) => {
  try {
    const result: {
      variables: {[key: string]: any};
      functions: {[key: string]: any};
      events: {[key: string]: any};
    } = {
      variables: {},
      functions: {},
      events: {}
    };
    
    // Clean the code - remove comments and normalize whitespace
    const cleanCode = jsCode
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Parse variable declarations (let, const, var)
    const varRegex = /(let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=\s*([^;]+))?\s*;?/g;
    let varMatch;
    let varOrder = 0;
    while ((varMatch = varRegex.exec(cleanCode)) !== null) {
      const [, declaration, name, value] = varMatch;
      result.variables[name] = {
        declaration: declaration.trim(),
        value: value ? value.trim() : null,
        order: varOrder++
      };
    }
    
    // Parse function declarations (regular functions)
    const funcRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g;
    let funcMatch;
    let funcOrder = 0;
    while ((funcMatch = funcRegex.exec(cleanCode)) !== null) {
      const [, name, params] = funcMatch;
      const parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
      result.functions[name] = {
        type: 'function',
        parameters: parameters,
        order: funcOrder++
      };
    }
    
    // Parse async function declarations
    const asyncFuncRegex = /async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g;
    let asyncFuncMatch;
    while ((asyncFuncMatch = asyncFuncRegex.exec(cleanCode)) !== null) {
      const [, name, params] = asyncFuncMatch;
      const parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
      result.functions[name] = {
        type: 'async',
        parameters: parameters
      };
    }
    
    // Parse arrow functions (const/let/var name = () => {})
    const arrowFuncRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;
    let arrowFuncMatch;
    while ((arrowFuncMatch = arrowFuncRegex.exec(cleanCode)) !== null) {
      const [, name, params] = arrowFuncMatch;
      const isAsync = cleanCode.substring(arrowFuncMatch.index, arrowFuncMatch.index + arrowFuncMatch[0].length).includes('async');
      const parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
      result.functions[name] = {
        type: isAsync ? 'asyncArrow' : 'arrow',
        parameters: parameters
      };
    }
    
    // Parse object methods (method() {})
    const methodRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(cleanCode)) !== null) {
      const [, name, params] = methodMatch;
      // Check if this is inside an object (look for { before the method)
      const beforeMatch = cleanCode.substring(0, methodMatch.index);
      const lastBrace = beforeMatch.lastIndexOf('{');
      const lastSemicolon = beforeMatch.lastIndexOf(';');
      if (lastBrace > lastSemicolon) {
        const parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
        result.functions[name] = {
          type: 'method',
          parameters: parameters
        };
      }
    }
    
    // Parse constructor functions
    const constructorRegex = /function\s+([A-Z][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g;
    let constructorMatch;
    while ((constructorMatch = constructorRegex.exec(cleanCode)) !== null) {
      const [, name, params] = constructorMatch;
      const parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
      result.functions[name] = {
        type: 'constructor',
        parameters: parameters
      };
    }
    
    // Parse event assignments (window.onload, etc.)
    const eventRegex = /(window\.onload|document\.onload|onclick|onload)\s*=\s*([^;]+);?/g;
    let eventMatch;
    let eventOrder = 0;
    while ((eventMatch = eventRegex.exec(cleanCode)) !== null) {
      const [, eventName, value] = eventMatch;
      result.events[eventName] = {
        value: value.trim(),
        order: eventOrder++
      };
    }
    
    return result;
  } catch (error) {
    return null;
  }
};

// Validate variable declaration and value
export const validateVariable = (element: any, jsCode: string) => {
  const parsed = parseJavaScript(jsCode);
  if (!parsed) {
    return { passed: false, message: 'Failed to parse JavaScript code' };
  }

  const varInfo = parsed.variables[element.name];
  if (!varInfo) {
    return { passed: false, message: `Variable '${element.name}' not found` };
  }

  // Check declaration type
  if (element.declaration && varInfo.declaration !== element.declaration) {
    return { 
      passed: false, 
      message: `Expected declaration '${element.declaration}', found '${varInfo.declaration}'` 
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
        message: `Expected value '${element.value}', found '${varInfo.value}'` 
      };
    }
  } else if (element.value === null && varInfo.value !== null) {
    // If test case expects no value (null) but code has a value
    return { 
      passed: false, 
      message: `Expected no value, but found '${varInfo.value}'` 
    };
  } else if (element.value === '' && varInfo.value !== null) {
    // If test case expects no value (empty string) but code has a value
    return { 
      passed: false, 
      message: `Expected no value, but found '${varInfo.value}'` 
    };
  }

  return { passed: true, message: `Variable '${element.name}' validated successfully` };
};

// Validate function test case
export const validateFunctionTestCase = async (element: any, testCase: any, jsCode: string) => {
  try {
    const parsed = parseJavaScript(jsCode);
    if (!parsed) {
      return { passed: false, message: 'Failed to parse JavaScript code' };
    }

    const funcInfo = parsed.functions[element.name];
    if (!funcInfo) {
      return { passed: false, message: `Function '${element.name}' not found` };
    }

    // Check function type if specified
    if (element.funcType && funcInfo.type !== element.funcType) {
      return { 
        passed: false, 
        message: `Expected function type '${element.funcType}', found '${funcInfo.type}'` 
      };
    }

    // Check parameters if specified
    if (element.parameters && element.parameters.length > 0) {
      if (funcInfo.parameters.length !== element.parameters.length) {
        return { 
          passed: false, 
          message: `Expected ${element.parameters.length} parameters, found ${funcInfo.parameters.length}` 
        };
      }

      // Check parameter names
      for (let i = 0; i < element.parameters.length; i++) {
        if (funcInfo.parameters[i] !== element.parameters[i].name) {
          return { 
            passed: false, 
            message: `Parameter ${i + 1} expected '${element.parameters[i].name}', found '${funcInfo.parameters[i]}'` 
          };
        }
      }
    }

    // Execute test case if it's a return type test
    if (testCase.testType === 'return') {
      const result = await executeFunctionTest(element.name, testCase, jsCode);
      return result;
    } else if (testCase.testType === 'domManipulation') {
      const result = await executeDOMTest(element.name, testCase, jsCode);
      return result;
    } else if (testCase.testType === 'sideEffect') {
      return { 
        passed: true, 
        message: `Side effect test: ${testCase.sideEffect || testCase.description}` 
      };
    }

    return { passed: true, message: 'Function structure validated successfully' };
  } catch (error) {
    return { passed: false, message: `Validation error: ${error instanceof Error ? error.message : String(error)}` };
  }
};

// Execute function test with actual JavaScript execution
export const executeFunctionTest = async (functionName: string, testCase: any, jsCode: string) => {
  try {
    // Create a safe execution environment
    const mockDOM = {
      getElementById: (id: string) => ({
        textContent: '',
        innerHTML: '',
        value: '',
        style: {},
        _changes: []
      })
    };

    const context = {
      document: mockDOM,
      window: { onload: null },
      console: { log: () => {} },
      Math: Math,
      Date: Date,
      setInterval: () => 123,
      clearInterval: () => {}
    };

    // Execute the JavaScript code in a safe environment
    const executeFunction = new Function(`
      const document = arguments[0].document;
      const window = arguments[0].window;
      const console = arguments[0].console;
      const Math = arguments[0].Math;
      const Date = arguments[0].Date;
      const setInterval = arguments[0].setInterval;
      const clearInterval = arguments[0].clearInterval;
      
      ${jsCode}
      
      return ${functionName};
    `);

    const targetFunction = executeFunction(context);
    
    if (typeof targetFunction !== 'function') {
      return { 
        passed: false, 
        message: `'${functionName}' is not a function` 
      };
    }

    // Execute the function with test inputs
    const result = targetFunction.apply(null, testCase.input || []);
    
    // Compare with expected output
    const expected = testCase.expectedOutput;
    
    // Normalize quotes for comparison - convert single quotes to double quotes
    const normalizeForComparison = (value: any) => {
      if (typeof value === 'string') {
        return value.replace(/'/g, '"');
      }
      // Convert boolean to string for comparison
      if (typeof value === 'boolean') {
        return value.toString();
      }
      return value;
    };
    
    const normalizedResult = normalizeForComparison(result);
    const normalizedExpected = normalizeForComparison(expected);
    const passed = JSON.stringify(normalizedResult) === JSON.stringify(normalizedExpected);
    
    return {
      passed,
      message: passed 
        ? `Test passed: ${testCase.description}` 
        : `Expected: ${expected}, Got: ${result}`
    };
  } catch (error) {
    return { 
      passed: false, 
      message: `Execution error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

// Execute DOM manipulation test
export const executeDOMTest = async (functionName: string, testCase: any, jsCode: string) => {
  try {
    // Create a mock DOM with change tracking
    const mockElements = new Map();
    const mockDOM = {
      getElementById: (id: string) => {
        if (!mockElements.has(id)) {
          mockElements.set(id, {
            textContent: '',
            innerHTML: '',
            value: '',
            style: {},
            _changes: []
          });
        }
        const element = mockElements.get(id);
        
        // Return proxy to track changes
        return new Proxy(element, {
          set(target: any, property: string, value: any) {
            target._changes.push({ property, value, timestamp: Date.now() });
            target[property] = value;
            return true;
          }
        });
      }
    };

    const context = {
      document: mockDOM,
      window: { onload: null },
      console: { log: () => {} },
      Math: Math,
      Date: Date,
      setInterval: () => 123,
      clearInterval: () => {}
    };

    // Execute the JavaScript code
    const executeFunction = new Function(`
      const document = arguments[0].document;
      const window = arguments[0].window;
      const console = arguments[0].console;
      const Math = arguments[0].Math;
      const Date = arguments[0].Date;
      const setInterval = arguments[0].setInterval;
      const clearInterval = arguments[0].clearInterval;
      
      ${jsCode}
      
      return ${functionName};
    `);

    const targetFunction = executeFunction(context);
    
    if (typeof targetFunction !== 'function') {
      return { 
        passed: false, 
        message: `'${functionName}' is not a function` 
      };
    }

    // Execute the function
    const result = targetFunction.apply(null, testCase.input || []);
    
    // Check DOM changes
    if (testCase.expectedDOMChanges && testCase.expectedDOMChanges.length > 0) {
      let allPassed = true;
      const errors: string[] = [];
      
      for (const expectedChange of testCase.expectedDOMChanges) {
        const element = mockElements.get(expectedChange.elementId);
        if (!element) {
          allPassed = false;
          errors.push(`Element '${expectedChange.elementId}' not found`);
          continue;
        }
        
        const actualValue = element[expectedChange.property];
        
        // Normalize quotes for comparison
        const normalizeForComparison = (value: any) => {
          if (typeof value === 'string') {
            return value.replace(/'/g, '"');
          }
          return value;
        };
        
        const normalizedActual = normalizeForComparison(actualValue);
        const normalizedExpected = normalizeForComparison(expectedChange.expectedValue);
        
        if (normalizedActual !== normalizedExpected) {
          allPassed = false;
          errors.push(`Expected ${expectedChange.property}='${expectedChange.expectedValue}', got '${actualValue}'`);
        }
      }
      
      return {
        passed: allPassed,
        message: allPassed 
          ? `DOM test passed: ${testCase.description}` 
          : `DOM test failed: ${errors.join(', ')}`
      };
    }
    
    return {
      passed: true,
      message: `DOM test passed: ${testCase.description}`
    };
  } catch (error) {
    return { 
      passed: false, 
      message: `DOM test error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

// Validate event assignment
export const validateEvent = (element: any, jsCode: string) => {
  const parsed = parseJavaScript(jsCode);
  if (!parsed) {
    return { passed: false, message: 'Failed to parse JavaScript code' };
  }

  const eventInfo = parsed.events[element.name];
  if (!eventInfo) {
    return { passed: false, message: `Event '${element.name}' not found` };
  }

  // Check event value if specified
  if (element.value) {
    // Normalize quotes for comparison
    const normalizeForComparison = (value: any) => {
      if (typeof value === 'string') {
        return value.replace(/'/g, '"');
      }
      // Convert boolean to string for comparison
      if (typeof value === 'boolean') {
        return value.toString();
      }
      return value;
    };
    
    const normalizedElementValue = normalizeForComparison(element.value);
    const normalizedEventInfo = normalizeForComparison(eventInfo.value);
    
    if (normalizedEventInfo !== normalizedElementValue) {
      return { 
        passed: false, 
        message: `Expected value '${element.value}', found '${eventInfo.value}'` 
      };
    }
  }

  return { passed: true, message: `Event '${element.name}' validated successfully` };
};

// Main validation function that orchestrates all validation
export const validateJSTestCases = async (elements: any[], jsCode: string) => {
  const results: {[key: number]: {[key: number]: any}} = {};
  const groupedResults: any[] = [];

  try {
    // Don't validate if there are no elements
    if (elements.length === 0) {
      return { results, hasErrors: false, groupedResults: [] };
    }

    
    for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
      const element = elements[elementIndex];
      results[elementIndex] = {};

      if (element.type === 'variable') {
        // Validate variable
        const varResult = validateVariable(element, jsCode);
        results[elementIndex][0] = varResult;
        
        // Add to grouped results as individual item
        const expectedValue = element.value !== null && element.value !== undefined 
          ? `${element.declaration} ${element.name} = ${element.value};`
          : `${element.declaration} ${element.name};`;
        groupedResults.push({
          ...varResult,
          elementName: element.name,
          elementType: 'variable',
          expectedValue: expectedValue,
          description: `Variable '${element.name}' should be declared as '${element.declaration}'${element.value ? ` with value '${element.value}'` : ''}`,
          isGrouped: false
        });
      } else if (element.type === 'function' && element.testCases && element.testCases.length > 0) {
        // Validate function test cases
        const testCaseResults: any[] = [];
        let allPassed = true;
        
        for (let testCaseIndex = 0; testCaseIndex < element.testCases.length; testCaseIndex++) {
          const testCase = element.testCases[testCaseIndex];
          const testResult = await validateFunctionTestCase(element, testCase, jsCode);
          results[elementIndex][testCaseIndex] = testResult;
          
          testCaseResults.push({
            ...testResult,
            elementName: element.name,
            elementType: 'function',
            testCaseIndex: testCaseIndex,
            testCaseDescription: testCase.description || `Test case ${testCaseIndex + 1}`,
            expectedOutput: testCase.expectedOutput,
            input: testCase.input
          });
          
          if (!testResult.passed) {
            allPassed = false;
          }
        }
        
        // Add as grouped result
        groupedResults.push({
          passed: allPassed,
          elementName: element.name,
          elementType: 'function',
          isGrouped: true,
          testCases: testCaseResults,
          passedCount: testCaseResults.filter(tc => tc.passed).length,
          totalCount: testCaseResults.length,
          description: `Function '${element.name}' test cases`
        });
      } else if (element.type === 'function') {
        // Validate function structure only (no test cases)
        const funcResult = await validateFunctionTestCase(element, {}, jsCode);
        results[elementIndex][0] = funcResult;
        
        // Add to grouped results as individual item
        groupedResults.push({
          ...funcResult,
          elementName: element.name,
          elementType: 'function',
          description: `Function '${element.name}' should be declared`,
          isGrouped: false
        });
      } else if (element.type === 'event') {
        // Validate event
        const eventResult = validateEvent(element, jsCode);
        results[elementIndex][0] = eventResult;
        
        // Add to grouped results
        groupedResults.push({
          ...eventResult,
          elementName: element.name,
          elementType: 'event',
          description: `Event '${element.name}' should be assigned`,
          isGrouped: false
        });
      }
    }

    // Check if there are any validation errors
    const hasErrors = Object.values(results).some(elementResults => 
      Object.values(elementResults).some(result => !result.passed)
    );
    
    return { results, hasErrors, groupedResults };
    
  } catch (error) {
    console.error('Validation error:', error);
    return { results: {}, hasErrors: true, groupedResults: [] };
  }
};
