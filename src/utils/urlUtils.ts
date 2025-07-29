/**
 * Utility function to update URL parameters without causing a page reload
 * @param paramName - The name of the URL parameter to update
 * @param paramValue - The value to set for the parameter
 */
export const updateUrlParameter = (paramName: string, paramValue: string | number): void => {
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set(paramName, paramValue.toString());
  window.history.replaceState({}, '', newUrl.toString());
};

/**
 * Utility function specifically for updating the 'index' parameter
 * This is the most commonly used parameter in test components
 * @param index - The index value to set
 */
export const updateIndexParameter = (index: number): void => {
  updateUrlParameter('index', index);
}; 