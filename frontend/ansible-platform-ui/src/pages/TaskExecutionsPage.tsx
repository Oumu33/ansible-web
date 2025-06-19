import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTaskExecutions, triggerTaskExecution, TaskExecution, TaskExecutionTriggerData } from '../services/taskService';
import TaskTriggerForm from '../components/tasks/TaskTriggerForm';

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '20px', maxWidth: '900px', margin: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  list: { listStyle: 'none', padding: 0, marginTop: '20px' },
  listItem: { padding: '15px', border: '1px solid #ddd', borderRadius: '5px', marginBottom: '10px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  listItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  actions: { display: 'flex', gap: '10px', flexShrink: 0 },
  button: { padding: '6px 12px', textDecoration: 'none', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', whiteSpace: 'nowrap' },
  viewButton: { backgroundColor: '#17a2b8', color: 'white' },
  createButton: { backgroundColor: '#28a745', color: 'white' },
  formContainer: { marginTop: '20px', marginBottom: '30px', padding: '25px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' },
  statusBadge: { padding: '4px 8px', borderRadius: '12px', color: 'white', fontSize: '0.85em', textTransform: 'capitalize', fontWeight: '500' },
  detailsLine: { margin: '4px 0', fontSize: '0.9em', color: '#333' },
  playbookLink: { fontWeight: 'bold', textDecoration: 'none', color: '#0056b3' }
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

const TaskExecutionsPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const navigate = useNavigate();

  const fetchTasks = useCallback(async () => {
    // Keep loading true while fetching, but don't reset error if already set by trigger
    setIsLoading(true);
    try {
      const data = await getTaskExecutions();
      setTasks(data);
      setError(null); // Clear previous fetch errors if successful
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task executions.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    // Set up polling:
    const intervalId = setInterval(fetchTasks, 15000); // Poll every 15 seconds
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchTasks]);

  const handleTriggerSubmit = async (data: TaskExecutionTriggerData) => {
    try {
      const newTask = await triggerTaskExecution(data);
      setShowTriggerForm(false);
      // No need to call fetchTasks() immediately if backend returns the new task with full details
      // Or if we navigate away. If staying on page, optimistic update or fetch is good.
      // setTasks(prevTasks => [newTask, ...prevTasks]); // Optimistic update
      navigate(`/tasks/${newTask.id}`);
    } catch (err: any) {
      console.error("Trigger task execution failed:", err);
      throw err;
    }
  };

  if (isLoading && tasks.length === 0) return <div style={styles.page}>Loading task executions...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>Task Executions</h2>
        <button
          onClick={() => { setShowTriggerForm(!showTriggerForm); setError(null); }}
          style={{...styles.button, ...styles.createButton}}
        >
          {showTriggerForm ? 'Cancel Run' : 'Run New Playbook'}
        </button>
      </div>
      {error && <p style={{color: 'red', border: '1px solid red', padding: '10px', borderRadius: '4px'}}>{error}</p>}

      {showTriggerForm && (
        <div style={styles.formContainer}>
          <TaskTriggerForm
            onSubmit={handleTriggerSubmit}
            onCancel={() => { setShowTriggerForm(false); setError(null); }}
          />
        </div>
      )}

      {tasks.length === 0 && !isLoading && !showTriggerForm && <p>No task executions found. Click "Run New Playbook" to start one.</p>}

      {tasks.length > 0 && (
        <ul style={styles.list}>
          {tasks.map(task => (
            <li key={task.id} style={styles.listItem}>
              <div style={styles.listItemHeader}>
                <Link to={`/playbooks/edit/${task.playbook}`} style={styles.playbookLink} title="View/Edit Playbook">
                  {task.playbook_name || `Playbook ID: ${task.playbook}`}
                </Link>
                <span style={{...styles.statusBadge, backgroundColor: getStatusColor(task.status)}}>{task.status}</span>
              </div>
              <div>
                <p style={styles.detailsLine}><strong>Targets:</strong> {task.target_spec}</p>
                <p style={styles.detailsLine}><strong>Executed by:</strong> {task.executed_by_username || 'N/A'}</p>
                <p style={styles.detailsLine}><strong>Created:</strong> {new Date(task.created_at || Date.now()).toLocaleString()}</p>
                {task.started_at && <p style={styles.detailsLine}><strong>Started:</strong> {new Date(task.started_at).toLocaleString()}</p>}
                {task.completed_at && <p style={styles.detailsLine}><strong>Completed:</strong> {new Date(task.completed_at).toLocaleString()}</p>}
              </div>
              <div style={{marginTop: '10px', ...styles.actions}}>
                <Link to={`/tasks/${task.id}`} style={{...styles.button, ...styles.viewButton}}>View Details & Log</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskExecutionsPage;
