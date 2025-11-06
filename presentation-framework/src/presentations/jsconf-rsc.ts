/**
 * JSConf 2025 React Foundation Keynote
 *
 * This presentation is being migrated to the new .lume format.
 * For now, it re-exports the original TSX-based presentation.
 *
 * TODO: Complete the conversion from jsconf-rsc.lume file
 */

import * as jsconfModule from './jsconf-2025-react-foundation';

// Re-export named exports
export const getSlides = jsconfModule.getSlides;
export const presentationConfig = jsconfModule.presentationConfig;
export const customStyles = jsconfModule.customStyles;

// Create default export as a module object
export default {
  getSlides: jsconfModule.getSlides,
  presentationConfig: jsconfModule.presentationConfig,
  customStyles: jsconfModule.customStyles,
};
