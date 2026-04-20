import { useState, useCallback } from 'react';
import {
  vehiclesService,
  driversService,
  supervisorsService,
  recordsService,
  damagesService,
  docsService,
} from '../services/storage';

/**
 * Custom hook for managing all data
 */
export function useData() {
  const [vehicles, setVehicles] = useState(() => vehiclesService.getAll());
  const [drivers, setDrivers] = useState(() => driversService.getAll());
  const [supervisors, setSupervisors] = useState(() => supervisorsService.getAll());
  const [records, setRecords] = useState(() => recordsService.getAll());
  const [damages, setDamages] = useState(() => damagesService.getAll());
  const [docs, setDocs] = useState(() => docsService.getAll());

  const reload = useCallback(() => {
    setVehicles(vehiclesService.getAll());
    setDrivers(driversService.getAll());
    setSupervisors(supervisorsService.getAll());
    setRecords(recordsService.getAll());
    setDamages(damagesService.getAll());
    setDocs(docsService.getAll());
  }, []);

  return {
    vehicles, drivers, supervisors, records, damages, docs,
    reload,
    vehiclesService,
    driversService,
    supervisorsService,
    recordsService,
    damagesService,
    docsService,
  };
}

/**
 * Hook for getting current terminal from sessionStorage
 */
export function useTerminal() {
  const [terminal, setTerminalState] = useState(() => {
    return sessionStorage.getItem('cp_terminal') || '';
  });

  const setTerminal = useCallback((t) => {
    sessionStorage.setItem('cp_terminal', t);
    setTerminalState(t);
  }, []);

  const clearTerminal = useCallback(() => {
    sessionStorage.removeItem('cp_terminal');
    setTerminalState('');
  }, []);

  return { terminal, setTerminal, clearTerminal };
}
