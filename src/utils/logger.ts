
export interface LogEntry {
  timestamp: string;
  event: string;
}

const LOG_KEY = 'm2m_system_log';
const MAX_LOGS = 100;

export const addLog = (event: string) => {
  try {
    const logs: LogEntry[] = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    const newEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      event,
    };
    const updatedLogs = [newEntry, ...logs].slice(0, MAX_LOGS);
    localStorage.setItem(LOG_KEY, JSON.stringify(updatedLogs));
  } catch (e) {
    console.error('Failed to add log', e);
  }
};

export const getLogs = (): LogEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch (e) {
    return [];
  }
};

export const clearLogs = () => {
  localStorage.removeItem(LOG_KEY);
};
