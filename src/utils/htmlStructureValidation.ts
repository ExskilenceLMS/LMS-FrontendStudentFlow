// Enhanced HTML structure validation - checks for proper document structure and nesting
export const validateBasicHTMLStructure = (htmlCode: string): { isValid: boolean; missingElements: string[], structureErrors: string[] } => {
  const missingElements: string[] = [];
  const structureErrors: string[] = [];
  
  // Normalize HTML for case-insensitive matching
  const normalizedHTML = htmlCode.replace(/<(\/?)([^>]+)>/g, (match, closing, tag) => {
    return `<${closing}${tag.toLowerCase()}>`;
  });
  
  // Check for DOCTYPE declaration
  if (!normalizedHTML.includes('<!doctype')) {
    missingElements.push('DOCTYPE declaration');
  }
  
  // Check for html tag
  if (!normalizedHTML.includes('<html')) {
    missingElements.push('html tag');
  } else {
    // Check if head and body are properly nested inside html
    const htmlTagMatch = normalizedHTML.match(/<html[^>]*>([\s\S]*?)<\/html>/i);
    if (htmlTagMatch) {
      const htmlContent = htmlTagMatch[1];
      
      // Check for head tag inside html
      if (!htmlContent.includes('<head')) {
        missingElements.push('head tag');
      } else {
        // Check if head is properly closed
        const headTagMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        if (!headTagMatch) {
          structureErrors.push('head tag is not properly closed');
        } else {
          const headContent = headTagMatch[1];
          
          // Check for meta tags inside head (not in body)
          const metaTagsInHead = (headContent.match(/<meta[^>]*>/gi) || []).length;
          const metaTagsInBody = (htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [])[1];
          const metaTagsInBodyCount = metaTagsInBody ? (metaTagsInBody.match(/<meta[^>]*>/gi) || []).length : 0;
          
          if (metaTagsInBodyCount > 0) {
            structureErrors.push('meta tags should be inside head, not in body');
          }
          
          // Check for title tag inside head (not in body)
          const titleInHead = headContent.includes('<title');
          const titleInBody = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const titleInBodyCount = titleInBody ? (titleInBody[1].match(/<title[^>]*>/gi) || []).length : 0;
          
          if (titleInBodyCount > 0) {
            structureErrors.push('title tag should be inside head, not in body');
          }
        }
      }
      
      // Check for body tag inside html
      if (!htmlContent.includes('<body')) {
        missingElements.push('body tag');
      } else {
        // Check if body is properly closed
        const bodyTagMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (!bodyTagMatch) {
          structureErrors.push('body tag is not properly closed');
        } else {
          // Check if body is inside html but not inside head
          const headEndIndex = htmlContent.indexOf('</head>');
          const bodyStartIndex = htmlContent.indexOf('<body');
          
          if (headEndIndex !== -1 && bodyStartIndex !== -1 && bodyStartIndex < headEndIndex) {
            structureErrors.push('body tag should be after head tag, not inside head');
          }
        }
      }
      
      // Check for proper nesting: head should come before body
      const headIndex = htmlContent.indexOf('<head');
      const bodyIndex = htmlContent.indexOf('<body');
      
      if (headIndex !== -1 && bodyIndex !== -1 && bodyIndex < headIndex) {
        structureErrors.push('head tag should come before body tag');
      }
    } else {
      structureErrors.push('html tag is not properly closed');
    }
  }
  
  return {
    isValid: missingElements.length === 0 && structureErrors.length === 0,
    missingElements,
    structureErrors
  };
};
