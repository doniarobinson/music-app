/**
 * localStorage keys for stashing the last questionnaire submission + its
 * results between /questionnaire and /results (there's no DB, so this is
 * the whole persistence layer — per-browser only, per the "no DB" design).
 */
export const DISCOVERY_PARAMS_KEY = "deepcuts:lastParams";
export const DISCOVERY_RESULTS_KEY = "deepcuts:lastResults";
