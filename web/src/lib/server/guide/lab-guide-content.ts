import labGuide from '../../../../static/lab-guide.md?raw';

/** Lab guide bundled at build time so Netlify/serverless functions can read it. */
export const LAB_GUIDE_DOCUMENT = labGuide;
