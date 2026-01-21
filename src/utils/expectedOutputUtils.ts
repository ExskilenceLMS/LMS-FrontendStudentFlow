/**
 * Utility functions for handling ExpectedOutput ordering based on TestCases
 */

interface Data {
  [key: string]: any;
}

interface TestCase {
  [key: string]: string;
}

/**
 * Reorders ExpectedOutput array based on column order specified in TestCases
 * If TestCases[1] contains a comma-separated column order, uses that order
 * Otherwise, returns the ExpectedOutput in its default order
 * 
 * @param expectedOutput - The ExpectedOutput array to reorder
 * @param testCases - The TestCases array that may contain column order information
 * @returns Reordered ExpectedOutput array or original if no column order specified
 */
export const reorderExpectedOutput = (
  expectedOutput: Data[],
  testCases: TestCase[] = []
): Data[] => {
  // If no expected output or empty, return as-is
  if (!expectedOutput || expectedOutput.length === 0) {
    return expectedOutput;
  }

  // Check if second test case exists and contains column order
  if (testCases && testCases.length > 1 && testCases[1]) {
    const secondTestCase = testCases[1];
    
    // Get the Testcase value (the comma-separated column order)
    const testcaseValue = secondTestCase.Testcase;
    
    if (testcaseValue && typeof testcaseValue === 'string') {
      // Parse comma-separated column names
      const columnOrder = testcaseValue
        .split(',')
        .map(col => col.trim())
        .filter(col => col.length > 0);
      
      // If we have a valid column order, reorder the ExpectedOutput
      if (columnOrder.length > 0) {
        // Get all available keys from the first row
        const availableKeys = Object.keys(expectedOutput[0] || {});
        
        // Create ordered keys: first columns from testcase order, then any remaining columns
        const orderedKeys = [
          ...columnOrder.filter(key => availableKeys.includes(key)),
          ...availableKeys.filter(key => !columnOrder.includes(key))
        ];
        
        // Reorder each row in ExpectedOutput
        return expectedOutput.map(row => {
          const reorderedRow: Data = {};
          orderedKeys.forEach(key => {
            if (row.hasOwnProperty(key)) {
              reorderedRow[key] = row[key];
            }
          });
          return reorderedRow;
        });
      }
    }
  }
  
  // Return original ExpectedOutput if no column order specified
  return expectedOutput;
};
