"use client";

/**
 * Back-compat shim. The store moved to useGameStore.ts (v2: dual
 * learning modes, advanced metrics, sports log). All existing
 * imports from "@/store/useAppStore" continue to work unchanged.
 */
export * from "./useGameStore";
