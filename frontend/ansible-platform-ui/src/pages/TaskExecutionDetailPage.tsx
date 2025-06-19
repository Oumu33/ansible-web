import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTaskExecutionById, getTaskExecutionLog, TaskExecution } from '../services/taskService';

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '20px', maxWidth: '1000px', margin: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  detailsTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px', tableLayout: 'fixed' },
  th: { textAlign: 'left', padding: '10px', border: '1px solid #ddd', backgroundColor: '#f2f2f2', width: '180px', fontWeight: '600' },
  td: { textAlign: 'left', padding: '10px', border: '1px solid #ddd', wordBreak: 'break-word' },
  logContainer: {
    marginTop: '20px',
    padding: '15px',
    border: '1px solid #ccc',
    backgroundColor: '#222', // Dark background for logs
    color: '#eee', // Light text for logs
    borderRadius: '5px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  logPre: {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    margin: 0,
    fontFamily: 'monospace',
    fontSize: '0.9em',
  },
  statusBadge: { padding: '4px 8px', borderRadius: '12px', color: 'white', fontSize: '0.9em', textTransform: 'capitalize', fontWeight: '500' },
  button: { padding: '8px 15px', textDecoration: 'none', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' },
  loadingText: { fontStyle: 'italic', color: '#777' }
};

const getStatusColor = (status: TaskExecution['status']): string => {
  switch (status) {
    case 'succeeded': return '#28a745';
    case 'failed': return '#dc3545';
    case 'running': return '#007bff';
    case 'pending': return '#ffc107';
    case 'canceled': return '#6c757d';
    default: return '#343a40';
  }
};

const TaskExecutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskExecution | null>(null);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const fetchTaskDetailsAndLog = useCallback(async (taskId: number) => {
    setIsLoading(true);
    setError(null);
    setLogError(null);
    setLogContent(null); // Reset log content on new fetch

    try {
      const taskData = await getTaskExecutionById(taskId);
      setTask(taskData);

      if (taskData.status === 'succeeded' || taskData.status === 'failed' || taskData.status === 'running') { // Attempt to fetch logs for running too
        setIsLogLoading(true);
        try {
          const logs = await getTaskExecutionLog(taskId);
          setLogContent(logs);
        } catch (logFetchError: any) {
          console.error("Failed to fetch task log:", logFetchError);
          setLogError(logFetchError.response?.data || logFetchError.message || 'Failed to load execution log.');
          setLogContent("Log content not available or failed to load.");
        } finally {
          setIsLogLoading(false);
        }
      } else if (taskData.status === 'pending') {
        setLogContent("Task is pending. Logs will be available after it starts/completes.");
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task execution details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (id) {
      fetchTaskDetailsAndLog(parseInt(id, 10));
      // If task is running or pending, set up polling
      if (task && (task.status === 'running' || task.status === 'pending')) {
        intervalId = setInterval(() => {
          fetchTaskDetailsAndLog(parseInt(id, 10));
        }, 5000); // Poll every 5 seconds for running/pending tasks
      }
    } else {
      setError("No Task Execution ID provided.");
      setIsLoading(false);
    }
    return () => { // Cleanup interval on component unmount or if task status changes
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, fetchTaskDetailsAndLog, task?.status]); // Add task.status to re-evaluate polling

  if (isLoading && !task) return <div style={styles.page}>Loading task execution details...</div>;
  if (error) return <div style={styles.page}><p style={{color: 'red'}}>{error}</p><Link to="/tasks" style={styles.button}>Back to List</Link></div>;
  if (!task) return <div style={styles.page}>Task execution not found. <Link to="/tasks" style={styles.button}>Back to List</Link></div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>Task Execution Details: #{task.id}</h2>
        <Link to="/tasks" style={styles.button}>Back to Task List</Link>
      </div>

      <table style={styles.detailsTable}>
        <tbody>
          <tr><th style={styles.th}>Playbook:</th><td style={styles.td}><Link to={`/playbooks/edit/${task.playbook}`}>{task.playbook_name || `ID ${task.playbook}`}</Link></td></tr>
          <tr><th style={styles.th}>Targets:</th><td style={styles.td}>{task.target_spec}</td></tr>
          <tr><th style={styles.th}>Status:</th><td style={styles.td}><span style={{...styles.statusBadge, backgroundColor: getStatusColor(task.status)}}>{task.status}</span></td></tr>
          <tr><th style={styles.th}>Executed By:</th><td style={styles.td}>{task.executed_by_username || 'N/A'}</td></tr>
          <tr><th style={styles.th}>Created At:</th><td style={styles.td}>{new Date(task.created_at || Date.now()).toLocaleString()}</td></tr>
          <tr><th style={styles.th}>Started At:</th><td style={styles.td}>{task.started_at ? new Date(task.started_at).toLocaleString() : 'N/A'}</td></tr>
          <tr><th style={styles.th}>Completed At:</th><td style={styles.td}>{task.completed_at ? new Date(task.completed_at).toLocaleString() : 'N/A'}</td></tr>
          <tr><th style={styles.th}>Celery Task ID:</th><td style={styles.td}>{task.celery_task_id || 'N/A'}</td></tr>
          <tr><th style={styles.th}>Log Directory:</th><td style={styles.td}>{task.output_log_directory || 'N/A'}</td></tr>
        </tbody>
      </table>

      <h3>Execution Log</h3>
      {logError && <p style={{color: 'red'}}>{logError}</p>}
      <div style={styles.logContainer}>
        <pre style={styles.logPre}>
          {isLogLoading ? <span style={styles.loadingText}>Loading log...</span> : logContent || <span style={styles.loadingText}>No log content loaded or task not yet run.</span>}
        </pre>
      </div>
    </div>
  );
};

export default TaskExecutionDetailPage;
