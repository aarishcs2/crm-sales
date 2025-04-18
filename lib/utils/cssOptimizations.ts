/**
 * Utility functions for optimizing CSS usage
 */

/**
 * Generate CSS variables for a theme
 * @param theme Theme object with color values
 * @returns CSS variables string
 */
export function generateCssVariables(theme: Record<string, string>): string {
  return Object.entries(theme)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');
}

/**
 * Create a style element with the given CSS
 * @param css CSS string
 * @param id Optional ID for the style element
 * @returns The created style element
 */
export function createStyleElement(css: string, id?: string): HTMLStyleElement {
  const style = document.createElement('style');
  if (id) style.id = id;
  style.textContent = css;
  return style;
}

/**
 * Inject CSS into the document head
 * @param css CSS string
 * @param id Optional ID for the style element
 */
export function injectCss(css: string, id?: string): void {
  if (typeof document === 'undefined') return;
  
  // Remove existing style with the same ID if it exists
  if (id) {
    const existingStyle = document.getElementById(id);
    if (existingStyle) existingStyle.remove();
  }
  
  // Create and append the new style element
  const style = createStyleElement(css, id);
  document.head.appendChild(style);
}

/**
 * Remove injected CSS by ID
 * @param id ID of the style element to remove
 */
export function removeCss(id: string): void {
  if (typeof document === 'undefined') return;
  
  const style = document.getElementById(id);
  if (style) style.remove();
}

/**
 * Create a scoped CSS class name to avoid conflicts
 * @param componentName Component name
 * @param className Class name
 * @returns Scoped class name
 */
export function scopedClassName(componentName: string, className: string): string {
  return `${componentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${className}`;
}

/**
 * Optimize CSS by removing unused selectors
 * @param css CSS string
 * @param usedSelectors Array of used selectors
 * @returns Optimized CSS string
 */
export function optimizeCss(css: string, usedSelectors: string[]): string {
  // Simple CSS parser to extract selectors and their rules
  const cssRules: Record<string, string> = {};
  const cssRegex = /([^{]+)({[^}]*})/g;
  let match;
  
  while ((match = cssRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const rules = match[2];
    cssRules[selector] = rules;
  }
  
  // Filter out unused selectors
  const optimizedCss = Object.entries(cssRules)
    .filter(([selector]) => {
      // Keep selector if it's used or it's a global selector
      return usedSelectors.some(used => selector.includes(used)) || 
             selector.startsWith('*') || 
             selector.startsWith('html') || 
             selector.startsWith('body');
    })
    .map(([selector, rules]) => `${selector} ${rules}`)
    .join('\n');
  
  return optimizedCss;
}
